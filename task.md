# 🏦 Sanjeevani Finance — Bug Fix & Feature Implementation Tasks

## Phase 0 — Bug Fixes (CRITICAL)

- [/] BUG-01: Credit score weights & risk thresholds don't match SRS §11 — loans.controller.ts
- [ ] BUG-02: OVERDUE installments skipped on payment — collections.controller.ts L135
- [ ] BUG-03: Duplicate journal line IDs in loan disbursement — loans.controller.ts L382
- [ ] BUG-04: Daily closing checklist hardcoded true — daily-closing.controller.ts L71
- [ ] BUG-05: Customer DOB always '1990-01-01' — data-store.service.ts L275
- [ ] BUG-06: Customer Gender always 'MALE' — data-store.service.ts L276
- [ ] BUG-07: Customer Status always ACTIVE — data-store.service.ts L287
- [ ] BUG-08: Complaint missing ASSIGNED/INVESTIGATION/CLOSED states
- [ ] BUG-09: firstDueDate = disbursementDate (should be +1 month) — data-store.service.ts L351
- [ ] BUG-10: totalInterest goes negative if total_payable NULL — data-store.service.ts L349
- [ ] BUG-11: Cash drawers only loads last 10 records — data-store.service.ts L215
- [x] BUG-12: loanInstallments — already mapped at line 529 (FALSE ALARM — already fixed)

## Phase 1 — Partial Feature Completion
- [ ] SMS Notifications (payment received, EMI due, maturity)
- [ ] Complaint workflow — ASSIGNED, INVESTIGATION, CLOSED states (API + UI)
- [ ] Daily Closing — dynamic real checklist + Manager Sign-Off
- [ ] Receipt PDF print view
- [ ] HR — Attendance & Leave tracking
- [ ] Payroll module
- [ ] 2FA enforcement in login flow
- [ ] MIS Report Export (CSV download)
- [ ] Maturity Auto-Processing cron
- [ ] Document templates (12 customer document types)

## Phase 2 — Missing Features
- [ ] Staff KPI Dashboard per employee
- [ ] Bulk CSV Data Import Tool
- [ ] Audit & Surprise Audit Module
- [ ] Four-Eyes Verification for large transactions
- [ ] Incentive Calculation
- [ ] Bank Statement Import UI
- [ ] SOP Manual page

## Phase 3 — Advanced
- [ ] Overdue DPD auto-update cron (midnight)
- [ ] Counter persistence from DB MAX()
- [ ] Per-branch daily closing
