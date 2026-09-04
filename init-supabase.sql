-- ==============================================================================
-- SANJEEVANI FINANCE MANAGEMENT SYSTEM - POSTGRESQL INITIALIZATION SCHEMA
-- Run this in Supabase SQL Editor or pgAdmin 4 Query Tool
-- ==============================================================================

-- 1. Branches
CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(50) PRIMARY KEY,
    branch_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100),
    mobile VARCHAR(15),
    roles TEXT[] DEFAULT '{"SUPER_ADMIN"}',
    branch_id VARCHAR(50),
    branch_name VARCHAR(100),
    employee_id VARCHAR(50),
    employee_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    is_2fa_enabled BOOLEAN DEFAULT FALSE,
    password_hash TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Employees
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(50) PRIMARY KEY,
    employee_number VARCHAR(50) UNIQUE NOT NULL,
    branch_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    email VARCHAR(100),
    designation VARCHAR(50) NOT NULL,
    joining_date DATE NOT NULL,
    salary NUMERIC(12,2) DEFAULT 0,
    employment_status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Customers (Members)
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    customer_number VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    email VARCHAR(100),
    aadhaar VARCHAR(20),
    pan VARCHAR(20),
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    kyc_status VARCHAR(20) DEFAULT 'VERIFIED',
    risk_category VARCHAR(20) DEFAULT 'LOW',
    assigned_collector_id VARCHAR(50),
    branch_id VARCHAR(50),
    portal_password TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Products
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    product_type VARCHAR(50) NOT NULL,
    interest_rate NUMERIC(6,2) NOT NULL,
    min_tenure_months INT DEFAULT 12,
    max_tenure_months INT DEFAULT 60,
    min_amount NUMERIC(15,2) DEFAULT 100,
    max_amount NUMERIC(15,2) DEFAULT 1000000,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Accounts (Savings / RD / FD)
CREATE TABLE IF NOT EXISTS accounts (
    id VARCHAR(50) PRIMARY KEY,
    account_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(50) NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_mobile VARCHAR(15),
    product_id VARCHAR(50),
    product_name VARCHAR(100),
    product_type VARCHAR(50),
    branch_id VARCHAR(50),
    branch_name VARCHAR(100),
    balance NUMERIC(15,2) DEFAULT 0,
    interest_rate NUMERIC(6,2) DEFAULT 0,
    tenure_months INT DEFAULT 12,
    monthly_deposit NUMERIC(15,2) DEFAULT 0,
    maturity_amount NUMERIC(15,2) DEFAULT 0,
    maturity_date DATE,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Loans
CREATE TABLE IF NOT EXISTS loans (
    id VARCHAR(50) PRIMARY KEY,
    loan_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(50) NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_mobile VARCHAR(15),
    product_id VARCHAR(50),
    product_name VARCHAR(100),
    branch_id VARCHAR(50),
    branch_name VARCHAR(100),
    principal_amount NUMERIC(15,2) NOT NULL,
    sanctioned_amount NUMERIC(15,2) NOT NULL,
    disbursed_amount NUMERIC(15,2) NOT NULL,
    interest_rate NUMERIC(6,2) NOT NULL,
    interest_method VARCHAR(50),
    tenure_months INT NOT NULL,
    emi_amount NUMERIC(15,2) NOT NULL,
    total_payable NUMERIC(15,2) NOT NULL,
    total_paid NUMERIC(15,2) DEFAULT 0,
    principal_outstanding NUMERIC(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    disbursed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mature_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Repayment Schedules / Installments
CREATE TABLE IF NOT EXISTS repayment_schedules (
    id VARCHAR(50) PRIMARY KEY,
    loan_id VARCHAR(50) NOT NULL,
    installment_number INT NOT NULL,
    due_date DATE NOT NULL,
    principal_due NUMERIC(15,2) NOT NULL,
    interest_due NUMERIC(15,2) NOT NULL,
    emi_amount NUMERIC(15,2) NOT NULL,
    principal_paid NUMERIC(15,2) DEFAULT 0,
    interest_paid NUMERIC(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'PENDING',
    paid_at TIMESTAMP
);

-- 9. Receipts
CREATE TABLE IF NOT EXISTS receipts (
    id VARCHAR(50) PRIMARY KEY,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    transaction_id VARCHAR(50),
    customer_id VARCHAR(50) NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_mobile VARCHAR(15),
    account_id VARCHAR(50),
    loan_id VARCHAR(50),
    payment_mode VARCHAR(20) DEFAULT 'CASH',
    amount NUMERIC(15,2) NOT NULL,
    collector_id VARCHAR(50),
    collector_name VARCHAR(100),
    branch_id VARCHAR(50),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Cash Drawers
CREATE TABLE IF NOT EXISTS cash_drawers (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) NOT NULL,
    branch_name VARCHAR(100),
    cashier_id VARCHAR(50) NOT NULL,
    cashier_name VARCHAR(100) NOT NULL,
    business_date DATE NOT NULL,
    opening_balance NUMERIC(15,2) DEFAULT 0,
    cash_received NUMERIC(15,2) DEFAULT 0,
    cash_paid NUMERIC(15,2) DEFAULT 0,
    expected_closing_balance NUMERIC(15,2) DEFAULT 0,
    physical_closing_balance NUMERIC(15,2) DEFAULT 0,
    difference NUMERIC(15,2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'OPEN',
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP
);

-- 11. Chart of Accounts (COA)
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id VARCHAR(50) PRIMARY KEY,
    account_code VARCHAR(20) UNIQUE NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    current_balance NUMERIC(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(50) PRIMARY KEY,
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    account_id VARCHAR(50),
    customer_id VARCHAR(50),
    transaction_type VARCHAR(50) NOT NULL,
    payment_mode VARCHAR(20) DEFAULT 'CASH',
    amount NUMERIC(15,2) NOT NULL,
    running_balance NUMERIC(15,2) DEFAULT 0,
    reference_no VARCHAR(100),
    branch_id VARCHAR(50),
    performed_by VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Daily Closures
CREATE TABLE IF NOT EXISTS daily_closures (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) NOT NULL,
    branch_name VARCHAR(100),
    business_date DATE NOT NULL,
    opening_cash NUMERIC(15,2) DEFAULT 0,
    total_collections NUMERIC(15,2) DEFAULT 0,
    total_disbursements NUMERIC(15,2) DEFAULT 0,
    closing_cash NUMERIC(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'LOCKED',
    closed_by_id VARCHAR(50),
    closed_by_name VARCHAR(100),
    closed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    can_reopen BOOLEAN DEFAULT TRUE
);

-- 14. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. Customer Complaints & Grievances
CREATE TABLE IF NOT EXISTS complaints (
    id VARCHAR(50) PRIMARY KEY,
    complaint_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(50),
    customer_name VARCHAR(150),
    customer_number VARCHAR(50),
    category VARCHAR(100),
    description TEXT,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    status VARCHAR(20) DEFAULT 'OPEN',
    resolution TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes for Customer Portal & Fast Mobile Lookups
CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);
CREATE INDEX IF NOT EXISTS idx_accounts_customer_id ON accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_loans_customer_id ON loans(customer_id);
CREATE INDEX IF NOT EXISTS idx_complaints_customer_id ON complaints(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);

-- Safe Column Upgrades for Existing Databases
ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_password TEXT;

-- ==============================================================================
-- INITIAL MASTER SEED DATA
-- ==============================================================================

-- Seed Head Office Branch
INSERT INTO branches (id, branch_code, name, address, city, state, phone, status)
VALUES ('BR-001', 'SJF-BR001', 'Head Office - Main Branch', 'Sanjeevani Tower, MG Road', 'Agra', 'Uttar Pradesh', '+91 562 2854000', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Seed Super Admin User
INSERT INTO users (id, username, email, mobile, roles, branch_id, branch_name, employee_id, employee_name, is_active, is_2fa_enabled, password_hash)
VALUES ('USR-001', 'admin', 'admin@sanjeevani.com', '9876543210', '{"SUPER_ADMIN"}', 'BR-001', 'Head Office - Main Branch', 'EMP-001', 'Managing Director', TRUE, FALSE, 'Password@123')
ON CONFLICT (id) DO NOTHING;

-- Seed Banking Products
INSERT INTO products (id, product_code, product_name, product_type, interest_rate, min_tenure_months, max_tenure_months, min_amount, max_amount, is_enabled)
VALUES
  ('PRD-001', 'SJF-RD-01', 'Sanjeevani Recurring Deposit', 'RD', 9.50, 12, 60, 500, 50000, TRUE),
  ('PRD-002', 'SJF-DS-01', 'Daily Savings Scheme', 'SAVINGS', 4.00, 6, 24, 50, 10000, TRUE),
  ('PRD-003', 'SJF-FD-01', 'Fixed Term Deposit', 'TERM_DEPOSIT', 11.00, 12, 60, 5000, 1000000, TRUE),
  ('PRD-004', 'SJF-LN-GL', 'Sanjeevani Group Loan', 'LOAN', 18.00, 6, 24, 10000, 100000, TRUE),
  ('PRD-005', 'SJF-LN-MSME', 'MSME Business Growth Loan', 'LOAN', 16.50, 12, 48, 50000, 500000, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Seed Chart of Accounts
INSERT INTO chart_of_accounts (id, account_code, account_name, account_type, current_balance, is_active)
VALUES
  ('COA-1010', '1010', 'Cash in Hand (Main Vault)', 'ASSET', 250000, TRUE),
  ('COA-1020', '1020', 'Bank Account - SBI Current', 'ASSET', 1250000, TRUE),
  ('COA-1030', '1030', 'Loan Portfolio Principal Outstanding', 'ASSET', 4500000, TRUE),
  ('COA-2010', '2010', 'Member Deposit Liabilities (RD/Savings)', 'LIABILITY', 3800000, TRUE),
  ('COA-3010', '3010', 'Share Capital / Reserves', 'EQUITY', 2000000, TRUE),
  ('COA-4010', '4010', 'Interest Income from Loans', 'INCOME', 185000, TRUE),
  ('COA-5010', '5010', 'Operational & Staff Expenses', 'EXPENSE', 85000, TRUE)
ON CONFLICT (id) DO NOTHING;
