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
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FinancialEngine } from '@sanjeevani/financial-engine';
import {
  ILoanApplication,
  ICreditAssessment,
  ILoan,
  ILoanInstallment,
  IUser,
  LoanApplicationStatus,
  RiskCategory,
  InterestMethod,
  InstallmentStatus,
  RecoveryBucket,
  UserRole,
  PaginationParams,
  IJournalEntry,
} from '@sanjeevani/shared-types';

@Controller('api/v1')
@UseGuards(JwtAuthGuard)
export class LoansController {
  constructor(private dataStore: DataStoreService) {}

  // ==========================================
  // LOAN APPLICATIONS (SRS §22, §23)
  // ==========================================

  @Get('loan-applications')
  async getLoanApplications(
    @Query() query: PaginationParams & { status?: string; customerId?: string },
  ) {
    await this.dataStore.refreshIfStale();
    let list = [...this.dataStore.loanApplications];

    if (query.status) {
      list = list.filter((a) => a.status === query.status);
    }
    if (query.customerId) {
      list = list.filter((a) => a.customerId === query.customerId);
    }

    return {
      items: list,
      total: list.length,
    };
  }

  @Post('loan-applications')
  createLoanApplication(
    @Body() body: Partial<ILoanApplication>,
    @CurrentUser() user: IUser,
  ) {
    const customer = this.dataStore.customers.find((c) => c.id === body.customerId);
    if (!customer) {
      throw new NotFoundException('Customer record not found');
    }

    const product = this.dataStore.products.find(
      (p) => p.id === body.loanProductId || p.productType === 'LOAN',
    );
    if (!product) {
      throw new NotFoundException('Loan Product not found');
    }

    const requestedAmount = Number(body.requestedAmount) || 50000;
    const requestedTenure = Number(body.requestedTenureMonths) || 12;

    const applicationNumber = this.dataStore.nextLoanAppNumber();
    const branch = this.dataStore.branches.find((b) => b.id === (customer.branchId || user.branchId || 'BR-001'));

    const newApp: ILoanApplication = {
      id: `LA-${Date.now()}`,
      applicationNumber,
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerNumber: customer.customerNumber,
      customerMobile: customer.mobile,
      branchId: branch?.id || 'BR-001',
      branchName: branch?.name || 'Head Office Agra',
      loanProductId: product.id,
      loanProductName: product.productName,
      requestedAmount,
      requestedTenureMonths: requestedTenure,
      interestMethod: product.interestMethod || InterestMethod.REDUCING_BALANCE,
      annualInterestRate: product.interestRate || 14.0,
      purpose: body.purpose || 'Working Capital / Business Expansion',
      declaredIncome: Number(body.declaredIncome) || 35000,
      existingLiabilities: Number(body.existingLiabilities) || 0,
      status: LoanApplicationStatus.SUBMITTED,
      guarantors: body.guarantors || [],
      createdBy: user.id || 'USR-004',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.dataStore.loanApplications.unshift(newApp);

    this.dataStore.logAudit(
      user.id || 'USR-004',
      user.employeeName || 'Loan Officer',
      'LOAN_APPLICATION_SUBMITTED',
      'LoanApplication',
      newApp.id,
      undefined,
      newApp,
      `Submitted Loan Application ${newApp.applicationNumber} for ${newApp.customerName}`,
    );

    return newApp;
  }

  // ==========================================
  // CREDIT ASSESSMENT (SRS §24)
  // ==========================================

  @Post('loan-applications/:id/credit-assessment')
  performCreditAssessment(
    @Param('id') id: string,
    @Body()
    body: {
      kycScore: number;
      incomeScore: number;
      repaymentScore: number;
      liabilityScore: number;
      securityScore: number;
      bankingScore: number;
      fieldScore: number;
      notes?: string;
    },
    @CurrentUser() user: IUser,
  ) {
    const app = this.dataStore.loanApplications.find((a) => a.id === id);
    if (!app) {
      throw new NotFoundException('Loan Application not found');
    }

    const totalScore = Math.round(
      (body.kycScore * 0.15 +
        body.incomeScore * 0.25 +
        body.repaymentScore * 0.2 +
        body.liabilityScore * 0.1 +
        body.securityScore * 0.1 +
        body.bankingScore * 0.1 +
        body.fieldScore * 0.1),
    );

    let riskCategory = RiskCategory.LOW;
    let recommendation: 'APPROVE' | 'REJECT' | 'FURTHER_REVIEW' = 'APPROVE';

    if (totalScore >= 75) {
      riskCategory = RiskCategory.LOW;
      recommendation = 'APPROVE';
    } else if (totalScore >= 60) {
      riskCategory = RiskCategory.MEDIUM;
      recommendation = 'APPROVE';
    } else if (totalScore >= 45) {
      riskCategory = RiskCategory.HIGH;
      recommendation = 'FURTHER_REVIEW';
    } else {
      riskCategory = RiskCategory.VERY_HIGH;
      recommendation = 'REJECT';
    }

    const assessment: ICreditAssessment = {
      id: `CA-${Date.now()}`,
      loanApplicationId: app.id,
      kycScore: body.kycScore,
      incomeScore: body.incomeScore,
      repaymentScore: body.repaymentScore,
      liabilityScore: body.liabilityScore,
      securityScore: body.securityScore,
      bankingScore: body.bankingScore,
      fieldScore: body.fieldScore,
      totalScore,
      riskCategory,
      recommendation,
      assessedBy: user.id || 'USR-004',
      assessedAt: new Date().toISOString(),
    };

    this.dataStore.creditAssessments.push(assessment);
    app.internalCreditScore = totalScore;
    app.riskCategory = riskCategory;
    app.creditAssessmentRecommendation = recommendation;
    app.status = LoanApplicationStatus.MANAGER_REVIEW;
    app.fieldVerificationNotes = body.notes || 'Field verification completed.';

    return assessment;
  }

  // ==========================================
  // LOAN APPROVAL MATRIX (§30, §48 MAKER-CHECKER)
  // ==========================================

  @Post('loan-applications/:id/approve')
  approveLoanApplication(
    @Param('id') id: string,
    @Body() body: { sanctionedAmount?: number; approvalNotes?: string },
    @CurrentUser() user: IUser,
  ) {
    const app = this.dataStore.loanApplications.find((a) => a.id === id);
    if (!app) {
      throw new NotFoundException('Loan application not found');
    }

    // Maker-Checker Rule (BR-004, §48): Maker cannot approve own application
    if (app.createdBy === user.id && !user.roles.includes(UserRole.SUPER_ADMIN)) {
      throw new ForbiddenException(
        'Maker-Checker Violation (BR-004): You created this loan application and cannot approve it yourself.',
      );
    }

    const amount = body.sanctionedAmount || app.requestedAmount;

    // Approval Limit Check (§30)
    // Branch Manager up to 1L, GM up to 3L, Super Admin / Director > 3L
    if (amount > 100000 && user.roles.includes(UserRole.BRANCH_MANAGER) && !user.roles.includes(UserRole.SUPER_ADMIN)) {
      throw new ForbiddenException(
        `Approval Limit Exceeded (§30): Branch Managers can only approve loans up to ₹ 1,00,000. Loan amount is ${FinancialEngine.formatINR(amount)}. Please escalate to General Manager or Director.`,
      );
    }

    app.sanctionedAmount = amount;
    app.approvedBy = user.id;
    app.status = LoanApplicationStatus.READY_FOR_DISBURSEMENT;
    app.updatedAt = new Date().toISOString();

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Approver',
      'LOAN_APPROVED',
      'LoanApplication',
      app.id,
      undefined,
      app,
      `Sanctioned ₹ ${amount} for application ${app.applicationNumber}`,
    );

    return app;
  }

  // ==========================================
  // LOAN DISBURSEMENT & AMORTIZATION (SRS §26, §29)
  // ==========================================

  @Post('loan-applications/:id/disburse')
  async disburseLoan(
    @Param('id') id: string,
    @Body() body: { paymentMode?: string; referenceNumber?: string },
    @CurrentUser() user: IUser,
  ) {
    const app = this.dataStore.loanApplications.find((a) => a.id === id);
    if (!app) {
      throw new NotFoundException('Loan Application not found');
    }

    if (
      app.status !== LoanApplicationStatus.READY_FOR_DISBURSEMENT &&
      app.status !== LoanApplicationStatus.APPROVED
    ) {
      throw new BadRequestException(
        `Cannot disburse loan in status ${app.status}. Must be READY_FOR_DISBURSEMENT.`,
      );
    }

    const principal = app.sanctionedAmount || app.requestedAmount;
    const rate = app.annualInterestRate;
    const tenure = app.requestedTenureMonths;
    const method = app.interestMethod === InterestMethod.FLAT_RATE ? 'FLAT_RATE' : 'REDUCING_BALANCE';

    // Generate precision Amortization Schedule (SRS §26, §27)
    const emiCalculation = FinancialEngine.calculateLoanEmi({
      principal,
      annualInterestRate: rate,
      tenureMonths: tenure,
      interestMethod: method,
      startDate: new Date().toISOString().split('T')[0],
    });

    const loanNumber = this.dataStore.nextLoanNumber();
    const loanId = `LN-${Date.now()}`;
    const disburseDate = new Date().toISOString().split('T')[0];

    if (this.dataStore.isDateLocked(disburseDate)) {
      throw new BadRequestException(
        `Business Date Locked (BR-009): Business date ${disburseDate} is already closed and locked. Loan disbursements are blocked without reopening.`,
      );
    }

    const newLoan: ILoan = {
      id: loanId,
      loanNumber,
      customerId: app.customerId,
      customerName: app.customerName,
      customerNumber: app.customerNumber,
      loanApplicationId: app.id,
      branchId: app.branchId,
      principal,
      annualInterestRate: rate,
      interestMethod: app.interestMethod,
      tenureMonths: tenure,
      emiAmount: emiCalculation.emiAmount,
      totalPayable: emiCalculation.totalPayable,
      totalInterest: emiCalculation.totalInterest,
      disbursementDate: disburseDate,
      firstDueDate: emiCalculation.schedule[0]?.dueDate || disburseDate,
      finalDueDate: emiCalculation.schedule[emiCalculation.schedule.length - 1]?.dueDate || disburseDate,
      outstandingPrincipal: principal,
      totalPaid: 0,
      overdueAmount: 0,
      daysPastDue: 0,
      recoveryBucket: RecoveryBucket.CURRENT,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    this.dataStore.loans.unshift(newLoan);
    await this.dataStore.persistLoan(newLoan);

    // Save installments (BR-008)
    const installments: ILoanInstallment[] = emiCalculation.schedule.map((item) => ({
      id: `LNI-${loanId}-${item.installmentNumber}`,
      loanId,
      installmentNumber: item.installmentNumber,
      dueDate: item.dueDate,
      openingPrincipal: item.openingPrincipal,
      principalDue: item.principalDue,
      interestDue: item.interestDue,
      feeDue: item.feeDue,
      penaltyDue: item.penaltyDue,
      totalDue: item.totalDue,
      amountPaid: 0,
      principalPaid: 0,
      interestPaid: 0,
      closingPrincipal: item.closingPrincipal,
      status: InstallmentStatus.UPCOMING,
    }));

    this.dataStore.loanInstallments.push(...installments);
    await this.dataStore.persistLoanInstallments(installments);
    app.status = LoanApplicationStatus.DISBURSED;

    // Create Double-Entry Accounting Journal Entry (SRS §38: Dr Loan Receivable, Cr Bank/Cash)
    const journalNumber = this.dataStore.nextJournalNumber();
    const disburseJournal: IJournalEntry = {
      id: `JRN-${Date.now()}`,
      journalNumber,
      businessDate: disburseDate,
      description: `Loan Disbursement for ${app.customerName} (${loanNumber})`,
      totalDebit: principal,
      totalCredit: principal,
      status: 'POSTED',
      createdBy: user.id || 'USR-003',
      approvedBy: user.id,
      createdAt: new Date().toISOString(),
      lines: [
        {
          id: `JRNL-${Date.now()}-1`,
          journalEntryId: `JRN-${Date.now()}`,
          ledgerAccountId: 'COA-1030',
          ledgerAccountCode: '1030',
          ledgerAccountName: 'Loan Portfolio Principal Receivable',
          debitAmount: principal,
          creditAmount: 0,
          branchId: app.branchId,
          customerId: app.customerId,
        },
        {
          id: `JRNL-${Date.now()}-2`,
          journalEntryId: `JRN-${Date.now()}`,
          ledgerAccountId: body.paymentMode === 'CASH' ? 'COA-1010' : 'COA-1020',
          ledgerAccountCode: body.paymentMode === 'CASH' ? '1010' : '1020',
          ledgerAccountName: body.paymentMode === 'CASH' ? 'Cash In Hand' : 'HDFC Bank Operations Account',
          debitAmount: 0,
          creditAmount: principal,
          branchId: app.branchId,
          customerId: app.customerId,
        },
      ],
    };
    this.dataStore.journalEntries.unshift(disburseJournal);
    await this.dataStore.persistJournalEntry(disburseJournal);

    // Update Chart of Accounts balances in real time and persist
    const loanReceivableCoa = this.dataStore.chartOfAccounts.find((c) => c.id === 'COA-1030' || c.accountCode === '1030');
    if (loanReceivableCoa) {
      loanReceivableCoa.currentBalance = FinancialEngine.add(loanReceivableCoa.currentBalance, principal);
      await this.dataStore.persistChartOfAccount(loanReceivableCoa);
    }

    const disburseSourceId = body.paymentMode === 'CASH' ? 'COA-1010' : 'COA-1020';
    const disburseSourceCoa = this.dataStore.chartOfAccounts.find((c) => c.id === disburseSourceId || c.accountCode === (body.paymentMode === 'CASH' ? '1010' : '1020'));
    if (disburseSourceCoa) {
      disburseSourceCoa.currentBalance = FinancialEngine.subtract(disburseSourceCoa.currentBalance, principal);
      await this.dataStore.persistChartOfAccount(disburseSourceCoa);
    }

    // Update Cash Drawer if disbursed in cash (BR-006)
    if (body.paymentMode === 'CASH') {
      const drawer = this.dataStore.cashDrawers.find((d) => d.businessDate === disburseDate && d.status === 'OPEN');
      if (drawer) {
        drawer.cashPaid = FinancialEngine.add(drawer.cashPaid, principal);
        drawer.expectedClosingBalance = FinancialEngine.subtract(drawer.expectedClosingBalance, principal);
        await this.dataStore.persistCashDrawer(drawer);
      }
    }

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Disbursement Officer',
      'LOAN_DISBURSED',
      'Loan',
      newLoan.id,
      undefined,
      newLoan,
      `Disbursed Loan ${loanNumber} of ₹ ${principal} to ${app.customerName}`,
    );

    return {
      loan: newLoan,
      schedule: installments,
    };
  }

  // ==========================================
  // ACTIVE LOANS & SCHEDULE VIEWER (§25, §27)
  // ==========================================

  @Get('loans')
  async getActiveLoans(
    @Query() query: PaginationParams & { status?: string; customerId?: string },
  ) {
    await this.dataStore.refreshIfStale();
    let list = [...this.dataStore.loans];

    if (query.search) {
      const s = query.search.toLowerCase();
      list = list.filter(
        (l) =>
          l.loanNumber.toLowerCase().includes(s) ||
          l.customerName?.toLowerCase().includes(s) ||
          l.customerNumber?.toLowerCase().includes(s),
      );
    }

    if (query.status) {
      list = list.filter((l) => l.status === query.status);
    }

    if (query.customerId) {
      list = list.filter((l) => l.customerId === query.customerId);
    }

    return {
      items: list,
      total: list.length,
    };
  }

  @Get('loans/:id')
  async getLoanDetails(@Param('id') id: string) {
    await this.dataStore.refreshIfStale();
    const loan = this.dataStore.loans.find((l) => l.id === id || l.loanNumber === id);
    if (!loan) {
      throw new NotFoundException(`Loan not found for identifier: ${id}`);
    }

    const schedule = this.dataStore.loanInstallments.filter((i) => i.loanId === loan.id);
    const transactions = this.dataStore.transactions.filter((t) => t.loanId === loan.id);

    return {
      loan,
      schedule,
      transactions,
    };
  }

  @Delete('loan-applications/:id')
  @Patch('loan-applications/:id')
  updateLoanApplication(
    @Param('id') id: string,
    @Body() body: Partial<ILoanApplication>,
    @CurrentUser() user: IUser,
  ) {
    const index = this.dataStore.loanApplications.findIndex((a) => a.id === id || a.applicationNumber === id);
    if (index === -1) {
      throw new NotFoundException(`Loan application not found: ${id}`);
    }

    const currentApp = this.dataStore.loanApplications[index];
    const oldVal = { ...currentApp };

    if (body.requestedAmount !== undefined) currentApp.requestedAmount = Number(body.requestedAmount);
    if (body.requestedTenureMonths !== undefined) currentApp.requestedTenureMonths = Number(body.requestedTenureMonths);
    if (body.purpose) currentApp.purpose = body.purpose;
    if (body.status) currentApp.status = body.status;

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Admin',
      'LOAN_APPLICATION_UPDATED',
      'LoanApplication',
      currentApp.id,
      oldVal,
      currentApp,
      `Updated loan application ${currentApp.applicationNumber}`,
    );

    return currentApp;
  }

  @Patch('loans/:id')
  async updateLoan(
    @Param('id') id: string,
    @Body() body: Partial<ILoan>,
    @CurrentUser() user: IUser,
  ) {
    const index = this.dataStore.loans.findIndex((l) => l.id === id || l.loanNumber === id);
    if (index === -1) {
      throw new NotFoundException(`Loan not found: ${id}`);
    }

    const currentLoan = this.dataStore.loans[index];
    const oldVal = { ...currentLoan };

    if (body.status) currentLoan.status = body.status;
    if (body.recoveryBucket) currentLoan.recoveryBucket = body.recoveryBucket;
    if (body.outstandingPrincipal !== undefined) currentLoan.outstandingPrincipal = Number(body.outstandingPrincipal);
    if (body.overdueAmount !== undefined) currentLoan.overdueAmount = Number(body.overdueAmount);
    if (body.daysPastDue !== undefined) currentLoan.daysPastDue = Number(body.daysPastDue);

    await this.dataStore.persistLoan(currentLoan);

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Admin',
      'LOAN_UPDATED',
      'Loan',
      currentLoan.id,
      oldVal,
      currentLoan,
      `Updated loan ${currentLoan.loanNumber} status to ${currentLoan.status}`,
    );

    return currentLoan;
  }

  @Delete('loan-applications/:id')
  deleteLoanApplication(@Param('id') id: string, @CurrentUser() user: IUser) {
    const index = this.dataStore.loanApplications.findIndex((a) => a.id === id || a.applicationNumber === id);
    if (index === -1) {
      throw new NotFoundException(`Loan application not found: ${id}`);
    }

    const removed = this.dataStore.loanApplications.splice(index, 1)[0];

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Admin',
      'LOAN_APPLICATION_DELETED',
      'LoanApplication',
      removed.id,
      removed,
      undefined,
      `Deleted loan application ${removed.applicationNumber}`,
    );

    return { message: `Loan application ${removed.applicationNumber} deleted successfully.`, id: removed.id };
  }

  @Delete('loans/:id')
  async deleteLoan(@Param('id') id: string, @CurrentUser() user: IUser) {
    const index = this.dataStore.loans.findIndex((l) => l.id === id || l.loanNumber === id);
    if (index === -1) {
      throw new NotFoundException(`Loan not found: ${id}`);
    }

    const removed = this.dataStore.loans.splice(index, 1)[0];
    await this.dataStore.deleteLoan(removed.id);
    await this.dataStore.deleteLoanInstallments(removed.id);

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Admin',
      'LOAN_DELETED',
      'Loan',
      removed.id,
      removed,
      undefined,
      `Deleted loan account ${removed.loanNumber}`,
    );

    return { message: `Loan ${removed.loanNumber} removed successfully.`, id: removed.id };
  }
}
