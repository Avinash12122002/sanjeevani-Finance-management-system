'use client';

import React, { useState } from 'react';
import { Card, Collapse, Tag, Input, Row, Col, Button, Divider } from 'antd';
import {
  BookOutlined,
  SearchOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  DollarCircleOutlined,
  TeamOutlined,
  FileProtectOutlined,
} from '@ant-design/icons';

interface ISopSection {
  id: number;
  title: string;
  category: string;
  roles: string[];
  guidelines: string[];
  fraudRisks: string;
  checklist: string[];
}

const sopSections: ISopSection[] = [
  {
    id: 1,
    title: 'Customer Onboarding & Membership (SRS §6, §34.1)',
    category: 'Customer Service',
    roles: ['Customer Service', 'Branch Manager'],
    guidelines: [
      'Assign permanent and unique Customer ID (format: SJF-XXXXXX) to every member.',
      'Collect and physically verify Aadhaar, PAN or Form 60.',
      'Check existing mobile numbers in software to strictly prohibit duplicate accounts.',
      'Ensure introducer/source information is recorded where applicable.',
    ],
    fraudRisks: 'Creation of dummy accounts to siphon loan disbursements or fake deposit liabilities.',
    checklist: ['PAN/Aadhaar verified', 'No duplicate mobile', 'Nominee declared', 'Customer ID generated'],
  },
  {
    id: 2,
    title: 'KYC & Identity Verification (SRS §6, §34.2)',
    category: 'Customer Service',
    roles: ['Customer Service', 'Branch Manager'],
    guidelines: [
      'Match customer photo with government ID cards.',
      'Record complete permanent address with pincode and state.',
      'Mark KYC status as VERIFIED only after document upload and manager approval.',
    ],
    fraudRisks: 'Impersonation, money laundering, and non-traceable borrowers.',
    checklist: ['Self-attested ID proof uploaded', 'Address proof verified', 'Customer photo attached'],
  },
  {
    id: 3,
    title: 'Account Opening — Savings, RD & Term Deposit (SRS §7, §8, §34.3)',
    category: 'Customer Service',
    roles: ['Customer Service', 'Cashier'],
    guidelines: [
      'Select eligible product with permitted interest rates (RD, Savings, FD).',
      `Generate account number (format: RD-${new Date().getFullYear()}-XXXXX or FD-${new Date().getFullYear()}-XXXXX).`,
      'Issue Term Deposit Certificate with certificate number, maturity date, and return amount.',
      'Explain premature withdrawal penalty rules (1% - 2% reduction) clearly.',
    ],
    fraudRisks: 'Offering unapproved interest rates or promising "guaranteed double returns" (strictly illegal).',
    checklist: ['Initial deposit collected', 'Nominee relationship verified', 'Deposit certificate issued'],
  },
  {
    id: 4,
    title: 'Field Collection & Cash Handling (SRS §16, §17, §34.4)',
    category: 'Operations',
    roles: ['Collection Executive', 'Cashier'],
    guidelines: [
      'Review assigned collection list and expected collection target every morning.',
      'Collect installment and issue official Digital Receipt immediately (SJF-RCP-YYYY-XXXXXX).',
      'Never accept cash without generating a software receipt with customer mobile confirmation.',
      'Overnight cash rule: Cash cannot stay with collector overnight. All cash must be surrendered by 7:00 PM.',
    ],
    fraudRisks: 'Cash pocketing, suppression of receipts, or delay in deposit (teeming and lading).',
    checklist: ['Receipt issued for every Rupee', 'SMS confirmation dispatched', 'Cash surrendered before 7:00 PM'],
  },
  {
    id: 5,
    title: 'Cashier Drawer Reconcilation (SRS §18, §34.5)',
    category: 'Finance',
    roles: ['Cashier', 'Accountant', 'Branch Manager'],
    guidelines: [
      'Open drawer every morning with carry-forward balance from previous closed drawer.',
      'Formula: Expected Cash = Opening Balance + Today Collections - Today Payments.',
      'Reconcile physical cash note-by-note with denomination breakdown.',
      'Any mismatch immediately triggers automated Red Alert and halts daily closing.',
    ],
    fraudRisks: 'Unrecorded payments or theft of physical counter cash.',
    checklist: ['Denominations verified', 'Difference === 0', 'Drawer status MATCHED'],
  },
  {
    id: 6,
    title: 'Digital Payments & UPI Reconciliation (SRS §28, §34.6)',
    category: 'Finance',
    roles: ['Accountant', 'Cashier'],
    guidelines: [
      'Verify UPI / Net Banking UTR numbers before tagging receipt as PAID.',
      'Match daily software bank balance against actual bank statement.',
      'Three-way match: Customer sub-ledger === Cash/Bank physical === Accounting trial balance.',
    ],
    fraudRisks: 'Fake UPI transaction screenshots presented by customers.',
    checklist: ['Bank UTR recorded', 'Bank statement matched', 'Zero discrepancy'],
  },
  {
    id: 7,
    title: 'Loan Application & Appraisal Scorecard (SRS §10, §11, §34.7)',
    category: 'Credit',
    roles: ['Loan Officer', 'Branch Manager'],
    guidelines: [
      'Mandatory rule: Collection agents CANNOT approve loans.',
      'Score borrower across 7 parameters (100 pts total): KYC (10), Income (20), Repayment (20), Liabilities (15), Security (15), Banking (10), Field Visit (10).',
      'Decision thresholds: 80+ Low Risk (Approve), 60–79 Manager Review, <60 Reject.',
      'Enforce authority limits: Officer (₹25k), Manager (₹1 Lakh), Director (Above ₹3 Lakh).',
    ],
    fraudRisks: 'Ghost borrowers, kickbacks from unverified borrowers, or exceeding approval limits.',
    checklist: ['Scorecard completed (>= 100 max)', 'Field verification report attached', 'Guarantor verified'],
  },
  {
    id: 8,
    title: 'Loan Disbursement & Dual Control (SRS §12, §38, §34.8)',
    category: 'Credit',
    roles: ['Branch Manager', 'Accountant'],
    guidelines: [
      'Large loans (> ₹1,00,000) require Four-Eyes dual control approval.',
      'Disburse via direct bank transfer (NEFT/IMPS) wherever possible.',
      'Auto-generate double-entry journal: Dr Loan Receivable / Cr Bank Account.',
      'Print formal Loan Agreement and Amortization Repayment Schedule.',
    ],
    fraudRisks: 'Single-officer arbitrary payouts without management review.',
    checklist: ['Second verifier approval obtained', 'Journal entry posted', 'Amortization schedule handed to borrower'],
  },
  {
    id: 9,
    title: 'Recovery & Overdue Protocol (SRS §14, §15, §34.9)',
    category: 'Recovery',
    roles: ['Recovery Officer', 'Branch Manager'],
    guidelines: [
      'Follow PAR aging color bands: 0 DPD (Green), 1–30 DPD (Yellow), 31–90 DPD (Orange), 90+ DPD (Red / NPA).',
      'Strict ethical code: No abusive language, no harassment, no unscheduled late-night visits.',
      'Structured escalation: Automated SMS → Reminder Call → Personal Visit → Manager Notice.',
    ],
    fraudRisks: 'Reputational risk from aggressive unapproved recovery tactics.',
    checklist: ['Overdue DPD recalculated daily', 'Customer contacted ethically', 'Promise to pay logged'],
  },
  {
    id: 10,
    title: 'Daily Closing & Business Date Lock (SRS §19, §63, §64, §34.10)',
    category: 'Management',
    roles: ['Branch Manager', 'Super Admin'],
    guidelines: [
      'Complete 9-step pipeline: Collections → Recon → Cash Drawer → Bank → Mismatch → Manager Sign-off → Date Locked.',
      'Once locked, operations for that date are frozen. Adjustments require contra-entries.',
      'Reopening a locked date requires Super Admin authorization with mandatory 10+ character audit reason.',
    ],
    fraudRisks: 'Backdating transactions to hide cash shortages or fake collections.',
    checklist: ['All checklist items verified', 'Manager digital sign-off completed', 'Date locked'],
  },
  {
    id: 11,
    title: 'Correction via Contra-Reversals (SRS §22, §34.11)',
    category: 'Finance',
    roles: ['Accountant', 'Branch Manager', 'Super Admin'],
    guidelines: [
      'Absolute rule: "Employee kuch delete na kar sake". Silent hard deletion is prohibited.',
      'Any correction must be executed via contra-reversal (inverting debits and credits).',
      'Mandatory audit explanation must be attached to every reversal.',
    ],
    fraudRisks: 'Deleting compromising transactions or altering ledger balances secretly.',
    checklist: ['Original marked REVERSED', 'Contra entry generated', 'Audit log recorded'],
  },
  {
    id: 12,
    title: 'Surprise Audit & Customer Verification (SRS §36, §34.12)',
    category: 'Audit',
    roles: ['Auditor', 'General Manager'],
    guidelines: [
      'Conduct surprise audits with random sampling of 20 customer accounts.',
      'Cross-check member passbook / verbal confirmation against software balances.',
      'Any discrepancy immediately creates a CRITICAL Red Alert on the Owner Dashboard.',
    ],
    fraudRisks: 'Passbook skimming where money is taken from members but not credited in software.',
    checklist: ['20 random accounts audited', 'Physical confirmation logged', 'Zero mismatch verified'],
  },
  {
    id: 13,
    title: 'Staff Onboarding & 9-Stage Pipeline (SRS §43, §34.13)',
    category: 'HR',
    roles: ['HR Manager', 'Branch Manager'],
    guidelines: [
      'Track every recruit through the 9-stage pipeline: Interview -> Doc Verified -> Reference Checked -> Offer Issued -> Appointment Letter -> Training -> Probation -> Confirmed.',
      'Mandatory physical document verification (Aadhaar, PAN, Education, Bank Passbook).',
      'Conduct telephone reference checks with at least two previous employers or community references before issuing appointment letter.',
    ],
    fraudRisks: 'Hiring unvetted staff with fictitious identities or previous history of cash embezzlement.',
    checklist: ['Original documents verified', 'Two reference checks cleared', 'Appointment letter signed', 'Probation terms recorded'],
  },
  {
    id: 14,
    title: 'Mandatory 7-Day Staff Induction & Certification (SRS §44, §34.14)',
    category: 'HR',
    roles: ['Trainer', 'Branch Manager'],
    guidelines: [
      'Day 1 (Ethics & Culture), Day 2 (Software Workflow), Day 3 (Products), Day 4 (KYC & AML), Day 5 (Collection & Fraud), Day 6 (Appraisal & Recovery), Day 7 (Practical Exam).',
      'Passing score: 70%+ in Day 7 practical examination strictly required for operational clearance.',
      'System enforces rule: Employee cannot be assigned collection routes or credit queues until training certification is marked PASSED.',
    ],
    fraudRisks: 'Untrained staff providing inaccurate interest rate commitments or mishandling cash.',
    checklist: ['Day 1 to 6 modules attended', 'Exam score >= 70%', 'Trainer certification signed', 'Software access unlocked'],
  },
  {
    id: 15,
    title: 'Monthly Payroll & 4-Factor Performance Incentives (SRS §41, §49 Module 18, §34.15)',
    category: 'Finance',
    roles: ['Accountant', 'General Manager'],
    guidelines: [
      'Incentives are balanced across 4 operational quality factors: Collection Rate (40%), Accounting Accuracy (30%), Customer CSAT (20%), Portfolio Quality (10%).',
      'Salary disbursement automatically triggers double-entry journal: Dr COA-5020 (Salaries Expense), Cr COA-1020 (Bank Account).',
      'Issue official printable payslip to every employee detailing earnings, deductions, and take-home pay.',
    ],
    fraudRisks: 'Volume-only incentives promoting aggressive predatory lending or concealing delinquency.',
    checklist: ['Attendance deductions factored', '4-factor formula computed', 'Disbursement journal posted', 'Payslips distributed'],
  },
  {
    id: 16,
    title: 'Customer Grievance Redressal & 5-Stage Lifecycle (SRS §37, §34.16)',
    category: 'Customer Service',
    roles: ['Customer Service', 'Branch Manager', 'Nodal Officer'],
    guidelines: [
      'Enforce mandatory 5-stage lifecycle: OPEN -> ASSIGNED -> INVESTIGATION -> RESOLVED -> CLOSED.',
      'Instant SMS acknowledgment with unique complaint tracking number dispatched to member immediately upon filing.',
      'Strict 3 business days SLA commitment for investigation and resolution.',
    ],
    fraudRisks: 'Suppressing customer complaints regarding uncredited collections or cashier shortages.',
    checklist: ['Tracking SMS delivered', 'Assigned to investigation officer', 'Resolved within 3 days', 'Customer satisfaction confirmed'],
  },
  {
    id: 17,
    title: 'Multi-Branch Cash Limits & Vault Security (SRS §17, §32, §34.17)',
    category: 'Operations',
    roles: ['Cashier', 'Branch Manager'],
    guidelines: [
      'Branch physical vault cash holding limit is capped at ₹2,00,000.',
      'Any excess collection beyond the vault limit must be banked into the commercial bank account by 5:00 PM.',
      'Dual-key custody is mandatory: Vault key with Cashier, combination lock with Branch Manager.',
    ],
    fraudRisks: 'Overnight cash holding leading to misappropriation, burglary, or armed robbery.',
    checklist: ['Vault keys separated', 'Cash within statutory limit', 'Excess collections banked', 'Overnight drawer balance === 0'],
  },
  {
    id: 18,
    title: 'Statutory Compliance Calendar & Regulatory Filings (SRS §35, §34.18)',
    category: 'Compliance',
    roles: ['Compliance Officer', 'Internal Auditor', 'General Manager'],
    guidelines: [
      'Daily: Cash drawer closing & 3-way reconciliation.',
      'Weekly: PAR overdue portfolio review and collector audit.',
      'Monthly: Comprehensive MIS P&L report generation and board review.',
      'Annual: Statutory registrar filings, audited financial statements, and AGM compliance.',
    ],
    fraudRisks: 'Non-compliance penalties, regulatory audit findings, or operational license suspension.',
    checklist: ['Daily reconciliation sign-off', 'Monthly MIS generated', 'Quarterly internal audit cleared', 'Annual ROC filings completed'],
  },
  {
    id: 19,
    title: 'Data Security, Role-Based Access & Anti-Tampering (SRS §48, §51, §34.19)',
    category: 'IT & Security',
    roles: ['Super Admin', 'IT Security Officer'],
    guidelines: [
      'Strictly zero shared login credentials across employees.',
      'Passwords must be rotated every 90 days and enforce 8+ character complexity.',
      'Account locks automatically after 5 consecutive failed login attempts.',
      'Indelible audit logging: Every creation, modification, and login event recorded with user ID, IP, and timestamp.',
    ],
    fraudRisks: 'Unauthorized ledger modifications, credential sharing, or backdoor database manipulation.',
    checklist: ['Unique login per employee', 'Password rotation verified', 'Lockout policy active', 'Audit logs review clean'],
  },
  {
    id: 20,
    title: 'Disaster Recovery & Business Continuity Plan (SRS §48, §50, §34.20)',
    category: 'Management',
    roles: ['Super Admin', 'Branch Manager'],
    guidelines: [
      'Automated daily encrypted database backups stored in cloud and secondary secure storage.',
      'In event of network outage, maintain physical duplicate receipt register with mandatory same-day catchup synchronization.',
      'Conduct bi-annual disaster recovery simulation to verify database restoration within 1 hour.',
    ],
    fraudRisks: 'Loss of member financial ledgers, debt records, or deposit contracts due to disaster.',
    checklist: ['Daily backup verified', 'Offline physical register available', 'Restoration drill tested', 'Emergency contact list updated'],
  },
];

export default function SopPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const categories = ['ALL', 'Customer Service', 'Operations', 'Finance', 'Credit', 'Recovery', 'Management', 'Audit', 'HR', 'Compliance', 'IT & Security'];

  const getCategoryIcon = (cat: string) => {
    if (cat.includes('Cash') || cat.includes('Collection') || cat.includes('Accounting')) return <DollarCircleOutlined />;
    if (cat.includes('Customer') || cat.includes('HR')) return <TeamOutlined />;
    if (cat.includes('Compliance') || cat.includes('Security') || cat.includes('Credit')) return <FileProtectOutlined />;
    return null;
  };

  const filtered = sopSections.filter((sec) => {
    const matchCategory = selectedCategory === 'ALL' || sec.category === selectedCategory;
    const matchSearch =
      sec.title.toLowerCase().includes(search.toLowerCase()) ||
      sec.guidelines.some((g) => g.toLowerCase().includes(search.toLowerCase())) ||
      sec.fraudRisks.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOutlined className="text-emerald-700 text-xl" />
            <h1 className="text-2xl font-bold text-slate-900 m-0">
              Standard Operating Procedures (SOP)
            </h1>
          </div>
          <p className="text-slate-500 text-sm mt-1 m-0">
            Mandatory operational rules, fraud prevention checklists, and workflows (SRS §34).
          </p>
        </div>
        <Button
          icon={<PrinterOutlined />}
          onClick={() => window.print()}
          className="border-emerald-600 text-emerald-700"
        >
          Print SOP Manual
        </Button>
      </div>

      {/* Brand Ethos Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <Row gutter={[24, 16]} align="middle">
          <Col xs={24} md={16}>
            <div className="text-xs uppercase tracking-wider text-emerald-400 font-semibold mb-1">
              Zero-Tolerance Operational Philosophy
            </div>
            <div className="text-lg font-bold text-white" style={{ color: '#ffffff' }}>
              &quot;Ethics First, Micro-Finance Next — No Shortcut to Trust&quot;
            </div>
            <div className="text-sm mt-1 leading-relaxed" style={{ color: '#cbd5e1' }}>
              Every staff member must strictly follow these SOP guidelines. Non-compliance is subject to disciplinary review and credential revocation.
            </div>
          </Col>
          <Col xs={24} md={8} className="text-left md:text-right">
            <Tag color="gold" className="px-3 py-1 font-bold text-xs rounded-full">
              Sanjeevani SOP v2.4 ({new Date().getFullYear()} Edition)
            </Tag>
          </Col>
        </Row>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
        <Input
          prefix={<SearchOutlined className="text-slate-400" />}
          placeholder="Search guidelines, rules, or fraud prevention controls..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-96"
          allowClear
        />
        <div className="flex flex-wrap gap-1">
          {categories.map((cat) => (
            <Button
              key={cat}
              size="small"
              icon={getCategoryIcon(cat)}
              type={selectedCategory === cat ? 'primary' : 'default'}
              style={selectedCategory === cat ? { background: '#059669', borderColor: '#059669' } : {}}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* SOP Content Accordion */}
      <div className="space-y-4">
        <Collapse
          defaultActiveKey={['1', '4', '5', '7', '10']}
          className="bg-white border border-slate-200 rounded-xl overflow-hidden"
          items={filtered.map((sec) => ({
            key: String(sec.id),
            label: (
              <div className="flex items-center justify-between pr-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-xs">
                    {sec.id}
                  </div>
                  <span className="font-bold text-slate-900 text-sm">{sec.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Tag color="blue" icon={getCategoryIcon(sec.category)}>{sec.category}</Tag>
                </div>
              </div>
            ),
            children: (
              <div className="space-y-4 pt-2">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Applicable Roles
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {sec.roles.map((r) => (
                      <Tag key={r} color="geekblue" className="text-xs">
                        {r}
                      </Tag>
                    ))}
                  </div>
                </div>

                <Divider className="my-2" />

                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Standard Operating Guidelines
                  </div>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700 m-0">
                    {sec.guidelines.map((g, idx) => (
                      <li key={idx}>{g}</li>
                    ))}
                  </ul>
                </div>

                <Divider className="my-2" />

                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-xs font-bold text-red-900 flex items-center gap-1.5 mb-1">
                    <SafetyCertificateOutlined /> Fraud Risk & Prevention Rule
                  </div>
                  <div className="text-xs text-red-700">{sec.fraudRisks}</div>
                </div>

                <Divider className="my-2" />

                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Compliance Checklist
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {sec.checklist.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200 text-slate-800">
                        <CheckCircleOutlined className="text-emerald-600" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ),
          }))}
        />
      </div>
    </div>
  );
}
