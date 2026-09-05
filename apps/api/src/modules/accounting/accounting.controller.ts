import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FinancialEngine } from '@sanjeevani/financial-engine';
import {
  AccountClassification,
  IChartOfAccount,
  IJournalEntry,
  IUser,
} from '@sanjeevani/shared-types';

@Controller('api/v1/accounting')
@UseGuards(JwtAuthGuard)
export class AccountingController {
  constructor(private dataStore: DataStoreService) {}

  @Get('chart-of-accounts')
  async getChartOfAccounts() {
    await this.dataStore.refreshIfStale();
    return this.dataStore.chartOfAccounts;
  }

  @Post('chart-of-accounts')
  async createAccount(@Body() body: Partial<IChartOfAccount>, @CurrentUser() user: IUser) {
    if (!body.accountName || !body.accountType) {
      throw new BadRequestException('Account Name and Account Classification are required.');
    }

    const code = body.accountCode || `COA-${Math.floor(1000 + Math.random() * 9000)}`;

    const newAccount: IChartOfAccount = {
      id: code,
      accountCode: code,
      accountName: body.accountName,
      accountType: body.accountType as AccountClassification,
      parentId: body.parentId || undefined,
      currentBalance: Number(body.currentBalance) || 0,
      isActive: true,
      description: body.description || undefined,
    };

    this.dataStore.chartOfAccounts.push(newAccount);
    await this.dataStore.persistChartOfAccount(newAccount);

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Admin',
      'ACCOUNT_CREATED',
      'ChartOfAccount',
      newAccount.id,
      undefined,
      newAccount,
      `Created COA Ledger Account ${newAccount.accountName} (${newAccount.accountCode})`,
    );

    return newAccount;
  }

  @Patch('chart-of-accounts/:id')
  async updateAccount(
    @Param('id') id: string,
    @Body() body: Partial<IChartOfAccount>,
    @CurrentUser() user: IUser,
  ) {
    const accIndex = this.dataStore.chartOfAccounts.findIndex((a) => a.id === id || a.accountCode === id);
    if (accIndex === -1) {
      throw new NotFoundException(`Chart of Account not found: ${id}`);
    }

    const currentAcc = this.dataStore.chartOfAccounts[accIndex];
    const oldVal = { ...currentAcc };

    if (body.accountName) currentAcc.accountName = body.accountName;
    if (body.accountType) currentAcc.accountType = body.accountType as AccountClassification;
    if (body.description) currentAcc.description = body.description;
    if (body.isActive !== undefined) currentAcc.isActive = body.isActive;

    await this.dataStore.persistChartOfAccount(currentAcc);

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Admin',
      'ACCOUNT_UPDATED',
      'ChartOfAccount',
      currentAcc.id,
      oldVal,
      currentAcc,
      `Updated COA Ledger Account ${currentAcc.accountName} (${currentAcc.accountCode})`,
    );

    return currentAcc;
  }

  @Delete('chart-of-accounts/:id')
  async deleteAccount(@Param('id') id: string, @CurrentUser() user: IUser) {
    const accIndex = this.dataStore.chartOfAccounts.findIndex((a) => a.id === id || a.accountCode === id);
    if (accIndex === -1) {
      throw new NotFoundException(`Chart of Account not found: ${id}`);
    }

    const removed = this.dataStore.chartOfAccounts.splice(accIndex, 1)[0];
    await this.dataStore.deleteChartOfAccount(removed.id);

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Admin',
      'ACCOUNT_DELETED',
      'ChartOfAccount',
      removed.id,
      removed,
      undefined,
      `Deleted COA Ledger Account ${removed.accountName} (${removed.accountCode})`,
    );

    return { message: `Ledger account ${removed.accountName} removed successfully.`, id: removed.id };
  }

  @Get('journals')
  async getJournalEntries() {
    await this.dataStore.refreshIfStale();
    return this.dataStore.journalEntries;
  }

  /**
   * Post Manual or Adjustment Journal Entry (SRS §40, §41, BR-016)
   * Strictly enforces SUM(DEBIT) === SUM(CREDIT)
   */
  @Post('journals')
  async createJournalEntry(
    @Body()
    body: {
      description: string;
      businessDate?: string;
      lines: {
        ledgerAccountId: string;
        debitAmount: number;
        creditAmount: number;
        branchId?: string;
      }[];
    },
    @CurrentUser() user: IUser,
  ) {
    if (!body.lines || body.lines.length < 2) {
      throw new BadRequestException('A valid double-entry journal requires at least 2 line items.');
    }

    const targetDate = body.businessDate || new Date().toISOString().split('T')[0];
    if (this.dataStore.isDateLocked(targetDate)) {
      throw new BadRequestException(
        `Business Date Locked (BR-009): Business date ${targetDate} is already closed and locked. Manual adjustments cannot be posted without reopening.`,
      );
    }

    // Double-Entry Balance Validator (SRS §41, BR-016)
    const balanceCheck = FinancialEngine.validateJournalBalance(body.lines);
    if (!balanceCheck.isValid) {
      throw new BadRequestException(
        `Unbalanced Journal Entry (BR-016): Total Debits (₹ ${balanceCheck.totalDebit}) do not equal Total Credits (₹ ${balanceCheck.totalCredit}). Difference: ₹ ${balanceCheck.difference}. Transaction rejected.`,
      );
    }

    const journalNumber = this.dataStore.nextJournalNumber();
    const formattedLines = body.lines.map((line) => {
      const coa = this.dataStore.chartOfAccounts.find((c) => c.id === line.ledgerAccountId || c.accountCode === line.ledgerAccountId);
      return {
        ledgerAccountId: coa?.id || line.ledgerAccountId,
        ledgerAccountCode: coa?.accountCode,
        ledgerAccountName: coa?.accountName,
        debitAmount: Number(line.debitAmount) || 0,
        creditAmount: Number(line.creditAmount) || 0,
        branchId: line.branchId || user.branchId || 'BR-001',
      };
    });

    const newJournal: IJournalEntry = {
      id: `JRN-${Date.now()}`,
      journalNumber,
      businessDate: body.businessDate || new Date().toISOString().split('T')[0],
      description: body.description || 'Manual Journal Adjustment',
      totalDebit: balanceCheck.totalDebit,
      totalCredit: balanceCheck.totalCredit,
      status: 'POSTED',
      createdBy: user.id || 'USR-005',
      approvedBy: user.id,
      createdAt: new Date().toISOString(),
      lines: formattedLines,
    };

    this.dataStore.journalEntries.unshift(newJournal);

    // Update Chart of Account balances (BR-016) and persist to database
    for (const line of formattedLines) {
      const coa = this.dataStore.chartOfAccounts.find(
        (c) => c.id === line.ledgerAccountId || c.accountCode === line.ledgerAccountCode,
      );
      if (coa) {
        const isDebitNature =
          coa.accountType === AccountClassification.ASSET ||
          coa.accountType === AccountClassification.EXPENSE;
        if (isDebitNature) {
          coa.currentBalance = FinancialEngine.subtract(
            FinancialEngine.add(coa.currentBalance, line.debitAmount),
            line.creditAmount,
          );
        } else {
          coa.currentBalance = FinancialEngine.subtract(
            FinancialEngine.add(coa.currentBalance, line.creditAmount),
            line.debitAmount,
          );
        }
        await this.dataStore.persistChartOfAccount(coa);
      }
    }

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Accountant',
      'JOURNAL_POSTED',
      'JournalEntry',
      newJournal.id,
      undefined,
      newJournal,
      `Posted Journal ${journalNumber} for ₹ ${balanceCheck.totalDebit}`,
    );

    await this.dataStore.persistJournalEntry(newJournal);

    return newJournal;
  }

  @Delete('journals/:id')
  async deleteJournalEntry(@Param('id') id: string, @CurrentUser() user: IUser) {
    const idx = this.dataStore.journalEntries.findIndex((j) => j.id === id || j.journalNumber === id);
    if (idx === -1) {
      throw new NotFoundException(`Journal entry not found: ${id}`);
    }

    const removed = this.dataStore.journalEntries.splice(idx, 1)[0];
    await this.dataStore.deleteJournalEntry(removed.id);

    // Reverse the debit/credit effects on Chart of Accounts balances (BR-016)
    if (Array.isArray(removed.lines)) {
      for (const line of removed.lines) {
        const coa = this.dataStore.chartOfAccounts.find(
          (c) => c.id === line.ledgerAccountId || c.accountCode === line.ledgerAccountCode,
        );
        if (coa) {
          const isDebitNature =
            coa.accountType === AccountClassification.ASSET ||
            coa.accountType === AccountClassification.EXPENSE;
          if (isDebitNature) {
            coa.currentBalance = FinancialEngine.add(
              FinancialEngine.subtract(coa.currentBalance, line.debitAmount || 0),
              line.creditAmount || 0,
            );
          } else {
            coa.currentBalance = FinancialEngine.add(
              FinancialEngine.subtract(coa.currentBalance, line.creditAmount || 0),
              line.debitAmount || 0,
            );
          }
          await this.dataStore.persistChartOfAccount(coa);
        }
      }
    }

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Accountant',
      'JOURNAL_DELETED',
      'JournalEntry',
      removed.id,
      removed,
      undefined,
      `Deleted Journal Entry ${removed.journalNumber}`,
    );

    return { message: `Journal entry ${removed.journalNumber} removed successfully.`, id: removed.id };
  }

  /**
   * Trial Balance Report (SRS §68)
   */
  @Get('trial-balance')
  async getTrialBalance() {
    await this.dataStore.refreshIfStale();
    const items = this.dataStore.chartOfAccounts.map((account) => {
      const isDebitNature =
        account.accountType === AccountClassification.ASSET ||
        account.accountType === AccountClassification.EXPENSE;

      return {
        code: account.accountCode,
        name: account.accountName,
        type: account.accountType,
        debit: isDebitNature ? account.currentBalance : 0,
        credit: !isDebitNature ? account.currentBalance : 0,
      };
    });

    let totalDebit = 0;
    let totalCredit = 0;
    for (const item of items) {
      totalDebit = FinancialEngine.add(totalDebit, item.debit);
      totalCredit = FinancialEngine.add(totalCredit, item.credit);
    }

    return {
      date: new Date().toISOString().split('T')[0],
      isBalanced: totalDebit === totalCredit,
      totalDebit,
      totalCredit,
      items,
    };
  }

  /**
   * Profit & Loss Statement (SRS §68)
   */
  @Get('profit-loss')
  async getProfitAndLoss() {
    await this.dataStore.refreshIfStale();
    const incomeAccounts = this.dataStore.chartOfAccounts.filter((a) => a.accountType === AccountClassification.INCOME);
    const expenseAccounts = this.dataStore.chartOfAccounts.filter((a) => a.accountType === AccountClassification.EXPENSE);

    let totalIncome = 0;
    for (const a of incomeAccounts) {
      totalIncome = FinancialEngine.add(totalIncome, a.currentBalance);
    }

    let totalExpense = 0;
    for (const a of expenseAccounts) {
      totalExpense = FinancialEngine.add(totalExpense, a.currentBalance);
    }

    const netProfit = FinancialEngine.subtract(totalIncome, totalExpense);

    return {
      period: 'FY 2026-2027',
      totalIncome,
      totalExpense,
      netProfit,
      incomeBreakdown: incomeAccounts,
      expenseBreakdown: expenseAccounts,
    };
  }

  /**
   * Balance Sheet (SRS §68)
   */
  @Get('balance-sheet')
  async getBalanceSheet() {
    await this.dataStore.refreshIfStale();
    const assets = this.dataStore.chartOfAccounts.filter((a) => a.accountType === AccountClassification.ASSET);
    const liabilities = this.dataStore.chartOfAccounts.filter((a) => a.accountType === AccountClassification.LIABILITY);
    const equity = this.dataStore.chartOfAccounts.filter((a) => a.accountType === AccountClassification.EQUITY);

    let totalAssets = 0;
    for (const a of assets) totalAssets = FinancialEngine.add(totalAssets, a.currentBalance);

    let totalLiabilities = 0;
    for (const l of liabilities) totalLiabilities = FinancialEngine.add(totalLiabilities, l.currentBalance);

    let totalEquity = 0;
    for (const e of equity) totalEquity = FinancialEngine.add(totalEquity, e.currentBalance);

    return {
      asOfDate: new Date().toISOString().split('T')[0],
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalLiabilitiesAndEquity: FinancialEngine.add(totalLiabilities, totalEquity),
      assets,
      liabilities,
      equity,
    };
  }
}
