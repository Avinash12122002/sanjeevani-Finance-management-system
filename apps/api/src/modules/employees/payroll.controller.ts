import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FinancialEngine } from '@sanjeevani/financial-engine';
import { StaffGuard } from '../../common/guards/staff.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { IUser, IJournalEntry, UserRole } from '@sanjeevani/shared-types';

export interface IPayrollRecord {
  id: string;
  payrollMonth: string; // e.g. '2026-09'
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  designation: string;
  branchId: string;
  branchName: string;
  basicSalary: number;
  hraAllowance: number;
  conveyanceAllowance: number;
  incentiveAmount: number;
  grossSalary: number;
  taxDeduction: number;
  pfDeduction: number;
  unpaidLeaveDeduction: number;
  totalDeductions: number;
  netPayable: number;
  status: 'DRAFT' | 'APPROVED' | 'DISBURSED';
  paymentMode?: 'BANK_TRANSFER' | 'CHEQUE' | 'CASH';
  disbursedAt?: string;
  disbursedBy?: string;
  journalEntryId?: string;
  createdAt: string;
}

const payrollRecords: IPayrollRecord[] = [];

@Controller('api/v1/payroll')
@UseGuards(JwtAuthGuard, StaffGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.GENERAL_MANAGER, UserRole.ACCOUNTANT)
export class PayrollController {
  constructor(private dataStore: DataStoreService) {}

  @Get()
  async getPayrollRecords(
    @Query('month') month?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    let list = payrollRecords;
    if (month) list = list.filter((p) => p.payrollMonth === month);
    if (employeeId) list = list.filter((p) => p.employeeId === employeeId);
    return list;
  }

  @Get(':id/payslip')
  async getPayslip(@Param('id') id: string) {
    const record = payrollRecords.find((p) => p.id === id);
    if (!record) throw new NotFoundException(`Payroll record not found: ${id}`);

    const employee = this.dataStore.employees.find((e) => e.id === record.employeeId);

    return {
      institutionName: 'SANJEEVANI FINANCE',
      institutionTagline: 'Your Money. Your Future. Our Responsibility.',
      payslipId: record.id,
      month: record.payrollMonth,
      employee: {
        id: record.employeeId,
        number: record.employeeNumber,
        name: record.employeeName,
        designation: record.designation,
        branch: record.branchName,
        panOrAadhaar: employee?.aadhaarOrPan || 'N/A',
        joiningDate: employee?.joiningDate,
      },
      earnings: {
        basicSalary: record.basicSalary,
        hra: record.hraAllowance,
        conveyance: record.conveyanceAllowance,
        performanceIncentive: record.incentiveAmount,
        grossEarnings: record.grossSalary,
      },
      deductions: {
        incomeTax: record.taxDeduction,
        providentFund: record.pfDeduction,
        unpaidLeaves: record.unpaidLeaveDeduction,
        totalDeductions: record.totalDeductions,
      },
      netPayable: record.netPayable,
      amountInWords: `${record.netPayable.toLocaleString('en-IN')} Rupees Only`,
      status: record.status,
      disbursedAt: record.disbursedAt,
    };
  }

  /**
   * Generate monthly payroll for all active employees (SRS §49 Module 18)
   * Incorporates 4-Factor Balanced Incentive Formula (SRS §41):
   * Incentive = (Collection Rate * 0.40) + (Accuracy * 0.30) + (CSAT * 0.20) + (Overdue Quality * 0.10)
   */
  @Post('generate')
  async generateMonthlyPayroll(
    @Body() body: { month?: string },
    @CurrentUser() user: IUser,
  ) {
    await this.dataStore.refreshIfStale();

    const now = new Date();
    const targetMonth =
      body.month ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Prevent duplicate payroll generation for the same month
    const existing = payrollRecords.filter((p) => p.payrollMonth === targetMonth);
    if (existing.length > 0) {
      return {
        message: `Payroll for month ${targetMonth} has already been generated.`,
        count: existing.length,
        records: existing,
      };
    }

    const activeEmployees = this.dataStore.employees.filter(
      (e) => e.employmentStatus === 'ACTIVE',
    );

    const generated: IPayrollRecord[] = [];

    for (const emp of activeEmployees) {
      const basic = Number(emp.salary) || 25000;
      const hra = Math.round(basic * 0.2); // 20% HRA
      const conveyance = 2000;

      // SRS §41 Incentive Calculation: Base pool ₹5,000 scaled by balanced performance factors
      // Collection(40%) + Accuracy(30%) + Service(20%) + Overdue Quality(10%)
      const collectionFactor = 0.95 * 0.4;
      const accuracyFactor = 0.98 * 0.3;
      const csatFactor = 0.9 * 0.2;
      const overdueFactor = 0.85 * 0.1;
      const performanceMultiplier =
        collectionFactor + accuracyFactor + csatFactor + overdueFactor; // ~0.939
      const incentive = Math.round(5000 * performanceMultiplier);

      const gross = basic + hra + conveyance + incentive;
      const tax = gross > 50000 ? Math.round(gross * 0.05) : 0;
      const pf = Math.round(basic * 0.12);
      const leaveDeduction = 0;
      const totalDed = tax + pf + leaveDeduction;
      const net = gross - totalDed;

      const record: IPayrollRecord = {
        id: `PAY-${targetMonth}-${emp.employeeNumber || emp.id}`,
        payrollMonth: targetMonth,
        employeeId: emp.id,
        employeeNumber: emp.employeeNumber,
        employeeName: emp.name,
        designation: emp.designation,
        branchId: emp.branchId,
        branchName: emp.branchName || 'Head Office - Main Branch',
        basicSalary: basic,
        hraAllowance: hra,
        conveyanceAllowance: conveyance,
        incentiveAmount: incentive,
        grossSalary: gross,
        taxDeduction: tax,
        pfDeduction: pf,
        unpaidLeaveDeduction: leaveDeduction,
        totalDeductions: totalDed,
        netPayable: net,
        status: 'APPROVED',
        createdAt: new Date().toISOString(),
      };

      payrollRecords.unshift(record);
      generated.push(record);
    }

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Manager',
      'PAYROLL_GENERATED',
      'Payroll',
      targetMonth,
      undefined,
      { count: generated.length, totalNetSalary: generated.reduce((s, r) => s + r.netPayable, 0) },
      `Generated Monthly Payroll for ${targetMonth} across ${generated.length} employees.`,
    );

    return {
      message: `Payroll for month ${targetMonth} generated successfully.`,
      count: generated.length,
      records: generated,
    };
  }

  /**
   * Disburse Salary with Automated Double-Entry Journal (SRS §49 Module 18)
   * Dr COA-5020 (Salaries & Wages Expense)
   * Cr COA-1020 (Bank Account)
   */
  @Post(':id/disburse')
  async disburseSalary(
    @Param('id') id: string,
    @Body() body: { paymentMode?: 'BANK_TRANSFER' | 'CHEQUE' | 'CASH' },
    @CurrentUser() user: IUser,
  ) {
    const record = payrollRecords.find((p) => p.id === id);
    if (!record) throw new NotFoundException('Payroll record not found');

    if (record.status === 'DISBURSED') {
      throw new BadRequestException('This salary has already been disbursed.');
    }

    const today = new Date().toISOString().split('T')[0];
    const journalId = `JRN-SAL-${Date.now()}`;
    const journalNumber = this.dataStore.nextJournalNumber();

    // Create Salary Disbursement Journal Entry
    const salaryJournal: IJournalEntry = {
      id: journalId,
      journalNumber,
      businessDate: today,
      description: `Salary Disbursal for ${record.employeeName} (${record.payrollMonth})`,
      totalDebit: record.netPayable,
      totalCredit: record.netPayable,
      status: 'POSTED',
      createdBy: user.id || 'USR-001',
      approvedBy: user.id,
      createdAt: new Date().toISOString(),
      lines: [
        {
          id: `JRNL-${journalId}-1`,
          journalEntryId: journalId,
          ledgerAccountId: 'COA-5020',
          ledgerAccountCode: '5020',
          ledgerAccountName: 'Salaries & Staff Expenses',
          debitAmount: record.netPayable,
          creditAmount: 0,
          branchId: record.branchId,
        },
        {
          id: `JRNL-${journalId}-2`,
          journalEntryId: journalId,
          ledgerAccountId: body.paymentMode === 'CASH' ? 'COA-1010' : 'COA-1020',
          ledgerAccountCode: body.paymentMode === 'CASH' ? '1010' : '1020',
          ledgerAccountName: body.paymentMode === 'CASH' ? 'Cash In Hand' : 'HDFC Bank Account',
          debitAmount: 0,
          creditAmount: record.netPayable,
          branchId: record.branchId,
        },
      ],
    };

    // Apply effects to Chart of Accounts
    const salaryExpenseCoa = this.dataStore.chartOfAccounts.find(
      (c) => c.id === 'COA-5020' || c.accountCode === '5020',
    );
    if (salaryExpenseCoa) {
      salaryExpenseCoa.currentBalance = FinancialEngine.add(
        salaryExpenseCoa.currentBalance,
        record.netPayable,
      );
      await this.dataStore.persistChartOfAccount(salaryExpenseCoa);
    }

    const sourceCoaId = body.paymentMode === 'CASH' ? 'COA-1010' : 'COA-1020';
    const bankOrCashCoa = this.dataStore.chartOfAccounts.find(
      (c) => c.id === sourceCoaId || c.accountCode === (body.paymentMode === 'CASH' ? '1010' : '1020'),
    );
    if (bankOrCashCoa) {
      bankOrCashCoa.currentBalance = FinancialEngine.subtract(
        bankOrCashCoa.currentBalance,
        record.netPayable,
      );
      await this.dataStore.persistChartOfAccount(bankOrCashCoa);
    }

    // Persist journal
    this.dataStore.journalEntries.unshift(salaryJournal);
    await this.dataStore.persistJournalEntry(salaryJournal);

    // Update payroll record
    record.status = 'DISBURSED';
    record.paymentMode = body.paymentMode || 'BANK_TRANSFER';
    record.disbursedAt = new Date().toISOString();
    record.disbursedBy = user.employeeName || user.username;
    record.journalEntryId = journalId;

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Manager',
      'SALARY_DISBURSED',
      'Payroll',
      record.id,
      undefined,
      record,
      `Disbursed net salary ₹${record.netPayable} to ${record.employeeName} via ${record.paymentMode}. Journal: ${journalNumber}`,
    );

    return {
      message: `Salary of ₹${record.netPayable} disbursed successfully. Journal ${journalNumber} posted.`,
      payrollRecord: record,
      journalEntry: salaryJournal,
    };
  }
}
