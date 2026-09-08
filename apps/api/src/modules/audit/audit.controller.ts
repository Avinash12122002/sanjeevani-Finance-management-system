import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StaffGuard } from '../../common/guards/staff.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { IUser, UserRole } from '@sanjeevani/shared-types';

export interface ISurpriseAuditItem {
  customerId: string;
  customerNumber: string;
  customerName: string;
  mobile: string;
  systemBalance: number;
  physicalConfirmedBalance?: number;
  discrepancy: number;
  status: 'PENDING_VERIFICATION' | 'CONFIRMED_MATCHED' | 'DISCREPANCY_FLAGGED';
  auditorNotes?: string;
  verifiedAt?: string;
}

export interface ISurpriseAuditSession {
  id: string;
  auditDate: string;
  auditorId: string;
  auditorName: string;
  branchId: string;
  branchName: string;
  sampleSize: number;
  totalDiscrepancy: number;
  status: 'IN_PROGRESS' | 'COMPLETED_CLEAN' | 'COMPLETED_WITH_DISCREPANCIES';
  items: ISurpriseAuditItem[];
  createdAt: string;
  completedAt?: string;
}

const surpriseAuditSessions: ISurpriseAuditSession[] = [];

@Controller('api/v1/audit')
@UseGuards(JwtAuthGuard, StaffGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.GENERAL_MANAGER, UserRole.AUDITOR, UserRole.BRANCH_MANAGER)
export class AuditController {
  constructor(private dataStore: DataStoreService) {}

  /**
   * Searchable Full Audit Log (SRS §35)
   */
  @Get('logs')
  async getAuditLogs(
    @Query('entityType') entityType?: string,
    @Query('userId') userId?: string,
    @Query('search') search?: string,
  ) {
    await this.dataStore.refreshIfStale();

    let logs = this.dataStore.auditLogs;
    if (entityType) logs = logs.filter((l) => l.entityType === entityType);
    if (userId) logs = logs.filter((l) => l.userId === userId);
    if (search) {
      const q = search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.userName?.toLowerCase().includes(q) ||
          l.eventType?.toLowerCase().includes(q) ||
          l.reason?.toLowerCase().includes(q) ||
          l.entityId?.toLowerCase().includes(q),
      );
    }
    return logs;
  }

  /**
   * Start Random Surprise Audit Sampling (SRS §36)
   * Randomly selects sample of customers (default 20) across active accounts
   */
  @Post('surprise-audit')
  async startSurpriseAudit(
    @Body() body: { sampleSize?: number; branchId?: string },
    @CurrentUser() user: IUser,
  ) {
    await this.dataStore.refreshIfStale();

    const size = Math.max(5, Math.min(50, Number(body.sampleSize) || 20));
    const allCustomers = this.dataStore.customers.filter(
      (c) => c.status === ('ACTIVE' as any),
    );

    if (allCustomers.length === 0) {
      throw new BadRequestException('No active customers found for surprise sampling.');
    }

    // Shuffle and pick random sample
    const shuffled = [...allCustomers].sort(() => 0.5 - Math.random());
    const sampled = shuffled.slice(0, size);

    const items: ISurpriseAuditItem[] = sampled.map((c) => {
      // Aggregate system balance from accounts
      const accounts = this.dataStore.accounts.filter((a) => a.customerId === c.id);
      const totalBalance = accounts.reduce((s, a) => s + (a.currentBalance || 0), 0);

      return {
        customerId: c.id,
        customerNumber: c.customerNumber,
        customerName: `${c.firstName} ${c.lastName}`.trim(),
        mobile: c.mobile,
        systemBalance: totalBalance,
        discrepancy: 0,
        status: 'PENDING_VERIFICATION',
      };
    });

    const session: ISurpriseAuditSession = {
      id: `SAS-${Date.now()}`,
      auditDate: new Date().toISOString().split('T')[0],
      auditorId: user.id,
      auditorName: user.employeeName || user.username,
      branchId: body.branchId || user.branchId || 'BR-001',
      branchName: user.branchName || 'Head Office - Main Branch',
      sampleSize: items.length,
      totalDiscrepancy: 0,
      status: 'IN_PROGRESS',
      items,
      createdAt: new Date().toISOString(),
    };

    surpriseAuditSessions.unshift(session);

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Auditor',
      'SURPRISE_AUDIT_INITIATED',
      'SurpriseAudit',
      session.id,
      undefined,
      { sampleSize: items.length },
      `Initiated Surprise Audit Session with random sample of ${items.length} customers (SRS §36).`,
    );

    return {
      message: `Surprise audit session created with ${items.length} random customer samples.`,
      session,
    };
  }

  @Get('surprise-audit')
  async listSurpriseAudits() {
    return surpriseAuditSessions;
  }

  @Get('surprise-audit/:id')
  async getSurpriseAuditById(@Param('id') id: string) {
    const session = surpriseAuditSessions.find((s) => s.id === id);
    if (!session) throw new NotFoundException('Surprise audit session not found');
    return session;
  }

  /**
   * Record Customer Physical Verification Result (SRS §36)
   * If customer reports different balance, triggers CRITICAL Red Alert!
   */
  @Post('surprise-audit/:id/verify-customer')
  async verifyCustomerBalance(
    @Param('id') id: string,
    @Body()
    body: {
      customerId: string;
      confirmedBalance: number;
      notes?: string;
    },
    @CurrentUser() user: IUser,
  ) {
    const session = surpriseAuditSessions.find((s) => s.id === id);
    if (!session) throw new NotFoundException('Surprise audit session not found');

    const item = session.items.find((i) => i.customerId === body.customerId);
    if (!item) throw new NotFoundException('Customer not in this audit sample');

    const physical = Number(body.confirmedBalance);
    const discrepancy = Math.abs(physical - item.systemBalance);

    item.physicalConfirmedBalance = physical;
    item.discrepancy = discrepancy;
    item.auditorNotes = body.notes;
    item.verifiedAt = new Date().toISOString();

    if (discrepancy === 0) {
      item.status = 'CONFIRMED_MATCHED';
    } else {
      item.status = 'DISCREPANCY_FLAGGED';

      // Spawn CRITICAL Red Alert (SRS §36 / §67)
      this.dataStore.redAlerts.unshift({
        id: `ALT-AUD-${Date.now()}`,
        alertType: 'CASH_MISMATCH',
        severity: 'CRITICAL',
        title: `Surprise Audit Balance Mismatch: ${item.customerName}`,
        description: `Customer reported ₹${physical} vs System Balance ₹${item.systemBalance} (Difference: ₹${discrepancy}). Immediate investigation required.`,
        entityType: 'Customer',
        entityId: item.customerId,
        amount: discrepancy,
        branchId: session.branchId,
        branchName: session.branchName,
        timestamp: new Date().toISOString(),
      });
    }

    session.totalDiscrepancy = session.items.reduce((s, i) => s + (i.discrepancy || 0), 0);

    const allDone = session.items.every((i) => i.status !== 'PENDING_VERIFICATION');
    if (allDone) {
      session.status =
        session.totalDiscrepancy === 0 ? 'COMPLETED_CLEAN' : 'COMPLETED_WITH_DISCREPANCIES';
      session.completedAt = new Date().toISOString();
    }

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Auditor',
      'CUSTOMER_BALANCE_VERIFIED',
      'SurpriseAudit',
      session.id,
      undefined,
      item,
      `Audited customer ${item.customerName} (${item.customerNumber}). Result: ${item.status}. Discrepancy: ₹${discrepancy}`,
    );

    return {
      message: `Customer ${item.customerName} verification recorded.`,
      item,
      sessionStatus: session.status,
      totalDiscrepancy: session.totalDiscrepancy,
    };
  }

  /**
   * Routine Compliance Calendar & Regulatory Health Check (SRS §35, §53)
   */
  @Get('compliance-calendar')
  async getComplianceCalendar() {
    await this.dataStore.refreshIfStale();

    const today = new Date().toISOString().split('T')[0];
    const todayClosure = this.dataStore.businessDayClosures.find((c) => c.businessDate === today);
    const activeMismatches = this.dataStore.redAlerts.filter(
      (a) => a.alertType === 'CASH_MISMATCH',
    );
    const latestSurpriseAudit = surpriseAuditSessions[0];

    return {
      institutionName: 'SANJEEVANI FINANCE',
      asOfDate: today,
      cadence: {
        daily: {
          task: 'Daily Cash Reconciliation & Business Date Lock (SRS §19)',
          status: todayClosure ? (todayClosure.status as string) : 'PENDING_CLOSING',
          lastCompleted: this.dataStore.businessDayClosures[0]?.businessDate || 'None',
        },
        weekly: {
          task: 'Random Customer Balance Verification (SRS §35)',
          status: latestSurpriseAudit ? latestSurpriseAudit.status : 'NOT_INITIATED',
          lastSession: latestSurpriseAudit?.auditDate || 'None',
        },
        monthly: {
          task: 'Accounts & Bank 3-Way Reconciliation (SRS §29)',
          status: activeMismatches.length === 0 ? 'CLEAN_NO_MISMATCH' : 'MISMATCH_REQUIRES_REVIEW',
          activeAlertCount: activeMismatches.length,
        },
        quarterly: {
          task: 'Internal Management & Governance Audit (SRS §35)',
          status: 'SCHEDULED_Q3',
          nextDueDate: '2026-09-30',
        },
        annually: {
          task: 'Statutory Compliance & Financial Statement Filing',
          status: 'IN_ORDER',
          financialYear: '2026-2027',
        },
      },
    };
  }
}
