import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataStoreService } from '../database/data-store.service';
import { SmsNotificationService } from './sms-notification.service';
import { InstallmentStatus, AccountStatus, ProductType } from '@sanjeevani/shared-types';

/**
 * SmsCronService — Scheduled SMS Reminders
 * SRS §24: Automated reminder notifications
 *
 * Requires @nestjs/schedule to be installed:
 *   npm install @nestjs/schedule --workspace=apps/api
 *
 * And ScheduleModule.forRoot() registered in AppModule.
 *
 * Cron jobs:
 *  - 9:00 AM daily — EMI due in 3 days reminder
 *  - 9:30 AM daily — RD installment due in 2 days reminder
 *  - 10:00 AM daily — Account maturity alert (7 days ahead)
 *  - Midnight daily — Overdue DPD update (auto-updates loan DPD & recovery bucket)
 */
@Injectable()
export class SmsCronService {
  private readonly logger = new Logger(SmsCronService.name);

  constructor(
    private dataStore: DataStoreService,
    private sms: SmsNotificationService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. EMI Due Reminders — 3 Days Before Due Date (9:00 AM)
  // ─────────────────────────────────────────────────────────────────────────────
  @Cron('0 9 * * *', { name: 'emi-due-reminder' })
  async sendEmiDueReminders() {
    this.logger.log('[CRON] Running EMI due reminders check...');
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + 3);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    const dueInstallments = this.dataStore.loanInstallments.filter(
      (i) => i.dueDate === targetDateStr && i.status === InstallmentStatus.DUE,
    );

    let sentCount = 0;
    for (const inst of dueInstallments) {
      const loan = this.dataStore.loans.find((l) => l.id === inst.loanId);
      if (!loan) continue;
      const customer = this.dataStore.customers.find((c) => c.id === loan.customerId);
      if (!customer?.mobile) continue;

      await this.sms.sendEmiDueReminderSms({
        mobile: customer.mobile,
        customerName: `${customer.firstName} ${customer.lastName}`.trim(),
        emiAmount: inst.totalDue,
        dueDate: inst.dueDate,
        loanNumber: loan.loanNumber,
      });
      sentCount++;
    }
    this.logger.log(`[CRON] EMI reminders sent: ${sentCount}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. RD Installment Due Reminders — 2 Days Before (9:30 AM)
  // ─────────────────────────────────────────────────────────────────────────────
  @Cron('30 9 * * *', { name: 'rd-due-reminder' })
  async sendRdDueReminders() {
    this.logger.log('[CRON] Running RD due reminders check...');
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + 2);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    const dueRdInstallments = this.dataStore.rdInstallments.filter(
      (i) => i.dueDate === targetDateStr && i.status === InstallmentStatus.DUE,
    );

    let sentCount = 0;
    for (const inst of dueRdInstallments) {
      const account = this.dataStore.accounts.find((a) => a.id === inst.rdAccountId);
      if (!account) continue;
      const customer = this.dataStore.customers.find((c) => c.id === account.customerId);
      if (!customer?.mobile) continue;

      await this.sms.sendRdInstallmentDueSms({
        mobile: customer.mobile,
        customerName: `${customer.firstName} ${customer.lastName}`.trim(),
        amount: inst.amountDue,
        dueDate: inst.dueDate,
        accountNumber: account.accountNumber,
      });
      sentCount++;
    }
    this.logger.log(`[CRON] RD reminders sent: ${sentCount}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Maturity Alerts — 7 Days Before Maturity (10:00 AM)
  // ─────────────────────────────────────────────────────────────────────────────
  @Cron('0 10 * * *', { name: 'maturity-alert' })
  async sendMaturityAlerts() {
    this.logger.log('[CRON] Running maturity alerts check...');
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + 7);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    const maturingAccounts = this.dataStore.accounts.filter(
      (a) => a.maturityDate === targetDateStr && a.status === AccountStatus.ACTIVE,
    );

    let sentCount = 0;
    for (const account of maturingAccounts) {
      const customer = this.dataStore.customers.find((c) => c.id === account.customerId);
      if (!customer?.mobile) continue;

      await this.sms.sendMaturityAlertSms({
        mobile: customer.mobile,
        customerName: `${customer.firstName} ${customer.lastName}`.trim(),
        accountNumber: account.accountNumber,
        productType: account.productType,
        maturityDate: account.maturityDate,
        maturityAmount: account.maturityAmount || account.currentBalance,
      });
      sentCount++;
    }
    this.logger.log(`[CRON] Maturity alerts sent: ${sentCount}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Auto-Maturity Processing — Mark accounts matured today (10:30 AM)
  // SRS §49 Module 15
  // ─────────────────────────────────────────────────────────────────────────────
  @Cron('30 10 * * *', { name: 'auto-maturity-processing' })
  async processMaturedAccounts() {
    this.logger.log('[CRON] Running auto-maturity processing...');
    const today = new Date().toISOString().split('T')[0];

    const maturedAccounts = this.dataStore.accounts.filter(
      (a) => a.maturityDate === today && a.status === AccountStatus.ACTIVE,
    );

    for (const account of maturedAccounts) {
      account.status = AccountStatus.MATURED as any;
      account.updatedAt = new Date().toISOString();
      await this.dataStore.persistAccount(account);

      // Create Red Alert for cashier to process payout
      const alert: any = {
        id: `ALERT-MAT-${account.id}-${Date.now()}`,
        alertType: 'MATURITY_DUE',
        severity: 'HIGH',
        title: `Account Matured: ${account.accountNumber}`,
        description: `${account.productType} account ${account.accountNumber} for ${account.customerName} matured today. Payout: ₹${(account.maturityAmount || account.currentBalance).toLocaleString('en-IN')}`,
        entityId: account.id,
        entityType: 'Account',
        timestamp: new Date().toISOString(),
        status: 'OPEN',
      };
      this.dataStore.redAlerts.unshift(alert);

      this.dataStore.logAudit('SYSTEM', 'Cron', 'ACCOUNT_MATURED', 'Account', account.id, undefined, account,
        `Auto-marked account ${account.accountNumber} as MATURED`);
    }
    this.logger.log(`[CRON] Maturity processing: ${maturedAccounts.length} accounts marked MATURED`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Overdue DPD Auto-Update — Midnight Daily (SRS §31, §32)
  // Updates daysPastDue, overdueAmount, recoveryBucket for all active loans
  // ─────────────────────────────────────────────────────────────────────────────
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: 'overdue-dpd-update' })
  async updateOverdueDpd() {
    this.logger.log('[CRON] Running overdue DPD update...');
    const today = new Date();

    let updatedCount = 0;
    for (const loan of this.dataStore.loans) {
      if (loan.status !== 'ACTIVE' && loan.status !== 'OVERDUE') continue;

      // Find all unpaid overdue installments
      const overdueInstallments = this.dataStore.loanInstallments.filter(
        (i) =>
          i.loanId === loan.id &&
          i.status !== InstallmentStatus.PAID &&
          i.status !== InstallmentStatus.WAIVED &&
          new Date(i.dueDate) < today,
      );

      // Update installment status to OVERDUE
      for (const inst of overdueInstallments) {
        if (inst.status !== InstallmentStatus.OVERDUE) {
          inst.status = InstallmentStatus.OVERDUE;
          await this.dataStore.persistLoanInstallment(inst);
        }
      }

      const overdueTotal = overdueInstallments.reduce((sum, i) => sum + (i.totalDue - i.amountPaid), 0);
      const oldestOverdue = overdueInstallments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
      const dpd = oldestOverdue
        ? Math.floor((today.getTime() - new Date(oldestOverdue.dueDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      loan.overdueAmount = overdueTotal;
      loan.daysPastDue = dpd;

      // Recovery bucket classification (SRS §32)
      if (dpd === 0) loan.recoveryBucket = 'CURRENT' as any;
      else if (dpd <= 30) loan.recoveryBucket = 'BUCKET_1_30' as any;
      else if (dpd <= 60) loan.recoveryBucket = 'BUCKET_31_60' as any;
      else if (dpd <= 90) loan.recoveryBucket = 'BUCKET_61_90' as any;
      else loan.recoveryBucket = 'NPA_90_PLUS' as any;

      if (dpd > 0 && loan.status === 'ACTIVE') {
        loan.status = 'OVERDUE';
      }

      await this.dataStore.persistLoan(loan);

      // Generate NPA Red Alert at 90+ DPD (once per loan)
      if (dpd >= 90) {
      const existingAlert = (this.dataStore.redAlerts as any[]).find(
        (a: any) => a.entityId === loan.id && a.alertType === 'NPA_TRIGGERED',
      );
        if (!existingAlert) {
          const npaAlert: any = {
            id: `ALERT-NPA-${loan.id}`,
            alertType: 'NPA_TRIGGERED',
            severity: 'CRITICAL',
            title: `NPA Loan: ${loan.loanNumber} (${dpd} DPD)`,
            description: `Loan ${loan.loanNumber} for ${loan.customerName} has crossed 90 DPD. Outstanding: ₹${loan.outstandingPrincipal.toLocaleString('en-IN')}. Overdue: ₹${overdueTotal.toLocaleString('en-IN')}. Immediate action required.`,
            entityId: loan.id,
            entityType: 'Loan',
            timestamp: new Date().toISOString(),
            status: 'OPEN',
          };
          this.dataStore.redAlerts.unshift(npaAlert);
        }
      }

      // Send overdue SMS after 3+ DPD
      if (dpd >= 3) {
        const customer = this.dataStore.customers.find((c) => c.id === loan.customerId);
        if (customer?.mobile) {
          await this.sms.sendOverdueAlertSms({
            mobile: customer.mobile,
            customerName: `${customer.firstName} ${customer.lastName}`.trim(),
            loanNumber: loan.loanNumber,
            overdueAmount: overdueTotal,
            daysPastDue: dpd,
          });
        }
      }

      updatedCount++;
    }
    this.logger.log(`[CRON] DPD update complete: ${updatedCount} loans processed`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. 7:00 PM Daily Cash Cut-Off & Overnight Cash Prevention Check (SRS §17, §18)
  // "Cash collector ke paas overnight nahi rehna chahiye"
  // ─────────────────────────────────────────────────────────────────────────────
  @Cron('0 19 * * *', { name: 'overnight-cash-cutoff' })
  async checkOvernightCashCutOff() {
    this.logger.log('[CRON] Checking 7:00 PM daily cash cut-off & unclosed drawers...');
    const todayStr = new Date().toISOString().split('T')[0];

    const openDrawers = this.dataStore.cashDrawers.filter(
      (d) => d.businessDate === todayStr && d.status === 'OPEN',
    );

    if (openDrawers.length > 0) {
      this.logger.warn(`[CRON] ${openDrawers.length} cash drawer(s) still OPEN past 7:00 PM!`);

      for (const drawer of openDrawers) {
        const alertId = `ALERT-DRAWER-OPEN-${drawer.id}-${todayStr}`;
        const existingAlert = (this.dataStore.redAlerts as any[]).find((a: any) => a.id === alertId);
        if (!existingAlert) {
          const alert: any = {
            id: alertId,
            alertType: 'CASH_MISMATCH',
            severity: 'CRITICAL',
            title: `Unclosed Cash Drawer past 7 PM (Branch ${drawer.branchId})`,
            description: `Cash drawer for ${drawer.cashierName || 'Cashier'} remains OPEN past 7:00 PM cut-off. Expected: ₹${(drawer.expectedClosingBalance || 0).toLocaleString('en-IN')}. Immediate closing required to enforce zero overnight cash rule (SRS §17).`,
            entityId: drawer.id,
            entityType: 'CashDrawer',
            timestamp: new Date().toISOString(),
            status: 'OPEN',
          };
          this.dataStore.redAlerts.unshift(alert);
        }
      }
    }
  }
}

