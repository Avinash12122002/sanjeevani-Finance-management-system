export const CREATE_TABLES_SQL = `
-- 1. BRANCHES MASTER
CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(50) PRIMARY KEY,
    branch_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    opened_at DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS & STAFF
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(150),
    mobile VARCHAR(20),
    roles TEXT[] NOT NULL DEFAULT '{"SUPER_ADMIN"}',
    branch_id VARCHAR(50),
    branch_name VARCHAR(150),
    employee_id VARCHAR(50),
    employee_name VARCHAR(150),
    is_active BOOLEAN DEFAULT TRUE,
    is_2fa_enabled BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255) DEFAULT 'Password@123',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. EMPLOYEES DIRECTORY
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(50) PRIMARY KEY,
    employee_number VARCHAR(50) UNIQUE NOT NULL,
    user_id VARCHAR(50),
    branch_id VARCHAR(50),
    branch_code VARCHAR(20),
    branch_name VARCHAR(150),
    name VARCHAR(150) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    designation VARCHAR(100),
    joining_date DATE DEFAULT CURRENT_DATE,
    salary NUMERIC(15, 2) DEFAULT 0,
    employment_status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. CUSTOMERS / MEMBERS (360°)
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    customer_number VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    aadhaar VARCHAR(20),
    pan VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    kyc_status VARCHAR(20) DEFAULT 'VERIFIED',
    risk_category VARCHAR(20) DEFAULT 'LOW',
    assigned_collector_id VARCHAR(50),
    branch_id VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. FINANCIAL PRODUCTS
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    product_type VARCHAR(50) NOT NULL,
    min_amount NUMERIC(15, 2) DEFAULT 0,
    max_amount NUMERIC(15, 2) DEFAULT 0,
    min_tenure_months INT DEFAULT 0,
    max_tenure_months INT DEFAULT 0,
    interest_method VARCHAR(50),
    interest_rate NUMERIC(6, 2) NOT NULL,
    penalty_rate NUMERIC(6, 2) DEFAULT 0,
    premature_allowed BOOLEAN DEFAULT TRUE,
    requires_nominee BOOLEAN DEFAULT FALSE,
    regulatory_status VARCHAR(50) DEFAULT 'APPROVED',
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. DEPOSIT & SAVINGS ACCOUNTS
CREATE TABLE IF NOT EXISTS accounts (
    id VARCHAR(50) PRIMARY KEY,
    account_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(50),
    customer_name VARCHAR(150) NOT NULL,
    customer_mobile VARCHAR(20),
    product_id VARCHAR(50),
    product_name VARCHAR(150),
    product_type VARCHAR(50),
    branch_id VARCHAR(50),
    branch_name VARCHAR(150),
    balance NUMERIC(15, 2) DEFAULT 0,
    interest_rate NUMERIC(6, 2) DEFAULT 0,
    tenure_months INT DEFAULT 12,
    monthly_deposit NUMERIC(15, 2) DEFAULT 0,
    maturity_amount NUMERIC(15, 2) DEFAULT 0,
    maturity_date DATE,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    opened_at DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. LOANS ORIGINATION & BALANCES
CREATE TABLE IF NOT EXISTS loans (
    id VARCHAR(50) PRIMARY KEY,
    loan_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(50),
    customer_name VARCHAR(150) NOT NULL,
    customer_mobile VARCHAR(20),
    product_id VARCHAR(50),
    product_name VARCHAR(150),
    branch_id VARCHAR(50),
    branch_name VARCHAR(150),
    principal_amount NUMERIC(15, 2) NOT NULL,
    sanctioned_amount NUMERIC(15, 2) NOT NULL,
    disbursed_amount NUMERIC(15, 2) DEFAULT 0,
    interest_rate NUMERIC(6, 2) NOT NULL,
    interest_method VARCHAR(50),
    tenure_months INT NOT NULL,
    emi_amount NUMERIC(15, 2) NOT NULL,
    total_payable NUMERIC(15, 2) NOT NULL,
    total_paid NUMERIC(15, 2) DEFAULT 0,
    principal_outstanding NUMERIC(15, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    disbursed_at DATE,
    mature_at DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. REPAYMENT SCHEDULES (EMIs)
CREATE TABLE IF NOT EXISTS repayment_schedules (
    id VARCHAR(50) PRIMARY KEY,
    loan_id VARCHAR(50) REFERENCES loans(id) ON DELETE CASCADE,
    installment_no INT NOT NULL,
    due_date DATE NOT NULL,
    principal_component NUMERIC(15, 2) NOT NULL,
    interest_component NUMERIC(15, 2) NOT NULL,
    emi_amount NUMERIC(15, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'DUE',
    paid_date DATE,
    penalty_charged NUMERIC(15, 2) DEFAULT 0
);

-- 9. COLLECTIONS & DIGITAL RECEIPTS
CREATE TABLE IF NOT EXISTS receipts (
    id VARCHAR(50) PRIMARY KEY,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    transaction_id VARCHAR(50),
    customer_id VARCHAR(50),
    customer_name VARCHAR(150) NOT NULL,
    customer_mobile VARCHAR(20),
    account_id VARCHAR(50),
    loan_id VARCHAR(50),
    payment_mode VARCHAR(50) DEFAULT 'CASH',
    amount NUMERIC(15, 2) NOT NULL,
    collector_id VARCHAR(50),
    collector_name VARCHAR(150),
    branch_id VARCHAR(50),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. CASHIER DRAWER & VAULT
CREATE TABLE IF NOT EXISTS cash_drawers (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50),
    branch_name VARCHAR(150),
    cashier_id VARCHAR(50),
    cashier_name VARCHAR(150),
    business_date DATE DEFAULT CURRENT_DATE,
    opening_balance NUMERIC(15, 2) DEFAULT 0,
    cash_received NUMERIC(15, 2) DEFAULT 0,
    cash_paid NUMERIC(15, 2) DEFAULT 0,
    expected_closing_balance NUMERIC(15, 2) DEFAULT 0,
    physical_closing_balance NUMERIC(15, 2) DEFAULT 0,
    difference NUMERIC(15, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'OPEN',
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- 11. CHART OF ACCOUNTS (DOUBLE-ENTRY)
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id VARCHAR(50) PRIMARY KEY,
    account_code VARCHAR(20) UNIQUE NOT NULL,
    account_name VARCHAR(150) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    current_balance NUMERIC(15, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- 12. GENERAL LEDGER TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(50) PRIMARY KEY,
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    account_id VARCHAR(50),
    customer_id VARCHAR(50),
    transaction_type VARCHAR(50) NOT NULL,
    payment_mode VARCHAR(50) DEFAULT 'CASH',
    amount NUMERIC(15, 2) NOT NULL,
    running_balance NUMERIC(15, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'POSTED',
    reference_no VARCHAR(100),
    branch_id VARCHAR(50),
    performed_by VARCHAR(150),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. DAILY CLOSING / DATE LOCK
CREATE TABLE IF NOT EXISTS daily_closures (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50),
    branch_name VARCHAR(150),
    business_date DATE NOT NULL,
    opening_cash NUMERIC(15, 2) DEFAULT 0,
    total_collections NUMERIC(15, 2) DEFAULT 0,
    total_disbursements NUMERIC(15, 2) DEFAULT 0,
    closing_cash NUMERIC(15, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'LOCKED',
    closed_by_id VARCHAR(50),
    closed_by_name VARCHAR(150),
    closed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    can_reopen BOOLEAN DEFAULT TRUE
);

-- 14. AUDIT & SURVEILLANCE LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
    user_name VARCHAR(150),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    client_ip VARCHAR(50),
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. CUSTOMER COMPLAINTS & GRIEVANCES
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
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

export const SEED_MASTER_DATA_SQL = `
-- Seed Branch
INSERT INTO branches (id, branch_code, name, address, city, state, phone, status)
VALUES ('BR-001', 'SJF-BR001', 'Head Office - Main Branch', 'Administrative Head Office', 'Agra', 'Uttar Pradesh', '+91 562 2520101', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Seed Super Admin User
INSERT INTO users (id, username, email, mobile, roles, branch_id, branch_name, employee_id, employee_name, is_active, password_hash)
VALUES ('USR-001', 'owner_admin', 'owner@sanjeevanifinance.com', '9876543210', '{"SUPER_ADMIN"}', 'BR-001', 'Head Office - Main Branch', 'EMP-001', 'System Administrator (Owner)', TRUE, 'Password@123')
ON CONFLICT (id) DO NOTHING;

-- Seed Super Admin Employee
INSERT INTO employees (id, employee_number, user_id, branch_id, branch_code, branch_name, name, mobile, email, designation, employment_status, joining_date)
VALUES ('EMP-001', 'SJF-EMP-000001', 'USR-001', 'BR-001', 'SJF-BR001', 'Head Office - Main Branch', 'System Administrator (Owner)', '9876543210', 'owner@sanjeevanifinance.com', 'SUPER_ADMIN', 'ACTIVE', CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;

-- Seed Products
INSERT INTO products (id, product_code, product_name, product_type, interest_rate, min_tenure_months, max_tenure_months, min_amount, max_amount, is_enabled)
VALUES 
('PRD-001', 'SJF-PRD-SAV01', 'Sanjeevani Regular Savings', 'SAVINGS', 4.0, 0, 120, 500, 500000, TRUE),
('PRD-002', 'SJF-PRD-RD01', 'Sanjeevani Monthly Sanchay RD', 'RD', 8.5, 12, 60, 1000, 50000, TRUE),
('PRD-003', 'SJF-PRD-TD01', 'Sanjeevani Samriddhi Fixed Deposit', 'TERM_DEPOSIT', 9.5, 12, 60, 10000, 2500000, TRUE),
('PRD-004', 'SJF-PRD-LN-MSME', 'Vyapar Unnati MSME Business Loan', 'LOAN', 14.0, 6, 36, 25000, 500000, TRUE),
('PRD-005', 'SJF-PRD-LN-MICRO', 'Mahila Shakti Micro Enterprise Loan', 'LOAN', 12.0, 6, 24, 10000, 100000, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Seed Chart of Accounts
INSERT INTO chart_of_accounts (id, account_code, account_name, account_type, current_balance, is_active)
VALUES
('COA-1010', '1010', 'Cash In Hand (Vault)', 'ASSET', 0, TRUE),
('COA-1020', '1020', 'Bank Accounts (Current/Settlement)', 'ASSET', 0, TRUE),
('COA-1030', '1030', 'Loan Principal Portfolio Receivable', 'ASSET', 0, TRUE),
('COA-2010', '2010', 'Recurring Deposits Payable (Liability)', 'LIABILITY', 0, TRUE),
('COA-2020', '2020', 'Term Deposits Payable (Liability)', 'LIABILITY', 0, TRUE),
('COA-3010', '3010', 'Share Capital & Reserves', 'EQUITY', 0, TRUE),
('COA-4010', '4010', 'Interest Income from Loans', 'INCOME', 0, TRUE),
('COA-4020', '4020', 'Processing Fees & Documentation Revenue', 'INCOME', 0, TRUE),
('COA-5010', '5010', 'Interest Expense on Deposits', 'EXPENSE', 0, TRUE),
('COA-5020', '5020', 'Employee Salaries & Field Incentives', 'EXPENSE', 0, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Seed Initial Open Cash Drawer for Today
INSERT INTO cash_drawers (id, branch_id, branch_name, cashier_id, cashier_name, business_date, opening_balance, cash_received, cash_paid, expected_closing_balance, physical_closing_balance, difference, status)
VALUES ('CD-001', 'BR-001', 'Head Office - Main Branch', 'USR-001', 'System Administrator (Owner)', CURRENT_DATE, 0, 0, 0, 0, 0, 0, 'OPEN')
ON CONFLICT (id) DO NOTHING;
`;
