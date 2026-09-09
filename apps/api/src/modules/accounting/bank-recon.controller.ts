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
import { randomBytes } from 'crypto';

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
      ledgerBalance: softwareBankBalance,
      bankStatementBalance: statementEndingBalance,
      statementBalance: statementEndingBalance,
      customerBankCollections,
      difference,
      unreconciledDifference: difference,
      isReconciled,
      matchedCount: matchedLines.length,
      unmatchedCount: unmatchedLines.length,
      summary: {
        totalStatementLines: importedStatementLines.length,
        matchedCount: matchedLines.length,
        unmatchedCount: unmatchedLines.length,
        totalDeposits: importedStatementLines.reduce((sum, l) => sum + (l.depositAmount || 0), 0),
        totalWithdrawals: importedStatementLines.reduce((sum, l) => sum + (l.withdrawalAmount || 0), 0),
      },
      statementLines: importedStatementLines,
      transactions: importedStatementLines,
    };
  }

  /**
   * IMPORT BANK STATEMENT ENTRIES (SRS §28)
   * Ingests statement rows from CSV string or pre-parsed line objects
   */
  @Post('import')
  async importBankStatement(
    @Body()
    body: {
      lines?: Array<{
        transactionDate?: string;
        valueDate?: string;
        description?: string;
        referenceNo?: string;
        withdrawalAmount?: number;
        depositAmount?: number;
        balance?: number;
      }>;
      csvContent?: string;
    },
    @CurrentUser() user: IUser,
  ) {
    let rawLines = body.lines || [];

    // Support direct CSV text payload from frontend
    if ((!rawLines || rawLines.length === 0) && body.csvContent) {
      const rows = body.csvContent.trim().split(/\r?\n/).filter(Boolean);
      const header = rows[0]?.toLowerCase() || '';
      const hasHeader = header.includes('date') || header.includes('amount') || header.includes('description');
      const dataRows = hasHeader ? rows.slice(1) : rows;

      rawLines = dataRows.map((row) => {
        const cols = row.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
        const date = cols[0] || new Date().toISOString().split('T')[0];
        const desc = cols[1] || 'Bank Transaction';
        const ref = cols[2] || '';
        const amt = parseFloat(cols[3] || '0') || 0;
        const type = (cols[4] || '').toUpperCase();
        const isDebit = type.includes('DEBIT') || type.includes('DR') || type.includes('WITHDRAW');

        return {
          transactionDate: date,
          description: desc,
          referenceNo: ref,
          withdrawalAmount: isDebit ? Math.abs(amt) : 0,
          depositAmount: !isDebit ? Math.abs(amt) : 0,
          balance: 0,
        };
      });
    }

    if (!rawLines || !Array.isArray(rawLines) || rawLines.length === 0) {
      throw new BadRequestException('Statement lines array or csvContent is required.');
    }

    const imported: IBankStatementLine[] = [];

    for (const raw of rawLines) {
      const withdrawal = Number(raw.withdrawalAmount || 0);
      const deposit = Number(raw.depositAmount || 0);
      const balance = Number(raw.balance || 0);

      if (!Number.isFinite(withdrawal) || !Number.isFinite(deposit) || !Number.isFinite(balance)) {
        throw new BadRequestException('Statement lines contain invalid non-numeric amount or balance values.');
      }

      const newLine: IBankStatementLine = {
        id: `BST-${Date.now()}-${randomBytes(4).toString('hex')}`,
        transactionDate: raw.transactionDate || new Date().toISOString().split('T')[0],
        valueDate: raw.valueDate,
        description: raw.description || 'Bank Transaction',
        referenceNo: raw.referenceNo,
        withdrawalAmount: withdrawal,
        depositAmount: deposit,
        balance,
        isMatched: false,
      };

      // Auto-match: exact reference match OR (exact amount AND same transaction date)
      const lineAmount = newLine.depositAmount || newLine.withdrawalAmount || 0;
      const matchedTxn = this.dataStore.transactions.find((t) => {
        if (newLine.referenceNo && t.referenceNumber && t.referenceNumber.toLowerCase() === newLine.referenceNo.toLowerCase()) {
          return true;
        }
        const txnAmount = Math.abs(t.amount || 0);
        if (lineAmount > 0 && Math.abs(txnAmount - lineAmount) < 0.01 && t.transactionDate === newLine.transactionDate) {
          return true;
        }
        return false;
      });

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
      statementLineId?: string;
      statementTxnId?: string;
      transactionId?: string;
      matched?: boolean;
    },
    @CurrentUser() user: IUser,
  ) {
    const lineId = body.statementLineId || body.statementTxnId;
    if (!lineId) {
      throw new BadRequestException('statementLineId or statementTxnId is required.');
    }

    const line = importedStatementLines.find((l) => l.id === lineId);
    if (!line) {
      throw new BadRequestException(`Statement line '${lineId}' not found.`);
    }

    const newMatched = body.matched !== undefined ? body.matched : !line.isMatched;

    line.isMatched = newMatched;
    line.matchedTransactionId = newMatched ? body.transactionId || 'MANUAL_MATCH' : undefined;
    line.matchedAt = newMatched ? new Date().toISOString() : undefined;
    line.matchedBy = newMatched ? user.employeeName || user.username : undefined;

    // Record both match and unmatch events in audit trail
    this.dataStore.logAudit(
      user.id,
      user.employeeName || user.username,
      newMatched ? 'BANK_STATEMENT_MATCHED' : 'BANK_STATEMENT_UNMATCHED',
      'BankReconciliation',
      line.id,
      { isMatched: !newMatched },
      { isMatched: newMatched, matchedTransactionId: line.matchedTransactionId },
      `Statement line ${line.id} ${newMatched ? 'matched' : 'unmatched'} by user`,
    );

    return {
      message: `Statement line ${line.id} ${newMatched ? 'matched' : 'unmatched'} successfully.`,
      line,
    };
  }
}
