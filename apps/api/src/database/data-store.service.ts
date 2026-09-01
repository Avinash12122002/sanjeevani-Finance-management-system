import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  UserRole,
  CustomerStatus,
  ProductType,
  RegulatoryStatus,
  AccountStatus,
  TransactionType,
  TransactionStatus,
  InterestMethod,
  InstallmentStatus,
  CashDrawerStatus,
  BusinessDateStatus,
  AccountClassification,
  IBranch,
  IUser,
  IEmployee,
  ICustomer,
  ICustomerKYC,
  INominee,
  IProduct,
  IAccount,
  IRDInstallment,
  ILoanApplication,
  ICreditAssessment,
  ILoan,
  ILoanInstallment,
  ITransaction,
  IReceipt,
  ICashDrawer,
  IChartOfAccount,
  IJournalEntry,
  IBusinessDayClosure,
  IAuditLog,
  IComplaint,
  IRecoveryCase,
  IDashboardMetrics,
  IRedAlert,
} from '@sanjeevani/shared-types';
import { FinancialEngine } from '@sanjeevani/financial-engine';

@Injectable()
export class DataStoreService implements OnModuleInit {
  // Primary Collections (Clean Initial State)
  branches: IBranch[] = [];
  users: IUser[] = [];
  employees: IEmployee[] = [];
  customers: ICustomer[] = [];
  kycDocuments: ICustomerKYC[] = [];
  nominees: INominee[] = [];
  products: IProduct[] = [];
  accounts: IAccount[] = [];
  rdInstallments: IRDInstallment[] = [];
  loanApplications: ILoanApplication[] = [];
  creditAssessments: ICreditAssessment[] = [];
  loans: ILoan[] = [];
  loanInstallments: ILoanInstallment[] = [];
  transactions: ITransaction[] = [];
  receipts: IReceipt[] = [];
  cashDrawers: ICashDrawer[] = [];
  chartOfAccounts: IChartOfAccount[] = [];
  journalEntries: IJournalEntry[] = [];
  businessDayClosures: IBusinessDayClosure[] = [];
  auditLogs: IAuditLog[] = [];
  complaints: IComplaint[] = [];
  recoveryCases: IRecoveryCase[] = [];
  redAlerts: IRedAlert[] = [];

  // ID Counters (Clean Initial Production State)
  private counters = {
    customer: 0,
    employee: 1,
    branch: 1,
    account: 0,
    loan: 0,
    loanApp: 0,
    transaction: 0,
    receipt: 0,
    journal: 0,
    complaint: 0,
  };

  onModuleInit() {
    this.seedInitialMasterData();
  }

  // ==========================================
  // AUTO-GENERATOR ID METHODS (§105)
  // ==========================================
  nextCustomerNumber(): string {
    this.counters.customer++;
    return `SJF-CUS-${String(this.counters.customer).padStart(6, '0')}`;
  }

  nextEmployeeNumber(): string {
    this.counters.employee++;
    return `SJF-EMP-${String(this.counters.employee).padStart(6, '0')}`;
  }

  nextTransactionNumber(): string {
    this.counters.transaction++;
    const year = new Date().getFullYear();
    return `SJF-TXN-${year}-${String(this.counters.transaction).padStart(8, '0')}`;
  }

  nextReceiptNumber(): string {
    this.counters.receipt++;
    const year = new Date().getFullYear();
    return `SJF-RCP-${year}-${String(this.counters.receipt).padStart(8, '0')}`;
  }

  nextLoanNumber(): string {
    this.counters.loan++;
    const year = new Date().getFullYear();
    return `SJF-LN-${year}-${String(this.counters.loan).padStart(6, '0')}`;
  }

  nextLoanAppNumber(): string {
    this.counters.loanApp++;
    const year = new Date().getFullYear();
    return `SJF-LA-${year}-${String(this.counters.loanApp).padStart(6, '0')}`;
  }

  nextAccountNumber(type: ProductType): string {
    this.counters.account++;
    const year = new Date().getFullYear();
    const prefix = type === ProductType.RD ? 'RD' : type === ProductType.TERM_DEPOSIT ? 'TD' : 'SAV';
    return `SJF-${prefix}-${year}-${String(this.counters.account).padStart(6, '0')}`;
  }

  nextJournalNumber(): string {
    this.counters.journal++;
    const year = new Date().getFullYear();
    return `SJF-JRN-${year}-${String(this.counters.journal).padStart(6, '0')}`;
  }

  nextComplaintNumber(): string {
    this.counters.complaint++;
    const year = new Date().getFullYear();
    return `SJF-CMP-${year}-${String(this.counters.complaint).padStart(6, '0')}`;
  }

  // ==========================================
  // AUDIT LOG RECORDER (BR-011, §50)
  // ==========================================
  logAudit(
    userId: string,
    userName: string,
    eventType: string,
    entityType: string,
    entityId: string,
    oldValue?: any,
    newValue?: any,
    reason?: string,
  ) {
    const log: IAuditLog = {
      id: `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId,
      userName,
      eventType,
      entityType,
      entityId,
      oldValue,
      newValue,
      reason,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
  }

  // ==========================================
  // SEED CLEAN OPERATIONAL MASTER DATA
  // ==========================================
  private seedInitialMasterData() {
    // 1. Primary Operating Branch Master (§2)
    this.branches = [
      {
        id: 'BR-001',
        branchCode: 'SJF-BR001',
        name: 'Head Office - Main Branch',
        address: 'Administrative Head Office',
        city: 'Agra',
        state: 'Uttar Pradesh',
        phone: '+91 562 2520101',
        status: 'ACTIVE',
        openedAt: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      },
    ];

    // 2. Initial System Super Admin (§3, §45)
    this.users = [
      {
        id: 'USR-001',
        username: 'owner_admin',
        email: 'owner@sanjeevanifinance.com',
        mobile: '9876543210',
        roles: [UserRole.SUPER_ADMIN],
        branchId: 'BR-001',
        branchName: 'Head Office - Main Branch',
        employeeId: 'EMP-001',
        employeeName: 'System Administrator (Owner)',
        isActive: true,
        is2faEnabled: true,
        createdAt: new Date().toISOString(),
      },
    ];

    this.employees = [
      {
        id: 'EMP-001',
        employeeNumber: 'SJF-EMP-000001',
        userId: 'USR-001',
        branchId: 'BR-001',
        branchCode: 'SJF-BR001',
        branchName: 'Head Office - Main Branch',
        name: 'System Administrator (Owner)',
        mobile: '9876543210',
        email: 'owner@sanjeevanifinance.com',
        designation: UserRole.SUPER_ADMIN,
        joiningDate: new Date().toISOString().split('T')[0],
        salary: 0,
        employmentStatus: 'ACTIVE',
        createdAt: new Date().toISOString(),
      },
    ];

    // 3. Approved Products Master (§13)
    this.products = [
      {
        id: 'PRD-001',
        productCode: 'SJF-PRD-SAV01',
        productName: 'Sanjeevani Regular Savings',
        productType: ProductType.SAVINGS,
        minimumAmount: 500,
        maximumAmount: 500000,
        minimumTenureMonths: 0,
        maximumTenureMonths: 120,
        interestMethod: InterestMethod.SIMPLE_INTEREST,
        interestRate: 4.5,
        prematureAllowed: true,
        requiresNominee: true,
        regulatoryStatus: RegulatoryStatus.APPROVED,
        isEnabled: true,
        effectiveFrom: '2024-01-01',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'PRD-002',
        productCode: 'SJF-PRD-RD01',
        productName: 'Sanjeevani Monthly Sanchay RD',
        productType: ProductType.RD,
        minimumAmount: 1000,
        maximumAmount: 50000,
        minimumTenureMonths: 12,
        maximumTenureMonths: 60,
        interestMethod: InterestMethod.COMPOUND_INTEREST,
        interestRate: 8.5,
        penaltyRate: 2.0,
        prematureAllowed: true,
        prematurePenaltyRate: 1.0,
        requiresNominee: true,
        regulatoryStatus: RegulatoryStatus.APPROVED,
        isEnabled: true,
        effectiveFrom: '2024-01-01',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'PRD-003',
        productCode: 'SJF-PRD-TD01',
        productName: 'Sanjeevani Samriddhi Fixed Deposit',
        productType: ProductType.TERM_DEPOSIT,
        minimumAmount: 10000,
        maximumAmount: 2500000,
        minimumTenureMonths: 12,
        maximumTenureMonths: 60,
        interestMethod: InterestMethod.COMPOUND_INTEREST,
        interestRate: 9.5,
        prematureAllowed: true,
        prematurePenaltyRate: 1.5,
        requiresNominee: true,
        regulatoryStatus: RegulatoryStatus.APPROVED,
        isEnabled: true,
        effectiveFrom: '2024-01-01',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'PRD-004',
        productCode: 'SJF-PRD-LN-MSME',
        productName: 'Vyapar Unnati MSME Business Loan',
        productType: ProductType.LOAN,
        minimumAmount: 25000,
        maximumAmount: 500000,
        minimumTenureMonths: 6,
        maximumTenureMonths: 36,
        interestMethod: InterestMethod.REDUCING_BALANCE,
        interestRate: 14.0,
        penaltyRate: 3.0,
        prematureAllowed: true,
        requiresNominee: false,
        regulatoryStatus: RegulatoryStatus.APPROVED,
        isEnabled: true,
        effectiveFrom: '2024-01-01',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'PRD-005',
        productCode: 'SJF-PRD-LN-MICRO',
        productName: 'Mahila Shakti Micro Enterprise Loan',
        productType: ProductType.LOAN,
        minimumAmount: 10000,
        maximumAmount: 100000,
        minimumTenureMonths: 6,
        maximumTenureMonths: 24,
        interestMethod: InterestMethod.FLAT_RATE,
        interestRate: 12.0,
        penaltyRate: 2.0,
        prematureAllowed: true,
        requiresNominee: false,
        regulatoryStatus: RegulatoryStatus.APPROVED,
        isEnabled: true,
        effectiveFrom: '2024-01-01',
        createdAt: new Date().toISOString(),
      },
    ];

    // 4. Standard Chart of Accounts (§39)
    this.chartOfAccounts = [
      { id: 'COA-1010', accountCode: '1010', accountName: 'Cash In Hand (Vault)', accountType: AccountClassification.ASSET, currentBalance: 0, isActive: true },
      { id: 'COA-1020', accountCode: '1020', accountName: 'Bank Accounts (Current/Settlement)', accountType: AccountClassification.ASSET, currentBalance: 0, isActive: true },
      { id: 'COA-1030', accountCode: '1030', accountName: 'Loan Principal Portfolio Receivable', accountType: AccountClassification.ASSET, currentBalance: 0, isActive: true },
      { id: 'COA-2010', accountCode: '2010', accountName: 'Recurring Deposits Payable (Liability)', accountType: AccountClassification.LIABILITY, currentBalance: 0, isActive: true },
      { id: 'COA-2020', accountCode: '2020', accountName: 'Term Deposits Payable (Liability)', accountType: AccountClassification.LIABILITY, currentBalance: 0, isActive: true },
      { id: 'COA-3010', accountCode: '3010', accountName: 'Share Capital & Reserves', accountType: AccountClassification.EQUITY, currentBalance: 0, isActive: true },
      { id: 'COA-4010', accountCode: '4010', accountName: 'Interest Income from Loans', accountType: AccountClassification.INCOME, currentBalance: 0, isActive: true },
      { id: 'COA-4020', accountCode: '4020', accountName: 'Processing Fees & Documentation Revenue', accountType: AccountClassification.INCOME, currentBalance: 0, isActive: true },
      { id: 'COA-5010', accountCode: '5010', accountName: 'Interest Expense on Deposits', accountType: AccountClassification.EXPENSE, currentBalance: 0, isActive: true },
      { id: 'COA-5020', accountCode: '5020', accountName: 'Employee Salaries & Field Incentives', accountType: AccountClassification.EXPENSE, currentBalance: 0, isActive: true },
    ];

    // 5. Clean Active Cash Drawer (§34)
    const today = new Date().toISOString().split('T')[0];
    this.cashDrawers = [
      {
        id: 'CD-001',
        branchId: 'BR-001',
        branchName: 'Head Office - Main Branch',
        cashierId: 'USR-001',
        cashierName: 'System Administrator (Owner)',
        businessDate: today,
        openingBalance: 0,
        cashReceived: 0,
        cashPaid: 0,
        expectedClosingBalance: 0,
        physicalClosingBalance: 0,
        difference: 0,
        status: CashDrawerStatus.OPEN,
        openedAt: `${today}T09:00:00Z`,
      },
    ];

    // 6. Clean Business Day Closure (§64)
    this.businessDayClosures = [
      {
        id: 'BDC-001',
        branchId: 'BR-001',
        branchName: 'Head Office - Main Branch',
        businessDate: today,
        status: BusinessDateStatus.OPEN,
        totalCollections: 0,
        totalDisbursements: 0,
        cashInHand: 0,
        bankBalance: 0,
        mismatchCount: 0,
        closedBy: '',
        approvedBy: '',
        closedAt: '',
      },
    ];

    // Transactional collections initialized to clean empty arrays
    this.customers = [];
    this.kycDocuments = [];
    this.nominees = [];
    this.accounts = [];
    this.rdInstallments = [];
    this.loanApplications = [];
    this.creditAssessments = [];
    this.loans = [];
    this.loanInstallments = [];
    this.transactions = [];
    this.receipts = [];
    this.journalEntries = [];
    this.complaints = [];
    this.recoveryCases = [];
    this.redAlerts = [];
    this.auditLogs = [];
  }

  // ==========================================
  // DASHBOARD METRIC AGGREGATOR (§65)
  // ==========================================
  getOwnerDashboardMetrics(): IDashboardMetrics {
    const today = new Date().toISOString().split('T')[0];

    const totalMembers = this.customers.length;
    const activeMembers = this.customers.filter((c) => c.status === CustomerStatus.ACTIVE).length;
    const totalActiveAccounts = this.accounts.filter((a) => a.status === AccountStatus.ACTIVE).length;

    let totalLoanOutstanding = 0;
    let totalOverdueAmount = 0;
    for (const l of this.loans) {
      if (l.status === 'ACTIVE' || l.status === 'OVERDUE') {
        totalLoanOutstanding = FinancialEngine.add(totalLoanOutstanding, l.outstandingPrincipal || 0);
        totalOverdueAmount = FinancialEngine.add(totalOverdueAmount, l.overdueAmount || 0);
      }
    }

    const overduePercentage = totalLoanOutstanding > 0 ? (totalOverdueAmount / totalLoanOutstanding) * 100 : 0;

    let cashInHand = 0;
    for (const cd of this.cashDrawers) {
      cashInHand = FinancialEngine.add(cashInHand, cd.expectedClosingBalance || cd.openingBalance || 0);
    }

    let totalCollectionToday = 0;
    let totalCollectionMonth = 0;
    let newLoanDisbursementMonth = 0;

    for (const tx of this.transactions) {
      if (tx.status === TransactionStatus.POSTED) {
        if (tx.transactionDate === today) {
          totalCollectionToday = FinancialEngine.add(totalCollectionToday, tx.amount || 0);
        }
        totalCollectionMonth = FinancialEngine.add(totalCollectionMonth, tx.amount || 0);
        if (tx.transactionType === TransactionType.LOAN_DISBURSEMENT) {
          newLoanDisbursementMonth = FinancialEngine.add(newLoanDisbursementMonth, tx.amount || 0);
        }
      }
    }

    let emiDueToday = 0;
    let emiCollectedToday = 0;
    for (const inst of this.loanInstallments) {
      if (inst.dueDate === today) {
        emiDueToday = FinancialEngine.add(emiDueToday, inst.totalDue || 0);
        if (inst.status === InstallmentStatus.PAID) {
          emiCollectedToday = FinancialEngine.add(emiCollectedToday, inst.amountPaid || 0);
        }
      }
    }

    const bankBalance = 0;
    const monthlyIncome = 0;
    const monthlyExpense = 0;
    const netResult = FinancialEngine.subtract(monthlyIncome, monthlyExpense);

    return {
      totalMembers,
      activeMembers,
      totalActiveAccounts,
      totalCollectionToday,
      totalCollectionMonth,
      totalLoanOutstanding,
      newLoanDisbursementMonth,
      emiDueToday,
      emiCollectedToday,
      totalOverdueAmount,
      overduePercentage: Number(overduePercentage.toFixed(2)),
      cashInHand,
      bankBalance,
      monthlyIncome,
      monthlyExpense,
      netResult,
      cashMismatchAmount: 0,
    };
  }
}
