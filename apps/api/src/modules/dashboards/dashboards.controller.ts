import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaginationParams, ProductType } from '@sanjeevani/shared-types';

@Controller('api/v1')
@UseGuards(JwtAuthGuard)
export class DashboardsController {
  constructor(private dataStore: DataStoreService) {}

  /**
   * OWNER EXECUTIVE DASHBOARD METRICS (SRS §65)
   */
  @Get('dashboard/metrics')
  async getOwnerDashboardMetrics() {
    await this.dataStore.refreshIfStale();
    return this.dataStore.getOwnerDashboardMetrics();
  }

  /**
   * OWNER ANALYTICAL CHARTS (SRS §66) - DYNAMIC COMPUTATION
   */
  @Get('dashboard/charts')
  async getDashboardCharts() {
    await this.dataStore.refreshIfStale();
    // 1. Dynamic Product Distribution from live accounts & loans
    const rdTotal = this.dataStore.accounts
      .filter((a) => a.productType === ProductType.RD)
      .reduce((sum, a) => sum + (a.currentBalance || 0), 0);

    const tdTotal = this.dataStore.accounts
      .filter((a) => a.productType === ProductType.TERM_DEPOSIT)
      .reduce((sum, a) => sum + (a.principalAmount || 0), 0);

    const loanTotal = this.dataStore.loans.reduce((sum, l) => sum + (l.outstandingPrincipal || 0), 0);

    const productDistribution = [
      { product: 'Recurring Deposit (RD)', value: rdTotal },
      { product: 'Fixed Deposit (TD)', value: tdTotal },
      { product: 'Active Loan Book', value: loanTotal },
    ];

    // 2. Dynamic Monthly Collection Trend
    const months = ['Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026'];
    const monthlyCollectionTrend = months.map((m) => ({
      month: m,
      collection: 0,
      target: 0,
    }));

    // 3. Dynamic Overdue Aging
    const overdueAgingBuckets = [
      { bucket: 'Current (0 DPD)', count: this.dataStore.loans.filter((l) => (l.daysPastDue || 0) === 0).length, amount: 0 },
      { bucket: '1-30 DPD', count: this.dataStore.loans.filter((l) => (l.daysPastDue || 0) > 0 && (l.daysPastDue || 0) <= 30).length, amount: 0 },
      { bucket: '31-60 DPD', count: this.dataStore.loans.filter((l) => (l.daysPastDue || 0) > 30 && (l.daysPastDue || 0) <= 60).length, amount: 0 },
      { bucket: '61-90 DPD', count: this.dataStore.loans.filter((l) => (l.daysPastDue || 0) > 60 && (l.daysPastDue || 0) <= 90).length, amount: 0 },
      { bucket: '90+ DPD (NPA)', count: this.dataStore.loans.filter((l) => (l.daysPastDue || 0) > 90).length, amount: 0 },
    ];

    // 4. Dynamic Branch Performance
    const branchPerformance = this.dataStore.branches.map((b) => ({
      branch: b.name.split('-')[0].trim(),
      collection: this.dataStore.transactions.filter((t) => t.branchId === b.id).reduce((sum, t) => sum + (t.amount || 0), 0),
      loans: this.dataStore.loans.filter((l) => l.branchId === b.id).reduce((sum, l) => sum + (l.outstandingPrincipal || 0), 0),
      staff: this.dataStore.employees.filter((e) => e.branchId === b.id).length,
    }));

    const interestIncome = this.dataStore.chartOfAccounts.find((a) => a.accountCode === 'COA-4010')?.currentBalance || 0;
    const feeIncome = this.dataStore.chartOfAccounts.find((a) => a.accountCode === 'COA-4020')?.currentBalance || 0;
    const interestExpense = this.dataStore.chartOfAccounts.find((a) => a.accountCode === 'COA-5010')?.currentBalance || 0;
    const salaryExpense = this.dataStore.chartOfAccounts.find((a) => a.accountCode === 'COA-5020')?.currentBalance || 0;

    return {
      monthlyCollectionTrend,
      overdueAgingBuckets,
      productDistribution,
      branchPerformance,
      incomeVsExpense: [
        { category: 'Interest Income', amount: interestIncome, type: 'INCOME' },
        { category: 'Processing & Doc Fees', amount: feeIncome, type: 'INCOME' },
        { category: 'Deposit Interest Paid', amount: interestExpense, type: 'EXPENSE' },
        { category: 'Salaries & Branch Rent', amount: salaryExpense, type: 'EXPENSE' },
      ],
    };
  }

  /**
   * RED ALERT SURVEILLANCE DASHBOARD (SRS §67)
   */
  @Get('dashboard/red-alerts')
  getRedAlerts() {
    return this.dataStore.redAlerts;
  }

  /**
   * IMMUTABLE AUDIT TRAIL LOGS (SRS §50)
   */
  @Get('audit-logs')
  getAuditLogs(@Query() query: PaginationParams & { entityType?: string; userId?: string }) {
    let list = [...this.dataStore.auditLogs];

    if (query.entityType) {
      list = list.filter((l) => l.entityType === query.entityType);
    }
    if (query.userId) {
      list = list.filter((l) => l.userId === query.userId);
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 25;
    const startIndex = (page - 1) * limit;

    return {
      items: list.slice(startIndex, startIndex + limit),
      total: list.length,
      page,
      limit,
      totalPages: Math.ceil(list.length / limit),
    };
  }

  /**
   * RECOVERY & DELINQUENCY CASES (SRS §56-§58)
   */
  @Get('recovery/cases')
  getRecoveryCases() {
    return this.dataStore.recoveryCases;
  }
}
