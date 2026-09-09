import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
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
  UserRole,
  TransactionType,
  AccountStatus,
} from '@sanjeevani/shared-types';

import { StaffGuard } from '../../common/guards/staff.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('api/v1/accounting')
@UseGuards(JwtAuthGuard, StaffGuard, RolesGuard)
export class AccountingController {
  constructor(private dataStore: DataStoreService) {}

  @Get('chart-of-accounts')
  async getChartOfAccounts() {
    await this.dataStore.refreshIfStale();
    return this.dataStore.chartOfAccounts;
  }

  @Post('chart-of-accounts')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GENERAL_MANAGER, UserRole.ACCOUNTANT)
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.GENERAL_MANAGER, UserRole.ACCOUNTANT)
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
  @Roles(UserRole.SUPER_ADMIN)
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.GENERAL_MANAGER, UserRole.ACCOUNTANT)
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

  /**
   * CONTRA-REVERSAL CORRECTION (SRS §22)
   * Enforces rule: "Employee kuch delete na kar sake. Correction = reversal + new transaction, not silent deletion."
   */
  @Post('journals/:id/reverse')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GENERAL_MANAGER, UserRole.ACCOUNTANT)
  async reverseJournalEntry(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @CurrentUser() user: IUser,
  ) {
    if (!body.reason || body.reason.trim().length < 10) {
      throw new BadRequestException('A mandatory audit reason (minimum 10 characters) is required to reverse a journal entry.');
    }

    const original = this.dataStore.journalEntries.find((j) => j.id === id || j.journalNumber === id);
    if (!original) {
      throw new NotFoundException(`Journal entry not found: ${id}`);
    }

    if (original.status === 'REVERSED') {
      throw new BadRequestException(`Journal entry ${original.journalNumber} has already been reversed.`);
    }

    const today = new Date().toISOString().split('T')[0];
    const contraJournalNumber = this.dataStore.nextJournalNumber();
    const contraJournalId = `JRN-REV-${Date.now()}`;

    // Create inverted lines: Debits become Credits, Credits become Debits
    const contraLines = original.lines.map((line, idx) => ({
      id: `JRNL-${contraJournalId}-${idx + 1}`,
      journalEntryId: contraJournalId,
      ledgerAccountId: line.ledgerAccountId,
      ledgerAccountCode: line.ledgerAccountCode,
      ledgerAccountName: line.ledgerAccountName,
      debitAmount: line.creditAmount, // Inverted
      creditAmount: line.debitAmount, // Inverted
      branchId: line.branchId,
      customerId: line.customerId,
    }));

    const contraJournal: IJournalEntry = {
      id: contraJournalId,
      journalNumber: contraJournalNumber,
      businessDate: today,
      description: `CONTRA-REVERSAL for ${original.journalNumber}: ${body.reason}`,
      totalDebit: original.totalCredit,
      totalCredit: original.totalDebit,
      status: 'POSTED',
      createdBy: user.id || 'USR-001',
      approvedBy: user.id,
      createdAt: new Date().toISOString(),
      lines: contraLines,
    };

    // Apply reversal effects to Chart of Accounts balances
    for (const line of contraLines) {
      const coa = this.dataStore.chartOfAccounts.find(
        (c) => c.id === line.ledgerAccountId || c.accountCode === line.ledgerAccountCode,
      );
      if (coa) {
        const isDebitNature =
          coa.accountType === AccountClassification.ASSET ||
          coa.accountType === AccountClassification.EXPENSE;
        if (isDebitNature) {
          coa.currentBalance = FinancialEngine.subtract(
            FinancialEngine.add(coa.currentBalance, line.debitAmount || 0),
            line.creditAmount || 0,
          );
        } else {
          coa.currentBalance = FinancialEngine.subtract(
            FinancialEngine.add(coa.currentBalance, line.creditAmount || 0),
            line.debitAmount || 0,
          );
        }
        await this.dataStore.persistChartOfAccount(coa);
      }
    }

    // Mark original as REVERSED
    original.status = 'REVERSED';
    await this.dataStore.persistJournalEntry(original);

    // Save contra journal
    this.dataStore.journalEntries.unshift(contraJournal);
    await this.dataStore.persistJournalEntry(contraJournal);

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Accountant',
      'JOURNAL_CONTRA_REVERSED',
      'JournalEntry',
      original.id,
      original,
      contraJournal,
      `Posted contra-reversal ${contraJournal.journalNumber} for ${original.journalNumber}. Reason: ${body.reason}`,
    );

    return {
      message: `Journal entry ${original.journalNumber} reversed successfully via contra-entry ${contraJournal.journalNumber}.`,
      originalJournal: original,
      contraJournal,
    };
  }

  @Delete('journals/:id')
  @Roles(UserRole.SUPER_ADMIN)
  async deleteJournalEntry(@Param('id') id: string, @CurrentUser() user: IUser) {
    if (!user.roles.includes(UserRole.SUPER_ADMIN)) {
      throw new ForbiddenException(
        'Deletion Restricted (SRS §22): Silent deletion is not permitted. Please use POST /accounting/journals/:id/reverse to post a formal contra-reversal.',
      );
    }

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
   * Three-Way Daily Reconciliation Engine (SRS §29)
   * 1. Customer Sub-Ledgers vs
   * 2. Physical Cash & Bank Books vs
   * 3. General Ledger (Chart of Accounts)
   */
  @Get('three-way-reconciliation')
  async getThreeWayReconciliation() {
    await this.dataStore.refreshIfStale();

    const today = new Date().toISOString().split('T')[0];

    // Pillar 1: Customer Sub-Ledgers
    const activeAccounts = this.dataStore.accounts.filter((a) => a.status === AccountStatus.ACTIVE);
    const totalMemberDeposits = activeAccounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);

    const activeLoans = this.dataStore.loans.filter(
      (l) => (l.status as string) === 'ACTIVE' || (l.status as string) === 'DISBURSED',
    );
    const totalCustomerLoanOutstanding = activeLoans.reduce(
      (sum, l) => sum + (l.outstandingPrincipal || 0),
      0,
    );

    // Pillar 2: Physical Cash & Bank Actuals
    const todayDrawer = this.dataStore.cashDrawers.find(
      (d) => d.businessDate === today && d.status === 'OPEN',
    );
    const physicalCash = todayDrawer
      ? todayDrawer.physicalClosingBalance || todayDrawer.expectedClosingBalance || 0
      : 0;

    const bankCoa = this.dataStore.chartOfAccounts.find(
      (c) => c.id === 'COA-1020' || c.accountCode === '1020',
    );
    const physicalBank = bankCoa?.currentBalance || 0;

    // Pillar 3: General Ledger (Chart of Accounts)
    const cashCoa = this.dataStore.chartOfAccounts.find(
      (c) => c.id === 'COA-1010' || c.accountCode === '1010',
    );
    const loanReceivableCoa = this.dataStore.chartOfAccounts.find(
      (c) => c.id === 'COA-1030' || c.accountCode === '1030',
    );
    const rdDepositCoa = this.dataStore.chartOfAccounts.find(
      (c) => c.id === 'COA-2010' || c.accountCode === '2010',
    );
    const savingsDepositCoa = this.dataStore.chartOfAccounts.find(
      (c) => c.id === 'COA-2020' || c.accountCode === '2020',
    );

    const glCashBalance = cashCoa?.currentBalance || 0;
    const glBankBalance = bankCoa?.currentBalance || 0;
    const glLoanReceivable = loanReceivableCoa?.currentBalance || 0;
    const glDepositLiabilities =
      (rdDepositCoa?.currentBalance || 0) + (savingsDepositCoa?.currentBalance || 0);

    // Variances
    const cashVariance = Math.abs(physicalCash - glCashBalance);
    const depositVariance = Math.abs(totalMemberDeposits - glDepositLiabilities);
    const loanVariance = Math.abs(totalCustomerLoanOutstanding - glLoanReceivable);

    const isReconciled = cashVariance === 0 && depositVariance === 0 && loanVariance === 0;

    return {
      reportTitle: 'SANJEEVANI THREE-WAY DAILY RECONCILIATION',
      businessDate: today,
      generatedAt: new Date().toISOString(),
      isFullyReconciled: isReconciled,
      reconciliationStatus: isReconciled ? 'MATCHED_BALANCED' : 'DISCREPANCY_DETECTED',
      pillar1_CustomerLedgers: {
        totalMemberDeposits,
        totalCustomerLoansOutstanding: totalCustomerLoanOutstanding,
        activeAccountsCount: activeAccounts.length,
        activeLoansCount: activeLoans.length,
      },
      pillar2_PhysicalCashAndBank: {
        physicalCashInHand: physicalCash,
        bankBalance: physicalBank,
        activeDrawerFound: !!todayDrawer,
      },
      pillar3_GeneralLedger: {
        glCashInHand: glCashBalance,
        glBankAccount: glBankBalance,
        glLoanReceivable,
        glDepositLiabilities,
      },
      variances: {
        cashVariance,
        depositVariance,
        loanVariance,
        cashMatched: cashVariance === 0,
        depositsMatched: depositVariance === 0,
        loansMatched: loanVariance === 0,
      },
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

  /**
   * Bank Statement Reconciliation Matching Engine (SRS §28, §29)
   */
  @Post('bank-reconciliation/match')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GENERAL_MANAGER, UserRole.ACCOUNTANT)
  async matchBankStatement(
    @Body()
    body: {
      statementRows: Array<{
        id?: string;
        date: string;
        narration: string;
        referenceNo?: string;
        withdrawal?: number;
        deposit?: number;
        balance?: number;
      }>;
    },
  ) {
    await this.dataStore.refreshIfStale();

    const bankCoa = this.dataStore.chartOfAccounts.find(
      (c) => c.accountCode === '1020' || c.id === 'COA-1020',
    );
    const softwareBalance = bankCoa?.currentBalance || 0;

    const softwareBankTxns = this.dataStore.transactions
      .filter((t) => t.paymentMode !== 'CASH' || (t as any).debitAccountId === 'COA-1020' || (t as any).creditAccountId === 'COA-1020')
      .map((t) => ({
        id: t.id,
        date: (t.transactionDate || t.createdAt || '').split('T')[0],
        narration: t.remarks || (t as any).description || `Transaction ${t.transactionNumber || t.id}`,
        referenceNo: t.transactionNumber || t.referenceNumber || '',
        amount: t.amount,
        type: (t as any).debitAccountId === 'COA-1020' || t.transactionType === TransactionType.DEPOSIT || t.transactionType === TransactionType.EMI_PAYMENT || t.transactionType === TransactionType.INSTALLMENT ? 'DEPOSIT' : 'WITHDRAWAL',
        isMatched: false,
      }));

    const rows = body.statementRows || [];
    let matchedCount = 0;
    let unrecordedTotal = 0;

    const processedStatementRows = rows.map((row, idx) => {
      const withdrawal = Number(row.withdrawal) || 0;
      const deposit = Number(row.deposit) || 0;
      const amount = deposit > 0 ? deposit : withdrawal;
      const type = deposit > 0 ? 'DEPOSIT' : 'WITHDRAWAL';

      // Find matching transaction by reference or exact amount & close date
      const match = softwareBankTxns.find((st) => {
        if (st.isMatched) return false;
        if (st.type !== type) return false;

        if (row.referenceNo && st.referenceNo && st.referenceNo.toLowerCase().includes(row.referenceNo.toLowerCase())) {
          return true;
        }

        // Check amount match
        if (Math.abs(st.amount - amount) < 0.01) {
          if (!row.date || !st.date) return true;
          const diffDays = Math.abs(new Date(row.date).getTime() - new Date(st.date).getTime()) / (1000 * 60 * 60 * 24);
          return diffDays <= 7;
        }
        return false;
      });

      if (match) {
        match.isMatched = true;
        matchedCount++;
        return {
          ...row,
          id: row.id || `STMT-${idx + 1}`,
          amount,
          type,
          status: 'MATCHED',
          matchedSoftwareTxnId: match.id,
          matchedReference: match.referenceNo,
        };
      } else {
        unrecordedTotal += amount;
        return {
          ...row,
          id: row.id || `STMT-${idx + 1}`,
          amount,
          type,
          status: 'UNRECORDED_IN_BOOKS',
        };
      }
    });

    const unpresentedSoftwareTxns = softwareBankTxns
      .filter((st) => !st.isMatched)
      .map((st) => ({
        id: st.id,
        date: st.date,
        narration: st.narration,
        referenceNo: st.referenceNo,
        amount: st.amount,
        type: st.type,
        status: 'UNPRESENTED_IN_BANK',
      }));

    const unpresentedTotal = unpresentedSoftwareTxns.reduce((acc, curr) => acc + curr.amount, 0);
    const lastRow = rows[rows.length - 1];
    const statementEndingBalance = lastRow?.balance !== undefined ? Number(lastRow.balance) : softwareBalance;
    const variance = Math.round((softwareBalance - statementEndingBalance) * 100) / 100;

    return {
      softwareBalance,
      statementEndingBalance,
      variance,
      matchedCount,
      unrecordedCount: processedStatementRows.filter((r) => r.status === 'UNRECORDED_IN_BOOKS').length,
      unpresentedCount: unpresentedSoftwareTxns.length,
      unrecordedTotal,
      unpresentedTotal,
      statementRows: processedStatementRows,
      unpresentedSoftwareTxns,
    };
  }

  /**
   * Book missing bank entry (e.g. Bank SMS Charge / Interest) into software ledger
   */
  @Post('bank-reconciliation/create-adjustment')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GENERAL_MANAGER, UserRole.ACCOUNTANT)
  async createBankAdjustment(
    @Body()
    body: {
      type: 'BANK_CHARGE' | 'INTEREST_CREDIT' | 'DIRECT_DEPOSIT' | 'DIRECT_DEBIT';
      amount: number;
      narration: string;
      referenceNo?: string;
    },
    @CurrentUser() user: IUser,
  ) {
    const amount = Number(body.amount);
    if (!amount || amount <= 0) {
      throw new BadRequestException('Valid adjustment amount is required.');
    }

    const bankCoa = this.dataStore.chartOfAccounts.find(
      (c) => c.accountCode === '1020' || c.id === 'COA-1020',
    );
    if (!bankCoa) throw new NotFoundException('Bank account COA-1020 not found.');

    let offsetCoaCode = '5030';
    let isBankDebit = false;

    if (body.type === 'INTEREST_CREDIT') {
      offsetCoaCode = '4010';
      isBankDebit = true;
    } else if (body.type === 'BANK_CHARGE') {
      offsetCoaCode = '5030';
      isBankDebit = false;
    } else if (body.type === 'DIRECT_DEPOSIT') {
      offsetCoaCode = '2010';
      isBankDebit = true;
    } else {
      offsetCoaCode = '5030';
      isBankDebit = false;
    }

    const offsetCoa = this.dataStore.chartOfAccounts.find(
      (c) => c.accountCode === offsetCoaCode || c.id === `COA-${offsetCoaCode}`,
    );

    if (isBankDebit) {
      bankCoa.currentBalance = (bankCoa.currentBalance || 0) + amount;
      if (offsetCoa) offsetCoa.currentBalance = (offsetCoa.currentBalance || 0) + amount;
    } else {
      bankCoa.currentBalance = Math.max(0, (bankCoa.currentBalance || 0) - amount);
      if (offsetCoa) offsetCoa.currentBalance = (offsetCoa.currentBalance || 0) + amount;
    }

    await this.dataStore.persistChartOfAccount(bankCoa);
    if (offsetCoa) await this.dataStore.persistChartOfAccount(offsetCoa);

    this.dataStore.logAudit(
      user.id || 'USR-001',
      user.employeeName || 'Staff',
      'BANK_RECONCILIATION_ADJUSTMENT',
      'ChartOfAccount',
      bankCoa.id,
      undefined,
      { type: body.type, amount, narration: body.narration },
      `Bank adjustment booked: ${body.type} of ₹${amount} (${body.narration})`,
    );

    return {
      message: `Adjustment of ₹${amount} posted successfully.`,
      updatedBankBalance: bankCoa.currentBalance,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // MIS & REGULATORY REPORTS (SRS §30, §52)
  // ─────────────────────────────────────────────────────────────

  /**
   * Monthly MIS Report (SRS §30)
   * Full monthly metrics: Member movement, Deposits, Loans, Overdue, P&L, Cash & Bank
   */
  @Get('reports/monthly-mis')
  async getMonthlyMisReport(@Query('month') queryMonth?: string) {
    await this.dataStore.refreshIfStale();

    const now = new Date();
    const targetMonth =
      queryMonth ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [yearStr, monthStr] = targetMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const monthStart = `${targetMonth}-01`;
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const monthEnd = `${targetMonth}-${String(lastDayOfMonth).padStart(2, '0')}`;

    // 1. Member Movement
    const allCustomers = this.dataStore.customers;
    const openingMembers = allCustomers.filter((c) => {
      const jd = c.joiningDate || c.createdAt?.split('T')[0] || '';
      return jd < monthStart;
    }).length;
    const newMembers = allCustomers.filter((c) => {
      const jd = c.joiningDate || c.createdAt?.split('T')[0] || '';
      return jd >= monthStart && jd <= monthEnd;
    }).length;
    const closedMembers = allCustomers.filter(
      (c) => c.status === ('CLOSED' as any) || c.status === ('INACTIVE' as any),
    ).length;
    const closingMembers = openingMembers + newMembers - closedMembers;

    // 2. Deposits & Savings
    const allAccounts = this.dataStore.accounts;
    const activeAccounts = allAccounts.filter((a) => a.status === AccountStatus.ACTIVE);
    const totalDepositBalance = activeAccounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);

    const monthTxns = this.dataStore.transactions.filter(
      (t) => t.transactionDate >= monthStart && t.transactionDate <= monthEnd,
    );
    const depositCollections = monthTxns
      .filter((t) => t.transactionType === TransactionType.DEPOSIT)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const depositWithdrawals = monthTxns
      .filter((t) => t.transactionType === TransactionType.WITHDRAWAL)
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // 3. Loans Portfolio
    const allLoans = this.dataStore.loans;
    const activeLoans = allLoans.filter(
      (l) => (l.status as string) === 'ACTIVE' || (l.status as string) === 'DISBURSED',
    );
    const totalLoanOutstanding = activeLoans.reduce(
      (sum, l) => sum + (l.outstandingPrincipal || 0),
      0,
    );
    const newDisbursements = allLoans
      .filter((l) => l.disbursementDate >= monthStart && l.disbursementDate <= monthEnd)
      .reduce((sum, l) => sum + (l.principal || 0), 0);
    const principalRecovered = monthTxns
      .filter((t) => t.transactionType === TransactionType.EMI_PAYMENT)
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // 4. Overdue Portfolio (PAR Buckets)
    const overdueLoans = activeLoans.filter((l) => (l.overdueAmount || 0) > 0);
    const totalOverdue = overdueLoans.reduce((sum, l) => sum + (l.overdueAmount || 0), 0);
    const bucket0_30 = overdueLoans.filter((l) => (l.daysPastDue || 0) <= 30);
    const bucket31_60 = overdueLoans.filter(
      (l) => (l.daysPastDue || 0) > 30 && (l.daysPastDue || 0) <= 60,
    );
    const bucket61_90 = overdueLoans.filter(
      (l) => (l.daysPastDue || 0) > 60 && (l.daysPastDue || 0) <= 90,
    );
    const bucket90Plus = overdueLoans.filter((l) => (l.daysPastDue || 0) > 90);

    // 5. Finance (Income vs Expense)
    const incomeCoas = this.dataStore.chartOfAccounts.filter(
      (c) => c.accountType === AccountClassification.INCOME,
    );
    const expenseCoas = this.dataStore.chartOfAccounts.filter(
      (c) => c.accountType === AccountClassification.EXPENSE,
    );
    const totalIncome = incomeCoas.reduce((s, c) => s + (c.currentBalance || 0), 0);
    const totalExpense = expenseCoas.reduce((s, c) => s + (c.currentBalance || 0), 0);
    const netSurplus = totalIncome - totalExpense;

    // 6. Cash & Bank
    const cashCoa = this.dataStore.chartOfAccounts.find(
      (c) => c.id === 'COA-1010' || c.accountCode === '1010',
    );
    const bankCoa = this.dataStore.chartOfAccounts.find(
      (c) => c.id === 'COA-1020' || c.accountCode === '1020',
    );

    return {
      reportName: 'SANJEEVANI MONTHLY MIS REPORT',
      month: targetMonth,
      generatedAt: new Date().toISOString(),
      customerMetrics: {
        openingMembers: Math.max(0, openingMembers),
        newMembers,
        closedMembers,
        closingMembers: Math.max(0, closingMembers),
      },
      depositMetrics: {
        totalDepositBalance,
        newCollectionsThisMonth: depositCollections,
        withdrawalsThisMonth: depositWithdrawals,
        activeAccountsCount: activeAccounts.length,
      },
      loanMetrics: {
        totalOutstanding: totalLoanOutstanding,
        newDisbursementsThisMonth: newDisbursements,
        principalRecoveredThisMonth: principalRecovered,
        activeLoansCount: activeLoans.length,
      },
      overdueMetrics: {
        totalOverdueAmount: totalOverdue,
        overdueLoanCount: overdueLoans.length,
        overduePercentage:
          totalLoanOutstanding > 0
            ? Number(((totalOverdue / totalLoanOutstanding) * 100).toFixed(2))
            : 0,
        buckets: {
          bucket0_30: {
            count: bucket0_30.length,
            amount: bucket0_30.reduce((s, l) => s + (l.overdueAmount || 0), 0),
          },
          bucket31_60: {
            count: bucket31_60.length,
            amount: bucket31_60.reduce((s, l) => s + (l.overdueAmount || 0), 0),
          },
          bucket61_90: {
            count: bucket61_90.length,
            amount: bucket61_90.reduce((s, l) => s + (l.overdueAmount || 0), 0),
          },
          bucket90Plus: {
            count: bucket90Plus.length,
            amount: bucket90Plus.reduce((s, l) => s + (l.overdueAmount || 0), 0),
          },
        },
      },
      financialSummary: {
        totalIncome,
        totalExpense,
        netSurplus,
        cashInHand: cashCoa?.currentBalance || 0,
        bankBalance: bankCoa?.currentBalance || 0,
      },
    };
  }

  /**
   * Loan Outstanding Portfolio Report (SRS §52 Report #7)
   */
  @Get('reports/loan-outstanding-report')
  async getLoanOutstandingReport() {
    await this.dataStore.refreshIfStale();

    const activeLoans = this.dataStore.loans.filter(
      (l) => (l.status as string) === 'ACTIVE' || (l.status as string) === 'DISBURSED',
    );

    const loans = activeLoans.map((l) => ({
      id: l.id,
      loanNumber: l.loanNumber,
      customerId: l.customerId,
      customerName: l.customerName,
      principal: l.principal,
      outstandingPrincipal: l.outstandingPrincipal,
      emiAmount: l.emiAmount,
      totalPaid: l.totalPaid || 0,
      overdueAmount: l.overdueAmount || 0,
      daysPastDue: l.daysPastDue || 0,
      recoveryBucket: l.recoveryBucket || 'CURRENT',
      interestMethod: l.interestMethod,
      annualInterestRate: l.annualInterestRate,
      disbursementDate: l.disbursementDate,
      status: l.status,
    }));

    const totalPrincipal = loans.reduce((s, l) => s + l.principal, 0);
    const totalOutstanding = loans.reduce((s, l) => s + (l.outstandingPrincipal || 0), 0);
    const totalOverdue = loans.reduce((s, l) => s + (l.overdueAmount || 0), 0);

    return {
      reportName: 'LOAN OUTSTANDING PORTFOLIO REPORT',
      generatedAt: new Date().toISOString(),
      summary: {
        totalLoansCount: loans.length,
        totalSanctionedPrincipal: totalPrincipal,
        totalOutstandingPrincipal: totalOutstanding,
        totalOverdueAmount: totalOverdue,
      },
      loans,
    };
  }

  /**
   * Overdue Aging & PAR Report (SRS §52 Report #9)
   */
  @Get('reports/overdue-aging-report')
  async getOverdueAgingReport() {
    await this.dataStore.refreshIfStale();

    const overdueLoans = this.dataStore.loans.filter(
      (l) =>
        ((l.status as string) === 'ACTIVE' || (l.status as string) === 'DISBURSED') &&
        ((l.overdueAmount || 0) > 0 || (l.daysPastDue || 0) > 0),
    );

    const classify = (dpd: number) => {
      if (dpd <= 30) return '1-30 Days (Yellow)';
      if (dpd <= 60) return '31-60 Days (Orange)';
      if (dpd <= 90) return '61-90 Days (Orange-High)';
      return '90+ Days (Red/NPA)';
    };

    const categorizedLoans = overdueLoans.map((l) => ({
      loanNumber: l.loanNumber,
      customerName: l.customerName,
      customerId: l.customerId,
      principal: l.principal,
      outstandingPrincipal: l.outstandingPrincipal,
      overdueAmount: l.overdueAmount,
      daysPastDue: l.daysPastDue,
      bucket: classify(l.daysPastDue || 0),
      disbursementDate: l.disbursementDate,
    }));

    return {
      reportName: 'OVERDUE AGING & PAR CLASSIFICATION REPORT',
      generatedAt: new Date().toISOString(),
      totalOverdueLoansCount: overdueLoans.length,
      totalOverdueAmount: overdueLoans.reduce((s, l) => s + (l.overdueAmount || 0), 0),
      loans: categorizedLoans,
    };
  }

  /**
   * RD Recurring Deposit Due Report (SRS §52 Report #5)
   */
  @Get('reports/rd-due-report')
  async getRdDueReport(@Query('date') queryDate?: string) {
    await this.dataStore.refreshIfStale();

    const targetDate = queryDate || new Date().toISOString().split('T')[0];
    const targetMonth = targetDate.slice(0, 7);

    const rdAccounts = this.dataStore.accounts.filter(
      (a) => a.productType === ('RD' as any) && a.status === AccountStatus.ACTIVE,
    );

    const report = rdAccounts.map((a) => {
      const customer = this.dataStore.customers.find((c) => c.id === a.customerId);
      return {
        accountNumber: a.accountNumber,
        customerId: a.customerId,
        customerName: a.customerName,
        customerMobile: customer?.mobile || 'N/A',
        monthlyDeposit: a.principalAmount,
        maturityDate: a.maturityDate,
        currentBalance: a.currentBalance,
        status: a.status,
        targetMonth,
      };
    });

    return {
      reportName: 'RECURRING DEPOSIT (RD) DUE REPORT',
      month: targetMonth,
      generatedAt: new Date().toISOString(),
      totalRdAccounts: rdAccounts.length,
      totalExpectedMonthlyCollection: rdAccounts.reduce((s, a) => s + (a.principalAmount || 0), 0),
      accounts: report,
    };
  }

  /**
   * Deposit Maturity Report (SRS §52 Report #6)
   * Upcoming maturities in the next 30/60 days
   */
  @Get('reports/deposit-maturity-report')
  async getDepositMaturityReport(@Query('days') queryDays?: string) {
    await this.dataStore.refreshIfStale();

    const days = parseInt(queryDays || '30', 10);
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const todayStr = now.toISOString().split('T')[0];
    const futureStr = futureDate.toISOString().split('T')[0];

    const maturingAccounts = this.dataStore.accounts.filter(
      (a) =>
        a.maturityDate &&
        a.maturityDate >= todayStr &&
        a.maturityDate <= futureStr &&
        a.status === AccountStatus.ACTIVE,
    );

    const result = maturingAccounts.map((a) => {
      const customer = this.dataStore.customers.find((c) => c.id === a.customerId);
      return {
        accountNumber: a.accountNumber,
        productType: a.productType,
        customerName: a.customerName,
        customerMobile: customer?.mobile || 'N/A',
        principalAmount: a.principalAmount,
        interestRate: a.interestRate,
        maturityAmount: a.maturityAmount,
        maturityDate: a.maturityDate,
        currentBalance: a.currentBalance,
      };
    });

    return {
      reportName: 'DEPOSIT MATURITY PROJECTION REPORT',
      generatedAt: new Date().toISOString(),
      projectionWindowDays: days,
      maturingCount: maturingAccounts.length,
      totalMaturityLiability: maturingAccounts.reduce((s, a) => s + (a.maturityAmount || 0), 0),
      accounts: result,
    };
  }
}
