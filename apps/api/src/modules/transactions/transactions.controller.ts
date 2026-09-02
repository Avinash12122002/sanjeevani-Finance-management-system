import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FinancialEngine } from '@sanjeevani/financial-engine';
import {
  IUser,
  TransactionType,
  TransactionStatus,
  ITransaction,
  PaginationParams,
} from '@sanjeevani/shared-types';

@Controller('api/v1/transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private dataStore: DataStoreService) {}

  @Get()
  getTransactions(
    @Query()
    query: PaginationParams & {
      customerId?: string;
      loanId?: string;
      accountId?: string;
      type?: string;
    },
  ) {
    let list = [...this.dataStore.transactions];

    if (query.search) {
      const s = query.search.toLowerCase();
      list = list.filter(
        (t) =>
          t.transactionNumber.toLowerCase().includes(s) ||
          t.customerName?.toLowerCase().includes(s) ||
          t.customerNumber?.toLowerCase().includes(s) ||
          t.receiptNumber?.toLowerCase().includes(s),
      );
    }

    if (query.customerId) {
      list = list.filter((t) => t.customerId === query.customerId);
    }

    if (query.loanId) {
      list = list.filter((t) => t.loanId === query.loanId);
    }

    if (query.accountId) {
      list = list.filter((t) => t.accountId === query.accountId);
    }

    if (query.type) {
      list = list.filter((t) => t.transactionType === query.type);
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const startIndex = (page - 1) * limit;

    return {
      items: list.slice(startIndex, startIndex + limit),
      total: list.length,
      page,
      limit,
      totalPages: Math.ceil(list.length / limit),
    };
  }

  @Get(':id')
  getTransactionById(@Param('id') id: string) {
    const txn = this.dataStore.transactions.find((t) => t.id === id || t.transactionNumber === id);
    if (!txn) {
      throw new NotFoundException(`Transaction not found for identifier: ${id}`);
    }
    return txn;
  }

  /**
   * IMMUTABLE REVERSAL WORKFLOW (SRS §17, BR-002, BR-003)
   * Original Approved Transactions are never deleted.
   * A counter-acting Reversal Transaction is posted.
   */
  @Post(':id/reverse')
  reverseTransaction(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @CurrentUser() user: IUser,
  ) {
    if (!body.reason || body.reason.trim().length < 5) {
      throw new BadRequestException(
        'A mandatory descriptive reason (min 5 characters) is required for financial reversals (BR-015).',
      );
    }

    const originalTxn = this.dataStore.transactions.find((t) => t.id === id || t.transactionNumber === id);
    if (!originalTxn) {
      throw new NotFoundException('Transaction record not found');
    }

    if (originalTxn.status === TransactionStatus.REVERSED) {
      throw new BadRequestException('This transaction has already been reversed.');
    }

    const today = new Date().toISOString().split('T')[0];
    if (this.dataStore.isDateLocked(today)) {
      throw new BadRequestException(
        `Business Date Locked (BR-009): Business date ${today} is already closed and locked. Transaction reversals cannot be posted without reopening.`,
      );
    }

    const reversalTxnNumber = this.dataStore.nextTransactionNumber();

    const reversalTxn: ITransaction = {
      id: `TXN-REV-${Date.now()}`,
      transactionNumber: reversalTxnNumber,
      branchId: originalTxn.branchId,
      branchName: originalTxn.branchName,
      customerId: originalTxn.customerId,
      customerName: originalTxn.customerName,
      customerNumber: originalTxn.customerNumber,
      loanId: originalTxn.loanId,
      accountId: originalTxn.accountId,
      transactionType: TransactionType.REVERSAL,
      amount: originalTxn.amount,
      paymentMode: originalTxn.paymentMode,
      transactionDate: today,
      status: TransactionStatus.POSTED,
      createdBy: user.id || 'USR-001',
      createdByName: user.employeeName || 'Manager',
      reversalOfTransactionId: originalTxn.id,
      reversalReason: body.reason,
      remarks: `REVERSAL OF ${originalTxn.transactionNumber}: ${body.reason}`,
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
    };

    originalTxn.status = TransactionStatus.REVERSED;
    this.dataStore.transactions.unshift(reversalTxn);

    // Rollback loan or account changes with arbitrary decimal precision
    if (originalTxn.loanId) {
      const loan = this.dataStore.loans.find((l) => l.id === originalTxn.loanId);
      if (loan) {
        loan.outstandingPrincipal = FinancialEngine.add(loan.outstandingPrincipal, originalTxn.amount * 0.8);
        loan.totalPaid = Math.max(0, FinancialEngine.subtract(loan.totalPaid, originalTxn.amount));
      }
    } else if (originalTxn.accountId) {
      const acc = this.dataStore.accounts.find((a) => a.id === originalTxn.accountId);
      if (acc) {
        acc.currentBalance = Math.max(0, FinancialEngine.subtract(acc.currentBalance, originalTxn.amount));
      }
    }

    // Create Reversal Accounting Entry
    const journalNumber = this.dataStore.nextJournalNumber();
    this.dataStore.journalEntries.unshift({
      id: `JRN-REV-${Date.now()}`,
      journalNumber,
      transactionId: reversalTxn.id,
      businessDate: new Date().toISOString().split('T')[0],
      description: `REVERSAL of ${originalTxn.transactionNumber} - ${body.reason}`,
      totalDebit: originalTxn.amount,
      totalCredit: originalTxn.amount,
      status: 'POSTED',
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      lines: [
        {
          ledgerAccountId: originalTxn.loanId ? 'COA-1030' : 'COA-2010',
          debitAmount: originalTxn.amount,
          creditAmount: 0,
          branchId: originalTxn.branchId,
        },
        {
          ledgerAccountId: 'COA-1010',
          debitAmount: 0,
          creditAmount: originalTxn.amount,
          branchId: originalTxn.branchId,
        },
      ],
    });

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Manager',
      'TRANSACTION_REVERSED',
      'Transaction',
      originalTxn.id,
      originalTxn,
      reversalTxn,
      `Reversed transaction ${originalTxn.transactionNumber}: ${body.reason}`,
    );

    return {
      message: 'Transaction successfully reversed',
      originalTransaction: originalTxn,
      reversalTransaction: reversalTxn,
    };
  }
}
