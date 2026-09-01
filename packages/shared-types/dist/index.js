"use strict";
/**
 * SANJEEVANI FINANCE MANAGEMENT SYSTEM (SFMS)
 * Shared Domain Types, Enums, Interfaces & Business Rule Constants
 * Based on SRS v1.0 specifications
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessRules = exports.NotificationChannel = exports.PriorityLevel = exports.ComplaintStatus = exports.RecoveryActionType = exports.RecoveryBucket = exports.AccountClassification = exports.BusinessDateStatus = exports.CashDrawerStatus = exports.RiskCategory = exports.LoanApplicationStatus = exports.InstallmentStatus = exports.InterestMethod = exports.PaymentMode = exports.TransactionStatus = exports.TransactionType = exports.AccountStatus = exports.RegulatoryStatus = exports.ProductType = exports.KYCDocumentType = exports.KYCStatus = exports.CustomerStatus = exports.Permission = exports.UserRole = void 0;
// ==========================================
// 1. SYSTEM ROLES & PERMISSIONS (§3, §47)
// ==========================================
var UserRole;
(function (UserRole) {
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    UserRole["GENERAL_MANAGER"] = "GENERAL_MANAGER";
    UserRole["BRANCH_MANAGER"] = "BRANCH_MANAGER";
    UserRole["ACCOUNTANT"] = "ACCOUNTANT";
    UserRole["CASHIER"] = "CASHIER";
    UserRole["LOAN_OFFICER"] = "LOAN_OFFICER";
    UserRole["RECOVERY_OFFICER"] = "RECOVERY_OFFICER";
    UserRole["COLLECTION_AGENT"] = "COLLECTION_AGENT";
    UserRole["CUSTOMER_SERVICE"] = "CUSTOMER_SERVICE";
    UserRole["AUDITOR"] = "AUDITOR";
    UserRole["CUSTOMER"] = "CUSTOMER";
})(UserRole || (exports.UserRole = UserRole = {}));
var Permission;
(function (Permission) {
    // Customer & KYC
    Permission["CUSTOMER_CREATE"] = "CUSTOMER_CREATE";
    Permission["CUSTOMER_EDIT"] = "CUSTOMER_EDIT";
    Permission["CUSTOMER_VIEW"] = "CUSTOMER_VIEW";
    Permission["KYC_VERIFY"] = "KYC_VERIFY";
    // Accounts & Products
    Permission["ACCOUNT_CREATE"] = "ACCOUNT_CREATE";
    Permission["ACCOUNT_APPROVE"] = "ACCOUNT_APPROVE";
    Permission["ACCOUNT_CLOSE"] = "ACCOUNT_CLOSE";
    Permission["PRODUCT_MANAGE"] = "PRODUCT_MANAGE";
    // Loans
    Permission["LOAN_CREATE"] = "LOAN_CREATE";
    Permission["LOAN_RECOMMEND"] = "LOAN_RECOMMEND";
    Permission["LOAN_APPROVE"] = "LOAN_APPROVE";
    Permission["LOAN_DISBURSE"] = "LOAN_DISBURSE";
    Permission["LOAN_RESTRUCTURE"] = "LOAN_RESTRUCTURE";
    // Transactions & Collections
    Permission["TRANSACTION_CREATE"] = "TRANSACTION_CREATE";
    Permission["TRANSACTION_APPROVE"] = "TRANSACTION_APPROVE";
    Permission["TRANSACTION_REVERSE"] = "TRANSACTION_REVERSE";
    Permission["COLLECTION_RECORD"] = "COLLECTION_RECORD";
    Permission["CASH_CLOSE"] = "CASH_CLOSE";
    // Accounting
    Permission["JOURNAL_CREATE"] = "JOURNAL_CREATE";
    Permission["JOURNAL_APPROVE"] = "JOURNAL_APPROVE";
    Permission["BANK_RECONCILE"] = "BANK_RECONCILE";
    Permission["EXPENSE_MANAGE"] = "EXPENSE_MANAGE";
    // Administration & Reports
    Permission["DAILY_CLOSING_EXECUTE"] = "DAILY_CLOSING_EXECUTE";
    Permission["BUSINESS_DATE_REOPEN"] = "BUSINESS_DATE_REOPEN";
    Permission["REPORT_VIEW"] = "REPORT_VIEW";
    Permission["REPORT_EXPORT"] = "REPORT_EXPORT";
    Permission["AUDIT_VIEW"] = "AUDIT_VIEW";
    Permission["SETTINGS_EDIT"] = "SETTINGS_EDIT";
    Permission["STAFF_MANAGE"] = "STAFF_MANAGE";
    Permission["BRANCH_MANAGE"] = "BRANCH_MANAGE";
})(Permission || (exports.Permission = Permission = {}));
// ==========================================
// 2. CORE STATUS ENUMS
// ==========================================
var CustomerStatus;
(function (CustomerStatus) {
    CustomerStatus["ACTIVE"] = "ACTIVE";
    CustomerStatus["INACTIVE"] = "INACTIVE";
    CustomerStatus["SUSPENDED"] = "SUSPENDED";
    CustomerStatus["BLOCKED"] = "BLOCKED";
})(CustomerStatus || (exports.CustomerStatus = CustomerStatus = {}));
var KYCStatus;
(function (KYCStatus) {
    KYCStatus["PENDING"] = "PENDING";
    KYCStatus["VERIFIED"] = "VERIFIED";
    KYCStatus["REJECTED"] = "REJECTED";
    KYCStatus["EXPIRED"] = "EXPIRED";
})(KYCStatus || (exports.KYCStatus = KYCStatus = {}));
var KYCDocumentType;
(function (KYCDocumentType) {
    KYCDocumentType["AADHAAR"] = "AADHAAR";
    KYCDocumentType["PAN"] = "PAN";
    KYCDocumentType["VOTER_ID"] = "VOTER_ID";
    KYCDocumentType["PASSPORT"] = "PASSPORT";
    KYCDocumentType["DRIVING_LICENSE"] = "DRIVING_LICENSE";
    KYCDocumentType["RATION_CARD"] = "RATION_CARD";
    KYCDocumentType["OTHER"] = "OTHER";
})(KYCDocumentType || (exports.KYCDocumentType = KYCDocumentType = {}));
var ProductType;
(function (ProductType) {
    ProductType["SAVINGS"] = "SAVINGS";
    ProductType["RD"] = "RD";
    ProductType["TERM_DEPOSIT"] = "TERM_DEPOSIT";
    ProductType["LOAN"] = "LOAN";
    ProductType["COMMITTEE"] = "COMMITTEE";
    ProductType["OTHER"] = "OTHER";
})(ProductType || (exports.ProductType = ProductType = {}));
var RegulatoryStatus;
(function (RegulatoryStatus) {
    RegulatoryStatus["APPROVED"] = "APPROVED";
    RegulatoryStatus["RESTRICTED"] = "RESTRICTED";
    RegulatoryStatus["UNDER_REVIEW"] = "UNDER_REVIEW";
    RegulatoryStatus["DISABLED"] = "DISABLED";
})(RegulatoryStatus || (exports.RegulatoryStatus = RegulatoryStatus = {}));
var AccountStatus;
(function (AccountStatus) {
    AccountStatus["DRAFT"] = "DRAFT";
    AccountStatus["PENDING_APPROVAL"] = "PENDING_APPROVAL";
    AccountStatus["ACTIVE"] = "ACTIVE";
    AccountStatus["FROZEN"] = "FROZEN";
    AccountStatus["MATURED"] = "MATURED";
    AccountStatus["CLOSED"] = "CLOSED";
    AccountStatus["CANCELLED"] = "CANCELLED";
})(AccountStatus || (exports.AccountStatus = AccountStatus = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["DEPOSIT"] = "DEPOSIT";
    TransactionType["WITHDRAWAL"] = "WITHDRAWAL";
    TransactionType["INSTALLMENT"] = "INSTALLMENT";
    TransactionType["LOAN_DISBURSEMENT"] = "LOAN_DISBURSEMENT";
    TransactionType["EMI_PAYMENT"] = "EMI_PAYMENT";
    TransactionType["INTEREST_CREDIT"] = "INTEREST_CREDIT";
    TransactionType["PENALTY"] = "PENALTY";
    TransactionType["FEE"] = "FEE";
    TransactionType["REFUND"] = "REFUND";
    TransactionType["REVERSAL"] = "REVERSAL";
    TransactionType["ADJUSTMENT"] = "ADJUSTMENT";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING_APPROVAL"] = "PENDING_APPROVAL";
    TransactionStatus["POSTED"] = "POSTED";
    TransactionStatus["REVERSED"] = "REVERSED";
    TransactionStatus["REJECTED"] = "REJECTED";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
var PaymentMode;
(function (PaymentMode) {
    PaymentMode["CASH"] = "CASH";
    PaymentMode["UPI"] = "UPI";
    PaymentMode["BANK_TRANSFER"] = "BANK_TRANSFER";
    PaymentMode["CHEQUE"] = "CHEQUE";
    PaymentMode["INTERNAL_TRANSFER"] = "INTERNAL_TRANSFER";
})(PaymentMode || (exports.PaymentMode = PaymentMode = {}));
var InterestMethod;
(function (InterestMethod) {
    InterestMethod["FLAT_RATE"] = "FLAT_RATE";
    InterestMethod["REDUCING_BALANCE"] = "REDUCING_BALANCE";
    InterestMethod["CUSTOM_SCHEDULE"] = "CUSTOM_SCHEDULE";
    InterestMethod["SIMPLE_INTEREST"] = "SIMPLE_INTEREST";
    InterestMethod["COMPOUND_INTEREST"] = "COMPOUND_INTEREST";
})(InterestMethod || (exports.InterestMethod = InterestMethod = {}));
var InstallmentStatus;
(function (InstallmentStatus) {
    InstallmentStatus["UPCOMING"] = "UPCOMING";
    InstallmentStatus["DUE"] = "DUE";
    InstallmentStatus["PARTIAL"] = "PARTIAL";
    InstallmentStatus["PAID"] = "PAID";
    InstallmentStatus["OVERDUE"] = "OVERDUE";
    InstallmentStatus["WAIVED"] = "WAIVED";
    InstallmentStatus["RESTRUCTURED"] = "RESTRUCTURED";
})(InstallmentStatus || (exports.InstallmentStatus = InstallmentStatus = {}));
var LoanApplicationStatus;
(function (LoanApplicationStatus) {
    LoanApplicationStatus["DRAFT"] = "DRAFT";
    LoanApplicationStatus["SUBMITTED"] = "SUBMITTED";
    LoanApplicationStatus["KYC_PENDING"] = "KYC_PENDING";
    LoanApplicationStatus["DOCUMENT_PENDING"] = "DOCUMENT_PENDING";
    LoanApplicationStatus["FIELD_VERIFICATION"] = "FIELD_VERIFICATION";
    LoanApplicationStatus["CREDIT_REVIEW"] = "CREDIT_REVIEW";
    LoanApplicationStatus["MANAGER_REVIEW"] = "MANAGER_REVIEW";
    LoanApplicationStatus["APPROVED"] = "APPROVED";
    LoanApplicationStatus["REJECTED"] = "REJECTED";
    LoanApplicationStatus["SANCTIONED"] = "SANCTIONED";
    LoanApplicationStatus["AGREEMENT_PENDING"] = "AGREEMENT_PENDING";
    LoanApplicationStatus["READY_FOR_DISBURSEMENT"] = "READY_FOR_DISBURSEMENT";
    LoanApplicationStatus["DISBURSED"] = "DISBURSED";
    LoanApplicationStatus["CANCELLED"] = "CANCELLED";
})(LoanApplicationStatus || (exports.LoanApplicationStatus = LoanApplicationStatus = {}));
var RiskCategory;
(function (RiskCategory) {
    RiskCategory["LOW"] = "LOW";
    RiskCategory["MEDIUM"] = "MEDIUM";
    RiskCategory["HIGH"] = "HIGH";
    RiskCategory["VERY_HIGH"] = "VERY_HIGH";
})(RiskCategory || (exports.RiskCategory = RiskCategory = {}));
var CashDrawerStatus;
(function (CashDrawerStatus) {
    CashDrawerStatus["OPEN"] = "OPEN";
    CashDrawerStatus["PENDING_RECONCILIATION"] = "PENDING_RECONCILIATION";
    CashDrawerStatus["MATCHED"] = "MATCHED";
    CashDrawerStatus["MISMATCH"] = "MISMATCH";
    CashDrawerStatus["APPROVED_WITH_EXCEPTION"] = "APPROVED_WITH_EXCEPTION";
    CashDrawerStatus["CLOSED"] = "CLOSED";
})(CashDrawerStatus || (exports.CashDrawerStatus = CashDrawerStatus = {}));
var BusinessDateStatus;
(function (BusinessDateStatus) {
    BusinessDateStatus["OPEN"] = "OPEN";
    BusinessDateStatus["CLOSING"] = "CLOSING";
    BusinessDateStatus["PENDING_APPROVAL"] = "PENDING_APPROVAL";
    BusinessDateStatus["LOCKED"] = "LOCKED";
    BusinessDateStatus["REOPENED"] = "REOPENED";
})(BusinessDateStatus || (exports.BusinessDateStatus = BusinessDateStatus = {}));
var AccountClassification;
(function (AccountClassification) {
    AccountClassification["ASSET"] = "ASSET";
    AccountClassification["LIABILITY"] = "LIABILITY";
    AccountClassification["EQUITY"] = "EQUITY";
    AccountClassification["INCOME"] = "INCOME";
    AccountClassification["EXPENSE"] = "EXPENSE";
})(AccountClassification || (exports.AccountClassification = AccountClassification = {}));
var RecoveryBucket;
(function (RecoveryBucket) {
    RecoveryBucket["CURRENT"] = "CURRENT";
    RecoveryBucket["DPD_1_30"] = "1-30";
    RecoveryBucket["DPD_31_60"] = "31-60";
    RecoveryBucket["DPD_61_90"] = "61-90";
    RecoveryBucket["DPD_90_PLUS"] = "90+";
})(RecoveryBucket || (exports.RecoveryBucket = RecoveryBucket = {}));
var RecoveryActionType;
(function (RecoveryActionType) {
    RecoveryActionType["CALL"] = "CALL";
    RecoveryActionType["SMS"] = "SMS";
    RecoveryActionType["WHATSAPP"] = "WHATSAPP";
    RecoveryActionType["FIELD_VISIT"] = "FIELD_VISIT";
    RecoveryActionType["PROMISE_TO_PAY"] = "PROMISE_TO_PAY";
    RecoveryActionType["PAYMENT_RECEIVED"] = "PAYMENT_RECEIVED";
    RecoveryActionType["ESCALATION"] = "ESCALATION";
    RecoveryActionType["LEGAL_REVIEW"] = "LEGAL_REVIEW";
})(RecoveryActionType || (exports.RecoveryActionType = RecoveryActionType = {}));
var ComplaintStatus;
(function (ComplaintStatus) {
    ComplaintStatus["OPEN"] = "OPEN";
    ComplaintStatus["ASSIGNED"] = "ASSIGNED";
    ComplaintStatus["IN_PROGRESS"] = "IN_PROGRESS";
    ComplaintStatus["RESOLVED"] = "RESOLVED";
    ComplaintStatus["CLOSED"] = "CLOSED";
    ComplaintStatus["REOPENED"] = "REOPENED";
})(ComplaintStatus || (exports.ComplaintStatus = ComplaintStatus = {}));
var PriorityLevel;
(function (PriorityLevel) {
    PriorityLevel["LOW"] = "LOW";
    PriorityLevel["MEDIUM"] = "MEDIUM";
    PriorityLevel["HIGH"] = "HIGH";
    PriorityLevel["CRITICAL"] = "CRITICAL";
})(PriorityLevel || (exports.PriorityLevel = PriorityLevel = {}));
var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["SMS"] = "SMS";
    NotificationChannel["WHATSAPP"] = "WHATSAPP";
    NotificationChannel["EMAIL"] = "EMAIL";
    NotificationChannel["PUSH"] = "PUSH";
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
// ==========================================
// 3. BUSINESS RULES CONSTANTS (§94)
// ==========================================
exports.BusinessRules = {
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
};
