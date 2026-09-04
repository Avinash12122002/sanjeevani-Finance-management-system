import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
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
  PaymentMode,
  TransactionType,
  TransactionStatus,
  InstallmentStatus,
  IUser,
  ITransaction,
  IReceipt,
} from '@sanjeevani/shared-types';

@Controller('api/v1/collections')
@UseGuards(JwtAuthGuard)
export class CollectionsController {
  constructor(private dataStore: DataStoreService) {}

  /**
   * Today's Collection Queue for Collector or Cashier (SRS §31, §32)
   */
  @Get('today')
  async getTodaysCollectionList(@CurrentUser() user: IUser) {
    await this.dataStore.refreshIfStale();
    const dueLoans = this.dataStore.loans.filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE');
    const dueAccounts = this.dataStore.accounts.filter((a) => a.status === 'ACTIVE' && a.productType === 'RD');

    const dueList = [
      ...dueLoans.map((l) => ({
        id: l.id,
        type: 'LOAN_EMI',
        customerName: l.customerName,
        customerNumber: l.customerNumber,
        referenceNumber: l.loanNumber,
        expectedAmount: l.emiAmount,
        overdueAmount: l.overdueAmount,
        dueDate: l.firstDueDate,
        status: l.overdueAmount > 0 ? 'OVERDUE' : 'DUE',
      })),
      ...dueAccounts.map((a) => ({
        id: a.id,
        type: 'RD_INSTALLMENT',
        customerName: a.customerName,
        customerNumber: a.customerNumber,
        referenceNumber: a.accountNumber,
        expectedAmount: a.principalAmount,
        overdueAmount: 0,
        dueDate: '2026-09-05',
        status: 'DUE',
      })),
    ];

    let totalExpected = 0;
    for (const item of dueList) {
      totalExpected = FinancialEngine.add(totalExpected, item.expectedAmount);
    }

    return {
      date: new Date().toISOString().split('T')[0],
      assignedCount: dueList.length,
      totalExpected,
      items: dueList,
    };
  }

  /**
   * Record Collection / Customer Payment (SRS §16, §18, §32)
   * Enforces:
   * 1. Transaction Generation (BR-012)
   * 2. Digital Receipt Generation (BR-013)
   * 3. Amortization / Account update
   * 4. Double-Entry Journal balance (BR-016)
   * 5. Cash Drawer balance update (BR-006)
   */
  @Post('record')
  async recordPayment(
    @Body()
    body: {
      customerId: string;
      loanId?: string;
      accountId?: string;
      amount: number;
      paymentMode: PaymentMode;
      referenceNumber?: string;
      remarks?: string;
    },
    @CurrentUser() user: IUser,
  ) {
    const amount = Number(body.amount);
    if (!amount || amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    const customer = this.dataStore.customers.find((c) => c.id === body.customerId);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const transactionNumber = this.dataStore.nextTransactionNumber();
    const receiptNumber = this.dataStore.nextReceiptNumber();
    const today = new Date().toISOString().split('T')[0];

    if (this.dataStore.isDateLocked(today)) {
      throw new BadRequestException(
        `Business Date Locked (BR-009): Business date ${today} is already closed and locked. Payment collections cannot be posted without reopening.`,
      );
    }

    let paymentFor = 'General Payment';
    let transactionType = TransactionType.DEPOSIT;
    let nextInst: any = undefined;

    // 1. Process Loan EMI Payment
    if (body.loanId) {
      const loan = this.dataStore.loans.find((l) => l.id === body.loanId);
      if (!loan) throw new NotFoundException('Loan record not found');

      transactionType = TransactionType.EMI_PAYMENT;
      paymentFor = `Loan EMI (${loan.loanNumber})`;

      // Update next due installment
      nextInst = this.dataStore.loanInstallments.find(
        (i) => i.loanId === loan.id && (i.status === InstallmentStatus.DUE || i.status === InstallmentStatus.UPCOMING),
      );

      if (nextInst) {
        nextInst.amountPaid = amount;
        nextInst.status = InstallmentStatus.PAID;
        nextInst.paidAt = new Date().toISOString();
      }

      // Update Loan Outstanding Principal
      const principalPortion = nextInst ? nextInst.principalDue : amount * 0.8;
      loan.outstandingPrincipal = Math.max(0, FinancialEngine.subtract(loan.outstandingPrincipal, principalPortion));
      loan.totalPaid = FinancialEngine.add(loan.totalPaid, amount);

      if (loan.outstandingPrincipal === 0) {
        loan.status = 'CLOSED';
      }
    } else if (body.accountId) {
      // 2. Process Account / RD Deposit
      const account = this.dataStore.accounts.find((a) => a.id === body.accountId);
      if (!account) throw new NotFoundException('Account not found');

      transactionType = TransactionType.INSTALLMENT;
      paymentFor = `${account.productType} Deposit (${account.accountNumber})`;
      account.currentBalance = FinancialEngine.add(account.currentBalance, amount);
    }

    // 3. Create Transaction (BR-012)
    const transaction: ITransaction = {
      id: `TXN-${Date.now()}`,
      transactionNumber,
      branchId: customer.branchId,
      branchName: customer.branchName,
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerNumber: customer.customerNumber,
      loanId: body.loanId,
      accountId: body.accountId,
      transactionType,
      amount,
      paymentMode: body.paymentMode || PaymentMode.CASH,
      transactionDate: today,
      referenceNumber: body.referenceNumber,
      status: TransactionStatus.POSTED,
      createdBy: user.id || 'USR-006',
      createdByName: user.employeeName || 'Staff',
      approvedBy: user.id,
      approvedByName: user.employeeName,
      remarks: body.remarks || `Received payment via ${body.paymentMode || 'CASH'}`,
      receiptNumber,
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
    };

    this.dataStore.transactions.unshift(transaction);
    await this.dataStore.persistTransaction(transaction);

    // 4. Create Digital Receipt (BR-013, SRS §18)
    const receipt: IReceipt = {
      id: `RCP-${Date.now()}`,
      receiptNumber,
      transactionId: transaction.id,
      transactionNumber: transaction.transactionNumber,
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerNumber: customer.customerNumber,
      amount,
      paymentMode: body.paymentMode || PaymentMode.CASH,
      paymentFor,
      collectorId: user.id || 'USR-006',
      collectorName: user.employeeName || 'Collector',
      branchName: customer.branchName || 'Head Office Agra',
      generatedAt: new Date().toISOString(),
      deliveryStatus: 'SENT',
    };

    this.dataStore.receipts.unshift(receipt);
    await this.dataStore.persistReceipt(receipt);

    if (body.loanId) {
      const l = this.dataStore.loans.find((loan) => loan.id === body.loanId);
      if (l) await this.dataStore.persistLoan(l);
      if (nextInst) await this.dataStore.persistLoanInstallment(nextInst);
    } else if (body.accountId) {
      const a = this.dataStore.accounts.find((acc) => acc.id === body.accountId);
      if (a) await this.dataStore.persistAccount(a);
    }

    // 5. Update Cash Drawer if Payment Mode is CASH (BR-006, SRS §34)
    if (body.paymentMode === PaymentMode.CASH || !body.paymentMode) {
      const drawer = this.dataStore.cashDrawers.find((d) => d.businessDate === today && d.status === 'OPEN');
      if (drawer) {
        drawer.cashReceived = FinancialEngine.add(drawer.cashReceived, amount);
        drawer.expectedClosingBalance = FinancialEngine.add(drawer.expectedClosingBalance, amount);
        await this.dataStore.persistCashDrawer(drawer);
      }
    }

    // 6. Generate Double-Entry Accounting Journal (BR-016, SRS §38)
    const journalNumber = this.dataStore.nextJournalNumber();
    const isCash = body.paymentMode === PaymentMode.CASH || !body.paymentMode;
    const debitAccount = isCash ? 'COA-1010' : 'COA-1020';

    this.dataStore.journalEntries.unshift({
      id: `JRN-${Date.now()}`,
      journalNumber,
      transactionId: transaction.id,
      businessDate: today,
      description: `Payment Receipt ${receiptNumber} from ${customer.customerNumber}`,
      totalDebit: amount,
      totalCredit: amount,
      status: 'POSTED',
      createdBy: user.id || 'USR-006',
      createdAt: new Date().toISOString(),
      lines: [
        {
          ledgerAccountId: debitAccount,
          ledgerAccountCode: isCash ? '1010' : '1020',
          ledgerAccountName: isCash ? 'Cash In Hand (Vault)' : 'Bank Operations Account',
          debitAmount: amount,
          creditAmount: 0,
          branchId: customer.branchId,
          customerId: customer.id,
        },
        {
          ledgerAccountId: body.loanId ? 'COA-1030' : 'COA-2010',
          ledgerAccountCode: body.loanId ? '1030' : '2010',
          ledgerAccountName: body.loanId ? 'Loan Principal Receivable' : 'Member RD Liability',
          debitAmount: 0,
          creditAmount: amount,
          branchId: customer.branchId,
          customerId: customer.id,
        },
      ],
    });

    // Update Chart of Account balances in real time and persist to PostgreSQL
    const debitCoa = this.dataStore.chartOfAccounts.find((c) => c.id === debitAccount || c.accountCode === (isCash ? '1010' : '1020'));
    if (debitCoa) {
      debitCoa.currentBalance = FinancialEngine.add(debitCoa.currentBalance, amount);
      await this.dataStore.persistChartOfAccount(debitCoa);
    }

    const creditAccountId = body.loanId ? 'COA-1030' : 'COA-2010';
    const creditCoa = this.dataStore.chartOfAccounts.find((c) => c.id === creditAccountId || c.accountCode === (body.loanId ? '1030' : '2010'));
    if (creditCoa) {
      if (body.loanId) {
        creditCoa.currentBalance = FinancialEngine.subtract(creditCoa.currentBalance, amount);
      } else {
        creditCoa.currentBalance = FinancialEngine.add(creditCoa.currentBalance, amount);
      }
      await this.dataStore.persistChartOfAccount(creditCoa);
    }

    this.dataStore.logAudit(
      user.id || 'USR-006',
      user.employeeName || 'Staff',
      'PAYMENT_RECORDED',
      'Transaction',
      transaction.id,
      undefined,
      { amount, receiptNumber, customer: customer.customerNumber },
      `Recorded ${paymentFor} of ₹ ${amount}`,
    );

    return {
      message: 'Payment received successfully',
      transaction,
      receipt,
    };
  }

  @Get('receipts')
  async getAllReceipts() {
    await this.dataStore.refreshIfStale();
    return this.dataStore.receipts;
  }

  @Delete('receipts/:id')
  async deleteReceipt(@Param('id') id: string, @CurrentUser() user: IUser) {
    await this.dataStore.deleteReceipt(id);
    this.dataStore.logAudit(
      user?.id || 'USR-001',
      user?.employeeName || 'Administrator',
      'RECEIPT_DELETED',
      'Receipt',
      id,
      undefined,
      { receiptId: id },
      `Voided/Deleted digital receipt ${id}`,
    );
    return { success: true, message: `Receipt ${id} deleted successfully.` };
  }
}
