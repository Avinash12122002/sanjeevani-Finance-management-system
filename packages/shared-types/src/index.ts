/**
 * SANJEEVANI FINANCE MANAGEMENT SYSTEM (SFMS)
 * Shared Domain Types, Enums, Interfaces & Business Rule Constants
 * Based on SRS v1.0 specifications
 */

// ==========================================
// 1. SYSTEM ROLES & PERMISSIONS (§3, §47)
// ==========================================

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN', // Owner / Director (§3.1)
  GENERAL_MANAGER = 'GENERAL_MANAGER', // GM (§3.2)
  BRANCH_MANAGER = 'BRANCH_MANAGER', // BM (§3.3)
  ACCOUNTANT = 'ACCOUNTANT', // (§3.4)
  CASHIER = 'CASHIER', // (§3.5)
  LOAN_OFFICER = 'LOAN_OFFICER', // (§3.6)
  RECOVERY_OFFICER = 'RECOVERY_OFFICER', // (§3.7)
  COLLECTION_AGENT = 'COLLECTION_AGENT', // (§3.8)
  CUSTOMER_SERVICE = 'CUSTOMER_SERVICE', // CSE (§3.9)
  AUDITOR = 'AUDITOR', // Read-only (§3.10)
  CUSTOMER = 'CUSTOMER', // Member Portal (§3.11)
}

export enum Permission {
  // Customer & KYC
  CUSTOMER_CREATE = 'CUSTOMER_CREATE',
  CUSTOMER_EDIT = 'CUSTOMER_EDIT',
  CUSTOMER_VIEW = 'CUSTOMER_VIEW',
  KYC_VERIFY = 'KYC_VERIFY',

  // Accounts & Products
  ACCOUNT_CREATE = 'ACCOUNT_CREATE',
  ACCOUNT_APPROVE = 'ACCOUNT_APPROVE',
  ACCOUNT_CLOSE = 'ACCOUNT_CLOSE',
  PRODUCT_MANAGE = 'PRODUCT_MANAGE',

  // Loans
  LOAN_CREATE = 'LOAN_CREATE',
  LOAN_RECOMMEND = 'LOAN_RECOMMEND',
  LOAN_APPROVE = 'LOAN_APPROVE',
  LOAN_DISBURSE = 'LOAN_DISBURSE',
  LOAN_RESTRUCTURE = 'LOAN_RESTRUCTURE',

  // Transactions & Collections
  TRANSACTION_CREATE = 'TRANSACTION_CREATE',
  TRANSACTION_APPROVE = 'TRANSACTION_APPROVE',
  TRANSACTION_REVERSE = 'TRANSACTION_REVERSE',
  COLLECTION_RECORD = 'COLLECTION_RECORD',
  CASH_CLOSE = 'CASH_CLOSE',

  // Accounting
  JOURNAL_CREATE = 'JOURNAL_CREATE',
  JOURNAL_APPROVE = 'JOURNAL_APPROVE',
  BANK_RECONCILE = 'BANK_RECONCILE',
  EXPENSE_MANAGE = 'EXPENSE_MANAGE',

  // Administration & Reports
  DAILY_CLOSING_EXECUTE = 'DAILY_CLOSING_EXECUTE',
  BUSINESS_DATE_REOPEN = 'BUSINESS_DATE_REOPEN',
  REPORT_VIEW = 'REPORT_VIEW',
  REPORT_EXPORT = 'REPORT_EXPORT',
  AUDIT_VIEW = 'AUDIT_VIEW',
  SETTINGS_EDIT = 'SETTINGS_EDIT',
  STAFF_MANAGE = 'STAFF_MANAGE',
  BRANCH_MANAGE = 'BRANCH_MANAGE',
}

// ==========================================
// 2. CORE STATUS ENUMS
// ==========================================

export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  BLOCKED = 'BLOCKED',
}

export enum KYCStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum KYCDocumentType {
  AADHAAR = 'AADHAAR',
  PAN = 'PAN',
  VOTER_ID = 'VOTER_ID',
  PASSPORT = 'PASSPORT',
  DRIVING_LICENSE = 'DRIVING_LICENSE',
  RATION_CARD = 'RATION_CARD',
  OTHER = 'OTHER',
}

export enum ProductType {
  SAVINGS = 'SAVINGS',
  RD = 'RD', // Recurring Deposit
  TERM_DEPOSIT = 'TERM_DEPOSIT', // Fixed Deposit
  LOAN = 'LOAN',
  COMMITTEE = 'COMMITTEE', // Chit / Committee (Feature flagged)
  OTHER = 'OTHER',
}

export enum RegulatoryStatus {
  APPROVED = 'APPROVED',
  RESTRICTED = 'RESTRICTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  DISABLED = 'DISABLED',
}

export enum AccountStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  MATURED = 'MATURED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  INSTALLMENT = 'INSTALLMENT',
  LOAN_DISBURSEMENT = 'LOAN_DISBURSEMENT',
  EMI_PAYMENT = 'EMI_PAYMENT',
  INTEREST_CREDIT = 'INTEREST_CREDIT',
  PENALTY = 'PENALTY',
  FEE = 'FEE',
  REFUND = 'REFUND',
  REVERSAL = 'REVERSAL',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum TransactionStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  POSTED = 'POSTED',
  REVERSED = 'REVERSED',
  REJECTED = 'REJECTED',
}

export enum PaymentMode {
  CASH = 'CASH',
  UPI = 'UPI',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHEQUE = 'CHEQUE',
  INTERNAL_TRANSFER = 'INTERNAL_TRANSFER',
}

export enum InterestMethod {
  FLAT_RATE = 'FLAT_RATE',
  REDUCING_BALANCE = 'REDUCING_BALANCE',
  CUSTOM_SCHEDULE = 'CUSTOM_SCHEDULE',
  SIMPLE_INTEREST = 'SIMPLE_INTEREST',
  COMPOUND_INTEREST = 'COMPOUND_INTEREST',
}

export enum InstallmentStatus {
  UPCOMING = 'UPCOMING',
  DUE = 'DUE',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  WAIVED = 'WAIVED',
  RESTRUCTURED = 'RESTRUCTURED',
}

export enum LoanApplicationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  KYC_PENDING = 'KYC_PENDING',
  DOCUMENT_PENDING = 'DOCUMENT_PENDING',
  FIELD_VERIFICATION = 'FIELD_VERIFICATION',
  CREDIT_REVIEW = 'CREDIT_REVIEW',
  MANAGER_REVIEW = 'MANAGER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SANCTIONED = 'SANCTIONED',
  AGREEMENT_PENDING = 'AGREEMENT_PENDING',
  READY_FOR_DISBURSEMENT = 'READY_FOR_DISBURSEMENT',
  DISBURSED = 'DISBURSED',
  CANCELLED = 'CANCELLED',
}

export enum RiskCategory {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export enum CashDrawerStatus {
  OPEN = 'OPEN',
  PENDING_RECONCILIATION = 'PENDING_RECONCILIATION',
  MATCHED = 'MATCHED',
  MISMATCH = 'MISMATCH',
  APPROVED_WITH_EXCEPTION = 'APPROVED_WITH_EXCEPTION',
  CLOSED = 'CLOSED',
}

export enum BusinessDateStatus {
  OPEN = 'OPEN',
  CLOSING = 'CLOSING',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  LOCKED = 'LOCKED',
  REOPENED = 'REOPENED',
}

export enum AccountClassification {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum RecoveryBucket {
  CURRENT = 'CURRENT',
  DPD_1_30 = '1-30',
  DPD_31_60 = '31-60',
  DPD_61_90 = '61-90',
  DPD_90_PLUS = '90+',
}

export enum RecoveryActionType {
  CALL = 'CALL',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  FIELD_VISIT = 'FIELD_VISIT',
  PROMISE_TO_PAY = 'PROMISE_TO_PAY',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  ESCALATION = 'ESCALATION',
  LEGAL_REVIEW = 'LEGAL_REVIEW',
}

export enum ComplaintStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED',
}

export enum PriorityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum NotificationChannel {
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
}

// ==========================================
// 3. BUSINESS RULES CONSTANTS (§94)
// ==========================================

export const BusinessRules = {
  BR_001: 'No customer without unique customer ID (SJF-CUS-XXXXXX)',
  BR_002: 'No approved transaction can be deleted; immutable audit trail',
  BR_003: 'Financial correction requires explicit reversal transaction',
  BR_004: 'Maker cannot approve own restricted transaction (maker_id != checker_id)',
  BR_005: 'Disabled products cannot accept new accounts or applications',
  BR_006: 'Cash drawer must reconcile daily before cashier shift closing',
  BR_007: 'Loan cannot be disbursed without full approval hierarchy',
  BR_008: 'Loan schedule must exist and balance before loan activation',
  BR_009: 'Business date must be closed daily across all active branches',
  BR_010: 'Closed business date cannot be edited without authorized reopening',
  BR_011: 'Audit logs are strictly append-only and immutable',
  BR_012: 'Every customer payment generates a unique transaction number (SJF-TXN-...)',
  BR_013: 'Every successful customer payment generates a digital receipt (SJF-RCP-...)',
  BR_014: 'Branch-level staff cannot access records from unauthorized branches',
  BR_015: 'Sensitive profile or financial updates require mandatory reason',
  BR_016: 'All double-entry ledger lines must balance: SUM(DR) === SUM(CR)',
  BR_017: 'Duplicate payment protection enforced via Idempotency-Key headers',
  BR_018: 'Physical or logical deletion of financial records is prohibited',
  BR_019: 'Product activation is governed by compliance & regulatory flags',
  BR_020: 'High-value transactions trigger maker-checker threshold approvals',
} as const;

// ==========================================
// 4. API RESPONSE FORMAT (§74)
// ==========================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  requestId: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==========================================
// 5. DOMAIN ENTITY INTERFACES
// ==========================================

export interface IBranch {
  id: string;
  branchCode: string; // e.g. SJF-BR001
  name: string;
  address: string;
  city: string;
  state: string;
  managerId?: string;
  managerName?: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
  openedAt: string;
  createdAt: string;
}

export interface IUser {
  id: string;
  username: string;
  email?: string;
  mobile: string;
  roles: UserRole[];
  branchId?: string;
  branchName?: string;
  employeeId?: string;
  employeeName?: string;
  isActive: boolean;
  is2faEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface IEmployee {
  id: string;
  employeeNumber: string; // e.g. SJF-EMP-000001
  userId?: string;
  branchId: string;
  branchCode?: string;
  branchName?: string;
  name: string;
  mobile: string;
  email?: string;
  designation: string;
  joiningDate: string;
  salary: number;
  reportingManagerId?: string;
  employmentStatus: 'ACTIVE' | 'PROBATION' | 'RESIGNED' | 'TERMINATED';
  createdAt: string;
}

export interface ICustomer {
  id: string;
  customerNumber: string; // e.g. SJF-CUS-000001
  branchId: string;
  branchCode?: string;
  branchName?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fatherOrSpouseName: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  mobile: string;
  alternateMobile?: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  photoUrl?: string;
  joiningDate: string;
  status: CustomerStatus;
  kycStatus: KYCStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ICustomerKYC {
  id: string;
  customerId: string;
  documentType: KYCDocumentType;
  documentNumber: string; // Stored masked or encrypted
  documentUrl: string;
  verificationStatus: KYCStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  expiryDate?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface INominee {
  id: string;
  customerId: string;
  name: string;
  relationship: string;
  dateOfBirth: string;
  mobile: string;
  address: string;
  percentage: number; // Must sum to 100% per customer
  createdAt: string;
}

export interface IProduct {
  id: string;
  productCode: string; // e.g. SJF-PRD-RD01
  productName: string;
  productType: ProductType;
  minimumAmount: number;
  maximumAmount: number;
  minimumTenureMonths: number;
  maximumTenureMonths: number;
  interestMethod: InterestMethod;
  interestRate: number; // Annual %
  penaltyRate?: number; // Late fee % or fixed
  prematureAllowed: boolean;
  prematurePenaltyRate?: number;
  requiresNominee: boolean;
  regulatoryStatus: RegulatoryStatus;
  isEnabled: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  createdAt: string;
}

export interface IAccount {
  id: string;
  accountNumber: string; // e.g. SJF-RD-2026-000001
  customerId: string;
  customerName?: string;
  customerNumber?: string;
  productId: string;
  productName?: string;
  productType: ProductType;
  branchId: string;
  branchName?: string;
  openingDate: string;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  maturityDate?: string;
  maturityAmount?: number;
  currentBalance: number;
  status: AccountStatus;
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IRDInstallment {
  id: string;
  rdAccountId: string;
  installmentNumber: number;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  paidAt?: string;
  penaltyDue: number;
  status: InstallmentStatus;
}

export interface ILoanApplication {
  id: string;
  applicationNumber: string; // e.g. SJF-LA-2026-000001
  customerId: string;
  customerName?: string;
  customerNumber?: string;
  customerMobile?: string;
  branchId: string;
  branchName?: string;
  loanProductId: string;
  loanProductName?: string;
  requestedAmount: number;
  requestedTenureMonths: number;
  interestMethod: InterestMethod;
  annualInterestRate: number;
  purpose: string;
  declaredIncome: number;
  existingLiabilities: number;
  internalCreditScore?: number;
  riskCategory?: RiskCategory;
  status: LoanApplicationStatus;
  guarantors?: {
    name: string;
    mobile: string;
    relationship: string;
    guaranteeAmount: number;
  }[];
  fieldVerificationNotes?: string;
  creditAssessmentRecommendation?: string;
  recommendedBy?: string;
  approvedBy?: string;
  sanctionedAmount?: number;
  rejectionReason?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ICreditAssessment {
  id: string;
  loanApplicationId: string;
  kycScore: number; // 0-100
  incomeScore: number;
  repaymentScore: number;
  liabilityScore: number;
  securityScore: number;
  bankingScore: number;
  fieldScore: number;
  totalScore: number; // 0-100 weighted
  riskCategory: RiskCategory;
  recommendation: 'APPROVE' | 'REJECT' | 'FURTHER_REVIEW';
  assessedBy: string;
  assessedAt: string;
}

export interface ILoan {
  id: string;
  loanNumber: string; // e.g. SJF-LN-2026-000001
  customerId: string;
  customerName?: string;
  customerNumber?: string;
  loanApplicationId: string;
  branchId: string;
  principal: number;
  annualInterestRate: number;
  interestMethod: InterestMethod;
  tenureMonths: number;
  emiAmount: number;
  totalPayable: number;
  totalInterest: number;
  disbursementDate: string;
  firstDueDate: string;
  finalDueDate: string;
  outstandingPrincipal: number;
  totalPaid: number;
  overdueAmount: number;
  daysPastDue: number;
  recoveryBucket: RecoveryBucket;
  status: 'ACTIVE' | 'CLOSED' | 'OVERDUE' | 'NPA' | 'WRITTEN_OFF';
  createdAt: string;
}

export interface ILoanInstallment {
  id: string;
  loanId: string;
  installmentNumber: number;
  dueDate: string;
  openingPrincipal: number;
  principalDue: number;
  interestDue: number;
  feeDue: number;
  penaltyDue: number;
  totalDue: number;
  amountPaid: number;
  principalPaid: number;
  interestPaid: number;
  closingPrincipal: number;
  status: InstallmentStatus;
  paidAt?: string;
}

export interface ITransaction {
  id: string;
  transactionNumber: string; // e.g. SJF-TXN-2026-00000001
  branchId: string;
  branchName?: string;
  customerId?: string;
  customerName?: string;
  customerNumber?: string;
  accountId?: string;
  accountNumber?: string;
  loanId?: string;
  loanNumber?: string;
  transactionType: TransactionType;
  amount: number;
  paymentMode: PaymentMode;
  transactionDate: string;
  referenceNumber?: string; // Cheque / UPI UTR / Bank Ref
  status: TransactionStatus;
  createdBy: string;
  createdByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  reversalOfTransactionId?: string;
  reversalReason?: string;
  remarks?: string;
  receiptNumber?: string;
  createdAt: string;
  approvedAt?: string;
}

export interface IReceipt {
  id: string;
  receiptNumber: string; // e.g. SJF-RCP-2026-00000001
  transactionId: string;
  transactionNumber?: string;
  customerId: string;
  customerName: string;
  customerNumber: string;
  amount: number;
  paymentMode: PaymentMode;
  paymentFor: string; // 'Loan EMI', 'RD Deposit', 'Savings', etc.
  collectorId: string;
  collectorName?: string;
  branchName: string;
  generatedAt: string;
  pdfUrl?: string;
  deliveryStatus: 'PENDING' | 'SENT' | 'FAILED';
}

export interface ICashDrawer {
  id: string;
  branchId: string;
  branchName?: string;
  cashierId: string;
  cashierName?: string;
  businessDate: string;
  openingBalance: number;
  cashReceived: number;
  cashPaid: number;
  expectedClosingBalance: number;
  physicalClosingBalance?: number;
  difference?: number;
  status: CashDrawerStatus;
  closedBy?: string;
  approvedBy?: string;
  reconciliationNotes?: string;
  openedAt: string;
  closedAt?: string;
}

export interface IChartOfAccount {
  id: string;
  accountCode: string; // e.g. 1010-CASH, 1020-BANK, 2010-RD-LIABILITY, 4010-INTEREST-INCOME
  accountName: string;
  accountType: AccountClassification;
  parentId?: string;
  isActive: boolean;
  currentBalance: number;
}

export interface IJournalEntry {
  id: string;
  journalNumber: string; // e.g. SJF-JRN-2026-000001
  transactionId?: string;
  businessDate: string;
  description: string;
  totalDebit: number;
  totalCredit: number;
  status: 'POSTED' | 'REVERSED';
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
  lines: IJournalLine[];
}

export interface IJournalLine {
  id?: string;
  journalEntryId?: string;
  ledgerAccountId: string;
  ledgerAccountCode?: string;
  ledgerAccountName?: string;
  debitAmount: number;
  creditAmount: number;
  branchId: string;
  customerId?: string;
  accountId?: string;
}

export interface IBusinessDayClosure {
  id: string;
  branchId: string;
  branchName?: string;
  businessDate: string;
  status: BusinessDateStatus;
  totalCollections: number;
  totalDisbursements: number;
  cashInHand: number;
  bankBalance: number;
  mismatchCount: number;
  closedBy?: string;
  approvedBy?: string;
  closedAt?: string;
  reopenedReason?: string;
}

export interface IAuditLog {
  id: string;
  userId: string;
  userName?: string;
  userRole?: string;
  eventType: string; // e.g. CUSTOMER_CREATED, LOAN_APPROVED, TXN_REVERSED
  entityType: string; // 'Customer', 'Loan', 'Transaction', 'Account'
  entityId: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  deviceId?: string;
  reason?: string;
  timestamp: string;
}

export interface IComplaint {
  id: string;
  complaintNumber: string; // e.g. SJF-CMP-2026-000001
  customerId: string;
  customerName?: string;
  customerNumber?: string;
  category: string;
  description: string;
  priority: PriorityLevel;
  assignedTo?: string;
  assignedToName?: string;
  status: ComplaintStatus;
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface IRecoveryCase {
  id: string;
  loanId: string;
  loanNumber: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  daysPastDue: number;
  overdueAmount: number;
  bucket: RecoveryBucket;
  assignedTo?: string;
  assignedToName?: string;
  priority: PriorityLevel;
  nextActionDate?: string;
  status: 'OPEN' | 'PROMISED' | 'SETTLED' | 'LEGAL' | 'CLOSED';
  lastActionNotes?: string;
  actions?: IRecoveryAction[];
}

export interface IRecoveryAction {
  id: string;
  recoveryCaseId: string;
  actionType: RecoveryActionType;
  actionDate: string;
  notes: string;
  promiseAmount?: number;
  promiseDate?: string;
  nextFollowUp?: string;
  createdBy: string;
  createdByName?: string;
}

// ==========================================
// 6. DASHBOARD & OWNER MIS INTERFACES (§65-§67)
// ==========================================

export interface IDashboardMetrics {
  totalMembers: number;
  activeMembers: number;
  totalActiveAccounts: number;
  totalCollectionToday: number;
  totalCollectionMonth: number;
  totalLoanOutstanding: number;
  newLoanDisbursementMonth: number;
  emiDueToday: number;
  emiCollectedToday: number;
  totalOverdueAmount: number;
  overduePercentage: number;
  cashInHand: number;
  bankBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netResult: number;
  cashMismatchAmount: number;
}

export interface IRedAlert {
  id: string;
  alertType:
    | 'CASH_MISMATCH'
    | 'BANK_RECON_MISMATCH'
    | 'UNAPPROVED_HIGH_VALUE'
    | 'KYC_INCOMPLETE'
    | 'LOAN_HIGH_OVERDUE'
    | 'MATURITY_APPROACHING'
    | 'FAILED_LOGINS'
    | 'MANUAL_ADJUSTMENT'
    | 'TXN_REVERSAL'
    | 'DUPLICATE_SUSPECT';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  entityType?: string;
  entityId?: string;
  amount?: number;
  branchId?: string;
  branchName?: string;
  timestamp: string;
}
