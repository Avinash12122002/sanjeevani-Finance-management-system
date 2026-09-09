'use client';

import React from 'react';
import { Modal, Button, Select } from 'antd';
import { PrinterOutlined, FileTextOutlined } from '@ant-design/icons';
import { escapeHtml } from '../../lib/html-sanitizer';

export type DocumentTemplateType =
  | 'MEMBERSHIP_FORM'
  | 'KYC_FORM'
  | 'NOMINEE_FORM'
  | 'ACCOUNT_OPENING'
  | 'DEPOSIT_APPLICATION'
  | 'LOAN_APPLICATION'
  | 'LOAN_AGREEMENT'
  | 'REPAYMENT_SCHEDULE'
  | 'ACCOUNT_STATEMENT'
  | 'CLOSURE_FORM'
  | 'COMPLAINT_FORM';

export interface IDocumentCustomerContext {
  customerNumber: string;
  fullName: string;
  mobile: string;
  dateOfBirth?: string;
  gender?: string;
  aadhaar?: string;
  pan?: string;
  address?: string;
  branchName?: string;
  joiningDate?: string;
  accountNumber?: string;
  productType?: string;
  balance?: number;
  loanNumber?: string;
  loanAmount?: number;
  interestRate?: number;
  tenureMonths?: number;
  emiAmount?: number;
  nomineeName?: string;
  nomineeRelation?: string;
  [key: string]: any;
}

export function openDocumentPrintWindow(
  type: DocumentTemplateType,
  rawCtx: IDocumentCustomerContext,
) {
  if (typeof window === 'undefined') return;
  const printWindow = window.open('', '_blank', 'width=800,height=950');
  if (!printWindow) return;

  // Sanitize all context properties to protect against stored XSS
  const ctx: IDocumentCustomerContext = Object.fromEntries(
    Object.entries(rawCtx).map(([k, v]) => [
      k,
      typeof v === 'string' ? escapeHtml(v) : v,
    ]),
  ) as IDocumentCustomerContext;

  const titleMap: Record<DocumentTemplateType, string> = {
    MEMBERSHIP_FORM: 'MEMBER ENROLLMENT & SHARE APPLICATION',
    KYC_FORM: 'CUSTOMER IDENTIFICATION & KYC VERIFICATION FORM',
    NOMINEE_FORM: 'NOMINATION DECLARATION & UNDERTAKING FORM (DA-1)',
    ACCOUNT_OPENING: 'SAVINGS / RECURRING DEPOSIT ACCOUNT OPENING FORM',
    DEPOSIT_APPLICATION: 'TERM DEPOSIT APPLICATION & CERTIFICATE CONFIRMATION',
    LOAN_APPLICATION: 'CREDIT FACILITY & LOAN APPLICATION FORM',
    LOAN_AGREEMENT: 'TERM LOAN AGREEMENT & HYPOTHECATION CONTRACT',
    REPAYMENT_SCHEDULE: 'OFFICIAL LOAN AMORTIZATION REPAYMENT SCHEDULE',
    ACCOUNT_STATEMENT: 'MEMBER PASSBOOK & TRANSACTION STATEMENT OF ACCOUNT',
    CLOSURE_FORM: 'ACCOUNT CLOSURE & FINAL SETTLEMENT RECEIPT',
    COMPLAINT_FORM: 'CUSTOMER GRIEVANCE / COMPLAINT REGISTRATION FORM',
  };

  const docTitle = titleMap[type] || 'OFFICIAL DOCUMENT';

  const renderContentHtml = () => {
    switch (type) {
      case 'MEMBERSHIP_FORM':
        return `
          <div class="section-title">1. Applicant Personal Details</div>
          <table class="grid-table">
            <tr><td class="lbl">Member ID:</td><td class="val">${ctx.customerNumber || 'SJF-______'}</td><td class="lbl">Date of Joining:</td><td class="val">${ctx.joiningDate || new Date().toLocaleDateString('en-IN')}</td></tr>
            <tr><td class="lbl">Full Name:</td><td class="val">${ctx.fullName}</td><td class="lbl">Mobile No:</td><td class="val">+91 ${ctx.mobile}</td></tr>
            <tr><td class="lbl">Date of Birth:</td><td class="val">${ctx.dateOfBirth || '15/05/1990'}</td><td class="lbl">Gender:</td><td class="val">${ctx.gender || 'MALE'}</td></tr>
            <tr><td class="lbl">Permanent Address:</td><td colspan="3" class="val">${ctx.address || 'H.No 12, Main Market, Delhi'}</td></tr>
          </table>

          <div class="section-title">2. Membership Rules & Undertaking (SRS §47 #1)</div>
          <div class="legal-text">
            I hereby apply for admission as a registered member of SANJEEVANI FINANCE. I declare that the particulars furnished above are true to the best of my knowledge. I agree to abide by the registered bye-laws, code of conduct, and any amendments made thereto. I understand that member shares and deposits are subject to statutory guidelines.
          </div>

          <table class="sign-grid">
            <tr><td><div class="line"></div>Applicant Signature</td><td><div class="line"></div>Introducer Member Signature</td><td><div class="line"></div>Branch Manager Seal & Approval</td></tr>
          </table>
        `;

      case 'KYC_FORM':
        return `
          <div class="section-title">1. Customer Identification Details (SRS §47 #2)</div>
          <table class="grid-table">
            <tr><td class="lbl">Customer ID:</td><td class="val">${ctx.customerNumber}</td><td class="lbl">Full Name:</td><td class="val">${ctx.fullName}</td></tr>
            <tr><td class="lbl">Aadhaar (Last 4):</td><td class="val">XXXX-XXXX-${(ctx.aadhaar || '8910').slice(-4)}</td><td class="lbl">PAN Number:</td><td class="val">${ctx.pan || 'ABCDE1234F'}</td></tr>
            <tr><td class="lbl">Address Proof:</td><td class="val">Aadhaar / Voter ID verified</td><td class="lbl">Identity Status:</td><td class="val">KYC VERIFIED & DOCUMENTED</td></tr>
          </table>

          <div class="section-title">2. Verification Declaration & Biometric Match</div>
          <div class="legal-text">
            I hereby confirm that I have submitted my valid government-issued identity and address proofs for opening and operating financial accounts with Sanjeevani Finance. I authorize Sanjeevani Finance to verify these documents with competent authorities in accordance with Prevention of Money Laundering Act (PMLA) regulations.
          </div>

          <table class="sign-grid">
            <tr>
              <td><div style="width:90px;height:100px;border:1px dashed #475569;margin:0 auto 6px auto;display:flex;align-items:center;justify-content:center;font-size:10px;color:#64748b;">Applicant Photo</div>Applicant Signature</td>
              <td><div style="width:100px;height:70px;border:1px dashed #475569;margin:30px auto 6px auto;display:flex;align-items:center;justify-content:center;font-size:10px;color:#64748b;">Thumb Impression</div>Left Thumb</td>
              <td><div class="line"></div>KYC Verifying Officer Seal</td>
            </tr>
          </table>
        `;

      case 'NOMINEE_FORM':
        return `
          <div class="section-title">1. Account & Nominee Particulars (Form DA-1, SRS §47 #3)</div>
          <table class="grid-table">
            <tr><td class="lbl">Account / Member No:</td><td class="val">${ctx.accountNumber || ctx.customerNumber}</td><td class="lbl">Primary Account Holder:</td><td class="val">${ctx.fullName}</td></tr>
            <tr><td class="lbl">Nominee Full Name:</td><td class="val">${ctx.nomineeName || 'Smt. Kavita Sharma'}</td><td class="lbl">Relationship:</td><td class="val">${ctx.nomineeRelation || 'SPOUSE'}</td></tr>
            <tr><td class="lbl">Nominee Age / DOB:</td><td class="val">32 Years</td><td class="lbl">Minor Guardian (if minor):</td><td class="val">N/A (Major)</td></tr>
          </table>

          <div class="section-title">2. Legal Nomination Undertaking</div>
          <div class="legal-text">
            I hereby nominate the person named above to receive the amount to the credit of my account in the event of my death. This nomination supersedes any prior nomination made by me in respect of this account.
          </div>

          <table class="sign-grid">
            <tr><td><div class="line"></div>Account Holder Signature</td><td><div class="line"></div>Witness 1 Signature & Address</td><td><div class="line"></div>Authorized Branch Officer</td></tr>
          </table>
        `;

      case 'ACCOUNT_OPENING':
        return `
          <div class="section-title">1. Deposit Scheme Application Details (SRS §47 #4)</div>
          <table class="grid-table">
            <tr><td class="lbl">Account Number:</td><td class="val">${ctx.accountNumber || 'Pending Allocation'}</td><td class="lbl">Scheme Type:</td><td class="val">${ctx.productType || 'Recurring Deposit (RD)'}</td></tr>
            <tr><td class="lbl">Member Name:</td><td class="val">${ctx.fullName}</td><td class="lbl">Member ID:</td><td class="val">${ctx.customerNumber}</td></tr>
            <tr><td class="lbl">Initial / Monthly Deposit:</td><td class="val">₹${(ctx.balance || 1000).toLocaleString('en-IN')}</td><td class="lbl">Tenure:</td><td class="val">12 Months</td></tr>
          </table>

          <div class="section-title">2. Operating Terms & Conditions</div>
          <div class="legal-text">
            1. RD installments must be paid by the 10th of every calendar month.<br/>
            2. Late payment attracts penal charges as per the Schedule of Charges.<br/>
            3. Premature withdrawal shall incur a 1.00% reduction in accrued interest per product rules.<br/>
            4. Official receipts issued by Sanjeevani Finance software are the only valid proof of payment.
          </div>

          <table class="sign-grid">
            <tr><td><div class="line"></div>Customer Signature Specimen</td><td><div class="line"></div>Cashier / Officer Signature</td><td><div class="line"></div>Branch Manager Authorization</td></tr>
          </table>
        `;

      case 'DEPOSIT_APPLICATION':
        const fdYear = new Date().getFullYear();
        const fdPrincipal = ctx.balance || ctx.principalAmount || 0;
        const fdRate = ctx.interestRate ?? 8.5;
        const fdTenorMonths = ctx.tenureMonths || 12;
        const fdMaturity = ctx.maturityAmount || Math.round(fdPrincipal * (1 + (fdRate / 100) * (fdTenorMonths / 12)));
        return `
          <div class="section-title">1. Term Deposit (FD) Application & Certificate (SRS §47 #5)</div>
          <table class="grid-table">
            <tr><td class="lbl">Certificate / FD No:</td><td class="val">${ctx.accountNumber || `TD-${fdYear}-0001`}</td><td class="lbl">Deposit Date:</td><td class="val">${new Date().toLocaleDateString('en-IN')}</td></tr>
            <tr><td class="lbl">Depositor Name:</td><td class="val">${ctx.fullName}</td><td class="lbl">Member ID:</td><td class="val">${ctx.customerNumber}</td></tr>
            <tr><td class="lbl">Principal Deposited:</td><td class="val">₹${Number(fdPrincipal).toLocaleString('en-IN')}</td><td class="lbl">Interest Rate:</td><td class="val">${fdRate}% p.a.</td></tr>
            <tr><td class="lbl">Maturity Tenure:</td><td class="val">${fdTenorMonths} Months</td><td class="lbl">Maturity Payable:</td><td class="val">₹${Number(fdMaturity).toLocaleString('en-IN')}</td></tr>
          </table>

          <div class="section-title">2. Lien & Premature Encashment Policy</div>
          <div class="legal-text">
            This Fixed Deposit Certificate represents a deposit liability of Sanjeevani Finance. Premature encashment requires a minimum notice period of 7 business days and is subject to deduction of premature penalty interest.
          </div>

          <table class="sign-grid">
            <tr><td><div class="line"></div>Depositor Signature</td><td><div class="line"></div>Accountant Verification</td><td><div class="line"></div>Branch Manager Seal & Stamp</td></tr>
          </table>
        `;

      case 'LOAN_APPLICATION':
        return `
          <div class="section-title">1. Loan Facility Request & Financials (SRS §47 #6)</div>
          <table class="grid-table">
            <tr><td class="lbl">Borrower Full Name:</td><td class="val">${ctx.fullName}</td><td class="lbl">Member ID:</td><td class="val">${ctx.customerNumber}</td></tr>
            <tr><td class="lbl">Requested Amount:</td><td class="val">₹${(ctx.loanAmount || 50000).toLocaleString('en-IN')}</td><td class="lbl">Repayment Tenure:</td><td class="val">${ctx.tenureMonths || 12} Months</td></tr>
            <tr><td class="lbl">Loan Purpose:</td><td class="val">Small Business / Shop Expansion</td><td class="lbl">Monthly Income:</td><td class="val">₹28,000 / month</td></tr>
          </table>

          <div class="section-title">2. Guarantors Undertaking (SRS §10 Mandate: 2 Guarantors)</div>
          <table class="grid-table">
            <tr><td class="lbl">Guarantor 1 Name:</td><td class="val">${ctx.guarantor1Name || ctx.guarantors?.[0]?.name || 'To be specified'}</td><td class="lbl">Mobile / Member ID:</td><td class="val">${ctx.guarantor1Mobile || ctx.guarantors?.[0]?.mobile || ctx.guarantors?.[0]?.id || 'Pending documentation'}</td></tr>
            <tr><td class="lbl">Guarantor 2 Name:</td><td class="val">${ctx.guarantor2Name || ctx.guarantors?.[1]?.name || 'To be specified'}</td><td class="lbl">Mobile / Member ID:</td><td class="val">${ctx.guarantor2Mobile || ctx.guarantors?.[1]?.mobile || ctx.guarantors?.[1]?.id || 'Pending documentation'}</td></tr>
          </table>

          <div class="legal-text">
            We, the borrower and co-guarantors, jointly and severally promise to repay the sanctioned loan amount with applicable interest. In case of default, Sanjeevani Finance reserves full legal right of recovery against our assets and securities.
          </div>

          <table class="sign-grid">
            <tr><td><div class="line"></div>Borrower Signature</td><td><div class="line"></div>Guarantor 1 Signature</td><td><div class="line"></div>Guarantor 2 Signature</td></tr>
          </table>
        `;

      case 'LOAN_AGREEMENT':
        return `
          <div class="section-title">1. Sanction Terms & Hypothecation Contract (SRS §47 #7)</div>
          <table class="grid-table">
            <tr><td class="lbl">Loan Agreement No:</td><td class="val">${ctx.loanNumber || 'LN-2026-0045'}</td><td class="lbl">Sanction Date:</td><td class="val">${new Date().toLocaleDateString('en-IN')}</td></tr>
            <tr><td class="lbl">Borrower Name:</td><td class="val">${ctx.fullName}</td><td class="lbl">Sanctioned Amount:</td><td class="val">₹${(ctx.loanAmount || 50000).toLocaleString('en-IN')}</td></tr>
            <tr><td class="lbl">Interest Rate:</td><td class="val">${ctx.interestRate || 12.0}% p.a.</td><td class="lbl">Monthly EMI:</td><td class="val">₹${(ctx.emiAmount || 4442).toLocaleString('en-IN')}</td></tr>
            <tr><td class="lbl">Tenure:</td><td class="val">${ctx.tenureMonths || 12} Months</td><td class="lbl">Processing Fee:</td><td class="val">₹1,000 (Paid)</td></tr>
          </table>

          <div class="section-title">2. Default Clauses & Recovery Mandates (SRS §15, §16)</div>
          <div class="legal-text">
            1. The borrower agrees to pay regular monthly EMIs on or before the due date.<br/>
            2. Any delayed payment beyond the due date attracts penal interest @ 2% per month.<br/>
            3. Accounts crossing 90 Days Past Due (DPD) shall be declared Non-Performing Assets (NPA) and forwarded for recovery proceedings under applicable civil laws.<br/>
            4. Recovery officers of Sanjeevani Finance follow strict non-harassment ethical standards.
          </div>

          <table class="sign-grid">
            <tr><td><div class="line"></div>Borrower Signature</td><td><div class="line"></div>Credit Officer Witness</td><td><div class="line"></div>Authorized Branch Manager</td></tr>
          </table>
        `;

      case 'REPAYMENT_SCHEDULE':
        return `
          <div class="section-title">1. Amortization Schedule (SRS §47 #8)</div>
          <table class="grid-table">
            <tr><td class="lbl">Loan No:</td><td class="val">${ctx.loanNumber || 'LN-2026-0045'}</td><td class="lbl">Borrower:</td><td class="val">${ctx.fullName}</td></tr>
            <tr><td class="lbl">Sanctioned Principal:</td><td class="val">₹${(ctx.loanAmount || 50000).toLocaleString('en-IN')}</td><td class="lbl">EMI:</td><td class="val">₹${(ctx.emiAmount || 4442).toLocaleString('en-IN')} / month</td></tr>
          </table>

          <div class="section-title">2. Monthly Installment Breakdown</div>
          <table class="grid-table" style="font-size:11px;">
            <tr style="background:#047857;color:#fff;">
              <th>Inst #</th><th>Due Date</th><th>Principal Component</th><th>Interest Component</th><th>Total EMI</th><th>Closing Balance</th>
            </tr>
            ${Array.from({ length: ctx.tenureMonths || 6 }).map((_, i) => `
              <tr>
                <td style="text-align:center;">${i + 1}</td>
                <td>${new Date(Date.now() + (i + 1) * 30 * 86400000).toLocaleDateString('en-IN')}</td>
                <td>₹${Math.round(((ctx.loanAmount || 50000) / (ctx.tenureMonths || 6))).toLocaleString('en-IN')}</td>
                <td>₹${Math.round((ctx.loanAmount || 50000) * 0.01).toLocaleString('en-IN')}</td>
                <td><strong>₹${(ctx.emiAmount || 4442).toLocaleString('en-IN')}</strong></td>
                <td>₹${Math.max(0, Math.round((ctx.loanAmount || 50000) * (1 - (i + 1) / (ctx.tenureMonths || 6)))).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </table>

          <table class="sign-grid">
            <tr><td><div class="line"></div>Borrower Signature</td><td><div class="line"></div>Issued By Staff Code</td><td><div class="line"></div>Branch Stamp</td></tr>
          </table>
        `;

      case 'ACCOUNT_STATEMENT':
        return `
          <div class="section-title">1. Member Ledger Passbook Statement (SRS §47 #10)</div>
          <table class="grid-table">
            <tr><td class="lbl">Customer Name:</td><td class="val">${ctx.fullName}</td><td class="lbl">Member Number:</td><td class="val">${ctx.customerNumber}</td></tr>
            <tr><td class="lbl">Account Number:</td><td class="val">${ctx.accountNumber || '-'}</td><td class="lbl">Product Category:</td><td class="val">${ctx.productType || 'Savings Account'}</td></tr>
            <tr><td class="lbl">Current Balance:</td><td class="val"><strong>₹${Number(ctx.balance || 0).toLocaleString('en-IN')}</strong></td><td class="lbl">Branch:</td><td class="val">${ctx.branchName || 'Head Office'}</td></tr>
          </table>

          <div class="section-title">2. Recent Account Transactions</div>
          <table class="grid-table" style="font-size:11px;">
            <tr style="background:#047857;color:#fff;">
              <th>Date</th><th>TXN Ref</th><th>Description</th><th>Debit (-)</th><th>Credit (+)</th><th>Running Balance</th>
            </tr>
            ${(ctx.transactions && ctx.transactions.length > 0)
              ? ctx.transactions.map((t: any) => `
                <tr>
                  <td>${new Date(t.date || t.createdAt || Date.now()).toLocaleDateString('en-IN')}</td>
                  <td>${t.referenceNo || t.id || '-'}</td>
                  <td>${t.narration || t.type || 'Transaction'}</td>
                  <td>${t.type === 'DEBIT' || t.debit ? `₹${Number(t.debit || t.amount).toLocaleString('en-IN')}` : '-'}</td>
                  <td>${t.type === 'CREDIT' || t.credit ? `₹${Number(t.credit || t.amount).toLocaleString('en-IN')}` : '-'}</td>
                  <td><strong>₹${Number(t.balanceAfter || t.runningBalance || ctx.balance || 0).toLocaleString('en-IN')}</strong></td>
                </tr>
              `).join('')
              : `
                <tr>
                  <td>${new Date().toLocaleDateString('en-IN')}</td>
                  <td>${ctx.accountNumber || '-'}</td>
                  <td>Current Book Balance</td>
                  <td>-</td>
                  <td>-</td>
                  <td><strong>₹${Number(ctx.balance || 0).toLocaleString('en-IN')}</strong></td>
                </tr>
              `
            }
          </table>

          <table class="sign-grid">
            <tr><td><div class="line"></div>Customer Signature</td><td><div class="line"></div>Ledger Verified By</td><td><div class="line"></div>Branch Seal & Date</td></tr>
          </table>
        `;

      case 'CLOSURE_FORM':
        const closurePrincipal = ctx.balance || ctx.principalPaid || 0;
        const closureAccrued = ctx.accruedInterest || 0;
        const closureDeduction = ctx.penaltyAmount || 0;
        const closureFinal = ctx.settlementAmount || (closurePrincipal + closureAccrued - closureDeduction);
        return `
          <div class="section-title">1. Account Closure & Settlement Mandate (SRS §47 #11)</div>
          <table class="grid-table">
            <tr><td class="lbl">Account Number:</td><td class="val">${ctx.accountNumber || '-'}</td><td class="lbl">Member ID:</td><td class="val">${ctx.customerNumber}</td></tr>
            <tr><td class="lbl">Account Holder:</td><td class="val">${ctx.fullName}</td><td class="lbl">Product Type:</td><td class="val">${ctx.productType || 'Deposit Account'}</td></tr>
            <tr><td class="lbl">Principal Paid:</td><td class="val">₹${Number(closurePrincipal).toLocaleString('en-IN')}</td><td class="lbl">Accrued Interest:</td><td class="val">₹${Number(closureAccrued).toLocaleString('en-IN')}</td></tr>
            <tr><td class="lbl">Premature Deduction:</td><td class="val">₹${Number(closureDeduction).toLocaleString('en-IN')}</td><td class="lbl">Final Settlement:</td><td class="val"><strong>₹${Number(closureFinal).toLocaleString('en-IN')}</strong></td></tr>
          </table>

          <div class="section-title">2. Surrender of Documents & No-Due Declaration</div>
          <div class="legal-text">
            I hereby surrender my passbook/certificate and confirm receipt of the final settlement amount in full satisfaction of all claims against this account. I confirm that no further dues remain outstanding.
          </div>

          <table class="sign-grid">
            <tr><td><div class="line"></div>Member Surrender Signature</td><td><div class="line"></div>Cashier / Disbursing Officer</td><td><div class="line"></div>Branch Manager Final Closure Seal</td></tr>
          </table>
        `;

      case 'COMPLAINT_FORM':
        return `
          <div class="section-title">1. Grievance Tracking Particulars (SRS §47 #12, §37)</div>
          <table class="grid-table">
            <tr><td class="lbl">Complaint Tracking No:</td><td class="val">${ctx.complaintNumber || ctx.id || `CMP-${Date.now().toString().slice(-6)}`}</td><td class="lbl">Filing Date:</td><td class="val">${new Date().toLocaleDateString('en-IN')}</td></tr>
            <tr><td class="lbl">Complainant Member:</td><td class="val">${ctx.fullName || ctx.customerName || 'Valued Member'}</td><td class="lbl">Member ID:</td><td class="val">${ctx.customerNumber || ctx.customerId || 'N/A'}</td></tr>
            <tr><td class="lbl">Registered Mobile:</td><td class="val">${ctx.mobile ? `+91 ${ctx.mobile}` : 'N/A'}</td><td class="lbl">Grievance Category:</td><td class="val">${ctx.category || ctx.complaintCategory || 'General Grievance'}</td></tr>
          </table>

          <div class="section-title">2. Grievance Description & Redressal SLA</div>
          <div class="legal-text">
            ${ctx.description || ctx.complaintDescription || 'Grievance registered and forwarded to Grievance Redressal Officer for formal investigation and timely resolution.'}<br/><br/>
            <strong>Commitment:</strong> Under Sanjeevani Finance SOP §37, all registered grievances are resolved within a mandatory 3 business day SLA.
          </div>

          <table class="sign-grid">
            <tr><td><div class="line"></div>Complainant Signature</td><td><div class="line"></div>Grievance Redressal Officer</td><td><div class="line"></div>Nodal Compliance Officer</td></tr>
          </table>
        `;
    }
  };

  printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${docTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 12px;
      color: #0f172a;
      background: #fff;
      padding: 30px;
    }
    .sheet {
      border: 2px solid #065f46;
      border-radius: 8px;
      padding: 24px;
      max-width: 760px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #065f46;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      color: #064e3b;
      letter-spacing: 0.5px;
    }
    .brand-tagline {
      font-size: 11px;
      color: #047857;
      font-weight: 600;
      margin-top: 2px;
    }
    .doc-type {
      margin-top: 8px;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      color: #0f172a;
      letter-spacing: 0.5px;
      background: #f0fdf4;
      padding: 4px;
      border-radius: 4px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      color: #064e3b;
      text-transform: uppercase;
      margin: 14px 0 6px 0;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 2px;
    }
    .grid-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .grid-table td, .grid-table th {
      border: 1px solid #cbd5e1;
      padding: 5px 8px;
      font-size: 11px;
    }
    .grid-table .lbl {
      background: #f8fafc;
      font-weight: 600;
      color: #475569;
      width: 22%;
    }
    .grid-table .val {
      font-weight: 500;
    }
    .legal-text {
      font-size: 10.5px;
      line-height: 1.5;
      color: #334155;
      background: #f8fafc;
      padding: 10px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      margin-bottom: 16px;
    }
    .sign-grid {
      width: 100%;
      margin-top: 30px;
      border-collapse: collapse;
    }
    .sign-grid td {
      width: 33.3%;
      text-align: center;
      font-size: 11px;
      color: #475569;
      vertical-align: bottom;
    }
    .sign-grid .line {
      width: 80%;
      margin: 0 auto 6px auto;
      border-bottom: 1px solid #334155;
    }
    @media print {
      body { padding: 0; }
      @page { margin: 12mm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="brand-title">SANJEEVANI FINANCE</div>
      <div class="brand-tagline">Your Money. Your Future. Our Responsibility.</div>
      <div class="brand-tagline">संजीवनी फाइनेंस — भरोसे के साथ, बेहतर कल की ओर</div>
      <div class="doc-type">${docTitle}</div>
    </div>

    ${renderContentHtml()}
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
  `);
  printWindow.document.close();
}

/**
 * Print Documents Hub Modal for Customer Screen
 */
export function CustomerDocumentsModal({
  open,
  customer,
  onClose,
}: {
  open: boolean;
  customer: any;
  onClose: () => void;
}) {
  const [selectedDoc, setSelectedDoc] = React.useState<DocumentTemplateType>('MEMBERSHIP_FORM');

  if (!customer) return null;

  const context: IDocumentCustomerContext = {
    customerNumber: customer.customerNumber || customer.id,
    fullName: `${customer.firstName} ${customer.lastName || ''}`.trim(),
    mobile: customer.mobile || '9876543210',
    dateOfBirth: customer.dateOfBirth,
    gender: customer.gender,
    aadhaar: customer.aadhaarNumber,
    pan: customer.panNumber,
    address: customer.addressLine1 || customer.address || 'Delhi',
    branchName: customer.branchName || 'Head Office - Main Branch',
    joiningDate: customer.joiningDate || new Date().toISOString().split('T')[0],
  };

  const documentOptions: { value: DocumentTemplateType; label: string }[] = [
    { value: 'MEMBERSHIP_FORM', label: '1. Membership Application Form (SRS §47 #1)' },
    { value: 'KYC_FORM', label: '2. KYC Declaration & Biometric Verification (SRS §47 #2)' },
    { value: 'NOMINEE_FORM', label: '3. Nominee Declaration Undertaking (DA-1, SRS §47 #3)' },
    { value: 'ACCOUNT_OPENING', label: '4. Savings / RD Account Opening Form (SRS §47 #4)' },
    { value: 'DEPOSIT_APPLICATION', label: '5. Term Deposit Application & Certificate (SRS §47 #5)' },
    { value: 'LOAN_APPLICATION', label: '6. Loan Application & Guarantor Undertaking (SRS §47 #6)' },
    { value: 'LOAN_AGREEMENT', label: '7. Loan Sanction Agreement & Contract (SRS §47 #7)' },
    { value: 'REPAYMENT_SCHEDULE', label: '8. Repayment Amortization Schedule (SRS §47 #8)' },
    { value: 'ACCOUNT_STATEMENT', label: '10. Member Passbook & Statement of Account (SRS §47 #10)' },
    { value: 'CLOSURE_FORM', label: '11. Account Closure & Settlement Receipt (SRS §47 #11)' },
    { value: 'COMPLAINT_FORM', label: '12. Grievance / Complaint Registration Form (SRS §47 #12)' },
  ];

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-emerald-800">
          <FileTextOutlined />
          <span>Print Customer Documents (SRS §47 — All 12 Legal Forms)</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="close" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          style={{ background: '#059669', borderColor: '#059669' }}
          onClick={() => openDocumentPrintWindow(selectedDoc, context)}
        >
          Print Pre-Filled Document
        </Button>,
      ]}
    >
      <div className="space-y-4 py-3">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="text-xs text-slate-500">Selected Member:</div>
          <div className="font-bold text-slate-900 text-sm">
            {context.fullName} ({context.customerNumber}) • Mobile: +91 {context.mobile}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Select Document Template to Generate & Print:
          </label>
          <Select
            value={selectedDoc}
            onChange={(val) => setSelectedDoc(val)}
            style={{ width: '100%' }}
            options={documentOptions}
          />
        </div>

        <div className="text-xs text-slate-500 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
          ✓ Document will open in a high-resolution printable pop-up formatted to standard A4 specifications with official Sanjeevani Finance letterhead, legal clauses, and signature blocks.
        </div>
      </div>
    </Modal>
  );
}
