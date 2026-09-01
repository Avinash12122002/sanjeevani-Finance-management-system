# SANJEEVANI FINANCE MANAGEMENT SYSTEM
## Software Requirement Specification — SRS v1.0

**Project Name:** Sanjeevani Finance Management System  
**Short Name:** SFMS  
**System Type:** Financial Operations / Member Management / Loan Management / Collection Management / Accounting & MIS  
**Deployment:** Web + Mobile + Admin Dashboard  
**Architecture:** Modular Monolith initially, Microservice-ready  
**Primary Users:** Owner, General Manager, Branch Manager, Accountant, Cashier, Loan Officer, Recovery Officer, Collection Agent, Customer Service, Auditor, Member/Customer

---

# 1. PRODUCT VISION

Sanjeevani Finance Management System will replace register-based operations with a centralized digital system.

The application will manage:

- Members/customers
- KYC
- Membership
- Savings-type products
- RD-type products
- Term-deposit-type products
- Committee/chit-type products where permitted
- Loans
- EMI schedules
- Collections
- Recovery
- Cash
- Bank
- Accounting
- Receipts
- Branches
- Employees
- Roles and permissions
- Audit logs
- Notifications
- Complaints
- Documents
- MIS
- Management dashboards

Core philosophy:

**No software entry = no recognized transaction.**

---

# 2. BUSINESS GOALS

The system must enable Sanjeevani to:

1. Digitize all existing member records.
2. Give every member a unique permanent ID.
3. Give every account/product a unique account number.
4. Eliminate manual calculations.
5. Track every rupee from collection to bank/cash/account ledger.
6. Prevent unauthorized deletion or modification.
7. Track staff accountability.
8. Automate loan schedules and overdue tracking.
9. Create digital receipts.
10. Produce daily closing automatically.
11. Maintain centralized customer history.
12. Support multiple branches.
13. Provide owner-level MIS.
14. Provide audit trails.
15. Support future customer mobile applications.
16. Support configurable financial products.
17. Allow legal/compliance restrictions to be applied by configuration.

---

# 3. SYSTEM USERS

## 3.1 Super Admin / Owner

Full system access.

Can view:

- All branches
- All customers
- All transactions
- Financial MIS
- Loans
- Deposits
- Employees
- Audit logs
- Settings
- Permissions
- Risk
- Cash
- Bank
- Reports

Sensitive changes require maker-checker approval.

---

## 3.2 General Manager

Can:

- Monitor all branches
- Approve according to limits
- View operational MIS
- Monitor loan portfolio
- Review overdue
- Review collection
- View staff performance

Cannot modify system-level audit history.

---

## 3.3 Branch Manager

Responsible for:

- Branch operations
- Staff
- Cash closing
- Loan approvals within limit
- Customer complaints
- Reconciliation
- Branch reports

---

## 3.4 Accountant

Can access:

- Journal entries
- Ledgers
- Bank reconciliation
- Cash reconciliation
- Income
- Expenses
- Trial balance
- P&L
- Balance sheet
- Financial reports

---

## 3.5 Cashier

Can:

- Receive cash
- Record payments
- Issue receipts
- Make approved disbursements
- Close cash drawer
- Transfer cash to bank

Cannot approve own adjustments.

---

## 3.6 Loan Officer

Can:

- Create loan applications
- Upload documents
- Perform financial assessment
- Record field verification
- Recommend approve/reject

Cannot disburse funds directly.

---

## 3.7 Recovery Officer

Can access:

- Assigned overdue accounts
- Collection history
- Customer contact details
- Promise-to-pay information
- Recovery notes

---

## 3.8 Collection Agent

Can access only assigned members.

Can:

- View today's due list
- Record collection
- Generate receipt
- Record failed visit
- View outstanding amount

Cannot modify previous approved transactions.

---

## 3.9 Customer Service Executive

Can:

- Register customers
- Update non-sensitive profile information
- Upload KYC
- Generate statements
- Register complaints
- Process service requests

---

## 3.10 Auditor

Read-only access.

Can inspect:

- Transactions
- Modifications
- Approvals
- Audit logs
- Cash mismatches
- Reversals
- User activity

---

## 3.11 Customer / Member

Future customer portal/mobile app.

Can view:

- Profile
- Accounts
- Loans
- EMI
- Receipts
- Statements
- Maturity
- Notifications
- Complaints

---

# 4. HIGH-LEVEL SYSTEM ARCHITECTURE

```text
                         SANJEEVANI FINANCE

                           ┌─────────────┐
                           │ Customer App│
                           └──────┬──────┘
                                  │
┌──────────────┐          ┌───────▼────────┐        ┌──────────────┐
│ Staff Mobile │─────────▶│   API Gateway  │◀──────│ Admin Web App │
└──────────────┘          └───────┬────────┘        └──────────────┘
                                  │
                   ┌──────────────▼─────────────┐
                   │     Backend Application    │
                   │                            │
                   │ Customer                   │
                   │ Product                    │
                   │ Loan                       │
                   │ Collection                 │
                   │ Accounting                 │
                   │ Cash/Bank                  │
                   │ Employee                   │
                   │ Notification               │
                   │ Reporting                  │
                   │ Audit                      │
                   └──────────────┬─────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
 ┌───────▼────────┐      ┌────────▼───────┐       ┌──────▼───────┐
 │ PostgreSQL DB  │      │ Redis / Queue  │       │ File Storage │
 └────────────────┘      └────────────────┘       └──────────────┘
```

---

# 5. RECOMMENDED TECHNOLOGY STACK

## Backend

**NestJS + TypeScript**

Reasons:

- Modular
- Strong architecture
- Enterprise-friendly
- Type-safe
- Good validation
- Easy role-based authorization
- Queue integration
- Excellent PostgreSQL ecosystem

Alternative:

Java Spring Boot.

---

## Frontend Admin

**Next.js + React + TypeScript**

UI libraries:

- Material UI
- Ant Design
- shadcn/ui

---

## Mobile Application

Recommended:

**Flutter**

One codebase for:

- Android
- iOS

Separate applications can be provided for:

- Collection staff
- Customers

---

## Database

**PostgreSQL**

Do not use Excel or Firebase as the main financial database.

---

## Cache

Redis.

Used for:

- sessions
- OTP
- dashboard caching
- queues
- temporary locks

---

## Object Storage

S3-compatible storage.

Used for:

- KYC
- photos
- documents
- signed agreements
- receipts
- reports

---

## Notifications

Integration layer for:

- SMS
- WhatsApp
- Email
- Push notifications

---

# 6. BACKEND CODE STRUCTURE

```text
sanjeevani-finance/
│
├── apps/
│   ├── api/
│   ├── admin-web/
│   ├── collection-mobile/
│   └── customer-mobile/
│
├── backend/
│   └── src/
│
│       ├── main.ts
│       ├── app.module.ts
│
│       ├── common/
│       │   ├── decorators/
│       │   ├── guards/
│       │   ├── interceptors/
│       │   ├── exceptions/
│       │   ├── filters/
│       │   ├── middleware/
│       │   ├── validators/
│       │   ├── enums/
│       │   ├── utils/
│       │   └── constants/
│
│       ├── config/
│       │   ├── app.config.ts
│       │   ├── database.config.ts
│       │   ├── redis.config.ts
│       │   └── storage.config.ts
│
│       ├── modules/
│       │
│       │   ├── auth/
│       │   ├── users/
│       │   ├── roles/
│       │   ├── permissions/
│       │
│       │   ├── branches/
│       │   ├── employees/
│       │
│       │   ├── customers/
│       │   ├── kyc/
│       │   ├── nominees/
│       │   ├── documents/
│       │
│       │   ├── memberships/
│       │
│       │   ├── products/
│       │   ├── rd/
│       │   ├── term-deposits/
│       │   ├── committees/
│       │
│       │   ├── loans/
│       │   ├── loan-applications/
│       │   ├── credit-assessment/
│       │   ├── guarantors/
│       │   ├── emi/
│       │   ├── recovery/
│       │
│       │   ├── collections/
│       │   ├── receipts/
│       │
│       │   ├── cash/
│       │   ├── banks/
│       │   ├── reconciliation/
│       │
│       │   ├── accounting/
│       │   ├── ledger/
│       │   ├── journal/
│       │
│       │   ├── expenses/
│       │
│       │   ├── approvals/
│       │   ├── audit/
│       │
│       │   ├── notifications/
│       │   ├── complaints/
│       │
│       │   ├── reports/
│       │   ├── dashboards/
│       │
│       │   ├── payroll/
│       │   ├── attendance/
│       │
│       │   └── settings/
│
│       ├── database/
│       │   ├── entities/
│       │   ├── migrations/
│       │   ├── seeders/
│       │   └── repositories/
│
│       ├── jobs/
│       ├── events/
│       └── integrations/
│
├── packages/
│   ├── shared-types/
│   ├── validation/
│   └── financial-engine/
│
├── docker/
├── tests/
├── docs/
└── scripts/
```

---

# 7. STANDARD MODULE STRUCTURE

Every backend module should follow:

```text
loans/
│
├── loans.module.ts
├── loans.controller.ts
├── loans.service.ts
│
├── dto/
│   ├── create-loan.dto.ts
│   ├── update-loan.dto.ts
│   └── approve-loan.dto.ts
│
├── entities/
│   └── loan.entity.ts
│
├── repositories/
│   └── loan.repository.ts
│
├── policies/
│   └── loan.policy.ts
│
├── calculators/
│   └── emi.calculator.ts
│
└── tests/
    ├── loans.service.spec.ts
    └── emi.calculator.spec.ts
```

---

# 8. FRONTEND CODE STRUCTURE

```text
admin-web/
│
├── app/
│   ├── login/
│   ├── dashboard/
│   ├── customers/
│   ├── accounts/
│   ├── rd/
│   ├── deposits/
│   ├── loans/
│   ├── collections/
│   ├── recovery/
│   ├── accounting/
│   ├── employees/
│   ├── reports/
│   ├── complaints/
│   ├── audit/
│   └── settings/
│
├── components/
│
├── features/
│   ├── customer/
│   ├── loan/
│   ├── collection/
│   ├── accounting/
│   └── reports/
│
├── services/
│   ├── api.ts
│   ├── auth.ts
│   └── websocket.ts
│
├── hooks/
├── types/
├── utils/
└── constants/
```

---

# 9. CUSTOMER DATABASE

## customers

```text
id
customer_number
branch_id

first_name
middle_name
last_name

father_or_spouse_name

date_of_birth
gender

mobile
alternate_mobile
email

address_line_1
address_line_2
city
state
postal_code

photo_url

joining_date

status

created_by
created_at
updated_at
```

Example customer number:

`SJF-000001`

---

# 10. KYC TABLE

```text
customer_kyc

id
customer_id

document_type
document_number
document_url

verification_status

verified_by
verified_at

expiry_date

created_at
```

Statuses:

```text
PENDING
VERIFIED
REJECTED
EXPIRED
```

Sensitive KYC information must be encrypted/masked where appropriate.

---

# 11. NOMINEE

```text
nominees

id
customer_id

name
relationship
date_of_birth
mobile
address

percentage

created_at
```

---

# 12. BRANCH TABLE

```text
branches

id
branch_code
name

address
city
state

manager_id

phone

status

opened_at
created_at
```

Branch code example:

`SJF-BR001`

---

# 13. PRODUCT MASTER

Do not hard-code every product.

Use:

```text
products

id
product_code
product_name

product_type

minimum_amount
maximum_amount

minimum_tenure
maximum_tenure

interest_method
interest_rate

penalty_method

premature_allowed

requires_nominee

regulatory_status

is_enabled

effective_from
effective_to
```

Product types:

```text
SAVINGS
RD
TERM_DEPOSIT
LOAN
COMMITTEE
OTHER
```

`regulatory_status`:

```text
APPROVED
RESTRICTED
UNDER_REVIEW
DISABLED
```

No account can be opened when product status is not APPROVED.

---

# 14. ACCOUNT MASTER

```text
accounts

id
account_number

customer_id
product_id
branch_id

opening_date

principal_amount

interest_rate
tenure

maturity_date
maturity_amount

current_balance

status

created_by
approved_by

created_at
updated_at
```

Example:

`RD-2026-000123`

`TD-2026-000124`

---

# 15. ACCOUNT STATUS

```text
DRAFT
PENDING_APPROVAL
ACTIVE
FROZEN
MATURED
CLOSED
CANCELLED
```

---

# 16. TRANSACTION MASTER

This is one of the most critical tables.

```text
transactions

id
transaction_number

branch_id
customer_id
account_id

transaction_type

amount

payment_mode

transaction_date

reference_number

status

created_by
approved_by

reversal_of_transaction_id

remarks

created_at
approved_at
```

Transaction number:

`TXN-2026-00000001`

Transaction types:

```text
DEPOSIT
WITHDRAWAL
INSTALLMENT
LOAN_DISBURSEMENT
EMI_PAYMENT
INTEREST_CREDIT
PENALTY
FEE
REFUND
REVERSAL
ADJUSTMENT
```

---

# 17. IMMUTABLE TRANSACTION RULE

Approved financial transactions must never be deleted.

Wrong transaction:

```text
Original Transaction
        ↓
Reversal Transaction
        ↓
Correct Transaction
```

Example:

```text
TXN001 = +₹5,000
TXN002 = -₹5,000 REVERSAL
TXN003 = +₹3,000 CORRECT ENTRY
```

Audit trail remains complete.

---

# 18. RECEIPT MODULE

```text
receipts

id
receipt_number

transaction_id
customer_id

amount

payment_mode

collector_id

generated_at

pdf_url

delivery_status
```

Receipt number:

`SJF-RCP-2026-00001234`

---

# 19. RD MODULE

```text
rd_accounts

id
account_id

installment_amount
frequency

total_installments
paid_installments

next_due_date

late_fee

maturity_amount

status
```

---

# 20. RD INSTALLMENT TABLE

```text
rd_installments

id
rd_account_id

installment_number

due_date
amount_due

amount_paid

paid_at

status
```

Status:

```text
UPCOMING
DUE
PARTIAL
PAID
OVERDUE
WAIVED
```

---

# 21. TERM-DEPOSIT MODULE

```text
term_deposits

id
account_id

principal

interest_rate

interest_method

start_date
maturity_date

maturity_amount

premature_rate

nominee_id

certificate_number

status
```

---

# 22. LOAN APPLICATION

```text
loan_applications

id
application_number

customer_id
branch_id

loan_product_id

requested_amount
requested_tenure

purpose

declared_income

existing_liabilities

credit_score_internal

status

created_by
created_at
```

Application:

`LA-2026-000123`

---

# 23. LOAN APPLICATION STATUS

```text
DRAFT

SUBMITTED

KYC_PENDING

DOCUMENT_PENDING

FIELD_VERIFICATION

CREDIT_REVIEW

MANAGER_REVIEW

APPROVED

REJECTED

SANCTIONED

AGREEMENT_PENDING

READY_FOR_DISBURSEMENT

DISBURSED

CANCELLED
```

---

# 24. CREDIT ASSESSMENT

```text
credit_assessments

id
loan_application_id

kyc_score
income_score
repayment_score
liability_score
security_score
banking_score
field_score

total_score

risk_category

recommendation

assessed_by
assessed_at
```

Risk:

```text
LOW
MEDIUM
HIGH
VERY_HIGH
```

---

# 25. LOAN TABLE

```text
loans

id
loan_number

customer_id
loan_application_id

principal

annual_interest_rate

interest_method

tenure_months

emi_amount

disbursement_date

first_due_date
final_due_date

outstanding_principal

status

created_at
```

Loan number:

`LN-2026-000456`

---

# 26. EMI ENGINE

Support:

```text
FLAT_RATE
REDUCING_BALANCE
CUSTOM_SCHEDULE
```

For reducing balance:

```text
EMI =
P × r × (1+r)^n
-----------------
(1+r)^n - 1
```

Where:

```text
P = principal
r = monthly interest
n = months
```

All financial calculations must use decimal types.

Never use JavaScript floating-point Number for core money calculations.

Use:

```text
Decimal.js
```

or database decimal/numeric types.

---

# 27. EMI SCHEDULE

```text
loan_installments

id
loan_id

installment_number

due_date

opening_principal

principal_due
interest_due
fee_due
penalty_due

total_due

amount_paid

principal_paid
interest_paid

closing_principal

status
```

---

# 28. EMI STATUS

```text
UPCOMING
DUE
PARTIAL
PAID
OVERDUE
WAIVED
RESTRUCTURED
```

---

# 29. LOAN DISBURSEMENT WORKFLOW

```text
Loan Approved
     ↓
Sanction Generated
     ↓
Customer Acceptance
     ↓
Agreement Completed
     ↓
Final Verification
     ↓
Disbursement Request
     ↓
Maker Creates Transaction
     ↓
Checker Approves
     ↓
Bank/Cash Disbursement
     ↓
Loan Activated
     ↓
EMI Schedule Generated
```

---

# 30. LOAN APPROVAL MATRIX

Create configurable table:

```text
approval_limits

id
role_id
transaction_type

minimum_amount
maximum_amount

approval_level
```

Example:

```text
Loan Officer     ₹0 - ₹25,000       Recommend
Branch Manager   ₹25,001 - ₹1L      Approve
GM               ₹1L - ₹3L          Approve
Director         >₹3L               Approve
```

These values must be configurable.

---

# 31. COLLECTION MODULE

```text
collection_assignments

id
collector_id
customer_id

route_id

assigned_date

expected_amount

status
```

---

# 32. DAILY COLLECTION WORKFLOW

```text
Start Day
    ↓
Collector Login
    ↓
Assigned Customer List
    ↓
Visit Customer
    ↓
Select Account
    ↓
Enter Amount
    ↓
Select Mode
Cash / UPI / Bank
    ↓
Payment Validation
    ↓
Transaction Created
    ↓
Receipt Generated
    ↓
Customer Notification
    ↓
Collection Dashboard Updated
```

---

# 33. CASH COLLECTION RECONCILIATION

At closing:

```text
Total Cash Collected
-
Cash Deposited to Cashier
=
Difference
```

Collector cannot complete shift if difference exists without manager approval.

---

# 34. CASH DRAWER TABLE

```text
cash_drawers

id
branch_id
cashier_id

business_date

opening_balance
cash_received
cash_paid

expected_closing_balance
physical_closing_balance

difference

status

closed_by
approved_by
```

---

# 35. CASH STATUS

```text
OPEN
PENDING_RECONCILIATION
MATCHED
MISMATCH
APPROVED_WITH_EXCEPTION
CLOSED
```

---

# 36. BANK ACCOUNTS

```text
bank_accounts

id
branch_id

bank_name
account_name

masked_account_number

ifsc

opening_balance

current_book_balance

status
```

---

# 37. BANK RECONCILIATION

```text
bank_reconciliations

id
bank_account_id

statement_date

book_balance
statement_balance

unmatched_credits
unmatched_debits

difference

status

prepared_by
approved_by
```

---

# 38. ACCOUNTING ENGINE

Use double-entry accounting.

Every financial event produces:

```text
Debit
Credit
```

Example loan disbursement:

```text
Dr Loan Receivable        ₹100,000
Cr Bank                    ₹100,000
```

Loan repayment:

```text
Dr Bank                     ₹10,000
Cr Loan Principal            ₹8,000
Cr Interest Income           ₹2,000
```

---

# 39. GENERAL LEDGER

```text
chart_of_accounts

id
account_code
account_name

account_type

parent_id

is_active
```

Types:

```text
ASSET
LIABILITY
EQUITY
INCOME
EXPENSE
```

---

# 40. JOURNAL ENTRY

```text
journal_entries

id
journal_number

transaction_id

business_date

description

status

created_by
approved_by
```

---

# 41. JOURNAL LINES

```text
journal_lines

id
journal_entry_id

ledger_account_id

debit_amount
credit_amount

branch_id
customer_id
account_id
```

Every journal must satisfy:

```text
SUM(DEBIT) = SUM(CREDIT)
```

System must reject an unbalanced journal.

---

# 42. COMMITTEE MODULE

This module should be behind:

```text
feature_flag = OFF
```

until approved.

Database:

```text
committee_groups

id
committee_number
name

contribution_amount

member_count

start_date
end_date

frequency

payout_method

status
```

Members:

```text
committee_members

id
committee_id
customer_id

sequence_number

contribution_amount

total_paid
total_pending

payout_status
```

Installments:

```text
committee_installments

id
committee_member_id

due_date

amount_due
amount_paid

status
```

---

# 43. FEATURE FLAGS

Critical legal/compliance control:

```text
feature_flags

feature_name

enabled

enabled_for_branch

approved_by

effective_date

remarks
```

Examples:

```text
RD_PRODUCT
TERM_DEPOSIT
COMMITTEE
LUCKY_DRAW
PREMATURE_WITHDRAWAL
LOAN_GUARANTOR
CASH_DISBURSEMENT
```

This allows the software to disable a business activity without code changes.

---

# 44. LUCKY-DRAW MODULE

Do not build it directly into core accounting.

If ever approved, create as an optional promotional module.

```text
promotional_programs
program_members
entries
draws
winners
audit_logs
```

But:

```text
feature flag = disabled by default
```

---

# 45. EMPLOYEE TABLE

```text
employees

id
employee_number

user_id
branch_id

name
mobile
email

designation
joining_date

salary

reporting_manager_id

employment_status

created_at
```

Example:

`EMP-000125`

---

# 46. AUTHENTICATION

Recommended:

```text
Username/email/mobile
+
Password
+
OTP / 2FA for privileged actions
```

Session:

JWT access token + refresh token.

Privileged actions should require step-up authentication.

---

# 47. RBAC

Tables:

```text
roles
permissions
role_permissions
user_roles
```

Permissions examples:

```text
CUSTOMER_CREATE
CUSTOMER_EDIT

KYC_VERIFY

LOAN_CREATE
LOAN_RECOMMEND
LOAN_APPROVE
LOAN_DISBURSE

TRANSACTION_CREATE
TRANSACTION_APPROVE
TRANSACTION_REVERSE

CASH_CLOSE

REPORT_VIEW

AUDIT_VIEW

SETTINGS_EDIT
```

---

# 48. MAKER-CHECKER SYSTEM

Critical transactions should require two users.

Example:

```text
Cashier creates ₹2,00,000 payment
          ↓
STATUS = PENDING_APPROVAL
          ↓
Manager checks
          ↓
APPROVED
          ↓
Transaction posted
```

Rule:

```text
maker_user_id != checker_user_id
```

---

# 49. APPROVAL ENGINE

Generic approval table:

```text
approval_requests

id

entity_type
entity_id

action

amount

maker_id

required_role

status

approved_by

remarks

created_at
approved_at
```

Allows approval workflow for:

- Loans
- Withdrawals
- Reversals
- Account closures
- Interest adjustments
- Refunds
- Cash discrepancies
- Expenses

---

# 50. AUDIT LOG

Mandatory.

```text
audit_logs

id

user_id

event_type

entity_type
entity_id

old_value
new_value

ip_address
device_id

timestamp

reason
```

Example:

```text
USER: EMP0012

ACTION:
CUSTOMER_ADDRESS_UPDATED

OLD:
Agra

NEW:
Mathura

TIME:
2026-08-31 15:24:50
```

Audit logs cannot be edited through application UI.

---

# 51. LOGIN AUDIT

Track:

```text
login time
logout
failed attempts
IP
device
location approximation
session ID
```

---

# 52. DOCUMENT MANAGEMENT

```text
documents

id

entity_type
entity_id

document_type

file_url

mime_type

version

uploaded_by

verified_by

created_at
```

Used for:

- KYC
- Agreements
- Photos
- Signatures
- Income documents
- Loan documents
- Receipts
- Audit evidence

---

# 53. COMPLAINT MANAGEMENT

```text
complaints

id
complaint_number

customer_id

category

description

priority

assigned_to

status

resolution

created_at
resolved_at
```

Status:

```text
OPEN
ASSIGNED
IN_PROGRESS
RESOLVED
CLOSED
REOPENED
```

---

# 54. NOTIFICATION ENGINE

```text
notifications

id

customer_id

type
channel

template_id

message

scheduled_at
sent_at

delivery_status
```

Channels:

```text
SMS
WHATSAPP
EMAIL
PUSH
```

---

# 55. NOTIFICATION EVENTS

Automatic notifications:

```text
PAYMENT_RECEIVED

EMI_DUE

EMI_OVERDUE

RD_DUE

MATURITY_UPCOMING

LOAN_APPROVED

LOAN_REJECTED

LOAN_DISBURSED

ACCOUNT_OPENED

ACCOUNT_CLOSED

COMPLAINT_CREATED

COMPLAINT_RESOLVED
```

---

# 56. RECOVERY MODULE

```text
recovery_cases

id

loan_id

days_past_due

overdue_amount

bucket

assigned_to

priority

next_action_date

status
```

---

# 57. RECOVERY BUCKETS

Internal operational buckets:

```text
CURRENT

1-30

31-60

61-90

90+
```

Official regulatory/accounting classification should remain separately configurable.

---

# 58. RECOVERY ACTIONS

```text
recovery_actions

id
recovery_case_id

action_type

action_date

notes

promise_amount

promise_date

next_follow_up

created_by
```

Action types:

```text
CALL
SMS
WHATSAPP
FIELD_VISIT
PROMISE_TO_PAY
PAYMENT_RECEIVED
ESCALATION
LEGAL_REVIEW
```

---

# 59. EXPENSE MANAGEMENT

```text
expenses

id
branch_id

category_id

amount

description

payment_mode

voucher_number

receipt_url

created_by
approved_by

expense_date
```

---

# 60. PAYROLL

```text
salary_runs

id

month
year

employee_id

basic_salary

incentive
deductions

net_salary

status
```

---

# 61. COLLECTION AGENT KPI

Calculate:

```text
Expected Collection

Actual Collection

Collection %

Overdue Recovery

Cash Difference

Receipt Accuracy

Customer Complaints
```

---

# 62. LOAN OFFICER KPI

Track:

```text
Applications

Approval Rate

Disbursement

30-day delinquency

90-day delinquency

Portfolio Outstanding

Recovery Performance
```

---

# 63. DAILY CLOSING

Daily closing workflow:

```text
Collection Completed
       ↓
Collector Reconciliation
       ↓
Cashier Reconciliation
       ↓
Bank Transactions Checked
       ↓
Pending Transactions Reviewed
       ↓
Ledger Posted
       ↓
Mismatch Checked
       ↓
Manager Approval
       ↓
Business Date Locked
```

Once locked:

Transactions for the day cannot be silently edited.

---

# 64. BUSINESS-DATE LOCK

```text
business_day_closures

id
branch_id

business_date

status

closed_by
approved_by

closed_at
```

Status:

```text
OPEN
CLOSING
PENDING_APPROVAL
LOCKED
REOPENED
```

Reopening requires privileged approval and full audit log.

---

# 65. OWNER DASHBOARD

Dashboard cards:

```text
TOTAL MEMBERS

ACTIVE MEMBERS

TOTAL ACTIVE ACCOUNTS

TOTAL COLLECTION TODAY

TOTAL COLLECTION MONTH

TOTAL LOAN OUTSTANDING

NEW LOAN DISBURSEMENT

EMI DUE TODAY

EMI COLLECTED TODAY

TOTAL OVERDUE

OVERDUE %

CASH IN HAND

BANK BALANCE

INCOME

EXPENSE

NET RESULT

MISMATCH AMOUNT
```

---

# 66. OWNER DASHBOARD CHARTS

Recommended:

```text
Monthly Collection Trend

Loan Disbursement Trend

Loan Outstanding

Overdue Aging

Branch Performance

Collector Performance

Cash vs Bank

Product Distribution

Income vs Expense
```

---

# 67. RED ALERT DASHBOARD

Examples:

```text
Cash mismatch > 0

Bank reconciliation mismatch

Unapproved high-value transaction

KYC incomplete

Loan overdue > X days

Account maturity approaching

Repeated failed login

Manual adjustment made

Transaction reversal

Backdated transaction

Duplicate mobile/customer
```

---

# 68. REPORTING MODULE

Mandatory reports:

```text
Customer Master

Customer Statement

Account Statement

Daily Collection

Collector Summary

Cash Book

Bank Book

Bank Reconciliation

Daily Closing

RD Due

RD Overdue

Deposit Maturity

Loan Application Report

Loan Disbursement

Loan Outstanding

EMI Schedule

EMI Due

Overdue Aging

Recovery Report

Expense Report

Income Report

Trial Balance

Profit & Loss

Balance Sheet

Audit Trail

User Activity

Branch Performance
```

---

# 69. CUSTOMER 360 SCREEN

Opening a customer should display:

```text
CUSTOMER
SJF-000125
Rajesh Kumar

KYC: Verified

Accounts
--------------------------------
RD             ₹12,000
Term Deposit   ₹50,000
Loan           ₹80,000
Outstanding    ₹54,000

Next EMI       ₹8,500
Due Date       05-Sep-2026

Overdue        ₹0

Nominee        Pooja Kumar

Last Payment   ₹1,000

Documents      7

Complaints     0
```

---

# 70. COLLECTION MOBILE APP

Collector home:

```text
TODAY

Assigned Customers     42

Expected Amount        ₹52,500

Collected              ₹35,000

Pending                ₹17,500

Cash                   ₹20,000

Digital                ₹15,000
```

---

# 71. COLLECTION ROUTE

Optional:

```text
routes

id
route_name

branch_id

collector_id

area

sequence
```

Can later support map/location-based optimization.

---

# 72. CUSTOMER MOBILE APP

Screens:

```text
Login

Dashboard

Profile

Accounts

RD

Deposits

Loans

EMI Schedule

Payment History

Receipts

Statements

Notifications

Service Requests

Complaints

Help
```

---

# 73. API DESIGN

Base:

```text
/api/v1
```

Authentication:

```text
POST /auth/login
POST /auth/refresh
POST /auth/logout
POST /auth/otp/verify
```

Customers:

```text
POST   /customers
GET    /customers
GET    /customers/:id
PATCH  /customers/:id

POST   /customers/:id/kyc

GET    /customers/:id/accounts
GET    /customers/:id/transactions
GET    /customers/:id/statements
```

Products:

```text
GET  /products
POST /products
PATCH /products/:id
```

Loans:

```text
POST /loan-applications

GET /loan-applications/:id

POST /loan-applications/:id/submit

POST /loan-applications/:id/verification

POST /loan-applications/:id/credit-assessment

POST /loan-applications/:id/recommend

POST /loan-applications/:id/approve

POST /loan-applications/:id/reject

POST /loans/:id/disburse

GET /loans/:id/schedule

GET /loans/:id/payments
```

Collections:

```text
GET /collections/today

POST /collections

GET /collectors/:id/reconciliation

POST /collectors/:id/close-day
```

Transactions:

```text
POST /transactions

GET /transactions/:id

POST /transactions/:id/approve

POST /transactions/:id/reverse
```

Reports:

```text
GET /reports/daily-collection

GET /reports/loan-outstanding

GET /reports/overdue-aging

GET /reports/cash-book

GET /reports/trial-balance

GET /reports/profit-loss
```

---

# 74. API RESPONSE FORMAT

Success:

```json
{
  "success": true,
  "data": {},
  "message": "Transaction created successfully",
  "requestId": "REQ-123"
}
```

Failure:

```json
{
  "success": false,
  "error": {
    "code": "LOAN_LIMIT_EXCEEDED",
    "message": "User is not authorized to approve this amount"
  },
  "requestId": "REQ-124"
}
```

---

# 75. MONEY RULE

Never use:

```javascript
let balance = 10.1 + 20.2;
```

Financial values should use:

```text
PostgreSQL NUMERIC(18,2)

Decimal.js on backend
```

---

# 76. DATABASE TRANSACTIONS

Critical operations must run inside database transactions.

Example EMI payment:

```text
BEGIN

Create Transaction

Update Loan Installment

Update Loan Outstanding

Create Journal Entry

Create Journal Lines

Generate Receipt

COMMIT
```

If any part fails:

```text
ROLLBACK
```

---

# 77. IDEMPOTENCY

Payment API must support:

```text
Idempotency-Key
```

Otherwise a double-click or retry could create duplicate payment.

---

# 78. CONCURRENCY LOCKING

For balance-sensitive operations:

Use:

```text
SELECT ... FOR UPDATE
```

or optimistic version locking.

This prevents two employees from changing the same balance simultaneously.

---

# 79. EVENT ARCHITECTURE

Use internal events:

```text
PaymentReceived

LoanApproved

LoanDisbursed

EMIDue

EMIOverdue

AccountMatured

CustomerCreated

ComplaintCreated
```

Example:

```text
PaymentReceived
      ↓
Update Account
      ↓
Accounting Entry
      ↓
Generate Receipt
      ↓
Send WhatsApp
      ↓
Update Dashboard
```

---

# 80. BACKGROUND JOBS

Queue:

BullMQ + Redis.

Jobs:

```text
Generate EMI reminders

Generate RD reminders

Calculate maturity

Generate monthly statements

Send notifications

Create overdue buckets

Generate daily MIS

Run backups

Generate PDF reports
```

---

# 81. NIGHTLY JOBS

Example:

```text
00:05 Validate business closing

00:15 Update overdue statuses

00:30 Generate tomorrow due list

01:00 Generate dashboards

01:30 Backup

02:00 Data integrity checks
```

---

# 82. SECURITY

Minimum:

```text
HTTPS

Password hashing using Argon2/bcrypt

2FA

RBAC

Encryption at rest for sensitive information

Encrypted backups

Audit logs

Session expiry

Device monitoring

Rate limiting

IP logging

File malware scanning

Secure secret storage
```

---

# 83. DATA MASKING

Collector does not need to see full sensitive document information.

Example:

```text
PAN: ABCP****K

Account: ******1234
```

---

# 84. BACKUP STRATEGY

Use:

```text
Continuous database backup

Daily snapshot

Weekly snapshot

Monthly archive
```

Backups should be encrypted.

Periodically test restoration.

Backup that has never been restored/tested is not a reliable backup.

---

# 85. DISASTER RECOVERY

Define:

```text
RPO

RTO
```

Suggested starting target:

```text
RPO <= 15 minutes

RTO <= 4 hours
```

for a serious production system.

---

# 86. LOGGING

Structured logs:

```text
request_id

user_id

branch_id

action

endpoint

duration

result

timestamp
```

Never store plain passwords/OTPs in logs.

---

# 87. DATA MIGRATION SYSTEM

Existing registers:

```text
Register
   ↓
Data Entry Excel Template
   ↓
Validation
   ↓
Duplicate Detection
   ↓
Supervisor Verification
   ↓
Import
   ↓
Customer Confirmation
   ↓
Opening Balance Approval
   ↓
Opening Balance Lock
```

---

# 88. IMPORT TEMPLATE

Customers:

```text
Old Register Number

Customer Name

Father/Spouse

Mobile

Address

Joining Date

Product

Principal

Current Balance

Maturity Date

Loan Outstanding

Pending EMI
```

---

# 89. OPENING BALANCE CONTROL

Migrated balances should use a special entry:

```text
OPENING_BALANCE
```

Must record:

```text
source register

page number

entered by

verified by

approval date
```

---

# 90. DUPLICATE CUSTOMER DETECTION

System should warn when matching:

```text
mobile

PAN/KYC ID

name + DOB

name + father name + address
```

Do not auto-delete duplicates.

Send for review.

---

# 91. DAILY STAFF WORKFLOW

```text
09:30
Login

↓
Tasks / Due Lists

↓
Customer Operations

↓
Collections

↓
Loans

↓
Customer Requests

↓
Pending Approvals

↓
Reconciliation

↓
Daily Closing

↓
Manager Approval
```

---

# 92. BRANCH MANAGER WORKFLOW

Morning:

```text
Opening cash

Staff attendance

Pending approvals

Today's collections

Due EMI

Overdue
```

Evening:

```text
Cash verification

Collector reconciliation

Bank verification

Pending exceptions

Daily closing

MIS approval
```

---

# 93. OWNER WORKFLOW

Daily:

```text
Dashboard

Exception alerts

Collection

Overdue

Cash

Bank

High-value approvals
```

Weekly:

```text
Portfolio quality

Staff performance

Branch performance

Recovery

Complaints
```

Monthly:

```text
P&L

Balance Sheet

Cash Flow

Portfolio

Growth

Risk

Audit

Expansion
```

---

# 94. SOFTWARE BUSINESS RULES

Critical rules:

```text
BR-001
No customer without unique customer ID.

BR-002
No approved transaction can be deleted.

BR-003
Financial correction requires reversal.

BR-004
Maker cannot approve own restricted transaction.

BR-005
Disabled products cannot accept new accounts.

BR-006
Cash drawer must reconcile daily.

BR-007
Loan cannot be disbursed without required approvals.

BR-008
Loan schedule must exist before activation.

BR-009
Business date must be closed daily.

BR-010
Closed day cannot be edited without authorized reopening.

BR-011
Audit logs are immutable.

BR-012
Every customer payment generates a transaction number.

BR-013
Every successful customer payment produces a receipt.

BR-014
Branch-level users cannot access unauthorized branches.

BR-015
Sensitive changes require reason.

BR-016
All monetary ledger entries must balance.

BR-017
System must prevent duplicate payment through idempotency controls.

BR-018
Deleted financial records are prohibited.

BR-019
Product permissions are controlled by compliance configuration.

BR-020
All high-value operations require configurable approval.
```

---

# 95. DATABASE RELATIONSHIP OVERVIEW

```text
BRANCH
   │
   ├── EMPLOYEES
   │
   ├── CUSTOMERS
   │       │
   │       ├── KYC
   │       ├── NOMINEES
   │       ├── DOCUMENTS
   │       │
   │       ├── ACCOUNTS
   │       │      │
   │       │      ├── RD
   │       │      ├── TERM DEPOSIT
   │       │      └── TRANSACTIONS
   │       │
   │       └── LOANS
   │              │
   │              ├── EMI SCHEDULE
   │              ├── PAYMENTS
   │              └── RECOVERY
   │
   ├── CASH DRAWERS
   │
   ├── BANK ACCOUNTS
   │
   └── ACCOUNTING
          │
          ├── JOURNALS
          └── LEDGERS
```

---

# 96. ADMIN NAVIGATION

```text
Dashboard

Customers

Accounts
 ├ Savings
 ├ RD
 └ Term Deposits

Loans
 ├ Applications
 ├ Verification
 ├ Approval
 ├ Active Loans
 ├ EMI
 └ Overdue

Collections
 ├ Today's Collection
 ├ Routes
 ├ Collectors
 └ Reconciliation

Cash & Bank
 ├ Cash Drawer
 ├ Bank Accounts
 └ Reconciliation

Accounting
 ├ Chart of Accounts
 ├ Journals
 ├ Ledgers
 ├ Expenses
 └ Financial Statements

Recovery

Employees

Branches

Complaints

Reports

Audit

Notifications

Settings
```

---

# 97. DEVELOPMENT PHASES

## Phase 1 — Core Foundation

Build:

```text
Authentication

Users

Roles

Branches

Customers

KYC

Documents

Product Master

Audit Logs
```

---

## Phase 2 — Collections

Build:

```text
Accounts

Transactions

Receipts

Collection App

Collector Assignment

Cash Reconciliation
```

---

## Phase 3 — Loans

Build:

```text
Loan Application

Credit Assessment

Approvals

Loan Account

EMI Engine

Disbursement

Loan Payments

Overdue
```

---

## Phase 4 — Accounting

Build:

```text
Chart of Accounts

Journal Engine

Cash Book

Bank Book

Bank Reconciliation

P&L

Balance Sheet
```

---

## Phase 5 — Management

Build:

```text
Dashboards

MIS

Employee KPI

Complaints

Notifications

Audit Reporting
```

---

## Phase 6 — Customer App

Build:

```text
Customer login

Accounts

Loans

Statements

Receipts

Notifications

Complaints
```

---

## Phase 7 — Multi-Branch Scaling

Build:

```text
Branch controls

Centralized approvals

Branch MIS

Inter-branch transfers

Regional management
```

---

# 98. TESTING STRATEGY

Tests required:

```text
Unit Tests

Integration Tests

API Tests

Database Tests

Accounting Tests

EMI Calculation Tests

Permission Tests

Security Tests

Load Tests

Backup Restoration Tests

UAT
```

Financial engines should have especially high test coverage.

---

# 99. CRITICAL TEST CASE

Example:

Customer pays EMI ₹8,500.

Expected:

```text
Transaction = Created

Installment = Updated

Loan outstanding = Reduced

Journal = Balanced

Cash/Bank = Updated

Receipt = Generated

Notification = Queued

Audit = Recorded
```

If any component fails before completion:

```text
Entire financial transaction must rollback.
```

---

# 100. SOFTWARE ENVIRONMENTS

Maintain:

```text
LOCAL

DEVELOPMENT

TEST

UAT

PRODUCTION
```

Never test new functionality directly in production.

---

# 101. GIT STRUCTURE

Branches:

```text
main

develop

feature/customer-module

feature/loan-module

feature/collection-module

fix/payment-duplicate
```

Use pull requests.

At least one developer reviews before merge.

---

# 102. CI/CD

Pipeline:

```text
Developer pushes code

↓

Lint

↓

Unit tests

↓

Integration tests

↓

Security scan

↓

Build

↓

Deploy staging

↓

UAT

↓

Approval

↓

Production
```

---

# 103. DATABASE MIGRATIONS

Never manually change production DB structure.

Use migrations:

```text
001_create_customers

002_create_branches

003_create_products

004_create_accounts

005_create_transactions

006_create_loans
```

---

# 104. CONFIGURATION MANAGEMENT

Store configurable settings:

```text
company_name

financial_year

currency

timezone

receipt_prefix

loan_number_prefix

customer_prefix

maker_checker_threshold

daily_closing_time

password_policy

notification_templates
```

---

# 105. IDENTIFIER FORMAT

Recommended:

```text
Customer
SJF-CUS-000001

Employee
SJF-EMP-000001

Branch
SJF-BR-001

Loan
SJF-LN-2026-000001

Loan Application
SJF-LA-2026-000001

RD
SJF-RD-2026-000001

Term Deposit
SJF-TD-2026-000001

Transaction
SJF-TXN-2026-00000001

Receipt
SJF-RCP-2026-00000001

Complaint
SJF-CMP-2026-000001
```

---

# 106. REPORT EXPORTS

Support:

```text
PDF

Excel

CSV
```

Reports should show:

```text
Generated by

Generated time

Branch

Filters

Page numbering
```

---

# 107. SEARCH

Global search:

Search by:

```text
Customer ID

Name

Mobile

Account Number

Loan Number

Receipt

Transaction Number
```

---

# 108. PERFORMANCE TARGET

Initial system target:

```text
50,000 customers

500 concurrent staff

1,000,000+ transactions

50 branches
```

Architecture should allow scale beyond this later.

---

# 109. INDEXES

Database indexes on:

```text
customer_number

mobile

account_number

loan_number

transaction_number

transaction_date

branch_id

customer_id

account_id

due_date

status
```

---

# 110. SOFT DELETE

Non-financial master data may support:

```text
deleted_at
```

Financial transactions must never be soft-deleted in normal operation.

They must use reversal.

---

# 111. ERROR HANDLING

Examples:

```text
CUSTOMER_NOT_FOUND

ACCOUNT_FROZEN

INSUFFICIENT_PERMISSION

PRODUCT_DISABLED

TRANSACTION_DUPLICATE

BUSINESS_DAY_CLOSED

APPROVAL_REQUIRED

CASH_DRAWER_CLOSED

INVALID_AMOUNT

LOAN_NOT_ACTIVE
```

---

# 112. OBSERVABILITY

Production should monitor:

```text
API health

Database health

Queue status

CPU

Memory

Storage

Error rate

Failed jobs

Failed notifications

Login failures
```

---

# 113. FRAUD/RISK ALERT ENGINE

Future module.

Rules:

```text
Multiple reversals by same employee

Backdated transactions

Large cash transaction

Repeated adjustments

Multiple customer accounts using same mobile

Unusual collector collections

Cash mismatch

Large loan override

Loan approved immediately after creation

Unusual login device
```

---

# 114. SANJEEVANI MASTER WORKFLOW

```text
                    NEW CUSTOMER
                         │
                         ▼
                      KYC
                         │
                         ▼
                    MEMBERSHIP
                         │
             ┌───────────┴────────────┐
             │                        │
             ▼                        ▼
         SAVINGS                  LOAN REQUEST
       / RD / TD                      │
             │                        ▼
             │                   APPLICATION
             │                        │
             │                        ▼
             │                 CREDIT ASSESSMENT
             │                        │
             │                        ▼
             │                    APPROVAL
             │                        │
             │                        ▼
             │                  DISBURSEMENT
             │                        │
             │                        ▼
             │                       EMI
             │                        │
             └───────────┬────────────┘
                         ▼
                     COLLECTION
                         │
                         ▼
                      RECEIPT
                         │
                         ▼
                   CASH / BANK
                         │
                         ▼
                    ACCOUNTING
                         │
                         ▼
                  RECONCILIATION
                         │
                         ▼
                   DAILY CLOSING
                         │
                         ▼
                        MIS
                         │
                         ▼
                 OWNER DASHBOARD
```

---

# 115. THE MOST IMPORTANT ARCHITECTURAL PRINCIPLE

Do not build:

```text
RD software

+

Loan software

+

Accounting software

+

Collection software
```

as four disconnected applications.

Build:

```text
                 CUSTOMER MASTER
                       │
                 ACCOUNT MASTER
                       │
              TRANSACTION ENGINE
                       │
     ┌─────────────────┼────────────────┐
     │                 │                │
   PRODUCTS           LOANS        COLLECTIONS
     │                 │                │
     └─────────────────┼────────────────┘
                       │
                 ACCOUNTING
                       │
                       ▼
                 OWNER MIS
```

Everything should ultimately connect through the same customer, account and transaction system.

---

# 116. FINAL SOFTWARE ARCHITECTURE

```text
SANJEEVANI FINANCE PLATFORM

IDENTITY LAYER
 ├ Users
 ├ Roles
 └ Permissions

ORGANIZATION LAYER
 ├ Branches
 └ Employees

CUSTOMER LAYER
 ├ Customer
 ├ KYC
 ├ Nominee
 └ Documents

PRODUCT LAYER
 ├ Product Master
 ├ RD
 ├ Term Deposit
 └ Configurable Products

CREDIT LAYER
 ├ Loan Application
 ├ Credit Assessment
 ├ Approval
 ├ Loan
 ├ EMI
 └ Recovery

TRANSACTION LAYER
 ├ Payments
 ├ Collections
 ├ Receipts
 └ Reversals

FINANCE LAYER
 ├ Cash
 ├ Bank
 ├ Accounting
 ├ Reconciliation
 └ Expenses

CONTROL LAYER
 ├ Maker Checker
 ├ Approval Matrix
 ├ Audit Log
 ├ Feature Flags
 └ Risk Alerts

COMMUNICATION LAYER
 ├ SMS
 ├ WhatsApp
 ├ Email
 └ Push

MANAGEMENT LAYER
 ├ Reports
 ├ MIS
 ├ KPI
 └ Dashboard
```

---

# 117. RECOMMENDED MVP

Do not build everything on Day 1.

First release should contain:

```text
Customer

KYC

Branches

Employees

Roles

Product Master

Accounts

Loans

EMI

Collections

Transactions

Receipts

Cash Reconciliation

Basic Accounting

Audit Logs

Daily Closing

Owner Dashboard
```

Then add:

```text
Customer App

Advanced Recovery

WhatsApp Automation

Payroll

Advanced Accounting

BI

Fraud Detection

Multi-branch scaling
```

---

# 118. ULTIMATE RULE

Your software should ensure:

```text
Every Customer
has an ID.

Every Account
has a number.

Every Payment
has a transaction.

Every Transaction
has a receipt.

Every Rupee
has a ledger entry.

Every Change
has an audit record.

Every Important Action
has an authority.

Every Employee
has accountability.

Every Branch
has reconciliation.

Every Day
has closing.

And the Owner
has one dashboard.
```

That is the foundation of the Sanjeevani Finance Management System.