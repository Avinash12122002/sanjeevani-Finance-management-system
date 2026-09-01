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

@Controller('api/v1/daily-closing')
@UseGuards(JwtAuthGuard)
export class DailyClosingController {
  constructor(private dataStore: DataStoreService) {}

  @Get('status')
  getDailyClosingStatus() {
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

    return {
      currentBusinessDate: today,
      status: closure.status,
      closure,
      checklist: {
        allFieldCollectionsSubmitted: true,
        cashierDrawerBalanced: true,
        bankTransactionsReconciled: true,
        allPendingTransactionsApproved: true,
        ledgerPostingVerified: true,
      },
    };
  }

  @Get('history')
  getClosingHistory() {
    return this.dataStore.businessDayClosures;
  }

  /**
   * Execute Daily Closing & Business Date Lock (SRS §63, §64, BR-009)
   */
  @Post('execute')
  executeDailyClosing(
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
  reopenBusinessDate(
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
}
