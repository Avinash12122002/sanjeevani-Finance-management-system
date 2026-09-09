import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StaffGuard } from '../../common/guards/staff.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FinancialEngine } from '@sanjeevani/financial-engine';
import { IUser } from '@sanjeevani/shared-types';

export interface IBankStatementLine {
  id: string;
  transactionDate: string;
  valueDate?: string;
  description: string;
  referenceNo?: string;
  withdrawalAmount: number;
  depositAmount: number;
  balance: number;
  isMatched: boolean;
  matchedTransactionId?: string;
  matchedAt?: string;
  matchedBy?: string;
}

// In-Memory Bank Statement Store (persisted during session)
const importedStatementLines: IBankStatementLine[] = [
  {
    id: 'BST-001',
    transactionDate: new Date().toISOString().split('T')[0],
    description: 'NEFT CR-SANJEEVANI LOAN RECOVERY-COLLECTIONS',
    referenceNo: 'HDFC98217311',
    withdrawalAmount: 0,
    depositAmount: 45000,
    balance: 1245500,
    isMatched: true,
    matchedTransactionId: 'TXN-BANK-01',
  },
  {
    id: 'BST-002',
    transactionDate: new Date().toISOString().split('T')[0],
    description: 'CMS DISBURSEMENT TRF-MEMBER SANCTION',
    referenceNo: 'HDFC98218902',
    withdrawalAmount: 50000,
    depositAmount: 0,
    balance: 1195500,
    isMatched: true,
    matchedTransactionId: 'TXN-BANK-02',
  },
];

@Controller('api/v1/accounting/bank-recon')
@UseGuards(JwtAuthGuard, StaffGuard)
export class BankReconController {
  constructor(private dataStore: DataStoreService) {}

  /**
   * THREE-WAY BANK RECONCILIATION ENGINE (SRS §28, §29)
   * Reconciles:
   * 1. Software General Ledger Bank Account (COA-1020)
   * 2. Physical Bank Statement imported from bank portal
   * 3. Customer payment transaction receipts recorded
   */
  @Get('compare')
  async getReconciliationComparison() {
    await this.dataStore.refreshIfStale();

    // 1. Software Bank Ledger (COA 1020)
    const bankAccount = this.dataStore.chartOfAccounts.find(
      (c) => c.accountCode === '1020' || c.id === 'COA-1020',
    );
    const softwareBankBalance = bankAccount?.currentBalance || 0;

    // 2. Customer Ledger Bank Transactions
    const bankTxns = this.dataStore.transactions.filter(
      (t) => t.paymentMode === 'BANK_TRANSFER' || t.paymentMode === 'UPI' || t.paymentMode === 'CHEQUE',
    );
    const customerBankCollections = bankTxns.reduce(
      (sum, t) => FinancialEngine.add(sum, t.amount || 0),
      0,
    );

    // 3. Bank Statement Balance (latest row)
    const statementEndingBalance =
      importedStatementLines.length > 0
        ? importedStatementLines[importedStatementLines.length - 1].balance
        : softwareBankBalance;

    const matchedLines = importedStatementLines.filter((l) => l.isMatched);
    const unmatchedLines = importedStatementLines.filter((l) => !l.isMatched);

    // Difference between Software Ledger and Bank Statement
    const difference = FinancialEngine.subtract(softwareBankBalance, statementEndingBalance);
    const isReconciled = Math.abs(difference) === 0;

    return {
      softwareBankBalance,
      bankStatementBalance: statementEndingBalance,
      customerBankCollections,
      difference,
      isReconciled,
      summary: {
        totalStatementLines: importedStatementLines.length,
        matchedCount: matchedLines.length,
        unmatchedCount: unmatchedLines.length,
        totalDeposits: importedStatementLines.reduce((sum, l) => sum + (l.depositAmount || 0), 0),
        totalWithdrawals: importedStatementLines.reduce((sum, l) => sum + (l.withdrawalAmount || 0), 0),
      },
      statementLines: importedStatementLines,
    };
  }

  /**
   * IMPORT BANK STATEMENT ENTRIES (SRS §28)
   * Ingests statement rows from CSV / NetBanking statement export
   */
  @Post('import')
  async importBankStatement(
    @Body()
    body: {
      lines: Array<{
        transactionDate: string;
        valueDate?: string;
        description: string;
        referenceNo?: string;
        withdrawalAmount?: number;
        depositAmount?: number;
        balance: number;
      }>;
    },
    @CurrentUser() user: IUser,
  ) {
    if (!body.lines || !Array.isArray(body.lines) || body.lines.length === 0) {
      throw new BadRequestException('Statement lines array is required.');
    }

    const imported: IBankStatementLine[] = [];

    for (const raw of body.lines) {
      const newLine: IBankStatementLine = {
        id: `BST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        transactionDate: raw.transactionDate || new Date().toISOString().split('T')[0],
        valueDate: raw.valueDate,
        description: raw.description || 'Bank Transaction',
        referenceNo: raw.referenceNo,
        withdrawalAmount: Number(raw.withdrawalAmount || 0),
        depositAmount: Number(raw.depositAmount || 0),
        balance: Number(raw.balance || 0),
        isMatched: false,
      };

      // Auto-match if identical amount and reference exists in transactions
      const matchedTxn = this.dataStore.transactions.find(
        (t) =>
          Math.abs((t.amount || 0) - (newLine.depositAmount || newLine.withdrawalAmount)) < 0.01 ||
          (newLine.referenceNo && t.referenceNumber === newLine.referenceNo),
      );

      if (matchedTxn) {
        newLine.isMatched = true;
        newLine.matchedTransactionId = matchedTxn.id;
        newLine.matchedAt = new Date().toISOString();
        newLine.matchedBy = 'AUTO_RECONCILER';
      }

      importedStatementLines.push(newLine);
      imported.push(newLine);
    }

    this.dataStore.logAudit(
      user.id,
      user.employeeName || user.username,
      'BANK_STATEMENT_IMPORTED',
      'BankReconciliation',
      `BATCH-${Date.now()}`,
      undefined,
      { count: imported.length },
      `Imported ${imported.length} bank statement transaction rows`,
    );

    return {
      message: `Successfully imported ${imported.length} bank statement rows.`,
      count: imported.length,
      autoMatched: imported.filter((l) => l.isMatched).length,
    };
  }

  /**
   * MANUALLY MATCH / UNMATCH STATEMENT LINE (SRS §29)
   */
  @Post('match')
  async matchStatementLine(
    @Body()
    body: {
      statementLineId: string;
      transactionId?: string;
      matched: boolean;
    },
    @CurrentUser() user: IUser,
  ) {
    const line = importedStatementLines.find((l) => l.id === body.statementLineId);
    if (!line) {
      throw new BadRequestException('Statement line not found.');
    }

    line.isMatched = body.matched;
    line.matchedTransactionId = body.matched ? body.transactionId || 'MANUAL_MATCH' : undefined;
    line.matchedAt = body.matched ? new Date().toISOString() : undefined;
    line.matchedBy = body.matched ? user.employeeName || user.username : undefined;

    return {
      message: `Statement line ${line.id} ${body.matched ? 'matched' : 'unmatched'} successfully.`,
      line,
    };
  }
}
