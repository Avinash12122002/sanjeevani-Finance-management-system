import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FinancialEngine } from '@sanjeevani/financial-engine';
import {
  BusinessDateStatus,
  IBusinessDayClosure,
  IUser,
  UserRole,
  TransactionStatus,
} from '@sanjeevani/shared-types';

import { StaffGuard } from '../../common/guards/staff.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('api/v1/daily-closing')
@UseGuards(JwtAuthGuard, StaffGuard, RolesGuard)
export class DailyClosingController {
  constructor(private dataStore: DataStoreService) {}

  @Get('status')
  async getDailyClosingStatus() {
    await this.dataStore.refreshIfStale();
    const today = new Date().toISOString().split('T')[0];
    let closure = this.dataStore.businessDayClosures.find((c) => c.businessDate === today);

    // Compute live metrics dynamically
    const totalCollections = this.dataStore.transactions
      .filter((t) => t.transactionDate === today && t.status === TransactionStatus.POSTED)
      .reduce((sum, t) => FinancialEngine.add(sum, t.amount || 0), 0);

    const totalDisbursements = this.dataStore.loans
      .filter((l) => l.disbursementDate === today)
      .reduce((sum, l) => FinancialEngine.add(sum, l.principal || 0), 0);

    const cashInHand = this.dataStore.chartOfAccounts.find((c) => c.accountCode === '1010')?.currentBalance || 0;
    const bankBalance = this.dataStore.chartOfAccounts.find((c) => c.accountCode === '1020')?.currentBalance || 0;

    if (!closure) {
      closure = {
        id: `BDC-${Date.now()}`,
        branchId: 'BR-001',
        branchName: 'Head Office - Main Branch',
        businessDate: today,
        status: BusinessDateStatus.OPEN,
        totalCollections,
        totalDisbursements,
        cashInHand,
        bankBalance,
        mismatchCount: 0,
      };
      this.dataStore.businessDayClosures.unshift(closure);
    } else {
      closure.totalCollections = totalCollections;
      closure.totalDisbursements = totalDisbursements;
      closure.cashInHand = cashInHand;
      closure.bankBalance = bankBalance;
    }

    // BUG-04 FIX: Compute checklist items from live data — never hardcode true
    const pendingTransactions = this.dataStore.transactions.filter(
      (t) => t.transactionDate === today && (t.status as string) === 'PENDING',
    );
    const openDrawerWithMismatch = this.dataStore.cashDrawers.find(
      (d) => d.businessDate === today && d.status === 'OPEN' && (d.difference ?? 0) !== 0,
    );
    const activeCashMismatches = this.dataStore.redAlerts.filter(
      (a) => a.alertType === 'CASH_MISMATCH' && a.timestamp?.startsWith(today),
    );
    const openDrawer = this.dataStore.cashDrawers.find(
      (d) => d.businessDate === today && d.status === 'OPEN',
    );

    return {
      currentBusinessDate: today,
      status: closure.status,
      closure,
      checklist: {
        allFieldCollectionsSubmitted: pendingTransactions.length === 0,
        cashierDrawerBalanced: !openDrawer || (openDrawer.difference === 0 && !openDrawerWithMismatch),
        bankTransactionsReconciled: activeCashMismatches.length === 0,
        allPendingTransactionsApproved: pendingTransactions.length === 0,
        ledgerPostingVerified: this.dataStore.journalEntries.some(
          (j) => j.businessDate === today && j.status === 'POSTED',
        ),
        pendingTransactionCount: pendingTransactions.length,
        cashMismatchCount: activeCashMismatches.length,
      },
    };
  }

  @Get('history')
  async getClosingHistory() {
    await this.dataStore.refreshIfStale();
    return this.dataStore.businessDayClosures;
  }

  /**
   * Execute Daily Closing & Business Date Lock (SRS §63, §64, BR-009)
   */
  @Post('execute')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GENERAL_MANAGER, UserRole.BRANCH_MANAGER)
  async executeDailyClosing(
    @Body() body: { notes?: string },
    @CurrentUser() user: IUser,
  ) {
    const today = new Date().toISOString().split('T')[0];
    let closure = this.dataStore.businessDayClosures.find((c) => c.businessDate === today);

    if (closure && closure.status === BusinessDateStatus.LOCKED) {
      throw new BadRequestException('Business date for today is already LOCKED.');
    }

    const totalCollections = this.dataStore.transactions
      .filter((t) => t.transactionDate === today && t.status === TransactionStatus.POSTED)
      .reduce((sum, t) => FinancialEngine.add(sum, t.amount || 0), 0);

    const totalDisbursements = this.dataStore.loans
      .filter((l) => l.disbursementDate === today)
      .reduce((sum, l) => FinancialEngine.add(sum, l.principal || 0), 0);

    const cashInHand = this.dataStore.chartOfAccounts.find((c) => c.accountCode === '1010')?.currentBalance || 0;
    const bankBalance = this.dataStore.chartOfAccounts.find((c) => c.accountCode === '1020')?.currentBalance || 0;

    if (!closure) {
      closure = {
        id: `BDC-${Date.now()}`,
        branchId: user.branchId || 'BR-001',
        branchName: user.branchName || 'Head Office - Main Branch',
        businessDate: today,
        status: BusinessDateStatus.LOCKED,
        totalCollections,
        totalDisbursements,
        cashInHand,
        bankBalance,
        mismatchCount: 0,
        closedBy: user.id,
        approvedBy: user.id,
        closedAt: new Date().toISOString(),
      };
      this.dataStore.businessDayClosures.unshift(closure);
    } else {
      closure.status = BusinessDateStatus.LOCKED;
      closure.totalCollections = totalCollections;
      closure.totalDisbursements = totalDisbursements;
      closure.cashInHand = cashInHand;
      closure.bankBalance = bankBalance;
      closure.closedBy = user.id;
      closure.approvedBy = user.id;
      closure.closedAt = new Date().toISOString();
    }

    await this.dataStore.persistClosure(closure);

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Manager',
      'BUSINESS_DATE_LOCKED',
      'BusinessDayClosure',
      closure.id,
      undefined,
      closure,
      `Executed Daily Closing for Date ${today}. Business Date is now LOCKED (BR-009).`,
    );

    return {
      message: `Daily Closing completed successfully. Business date ${today} is now LOCKED.`,
      closure,
    };
  }

  /**
   * Privileged Date Reopening with Audit Recording (SRS §64, BR-010)
   */
  @Post('reopen')
  async reopenBusinessDate(
    @Body() body: { reason: string; date: string },
    @CurrentUser() user: IUser,
  ) {
    if (!user.roles.includes(UserRole.SUPER_ADMIN)) {
      throw new ForbiddenException(
        'Privilege Violation (BR-010): Reopening a closed business date requires Super Admin / Owner authorization.',
      );
    }

    if (!body.reason || body.reason.trim().length < 10) {
      throw new BadRequestException('A detailed reason (min 10 chars) is required to reopen a locked date.');
    }

    const closure = this.dataStore.businessDayClosures.find((c) => c.businessDate === (body.date || new Date().toISOString().split('T')[0]));
    if (!closure) {
      throw new BadRequestException('No closure record found for specified date.');
    }

    closure.status = BusinessDateStatus.REOPENED;
    closure.reopenedReason = body.reason;

    await this.dataStore.persistClosure(closure);

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Owner',
      'BUSINESS_DATE_REOPENED',
      'BusinessDayClosure',
      closure.id,
      undefined,
      closure,
      `REOPENED Business Date ${closure.businessDate}. Reason: ${body.reason}`,
    );

    return {
      message: `Business date ${closure.businessDate} reopened for adjustments.`,
      closure,
    };
  }

  /**
   * Manager Digital Sign-Off (SRS §19 — Four-eyes daily closing approval)
   * Only BRANCH_MANAGER / GENERAL_MANAGER / SUPER_ADMIN can approve
   */
  @Post('manager-approve')
  async managerApprove(
    @Body() body: { date?: string; remarks?: string },
    @CurrentUser() user: IUser,
  ) {
    const isAuthorized =
      user.roles.includes(UserRole.BRANCH_MANAGER) ||
      user.roles.includes(UserRole.GENERAL_MANAGER) ||
      user.roles.includes(UserRole.SUPER_ADMIN);

    if (!isAuthorized) {
      throw new ForbiddenException(
        'Manager Sign-Off (SRS §19): Only Branch Manager, General Manager, or Owner can approve the daily closing.',
      );
    }

    const targetDate = body.date || new Date().toISOString().split('T')[0];
    const closure = this.dataStore.businessDayClosures.find((c) => c.businessDate === targetDate);

    if (!closure) {
      throw new BadRequestException(`No daily closing record found for date: ${targetDate}`);
    }

    if (closure.status !== BusinessDateStatus.LOCKED) {
      throw new BadRequestException(
        `Business date ${targetDate} must be LOCKED before manager approval. Current status: ${closure.status}. Please execute daily closing first.`,
      );
    }

    const oldVal = { ...closure };
    (closure as any).managerApprovedBy = user.id;
    (closure as any).managerApprovedByName = user.employeeName || 'Manager';
    (closure as any).managerApprovedAt = new Date().toISOString();
    (closure as any).managerRemarks = body.remarks || 'Approved by manager.';
    closure.status = BusinessDateStatus.LOCKED; // stays LOCKED — manager approval is additional sign-off

    await this.dataStore.persistClosure(closure);

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Manager',
      'DAILY_CLOSING_MANAGER_APPROVED',
      'BusinessDayClosure',
      closure.id,
      oldVal,
      closure,
      `Manager sign-off by ${user.employeeName} for business date ${targetDate}. Remarks: ${body.remarks || 'None'}`,
    );

    return {
      message: `Daily closing for ${targetDate} approved by ${user.employeeName || 'Manager'}.`,
      closure,
    };
  }
}

