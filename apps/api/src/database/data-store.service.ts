import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import {
  UserRole,
  CustomerStatus,
  KYCStatus,
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
  RecoveryBucket,
  PaymentMode,
  ComplaintStatus,
  PriorityLevel,
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
import { CREATE_TABLES_SQL, SEED_MASTER_DATA_SQL } from './schema.sql';

@Injectable()
export class DataStoreService implements OnModuleInit {
  private readonly logger = new Logger(DataStoreService.name);
  private pool: Pool | null = null;

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
  customerPasswordMap = new Map<string, string>();

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

  async onModuleInit() {
    // 1. Always seed clean in-memory defaults first
    this.seedInitialMasterData();

    // 2. Automatically connect, provision tables and sync with PostgreSQL
    await this.initPostgres();
  }

  private async initPostgres() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      this.logger.warn('DATABASE_URL not configured. Operating in high-speed in-memory mode.');
      return;
    }

    try {
      this.logger.log('Connecting to PostgreSQL database...');
      // Strip sslmode parameter from URL so ssl: { rejectUnauthorized: false } works seamlessly with cloud poolers
      const cleanUrl = dbUrl.replace(/[?&]sslmode=[^&]+/g, '').replace(/[?&]uselibpqcompat=[^&]+/g, '');
      // Resolve host to IPv4 before connecting (Render doesn't support IPv6 outbound)
      const parsedUrl = new URL(cleanUrl);
      let resolvedHost = parsedUrl.hostname;
      try {
        const dns = await import('dns/promises');
        const addresses = await dns.resolve4(parsedUrl.hostname);
        if (addresses && addresses[0]) {
          resolvedHost = addresses[0];
          this.logger.log(`Resolved ${parsedUrl.hostname} → ${resolvedHost} (IPv4)`);
        }
      } catch (_dnsErr) {
        // DNS resolve4 failed — fall back to original hostname
      }

      const ipv4Url = cleanUrl.replace(parsedUrl.hostname, resolvedHost);
      this.pool = new Pool({
        connectionString: ipv4Url,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 15000,
      });

      // Execute auto table provisioning (if permitted)
      try {
        await this.pool.query(CREATE_TABLES_SQL);
        try {
          await this.pool.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_password TEXT');
        } catch (colErr: any) {
          this.logger.debug(`Column verification notice: ${colErr?.message}`);
        }
        this.logger.log('✅ All PostgreSQL database tables & columns verified successfully.');
      } catch (ddlErr: any) {
        this.logger.warn(`Table verification notice (tables may already exist): ${ddlErr.message}`);
      }

      // Execute seed master data
      try {
        await this.pool.query(SEED_MASTER_DATA_SQL);
        this.logger.log('✅ Initial master data verified in PostgreSQL.');
      } catch (seedErr: any) {
        this.logger.warn(`Seed verification notice: ${seedErr.message}`);
      }

      // Hydrate state from PostgreSQL
      await this.loadFromPostgres();
      this.logger.log('✅ In-memory data store synchronized with PostgreSQL.');
    } catch (err: any) {
      this.logger.error(`PostgreSQL connection failed: ${err.message}. Falling back to in-memory mode.`);
    }
  }

  private async loadFromPostgres() {
    if (!this.pool) return;
    try {
      const [
        branchRes,
        userRes,
        custRes,
        accRes,
        loanRes,
        rcpRes,
        txnRes,
        cdRes,
        prodRes,
        empRes,
        coaRes,
        cmpRes,
        auditRes,
        schedRes,
        closureRes,
        jrnRes,
      ] = await Promise.all([
        this.pool.query('SELECT * FROM branches').catch(() => ({ rows: [] })),
        this.pool.query('SELECT * FROM users').catch(() => ({ rows: [] })),
        this.pool.query('SELECT * FROM customers ORDER BY created_at ASC').catch(() => ({ rows: [] })),
        this.pool.query('SELECT * FROM accounts ORDER BY created_at ASC').catch(() => ({ rows: [] })),
        this.pool.query('SELECT * FROM loans ORDER BY created_at ASC').catch(() => ({ rows: [] })),
        this.pool.query('SELECT * FROM receipts ORDER BY created_at ASC').catch(() => ({ rows: [] })),
        this.pool.query('SELECT * FROM transactions ORDER BY created_at ASC').catch(() => ({ rows: [] })),
        this.pool.query('SELECT * FROM cash_drawers ORDER BY opened_at DESC LIMIT 10').catch(() => ({ rows: [] })),
        this.pool.query('SELECT * FROM products ORDER BY created_at ASC').catch(() => ({ rows: [] })),
        this.pool.query('SELECT * FROM employees ORDER BY created_at ASC').catch(() => ({ rows: [] })),
        this.pool.query('SELECT * FROM chart_of_accounts ORDER BY account_code ASC').catch(() => ({ rows: [] })),
        this.pool.query('SELECT * FROM complaints ORDER BY created_at DESC LIMIT 100').catch(() => ({ rows: [] })),
        this.pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100').catch(() => ({ rows: [] })),
        this.pool.query('SELECT * FROM repayment_schedules ORDER BY installment_no ASC').catch(() => ({ rows: [] })),
        this.pool.query('SELECT * FROM daily_closures ORDER BY business_date DESC').catch(() => ({ rows: [] })),
        this.pool.query('SELECT * FROM journal_entries ORDER BY created_at DESC LIMIT 100').catch(() => ({ rows: [] })),
      ]);

      // Branches
      if (branchRes.rows.length > 0) {
        this.branches = branchRes.rows.map((r) => ({
          id: r.id,
          branchCode: r.branch_code,
          name: r.name,
          address: r.address,
          city: r.city,
          state: r.state,
          phone: r.phone,
          status: r.status,
          openedAt: r.opened_at ? new Date(r.opened_at).toISOString().split('T')[0] : '',
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : '',
        }));
      }

      // Users
      if (userRes.rows.length > 0) {
        this.users = userRes.rows.map((r) => ({
          id: r.id,
          username: r.username,
          email: r.email,
          mobile: r.mobile,
          roles: r.roles || [],
          branchId: r.branch_id,
          branchName: r.branch_name,
          employeeId: r.employee_id,
          employeeName: r.employee_name,
          isActive: r.is_active,
          is2faEnabled: r.is_2fa_enabled,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : '',
        }));
      }

      // Customers
      if (custRes.rows.length > 0) {
        this.customers = custRes.rows.map((r) => ({
          id: r.id,
          customerNumber: r.customer_number,
          branchId: r.branch_id || 'BR-001',
          branchCode: 'SJF-BR001',
          branchName: 'Head Office - Main Branch',
          firstName: r.full_name?.split(' ')[0] || r.full_name || 'Member',
          middleName: undefined,
          lastName: r.full_name?.split(' ').slice(1).join(' ') || '',
          fatherOrSpouseName: 'Not Specified',
          dateOfBirth: '1990-01-01',
          gender: 'MALE',
          mobile: r.mobile,
          email: r.email || undefined,
          aadhaar: r.aadhaar || undefined,
          pan: r.pan || undefined,
          addressLine1: r.address || 'Address not specified',
          city: r.city || 'Delhi',
          state: r.state || 'Delhi',
          postalCode: r.postal_code || '110086',
          joiningDate: r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : '',
          status: CustomerStatus.ACTIVE,
          kycStatus: r.kyc_status === 'VERIFIED' ? KYCStatus.VERIFIED : KYCStatus.PENDING,
          createdBy: 'USR-001',
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : '',
          updatedAt: r.created_at ? new Date(r.created_at).toISOString() : '',
        }));
        this.counters.customer = this.customers.length;

        custRes.rows.forEach((r) => {
          if (r.portal_password) {
            this.customerPasswordMap.set(r.id, r.portal_password);
          }
        });
      }

      // Accounts
      if (accRes.rows.length > 0) {
        this.accounts = accRes.rows.map((r) => ({
          id: r.id,
          accountNumber: r.account_number,
          customerId: r.customer_id,
          customerName: r.customer_name,
          productId: r.product_id || 'PRD-001',
          productName: r.product_name || 'Savings',
          productType: (r.product_type as ProductType) || ProductType.SAVINGS,
          branchId: r.branch_id || 'BR-001',
          branchName: r.branch_name || 'Head Office - Main Branch (Delhi)',
          openingDate: r.opened_at ? new Date(r.opened_at).toISOString().split('T')[0] : '',
          principalAmount: Number(r.monthly_deposit || r.balance || 0),
          interestRate: Number(r.interest_rate || 0),
          tenureMonths: r.tenure_months || 12,
          maturityAmount: Number(r.maturity_amount || 0),
          maturityDate: r.maturity_date ? new Date(r.maturity_date).toISOString().split('T')[0] : '',
          currentBalance: Number(r.balance || 0),
          status: r.status === 'ACTIVE' ? AccountStatus.ACTIVE : AccountStatus.CLOSED,
          createdBy: 'USR-001',
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : '',
          updatedAt: r.created_at ? new Date(r.created_at).toISOString() : '',
        }));
        this.counters.account = this.accounts.length;
      }

      // Loans
      if (loanRes.rows.length > 0) {
        this.loans = loanRes.rows.map((r) => ({
          id: r.id,
          loanNumber: r.loan_number,
          customerId: r.customer_id,
          customerName: r.customer_name,
          loanApplicationId: `LA-${r.id}`,
          branchId: r.branch_id || 'BR-001',
          principal: Number(r.principal_amount || 0),
          annualInterestRate: Number(r.interest_rate || 0),
          interestMethod: (r.interest_method as InterestMethod) || InterestMethod.REDUCING_BALANCE,
          tenureMonths: r.tenure_months || 12,
          emiAmount: Number(r.emi_amount || 0),
          totalPayable: Number(r.total_payable || 0),
          totalInterest: Number(r.total_payable || 0) - Number(r.principal_amount || 0),
          disbursementDate: r.disbursed_at ? new Date(r.disbursed_at).toISOString().split('T')[0] : '',
          firstDueDate: r.disbursed_at ? new Date(r.disbursed_at).toISOString().split('T')[0] : '',
          finalDueDate: r.mature_at ? new Date(r.mature_at).toISOString().split('T')[0] : '',
          outstandingPrincipal: Number(r.principal_outstanding || 0),
          totalPaid: Number(r.total_paid || 0),
          overdueAmount: 0,
          daysPastDue: 0,
          recoveryBucket: RecoveryBucket.CURRENT,
          status: (r.status as any) || 'ACTIVE',
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : '',
        }));
        this.counters.loan = this.loans.length;
      }

      // Receipts
      if (rcpRes.rows.length > 0) {
        this.receipts = rcpRes.rows.map((r) => ({
          id: r.id,
          receiptNumber: r.receipt_number,
          transactionId: r.transaction_id || '',
          customerId: r.customer_id,
          customerName: r.customer_name,
          customerNumber: this.customers.find((c) => c.id === r.customer_id)?.customerNumber || r.customer_id,
          amount: Number(r.amount || 0),
          paymentMode: (r.payment_mode as PaymentMode) || PaymentMode.CASH,
          paymentFor: 'Payment Collection',
          collectorId: r.collector_id || 'USR-006',
          collectorName: r.collector_name || 'Collector',
          branchName: 'Head Office - Main Branch (Delhi)',
          generatedAt: r.created_at ? new Date(r.created_at).toISOString() : '',
          deliveryStatus: 'SENT',
        }));
        this.counters.receipt = this.receipts.length;
      }

      // Transactions
      if (txnRes.rows.length > 0) {
        this.transactions = txnRes.rows.map((r) => ({
          id: r.id,
          transactionNumber: r.transaction_number,
          branchId: r.branch_id || 'BR-001',
          customerId: r.customer_id,
          accountId: r.account_id,
          transactionType: (r.transaction_type as TransactionType) || TransactionType.DEPOSIT,
          amount: Number(r.amount || 0),
          paymentMode: (r.payment_mode as PaymentMode) || PaymentMode.CASH,
          transactionDate: r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : '',
          status: (r.status as TransactionStatus) || TransactionStatus.POSTED,
          runningBalance: Number(r.running_balance || 0),
          createdBy: r.performed_by || 'USR-001',
          referenceNumber: r.reference_no,
          remarks: r.description,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : '',
        }));
        this.counters.transaction = this.transactions.length;
      }

      // Cash Drawers
      if (cdRes.rows.length > 0) {
        this.cashDrawers = cdRes.rows.map((r) => ({
          id: r.id,
          branchId: r.branch_id,
          branchName: r.branch_name,
          cashierId: r.cashier_id,
          cashierName: r.cashier_name,
          businessDate: r.business_date ? new Date(r.business_date).toISOString().split('T')[0] : '',
          openingBalance: Number(r.opening_balance || 0),
          cashReceived: Number(r.cash_received || 0),
          cashPaid: Number(r.cash_paid || 0),
          expectedClosingBalance: Number(r.expected_closing_balance || 0),
          physicalClosingBalance: Number(r.physical_closing_balance || 0),
          difference: Number(r.difference || 0),
          status: r.status,
          openedAt: r.opened_at ? new Date(r.opened_at).toISOString() : '',
          closedAt: r.closed_at ? new Date(r.closed_at).toISOString() : undefined,
        }));
      }

      // Products
      if (prodRes.rows.length > 0) {
        this.products = prodRes.rows.map((r) => ({
          id: r.id,
          productCode: r.product_code,
          productName: r.product_name,
          productType: (r.product_type as ProductType) || ProductType.SAVINGS,
          interestRate: Number(r.interest_rate || 0),
          minimumTenureMonths: r.min_tenure_months || 12,
          maximumTenureMonths: r.max_tenure_months || 60,
          minimumAmount: Number(r.min_amount || 100),
          maximumAmount: Number(r.max_amount || 1000000),
          isEnabled: r.is_enabled !== false,
          interestMethod: InterestMethod.REDUCING_BALANCE,
          penaltyRate: 2,
          prematureAllowed: true,
          effectiveFrom: '2026-04-01',
          requiresNominee: true,
          regulatoryStatus: RegulatoryStatus.APPROVED,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : '',
        }));
      }

      // Employees
      if (empRes.rows.length > 0) {
        this.employees = empRes.rows.map((r) => ({
          id: r.id,
          employeeNumber: r.employee_number,
          userId: r.user_id || 'USR-001',
          branchId: r.branch_id || 'BR-001',
          branchCode: r.branch_code || 'SJF-BR001',
          branchName: r.branch_name || 'Head Office - Main Branch',
          name: r.name,
          mobile: r.mobile,
          email: r.email,
          designation: r.designation,
          joiningDate: r.joining_date ? new Date(r.joining_date).toISOString().split('T')[0] : '',
          employmentStatus: r.employment_status || 'ACTIVE',
          salary: Number(r.salary || 0),
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : '',
        }));
        this.counters.employee = this.employees.length;
      }

      // Chart of Accounts
      if (coaRes.rows.length > 0) {
        this.chartOfAccounts = coaRes.rows.map((r) => ({
          id: r.id,
          accountCode: r.account_code,
          accountName: r.account_name,
          accountType: r.account_type as any,
          currentBalance: Number(r.current_balance || 0),
          isActive: r.is_active !== false,
          currency: 'INR',
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : '',
        }));
      }

      // Complaints
      if (cmpRes.rows.length > 0) {
        this.complaints = cmpRes.rows.map((r) => ({
          id: r.id,
          complaintNumber: r.complaint_number,
          customerId: r.customer_id,
          customerName: r.customer_name,
          customerNumber: r.customer_number,
          category: r.category || 'Service Request',
          description: r.description,
          priority: (r.priority as PriorityLevel) || PriorityLevel.MEDIUM,
          status: (r.status as ComplaintStatus) || ComplaintStatus.OPEN,
          resolution: r.resolution,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : '',
        }));
      }

      // Audit Logs
      if (auditRes.rows.length > 0) {
        this.auditLogs = auditRes.rows.map((r) => ({
          id: r.id,
          userId: r.user_id,
          userName: r.user_name,
          eventType: r.action,
          entityType: r.entity_type || r.entity || 'General',
          entityId: r.entity_id || '',
          oldValue: undefined,
          newValue: undefined,
          reason: typeof r.details === 'string' ? r.details : JSON.stringify(r.details || ''),
          ipAddress: r.client_ip || '127.0.0.1',
          timestamp: r.created_at ? new Date(r.created_at).toISOString() : '',
        }));
      }

      // Repayment Schedules (EMIs)
      if (schedRes.rows.length > 0) {
        this.loanInstallments = schedRes.rows.map((r) => ({
          id: r.id,
          loanId: r.loan_id,
          installmentNumber: r.installment_no,
          dueDate: r.due_date ? new Date(r.due_date).toISOString().split('T')[0] : '',
          openingPrincipal: 0,
          principalDue: Number(r.principal_component || 0),
          interestDue: Number(r.interest_component || 0),
          feeDue: 0,
          penaltyDue: Number(r.penalty_charged || 0),
          totalDue: Number(r.emi_amount || 0),
          amountPaid: r.status === 'PAID' ? Number(r.emi_amount || 0) : 0,
          principalPaid: r.status === 'PAID' ? Number(r.principal_component || 0) : 0,
          interestPaid: r.status === 'PAID' ? Number(r.interest_component || 0) : 0,
          closingPrincipal: 0,
          paidAt: r.paid_date ? new Date(r.paid_date).toISOString() : undefined,
          status: (r.status as InstallmentStatus) || InstallmentStatus.DUE,
        }));
      }

      // Daily Closures / Business Date Locks
      if (closureRes.rows.length > 0) {
        this.businessDayClosures = closureRes.rows.map((r) => ({
          id: r.id,
          branchId: r.branch_id || 'BR-001',
          branchName: r.branch_name || 'Head Office - Main Branch',
          businessDate: r.business_date ? new Date(r.business_date).toISOString().split('T')[0] : '',
          openingCash: Number(r.opening_cash || 0),
          totalCollections: Number(r.total_collections || 0),
          totalDisbursements: Number(r.total_disbursements || 0),
          cashInHand: Number(r.closing_cash || 0),
          bankBalance: 0,
          mismatchCount: 0,
          status: (r.status as BusinessDateStatus) || BusinessDateStatus.LOCKED,
          closedBy: r.closed_by_id,
          closedByName: r.closed_by_name,
          closedAt: r.closed_at ? new Date(r.closed_at).toISOString() : '',
        }));
      }

      // General Journal Entries
      if (jrnRes.rows.length > 0) {
        this.journalEntries = jrnRes.rows.map((r) => ({
          id: r.id,
          journalNumber: r.journal_number,
          businessDate: r.business_date ? new Date(r.business_date).toISOString().split('T')[0] : '',
          description: r.description || '',
          totalDebit: Number(r.total_debit || 0),
          totalCredit: Number(r.total_credit || 0),
          status: r.status || 'POSTED',
          createdBy: r.created_by,
          approvedBy: r.approved_by,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : '',
          lines: Array.isArray(r.lines) ? r.lines : typeof r.lines === 'string' ? (() => { try { return JSON.parse(r.lines); } catch { return []; } })() : [],
        }));
      }
    } catch (e: any) {
      this.logger.warn(`Could not load initial rows from PostgreSQL: ${e.message}`);
    }
  }

  private lastSyncTime = 0;
  private syncPromise: Promise<void> | null = null;

  /**
   * Refreshes in-memory store from PostgreSQL if stale (default maxAge = 3000ms).
   * Shares a single active syncPromise so concurrent requests wait together and don't duplicate work.
   */
  async refreshIfStale(maxAgeMs = 3000): Promise<void> {
    if (this.syncPromise) {
      return this.syncPromise;
    }
    const now = Date.now();
    if (now - this.lastSyncTime < maxAgeMs || !this.pool) {
      return;
    }
    this.syncPromise = (async () => {
      try {
        await this.loadFromPostgres();
        this.lastSyncTime = Date.now();
      } catch (e: any) {
        this.logger.warn(`Auto-refresh notice: ${e.message}`);
      } finally {
        this.syncPromise = null;
      }
    })();
    return this.syncPromise;
  }

  async forceSync(): Promise<void> {
    if (!this.pool) return;
    await this.loadFromPostgres();
    this.lastSyncTime = Date.now();
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

    // Asynchronously persist to PostgreSQL
    if (this.pool) {
      this.pool.query(
        `INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          log.id,
          userId || 'SYSTEM',
          userName || 'System',
          eventType,
          entityType || 'General',
          entityId || null,
          JSON.stringify({ reason: reason || '', details: newValue || {} }),
        ],
      ).catch((e) => this.logger.warn(`Failed to persist audit log: ${e.message}`));
    }
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
        name: 'Head Office - Main Branch (Delhi)',
        address: 'Administrative Head Office, Connaught Place',
        city: 'Delhi',
        state: 'Delhi',
        phone: '+91 11 23456789',
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

  /**
   * Check if a business date is locked (BR-009)
   */
  isDateLocked(date?: string): boolean {
    if (!date) return false;
    const closure = this.businessDayClosures.find((c) => c.businessDate === date);
    return closure ? closure.status === BusinessDateStatus.LOCKED : false;
  }

  // ==========================================
  // ASYNCHRONOUS POSTGRESQL PERSISTENCE HELPERS
  // ==========================================
  async persistCustomer(c: ICustomer) {
    if (!this.pool) return;
    try {
      const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Member';
      await this.pool.query(
        `INSERT INTO customers (id, customer_number, full_name, mobile, email, aadhaar, pan, address, city, state, kyc_status, risk_category, branch_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           mobile = EXCLUDED.mobile,
           email = EXCLUDED.email,
           aadhaar = EXCLUDED.aadhaar,
           pan = EXCLUDED.pan,
           kyc_status = EXCLUDED.kyc_status,
           address = EXCLUDED.address,
           city = EXCLUDED.city,
           state = EXCLUDED.state`,
        [
          c.id,
          c.customerNumber,
          fullName,
          c.mobile,
          c.email || null,
          (c as any).aadhaar || null,
          (c as any).pan || null,
          c.addressLine1 || null,
          c.city || null,
          c.state || null,
          c.kycStatus || 'VERIFIED',
          'LOW',
          c.branchId || null,
        ],
      );
    } catch (e: any) {
      this.logger.error(`Failed to persist customer ${c.id} to PostgreSQL: ${e.message}`);
    }
  }

  async persistAccount(a: IAccount) {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO accounts (id, account_number, customer_id, customer_name, product_id, product_name, product_type, branch_id, branch_name, balance, interest_rate, tenure_months, monthly_deposit, maturity_amount, maturity_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (id) DO UPDATE SET
           balance = EXCLUDED.balance,
           status = EXCLUDED.status`,
        [
          a.id,
          a.accountNumber,
          a.customerId,
          a.customerName || 'Account Holder',
          a.productId || null,
          a.productName || null,
          a.productType || null,
          a.branchId || null,
          a.branchName || null,
          a.currentBalance || 0,
          a.interestRate || 0,
          a.tenureMonths || 12,
          a.principalAmount || 0,
          a.maturityAmount || 0,
          a.maturityDate ? new Date(a.maturityDate) : null,
          a.status || 'ACTIVE',
        ],
      );
    } catch (e: any) {
      this.logger.error(`Failed to persist account ${a.id} to PostgreSQL: ${e.message}`);
    }
  }

  async persistLoan(l: ILoan) {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO loans (id, loan_number, customer_id, customer_name, branch_id, principal_amount, sanctioned_amount, disbursed_amount, interest_rate, interest_method, tenure_months, emi_amount, total_payable, total_paid, principal_outstanding, status, disbursed_at, mature_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         ON CONFLICT (id) DO UPDATE SET
           principal_outstanding = EXCLUDED.principal_outstanding,
           total_paid = EXCLUDED.total_paid,
           status = EXCLUDED.status`,
        [
          l.id,
          l.loanNumber,
          l.customerId,
          l.customerName || 'Borrower',
          l.branchId || null,
          l.principal || 0,
          l.principal || 0,
          l.principal || 0,
          l.annualInterestRate || 0,
          l.interestMethod || null,
          l.tenureMonths || 12,
          l.emiAmount || 0,
          l.totalPayable || 0,
          l.totalPaid || 0,
          l.outstandingPrincipal || 0,
          l.status || 'ACTIVE',
          l.disbursementDate ? new Date(l.disbursementDate) : null,
          l.finalDueDate ? new Date(l.finalDueDate) : null,
        ],
      );
    } catch (e: any) {
      this.logger.error(`Failed to persist loan ${l.id} to PostgreSQL: ${e.message}`);
    }
  }

  async persistReceipt(r: IReceipt) {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO receipts (id, receipt_number, transaction_id, customer_id, customer_name, payment_mode, amount, collector_id, collector_name, remarks)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [
          r.id,
          r.receiptNumber,
          r.transactionId || null,
          r.customerId,
          r.customerName,
          r.paymentMode || 'CASH',
          r.amount || 0,
          r.collectorId || null,
          r.collectorName || null,
          r.paymentFor || null,
        ],
      );
    } catch (e: any) {
      this.logger.error(`Failed to persist receipt ${r.id} to PostgreSQL: ${e.message}`);
    }
  }

  async persistTransaction(t: ITransaction) {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO transactions (id, transaction_number, account_id, customer_id, transaction_type, payment_mode, amount, running_balance, status, reference_no, branch_id, performed_by, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           running_balance = EXCLUDED.running_balance`,
        [
          t.id,
          t.transactionNumber,
          t.accountId || null,
          t.customerId || null,
          t.transactionType,
          t.paymentMode || 'CASH',
          t.amount || 0,
          (t as any).runningBalance || 0,
          t.status || 'POSTED',
          t.referenceNumber || null,
          t.branchId || null,
          t.createdBy || null,
          t.remarks || null,
        ],
      );
    } catch (e: any) {
      this.logger.error(`Failed to persist transaction ${t.id} to PostgreSQL: ${e.message}`);
    }
  }

  async persistCashDrawer(cd: ICashDrawer) {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO cash_drawers (id, branch_id, branch_name, cashier_id, cashier_name, business_date, opening_balance, cash_received, cash_paid, expected_closing_balance, physical_closing_balance, difference, status, opened_at, closed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO UPDATE SET
           cash_received = EXCLUDED.cash_received,
           cash_paid = EXCLUDED.cash_paid,
           expected_closing_balance = EXCLUDED.expected_closing_balance,
           physical_closing_balance = EXCLUDED.physical_closing_balance,
           difference = EXCLUDED.difference,
           status = EXCLUDED.status,
           closed_at = EXCLUDED.closed_at`,
        [
          cd.id,
          cd.branchId,
          cd.branchName,
          cd.cashierId,
          cd.cashierName,
          cd.businessDate ? new Date(cd.businessDate) : new Date(),
          cd.openingBalance || 0,
          cd.cashReceived || 0,
          cd.cashPaid || 0,
          cd.expectedClosingBalance || 0,
          cd.physicalClosingBalance || 0,
          cd.difference || 0,
          cd.status || 'OPEN',
          cd.openedAt ? new Date(cd.openedAt) : new Date(),
          cd.closedAt ? new Date(cd.closedAt) : null,
        ],
      );
    } catch (e: any) {
      this.logger.error(`Failed to persist cash drawer ${cd.id} to PostgreSQL: ${e.message}`);
    }
  }

  async persistUser(u: IUser) {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO users (id, username, email, mobile, roles, branch_id, branch_name, employee_id, employee_name, is_active, is_2fa_enabled, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
           username = EXCLUDED.username,
           email = EXCLUDED.email,
           mobile = EXCLUDED.mobile,
           roles = EXCLUDED.roles,
           branch_id = EXCLUDED.branch_id,
           branch_name = EXCLUDED.branch_name,
           employee_id = EXCLUDED.employee_id,
           employee_name = EXCLUDED.employee_name,
           is_active = EXCLUDED.is_active,
           password_hash = COALESCE(NULLIF(EXCLUDED.password_hash, ''), users.password_hash)`,
        [
          u.id,
          u.username,
          u.email || null,
          u.mobile || null,
          u.roles || ['SUPER_ADMIN'],
          u.branchId || null,
          u.branchName || null,
          u.employeeId || null,
          u.employeeName || null,
          u.isActive !== false,
          u.is2faEnabled || false,
          (u as any).passwordHash || 'Password@123',
        ],
      );
    } catch (e: any) {
      this.logger.error(`Failed to persist user ${u.id} to PostgreSQL: ${e.message}`);
    }
  }

  async deleteUser(id: string) {
    this.users = this.users.filter((u) => u.id !== id && u.username !== id);
    if (!this.pool) return;
    try {
      await this.pool.query('DELETE FROM users WHERE id = $1 OR username = $1', [id]);
    } catch (e: any) {
      this.logger.error(`Failed to delete user ${id} from PostgreSQL: ${e.message}`);
    }
  }

  async persistClosure(c: IBusinessDayClosure) {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO daily_closures (id, branch_id, branch_name, business_date, opening_cash, total_collections, total_disbursements, closing_cash, status, closed_by_id, closed_at, can_reopen)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           can_reopen = EXCLUDED.can_reopen`,
        [
          c.id,
          c.branchId,
          c.branchName || 'Main Branch',
          c.businessDate ? new Date(c.businessDate) : new Date(),
          c.cashInHand || 0,
          c.totalCollections || 0,
          c.totalDisbursements || 0,
          c.cashInHand || 0,
          c.status || 'LOCKED',
          c.closedBy || null,
          c.closedAt ? new Date(c.closedAt) : new Date(),
          true,
        ],
      );
    } catch (e: any) {
      this.logger.error(`Failed to persist closure ${c.id} to PostgreSQL: ${e.message}`);
    }
  }

  async persistProduct(p: IProduct) {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO products (id, product_code, product_name, product_type, interest_rate, min_tenure_months, max_tenure_months, min_amount, max_amount, is_enabled)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           product_name = EXCLUDED.product_name,
           interest_rate = EXCLUDED.interest_rate,
           min_tenure_months = EXCLUDED.min_tenure_months,
           max_tenure_months = EXCLUDED.max_tenure_months,
           min_amount = EXCLUDED.min_amount,
           max_amount = EXCLUDED.max_amount,
           is_enabled = EXCLUDED.is_enabled`,
        [
          p.id,
          p.productCode,
          p.productName,
          p.productType,
          p.interestRate || 0,
          p.minimumTenureMonths || 12,
          p.maximumTenureMonths || 60,
          p.minimumAmount || 100,
          p.maximumAmount || 1000000,
          p.isEnabled !== false,
        ],
      );
    } catch (e: any) {
      this.logger.error(`Failed to persist product ${p.id} to PostgreSQL: ${e.message}`);
    }
  }

  async deleteProduct(id: string) {
    this.products = this.products.filter((p) => p.id !== id && p.productCode !== id);
    if (!this.pool) return;
    try {
      await this.pool.query('DELETE FROM products WHERE id = $1 OR product_code = $1', [id]);
    } catch (e: any) {
      this.logger.error(`Failed to delete product ${id} from PostgreSQL: ${e.message}`);
    }
  }

  async persistBranch(b: IBranch) {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO branches (id, branch_code, name, address, city, state, phone, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           address = EXCLUDED.address,
           city = EXCLUDED.city,
           state = EXCLUDED.state,
           phone = EXCLUDED.phone,
           status = EXCLUDED.status`,
        [
          b.id,
          b.branchCode,
          b.name,
          b.address || null,
          b.city || null,
          b.state || null,
          b.phone || null,
          b.status || 'ACTIVE',
        ],
      );
    } catch (e: any) {
      this.logger.error(`Failed to persist branch ${b.id} to PostgreSQL: ${e.message}`);
    }
  }

  async deleteBranch(id: string) {
    this.branches = this.branches.filter((b) => b.id !== id && b.branchCode !== id);
    if (!this.pool) return;
    try {
      await this.pool.query('DELETE FROM branches WHERE id = $1 OR branch_code = $1', [id]);
    } catch (e: any) {
      this.logger.error(`Failed to delete branch ${id} from PostgreSQL: ${e.message}`);
    }
  }

  async persistEmployee(e: IEmployee) {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO employees (id, employee_number, branch_id, name, mobile, email, designation, joining_date, salary, employment_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           mobile = EXCLUDED.mobile,
           email = EXCLUDED.email,
           designation = EXCLUDED.designation,
           salary = EXCLUDED.salary,
           employment_status = EXCLUDED.employment_status`,
        [
          e.id,
          e.employeeNumber,
          e.branchId || 'BR-001',
          e.name,
          e.mobile,
          e.email || null,
          e.designation,
          e.joiningDate ? new Date(e.joiningDate) : new Date(),
          e.salary || 0,
          e.employmentStatus || 'ACTIVE',
        ],
      );
    } catch (err: any) {
      this.logger.error(`Failed to persist employee ${e.id} to PostgreSQL: ${err.message}`);
    }
  }

  async deleteEmployee(id: string) {
    this.employees = this.employees.filter((e) => e.id !== id && e.employeeNumber !== id);
    if (!this.pool) return;
    try {
      await this.pool.query('DELETE FROM employees WHERE id = $1 OR employee_number = $1', [id]);
    } catch (e: any) {
      this.logger.error(`Failed to delete employee ${id} from PostgreSQL: ${e.message}`);
    }
  }

  async deleteAccount(id: string) {
    this.accounts = this.accounts.filter((a) => a.id !== id && a.accountNumber !== id);
    this.rdInstallments = this.rdInstallments.filter((r) => r.rdAccountId !== id);
    if (!this.pool) return;
    try {
      await this.pool.query('DELETE FROM accounts WHERE id = $1 OR account_number = $1', [id]);
    } catch (e: any) {
      this.logger.error(`Failed to delete account ${id} from PostgreSQL: ${e.message}`);
    }
  }

  async deleteCustomer(id: string) {
    this.customers = this.customers.filter((c) => c.id !== id && c.customerNumber !== id);
    this.customerPasswordMap.delete(id);
    if (!this.pool) return;
    try {
      await this.pool.query('DELETE FROM customers WHERE id = $1 OR customer_number = $1', [id]);
    } catch (e: any) {
      this.logger.error(`Failed to delete customer ${id} from PostgreSQL: ${e.message}`);
    }
  }

  async deleteLoan(id: string) {
    this.loans = this.loans.filter((l) => l.id !== id && l.loanNumber !== id);
    this.loanInstallments = this.loanInstallments.filter((i) => i.loanId !== id);
    if (!this.pool) return;
    try {
      await this.pool.query('DELETE FROM loans WHERE id = $1 OR loan_number = $1', [id]);
    } catch (e: any) {
      this.logger.error(`Failed to delete loan ${id} from PostgreSQL: ${e.message}`);
    }
  }

  async persistLoanInstallment(inst: ILoanInstallment) {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO repayment_schedules (id, loan_id, installment_no, due_date, principal_component, interest_component, emi_amount, status, paid_date, penalty_charged)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           paid_date = EXCLUDED.paid_date,
           penalty_charged = EXCLUDED.penalty_charged`,
        [
          inst.id,
          inst.loanId,
          inst.installmentNumber,
          inst.dueDate ? new Date(inst.dueDate) : new Date(),
          inst.principalDue || 0,
          inst.interestDue || 0,
          inst.totalDue || 0,
          inst.status || 'DUE',
          inst.paidAt ? new Date(inst.paidAt) : null,
          inst.penaltyDue || 0,
        ],
      );
    } catch (e: any) {
      this.logger.error(`Failed to persist loan installment ${inst.id} to PostgreSQL: ${e.message}`);
    }
  }

  async persistLoanInstallments(installments: ILoanInstallment[]) {
    for (const inst of installments) {
      await this.persistLoanInstallment(inst);
    }
  }

  async deleteLoanInstallments(loanId: string) {
    this.loanInstallments = this.loanInstallments.filter((i) => i.loanId !== loanId);
    if (!this.pool) return;
    try {
      await this.pool.query('DELETE FROM repayment_schedules WHERE loan_id = $1', [loanId]);
    } catch (e: any) {
      this.logger.error(`Failed to delete repayment schedules for loan ${loanId} from PostgreSQL: ${e.message}`);
    }
  }

  async persistChartOfAccount(coa: IChartOfAccount) {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO chart_of_accounts (id, account_code, account_name, account_type, current_balance, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           account_name = EXCLUDED.account_name,
           current_balance = EXCLUDED.current_balance,
           is_active = EXCLUDED.is_active`,
        [coa.id, coa.accountCode, coa.accountName, coa.accountType, coa.currentBalance || 0, coa.isActive !== false],
      );
    } catch (e: any) {
      this.logger.error(`Failed to persist COA ${coa.accountCode} to PostgreSQL: ${e.message}`);
    }
  }

  async deleteChartOfAccount(id: string) {
    this.chartOfAccounts = this.chartOfAccounts.filter((c) => c.id !== id && c.accountCode !== id);
    if (!this.pool) return;
    try {
      await this.pool.query('DELETE FROM chart_of_accounts WHERE id = $1 OR account_code = $1', [id]);
    } catch (e: any) {
      this.logger.error(`Failed to delete COA ${id} from PostgreSQL: ${e.message}`);
    }
  }

  async persistJournalEntry(j: IJournalEntry) {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO journal_entries (id, journal_number, business_date, description, total_debit, total_credit, status, created_by, approved_by, lines)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           lines = EXCLUDED.lines`,
        [
          j.id,
          j.journalNumber,
          j.businessDate ? new Date(j.businessDate) : new Date(),
          j.description || '',
          j.totalDebit || 0,
          j.totalCredit || 0,
          j.status || 'POSTED',
          j.createdBy || null,
          j.approvedBy || null,
          JSON.stringify(j.lines || []),
        ],
      );
    } catch (e: any) {
      this.logger.error(`Failed to persist journal entry ${j.journalNumber} to PostgreSQL: ${e.message}`);
    }
  }

  async deleteJournalEntry(id: string) {
    this.journalEntries = this.journalEntries.filter((j) => j.id !== id && j.journalNumber !== id);
    if (!this.pool) return;
    try {
      await this.pool.query('DELETE FROM journal_entries WHERE id = $1 OR journal_number = $1', [id]);
    } catch (e: any) {
      this.logger.error(`Failed to delete journal entry ${id} from PostgreSQL: ${e.message}`);
    }
  }

  async persistComplaint(c: IComplaint) {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO complaints (id, complaint_number, customer_id, customer_name, customer_number, category, description, priority, status, resolution, resolved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           resolution = EXCLUDED.resolution,
           resolved_at = EXCLUDED.resolved_at`,
        [
          c.id,
          c.complaintNumber,
          c.customerId || null,
          c.customerName || null,
          c.customerNumber || null,
          c.category || 'General',
          c.description || '',
          c.priority || 'MEDIUM',
          c.status || 'OPEN',
          c.resolution || null,
          c.resolvedAt ? new Date(c.resolvedAt) : null,
        ],
      );
    } catch (e: any) {
      this.logger.error(`Failed to persist complaint ${c.id} to PostgreSQL: ${e.message}`);
    }
  }

  async deleteComplaint(id: string) {
    this.complaints = this.complaints.filter((c) => c.id !== id && c.complaintNumber !== id);
    if (!this.pool) return;
    try {
      await this.pool.query('DELETE FROM complaints WHERE id = $1 OR complaint_number = $1', [id]);
    } catch (e: any) {
      this.logger.error(`Failed to delete complaint ${id} from PostgreSQL: ${e.message}`);
    }
  }

  async deleteReceipt(id: string) {
    this.receipts = this.receipts.filter((r) => r.id !== id && r.receiptNumber !== id);
    if (this.pool) {
      try {
        await this.pool.query('DELETE FROM receipts WHERE id = $1 OR receipt_number = $1', [id]);
      } catch (e: any) {
        this.logger.error(`Failed to delete receipt ${id} from PostgreSQL: ${e.message}`);
      }
    }
  }

  async deleteCashDrawer(id: string) {
    this.cashDrawers = this.cashDrawers.filter((d) => d.id !== id);
    if (this.pool) {
      try {
        await this.pool.query('DELETE FROM cash_drawers WHERE id = $1', [id]);
      } catch (e: any) {
        this.logger.error(`Failed to delete cash drawer ${id} from PostgreSQL: ${e.message}`);
      }
    }
  }

  hasCustomerPassword(customerId: string): boolean {
    return this.customerPasswordMap.has(customerId);
  }

  getCustomerPassword(customerId: string): string | undefined {
    return this.customerPasswordMap.get(customerId);
  }

  async saveCustomerPassword(customerId: string, password: string): Promise<void> {
    this.customerPasswordMap.set(customerId, password);
    if (this.pool) {
      try {
        await this.pool.query('UPDATE customers SET portal_password = $1 WHERE id = $2', [password, customerId]);
      } catch (err: any) {
        this.logger.error(`Failed to persist portal password for customer ${customerId}: ${err.message}`);
      }
    }
  }

  // --- RAW DATABASE TABLES EXPLORER & CRUD (15 TABLES) ---
  readonly ALL_DB_TABLES = [
    'accounts',
    'audit_logs',
    'branches',
    'cash_drawers',
    'chart_of_accounts',
    'complaints',
    'customers',
    'daily_closures',
    'employees',
    'journal_entries',
    'loans',
    'products',
    'receipts',
    'repayment_schedules',
    'transactions',
    'users',
  ] as const;

  async getTableMetadata() {
    await this.refreshIfStale();
    const result: any[] = [];

    for (const table of this.ALL_DB_TABLES) {
      let count = 0;
      let columns: string[] = [];

      if (this.pool) {
        try {
          const countRes = await this.pool.query(`SELECT COUNT(*) as count FROM ${table}`);
          count = parseInt(countRes.rows[0]?.count || '0', 10);
          const colRes = await this.pool.query(
            `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
            [table]
          );
          columns = colRes.rows.map((r: any) => r.column_name);
        } catch {
          // Fallback if information_schema query fails
        }
      }

      if (columns.length === 0) {
        columns = this.getDefaultTableColumns(table);
      }
      if (count === 0 && !this.pool) {
        count = this.getInMemoryCount(table);
      }

      result.push({
        name: table,
        rowCount: count,
        columnCount: columns.length,
        columns,
      });
    }

    return result;
  }

  private getDefaultTableColumns(table: string): string[] {
    const cols: Record<string, string[]> = {
      branches: ['id', 'branch_code', 'name', 'address', 'city', 'state', 'phone', 'status', 'opened_at', 'created_at'],
      users: ['id', 'username', 'email', 'mobile', 'roles', 'branch_id', 'branch_name', 'employee_id', 'employee_name', 'is_active', 'is_2fa_enabled', 'created_at'],
      employees: ['id', 'employee_number', 'user_id', 'branch_id', 'branch_code', 'branch_name', 'name', 'mobile', 'email', 'designation', 'joining_date', 'salary', 'employment_status', 'created_at'],
      customers: ['id', 'customer_number', 'full_name', 'mobile', 'email', 'aadhaar', 'pan', 'address', 'city', 'state', 'kyc_status', 'risk_category', 'assigned_collector_id', 'branch_id', 'created_at'],
      products: ['id', 'product_code', 'product_name', 'product_type', 'min_amount', 'max_amount', 'min_tenure_months', 'max_tenure_months', 'interest_method', 'interest_rate', 'penalty_rate', 'premature_allowed', 'requires_nominee', 'regulatory_status', 'is_enabled', 'created_at'],
      accounts: ['id', 'account_number', 'customer_id', 'customer_name', 'customer_mobile', 'product_id', 'product_name', 'product_type', 'branch_id', 'branch_name', 'balance', 'interest_rate', 'tenure_months', 'monthly_deposit', 'maturity_amount', 'maturity_date', 'status', 'opened_at', 'created_at'],
      loans: ['id', 'loan_number', 'customer_id', 'customer_name', 'customer_mobile', 'product_id', 'product_name', 'branch_id', 'branch_name', 'principal_amount', 'sanctioned_amount', 'disbursed_amount', 'interest_rate', 'interest_method', 'tenure_months', 'emi_amount', 'total_payable', 'total_paid', 'principal_outstanding', 'status', 'disbursed_at', 'mature_at', 'created_at'],
      repayment_schedules: ['id', 'loan_id', 'installment_no', 'due_date', 'principal_component', 'interest_component', 'emi_amount', 'status', 'paid_date', 'penalty_charged'],
      receipts: ['id', 'receipt_number', 'transaction_id', 'customer_id', 'customer_name', 'customer_mobile', 'account_id', 'loan_id', 'payment_mode', 'amount', 'collector_id', 'collector_name', 'branch_id', 'remarks', 'created_at'],
      cash_drawers: ['id', 'branch_id', 'branch_name', 'cashier_id', 'cashier_name', 'business_date', 'opening_balance', 'cash_received', 'cash_paid', 'expected_closing_balance', 'physical_closing_balance', 'difference', 'status', 'opened_at', 'closed_at'],
      chart_of_accounts: ['id', 'account_code', 'account_name', 'account_type', 'current_balance', 'is_active'],
      transactions: ['id', 'transaction_number', 'account_id', 'customer_id', 'transaction_type', 'payment_mode', 'amount', 'running_balance', 'status', 'reference_no', 'branch_id', 'performed_by', 'description', 'created_at'],
      daily_closures: ['id', 'branch_id', 'branch_name', 'business_date', 'opening_cash', 'total_collections', 'total_disbursements', 'closing_cash', 'status', 'closed_by_id', 'closed_by_name', 'closed_at', 'can_reopen'],
      journal_entries: ['id', 'journal_number', 'business_date', 'description', 'total_debit', 'total_credit', 'status', 'created_by', 'approved_by', 'lines', 'created_at'],
      audit_logs: ['id', 'user_id', 'user_name', 'action', 'entity_type', 'entity_id', 'client_ip', 'user_agent', 'details', 'created_at'],
      complaints: ['id', 'complaint_number', 'customer_id', 'customer_name', 'customer_number', 'category', 'description', 'priority', 'status', 'resolution', 'resolved_at', 'created_at'],
    };
    return cols[table] || ['id'];
  }

  private getInMemoryCount(table: string): number {
    switch (table) {
      case 'branches': return this.branches.length;
      case 'users': return this.users.length;
      case 'employees': return this.employees.length;
      case 'customers': return this.customers.length;
      case 'products': return this.products.length;
      case 'accounts': return this.accounts.length;
      case 'loans': return this.loans.length;
      case 'repayment_schedules': return this.loanInstallments.length;
      case 'receipts': return this.receipts.length;
      case 'cash_drawers': return this.cashDrawers.length;
      case 'chart_of_accounts': return this.chartOfAccounts.length;
      case 'transactions': return this.transactions.length;
      case 'daily_closures': return this.businessDayClosures.length;
      case 'journal_entries': return this.journalEntries.length;
      case 'audit_logs': return this.auditLogs.length;
      case 'complaints': return this.complaints.length;
      default: return 0;
    }
  }

  async getRawTableRows(tableName: string) {
    if (!this.ALL_DB_TABLES.includes(tableName as any)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }

    if (this.pool) {
      try {
        const orderCol = ['audit_logs', 'transactions', 'receipts', 'complaints', 'customers', 'accounts', 'loans', 'users', 'employees', 'branches'].includes(tableName)
          ? 'created_at DESC'
          : 'id ASC';
        const res = await this.pool.query(`SELECT * FROM ${tableName} ORDER BY ${orderCol} LIMIT 200`);
        return res.rows;
      } catch (err: any) {
        this.logger.warn(`Direct query on ${tableName} failed: ${err.message}. Mapping from in-memory store.`);
      }
    }

    return this.getInMemoryRowsAsDatabaseFormat(tableName);
  }

  private getInMemoryRowsAsDatabaseFormat(tableName: string): any[] {
    switch (tableName) {
      case 'branches':
        return this.branches.map((b) => ({
          id: b.id,
          branch_code: b.branchCode,
          name: b.name,
          address: b.address,
          city: b.city,
          state: b.state,
          phone: b.phone,
          status: b.status,
          opened_at: b.openedAt,
          created_at: b.createdAt,
        }));
      case 'users':
        return this.users.map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          mobile: u.mobile,
          roles: u.roles,
          branch_id: u.branchId,
          branch_name: u.branchName,
          employee_id: u.employeeId,
          employee_name: u.employeeName,
          is_active: u.isActive,
          is_2fa_enabled: u.is2faEnabled,
          created_at: u.createdAt,
        }));
      case 'employees':
        return this.employees.map((e) => ({
          id: e.id,
          employee_number: e.employeeNumber,
          user_id: e.userId,
          branch_id: e.branchId,
          branch_code: e.branchCode,
          branch_name: e.branchName,
          name: e.name,
          mobile: e.mobile,
          email: e.email,
          designation: e.designation,
          joining_date: e.joiningDate,
          salary: e.salary || 35000,
          employment_status: e.employmentStatus,
          created_at: e.createdAt,
        }));
      case 'customers':
        return this.customers.map((c) => ({
          id: c.id,
          customer_number: c.customerNumber,
          full_name: `${c.firstName} ${c.lastName}`.trim(),
          mobile: c.mobile,
          email: c.email,
          aadhaar: 'XXXX-XXXX-1234',
          pan: 'ABCDE1234F',
          address: c.addressLine1,
          city: c.city,
          state: c.state,
          kyc_status: c.kycStatus,
          risk_category: 'LOW',
          assigned_collector_id: 'USR-006',
          branch_id: c.branchId,
          created_at: c.createdAt,
        }));
      case 'products':
        return this.products.map((p) => ({
          id: p.id,
          product_code: p.productCode,
          product_name: p.productName,
          product_type: p.productType,
          min_amount: p.minimumAmount,
          max_amount: p.maximumAmount,
          min_tenure_months: p.minimumTenureMonths,
          max_tenure_months: p.maximumTenureMonths,
          interest_method: 'REDUCING_BALANCE',
          interest_rate: p.interestRate,
          penalty_rate: 2.0,
          premature_allowed: true,
          requires_nominee: false,
          regulatory_status: 'APPROVED',
          is_enabled: p.isEnabled,
          created_at: '2026-08-01T00:00:00.000Z',
        }));
      case 'accounts':
        return this.accounts.map((a) => ({
          id: a.id,
          account_number: a.accountNumber,
          customer_id: a.customerId,
          customer_name: a.customerName,
          customer_mobile: (a as any).customerMobile || '9876543210',
          product_id: a.productId,
          product_name: a.productName,
          product_type: a.productType,
          branch_id: a.branchId,
          branch_name: a.branchName,
          balance: a.currentBalance,
          interest_rate: a.interestRate,
          tenure_months: a.tenureMonths,
          monthly_deposit: a.principalAmount,
          maturity_amount: a.maturityAmount,
          maturity_date: a.maturityDate,
          status: a.status,
          opened_at: a.openingDate,
          created_at: a.createdAt,
        }));
      case 'loans':
        return this.loans.map((l) => ({
          id: l.id,
          loan_number: l.loanNumber,
          customer_id: l.customerId,
          customer_name: l.customerName,
          customer_mobile: (l as any).customerMobile || '9876543210',
          product_id: 'PRD-004',
          product_name: 'Vyapar Unnati MSME Loan',
          branch_id: l.branchId,
          branch_name: 'Head Office Main Branch',
          principal_amount: l.principal,
          sanctioned_amount: l.principal,
          disbursed_amount: l.principal,
          interest_rate: l.annualInterestRate,
          interest_method: l.interestMethod,
          tenure_months: l.tenureMonths,
          emi_amount: l.emiAmount,
          total_payable: l.totalPayable,
          total_paid: l.totalPaid,
          principal_outstanding: l.outstandingPrincipal,
          status: l.status,
          disbursed_at: l.disbursementDate,
          mature_at: l.finalDueDate,
          created_at: l.createdAt,
        }));
      case 'repayment_schedules':
        return this.loanInstallments.map((inst) => ({
          id: inst.id,
          loan_id: inst.loanId,
          installment_no: inst.installmentNumber,
          due_date: inst.dueDate,
          principal_component: inst.principalDue,
          interest_component: inst.interestDue,
          emi_amount: inst.totalDue,
          status: inst.status,
          paid_date: inst.paidAt || inst.dueDate,
          penalty_charged: inst.penaltyDue || 0,
        }));
      case 'receipts':
        return this.receipts.map((r) => ({
          id: r.id,
          receipt_number: r.receiptNumber,
          transaction_id: r.transactionId,
          customer_id: r.customerId,
          customer_name: r.customerName,
          customer_mobile: '9876543210',
          account_id: 'ACC-001',
          loan_id: null,
          payment_mode: r.paymentMode,
          amount: r.amount,
          collector_id: r.collectorId,
          collector_name: r.collectorName,
          branch_id: 'BR-001',
          remarks: r.paymentFor,
          created_at: r.generatedAt,
        }));
      case 'cash_drawers':
        return this.cashDrawers.map((cd) => ({
          id: cd.id,
          branch_id: cd.branchId,
          branch_name: cd.branchName,
          cashier_id: cd.cashierId,
          cashier_name: cd.cashierName,
          business_date: cd.businessDate,
          opening_balance: cd.openingBalance,
          cash_received: cd.cashReceived,
          cash_paid: cd.cashPaid,
          expected_closing_balance: cd.expectedClosingBalance,
          physical_closing_balance: cd.physicalClosingBalance,
          difference: cd.difference,
          status: cd.status,
          opened_at: cd.openedAt,
          closed_at: cd.closedAt,
        }));
      case 'chart_of_accounts':
        return this.chartOfAccounts.map((coa) => ({
          id: coa.id,
          account_code: coa.accountCode,
          account_name: coa.accountName,
          account_type: coa.accountType,
          current_balance: coa.currentBalance,
          is_active: coa.isActive,
        }));
      case 'transactions':
        return this.transactions.map((t) => ({
          id: t.id,
          transaction_number: t.transactionNumber,
          account_id: t.accountId,
          customer_id: t.customerId,
          transaction_type: t.transactionType,
          payment_mode: t.paymentMode,
          amount: t.amount,
          running_balance: 50000,
          status: t.status,
          reference_no: t.referenceNumber,
          branch_id: t.branchId,
          performed_by: t.createdBy,
          description: t.remarks,
          created_at: t.createdAt,
        }));
      case 'daily_closures':
        return this.businessDayClosures.map((dc) => ({
          id: dc.id,
          branch_id: dc.branchId,
          branch_name: dc.branchName,
          business_date: dc.businessDate,
          opening_cash: dc.cashInHand || 0,
          total_collections: dc.totalCollections,
          total_disbursements: dc.totalDisbursements,
          closing_cash: dc.cashInHand,
          status: dc.status,
          closed_by_id: 'USR-001',
          closed_by_name: 'Administrator',
          closed_at: dc.closedAt,
          can_reopen: true,
        }));
      case 'journal_entries':
        return this.journalEntries.map((j) => ({
          id: j.id,
          journal_number: j.journalNumber,
          business_date: j.businessDate,
          description: j.description,
          total_debit: j.totalDebit,
          total_credit: j.totalCredit,
          status: j.status,
          created_by: j.createdBy,
          approved_by: j.approvedBy,
          lines: j.lines,
          created_at: j.createdAt,
        }));
      case 'audit_logs':
        return this.auditLogs.map((a) => ({
          id: a.id,
          user_id: a.userId,
          user_name: a.userName,
          action: a.eventType || (a as any).action || 'SYSTEM_EVENT',
          entity_type: a.entityType,
          entity_id: a.entityId,
          client_ip: a.ipAddress || '127.0.0.1',
          user_agent: 'Antigravity Chrome 120 / Windows 11',
          details: (a as any).details || { oldValue: a.oldValue, newValue: a.newValue },
          created_at: a.timestamp,
        }));
      case 'complaints':
        return this.complaints.map((c) => ({
          id: c.id,
          complaint_number: c.complaintNumber,
          customer_id: c.customerId,
          customer_name: c.customerName,
          customer_number: c.customerNumber,
          category: c.category,
          description: c.description,
          priority: c.priority,
          status: c.status,
          resolution: c.resolution,
          resolved_at: c.resolvedAt,
          created_at: c.createdAt,
        }));
      default:
        return [];
    }
  }

  async insertRawTableRow(tableName: string, data: Record<string, any>) {
    if (!this.ALL_DB_TABLES.includes(tableName as any)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }

    if (!data.id) {
      data.id = `${tableName.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    }

    // Sanitize and quote all column identifiers to prevent SQL injection and keyword collisions
    const validIdentifier = /^[a-zA-Z0-9_]+$/;
    const keys = Object.keys(data);
    for (const key of keys) {
      if (!validIdentifier.test(key)) {
        throw new Error(`Invalid column identifier: "${key}"`);
      }
    }

    if (this.pool) {
      try {
        const quotedKeys = keys.map((k) => `"${k}"`);
        const values = Object.values(data);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const query = `INSERT INTO ${tableName} (${quotedKeys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
        const res = await this.pool.query(query, values);
        await this.loadFromPostgres();
        return res.rows[0];
      } catch (err: any) {
        this.logger.error(`Database raw insert failed: ${err.message}`);
        throw err;
      }
    }

    // In-memory fallback insert
    switch (tableName) {
      case 'branches': this.branches.push(data as any); break;
      case 'users': this.users.push(data as any); break;
      case 'employees': this.employees.push(data as any); break;
      case 'customers': this.customers.push(data as any); break;
      case 'products': this.products.push(data as any); break;
      case 'accounts': this.accounts.push(data as any); break;
      case 'loans': this.loans.push(data as any); break;
      case 'receipts': this.receipts.push(data as any); break;
      case 'cash_drawers': this.cashDrawers.push(data as any); break;
      case 'chart_of_accounts': this.chartOfAccounts.push(data as any); break;
      case 'transactions': this.transactions.push(data as any); break;
      case 'complaints': this.complaints.push(data as any); break;
    }

    return data;
  }

  async updateRawTableRow(tableName: string, id: string, data: Record<string, any>) {
    if (!this.ALL_DB_TABLES.includes(tableName as any)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }

    // Sanitize and quote all column identifiers
    const validIdentifier = /^[a-zA-Z0-9_]+$/;
    const keys = Object.keys(data).filter((k) => k !== 'id');
    for (const key of keys) {
      if (!validIdentifier.test(key)) {
        throw new Error(`Invalid column identifier: "${key}"`);
      }
    }

    if (this.pool) {
      try {
        if (keys.length === 0) return { id, ...data };
        const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
        const values = keys.map((k) => data[k]);
        values.push(id);
        const query = `UPDATE ${tableName} SET ${setClause} WHERE id = $${values.length} RETURNING *`;
        const res = await this.pool.query(query, values);
        await this.loadFromPostgres();
        return res.rows[0];
      } catch (err: any) {
        this.logger.error(`Database raw update failed: ${err.message}`);
        throw err;
      }
    }

    // In-memory fallback update
    const updateInArr = (arr: any[]) => {
      const idx = arr.findIndex((item) => item.id === id);
      if (idx !== -1) arr[idx] = { ...arr[idx], ...data };
    };
    switch (tableName) {
      case 'branches': updateInArr(this.branches); break;
      case 'users': updateInArr(this.users); break;
      case 'employees': updateInArr(this.employees); break;
      case 'customers': updateInArr(this.customers); break;
      case 'products': updateInArr(this.products); break;
      case 'accounts': updateInArr(this.accounts); break;
      case 'loans': updateInArr(this.loans); break;
      case 'receipts': updateInArr(this.receipts); break;
      case 'cash_drawers': updateInArr(this.cashDrawers); break;
      case 'chart_of_accounts': updateInArr(this.chartOfAccounts); break;
      case 'transactions': updateInArr(this.transactions); break;
      case 'complaints': updateInArr(this.complaints); break;
    }

    return { id, ...data };
  }

  async deleteRawTableRow(tableName: string, id: string) {
    if (!this.ALL_DB_TABLES.includes(tableName as any)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }

    if (this.pool) {
      try {
        await this.pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
        await this.loadFromPostgres();
        return { success: true, message: `Record ${id} removed from ${tableName}` };
      } catch (err: any) {
        this.logger.error(`Database raw delete failed: ${err.message}`);
        throw err;
      }
    }

    // In-memory removal fallback
    switch (tableName) {
      case 'branches': this.branches = this.branches.filter((b) => b.id !== id); break;
      case 'users': this.users = this.users.filter((u) => u.id !== id); break;
      case 'employees': this.employees = this.employees.filter((e) => e.id !== id); break;
      case 'customers': this.customers = this.customers.filter((c) => c.id !== id); break;
      case 'products': this.products = this.products.filter((p) => p.id !== id); break;
      case 'accounts': this.accounts = this.accounts.filter((a) => a.id !== id); break;
      case 'loans': this.loans = this.loans.filter((l) => l.id !== id); break;
      case 'receipts': this.receipts = this.receipts.filter((r) => r.id !== id); break;
      case 'cash_drawers': this.cashDrawers = this.cashDrawers.filter((c) => c.id !== id); break;
      case 'chart_of_accounts': this.chartOfAccounts = this.chartOfAccounts.filter((c) => c.id !== id); break;
      case 'transactions': this.transactions = this.transactions.filter((t) => t.id !== id); break;
      case 'complaints': this.complaints = this.complaints.filter((c) => c.id !== id); break;
    }

    return { success: true, message: `Record ${id} deleted from ${tableName}` };
  }
}

