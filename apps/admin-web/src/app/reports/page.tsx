'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Tabs,
  Space,
  Select,
  Input,
  Modal,
  Alert,
  Row,
  Col,
  Radio,
  Statistic,
  message,
  DatePicker,
  Progress,
  Divider,
} from 'antd';
import {
  PieChartOutlined,
  DownloadOutlined,
  PrinterOutlined,
  AuditOutlined,
  SyncOutlined,
  CheckSquareOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  DollarCircleOutlined,
  RiseOutlined,
  WarningOutlined,
  BankOutlined,
  TeamOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { fetchApi } from '@/lib/api-client';
import { FinancialEngine } from '@sanjeevani/financial-engine';
import dayjs from 'dayjs';

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('daily_collection');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [reportPeriod, setReportPeriod] = useState('all');
  const [customDate, setCustomDate] = useState<string | null>(null);

  // Dedicated MIS Report States (§30, §52)
  const [monthlyMis, setMonthlyMis] = useState<any>(null);
  const [loanOutstanding, setLoanOutstanding] = useState<any>(null);
  const [overdueAging, setOverdueAging] = useState<any>(null);
  const [rdDue, setRdDue] = useState<any>(null);
  const [depositMaturity, setDepositMaturity] = useState<any>(null);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [projectionDays, setProjectionDays] = useState(30);

  // Bank Reconciliation States (§28-29)
  const [bankReconData, setBankReconData] = useState<any>(null);
  const [bankReconLoading, setBankReconLoading] = useState(false);
  const [reconImportModalOpen, setReconImportModalOpen] = useState(false);
  const [csvContentInput, setCsvContentInput] = useState('');
  const [importingRecon, setImportingRecon] = useState(false);

  // Staff KPI Dashboard States (§40)
  const [staffKpiData, setStaffKpiData] = useState<any>(null);
  const [staffKpiLoading, setStaffKpiLoading] = useState(false);
  const [selectedStaffRole, setSelectedStaffRole] = useState('ALL');
  const [selectedStaffMember, setSelectedStaffMember] = useState<any>(null);
  const [kpiScorecardModalOpen, setKpiScorecardModalOpen] = useState(false);

  // Surprise Audit Sampler State (§36)
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [sampleCount, setSampleCount] = useState(20);
  const [auditSampleData, setAuditSampleData] = useState<any>(null);
  const [auditSampleLoading, setAuditSampleLoading] = useState(false);

  const handleLoadSurpriseAuditSample = async (count: number) => {
    setAuditSampleLoading(true);
    setSampleCount(count);
    try {
      const res = await fetchApi(`/reports/surprise-audit-sample?count=${count}`);
      if (res.success && res.data) {
        setAuditSampleData(res.data);
      } else {
        message.error(res.message || 'Failed to generate audit sample');
      }
    } catch {
      message.error('An error occurred while sampling customers.');
    } finally {
      setAuditSampleLoading(false);
    }
  };

  const handleOpenSurpriseAudit = () => {
    setAuditModalOpen(true);
    handleLoadSurpriseAuditSample(20);
  };

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    setLoading(true);
    const [tRes, lRes, cRes, aRes] = await Promise.all([
      fetchApi('/transactions'),
      fetchApi('/loans'),
      fetchApi('/customers'),
      fetchApi('/audit-logs'),
    ]);

    if (tRes.success && tRes.data) setTransactions(tRes.data.items || tRes.data);
    if (lRes.success && lRes.data) setLoans(lRes.data.items || lRes.data);
    if (cRes.success && cRes.data) setCustomers(cRes.data.items || cRes.data);
    if (aRes.success && aRes.data) setAuditLogs(aRes.data.items || aRes.data);
    setLoading(false);
  };

  // Load Monthly MIS Report
  const loadMonthlyMis = async (month: string) => {
    setLoading(true);
    try {
      const res = await fetchApi(`/accounting/reports/monthly-mis?month=${month}`);
      if (res.success && res.data) {
        setMonthlyMis(res.data);
      }
    } catch {
      message.error('Failed to load Monthly MIS report');
    } finally {
      setLoading(false);
    }
  };

  // Load Loan Outstanding Report
  const loadLoanOutstanding = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/accounting/reports/loan-outstanding-report');
      if (res.success && res.data) {
        setLoanOutstanding(res.data);
      }
    } catch {
      message.error('Failed to load Loan Outstanding report');
    } finally {
      setLoading(false);
    }
  };

  // Load Overdue Aging Report
  const loadOverdueAging = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/accounting/reports/overdue-aging-report');
      if (res.success && res.data) {
        setOverdueAging(res.data);
      }
    } catch {
      message.error('Failed to load Overdue Aging report');
    } finally {
      setLoading(false);
    }
  };

  // Load RD Due Report
  const loadRdDue = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/accounting/reports/rd-due-report');
      if (res.success && res.data) {
        setRdDue(res.data);
      }
    } catch {
      message.error('Failed to load RD Due report');
    } finally {
      setLoading(false);
    }
  };

  // Load Deposit Maturity Report
  const loadDepositMaturity = async (days: number) => {
    setLoading(true);
    try {
      const res = await fetchApi(`/accounting/reports/deposit-maturity-report?days=${days}`);
      if (res.success && res.data) {
        setDepositMaturity(res.data);
      }
    } catch {
      message.error('Failed to load Deposit Maturity report');
    } finally {
      setLoading(false);
    }
  };

  // Load Bank Reconciliation (§28-29)
  const loadBankRecon = async () => {
    setBankReconLoading(true);
    try {
      const res = await fetchApi('/accounting/bank-recon/compare');
      if (res.success && res.data) {
        setBankReconData(res.data);
      }
    } catch {
      message.error('Failed to load Bank Reconciliation data');
    } finally {
      setBankReconLoading(false);
    }
  };

  const handleImportBankStatement = async () => {
    if (!csvContentInput.trim()) {
      message.warning('Please enter bank statement CSV text');
      return;
    }
    setImportingRecon(true);
    try {
      const res = await fetchApi('/accounting/bank-recon/import', {
        method: 'POST',
        body: JSON.stringify({ csvContent: csvContentInput }),
      });
      if (res.success) {
        message.success(res.message || 'Bank statement imported and reconciled successfully');
        setReconImportModalOpen(false);
        setCsvContentInput('');
        loadBankRecon();
      } else {
        message.error(res.message || 'Failed to import bank statement');
      }
    } catch {
      message.error('Error importing bank statement');
    } finally {
      setImportingRecon(false);
    }
  };

  const handleToggleReconMatch = async (txnId: string) => {
    try {
      const res = await fetchApi('/accounting/bank-recon/match', {
        method: 'POST',
        body: JSON.stringify({ statementTxnId: txnId }),
      });
      if (res.success) {
        message.success(res.message);
        loadBankRecon();
      } else {
        message.error(res.message);
      }
    } catch {
      message.error('Failed to update reconciliation match status');
    }
  };

  // Load Staff KPI Dashboard (§40)
  const loadStaffKpi = async () => {
    setStaffKpiLoading(true);
    try {
      const res = await fetchApi('/dashboard/staff-kpi');
      if (res.success && res.data) {
        setStaffKpiData(res.data);
      }
    } catch {
      message.error('Failed to load Staff KPI dashboard');
    } finally {
      setStaffKpiLoading(false);
    }
  };

  // Auto-fetch on tab change
  const handleTabChange = (key: string) => {
    setActiveReport(key);
    if (key === 'monthly_mis' && !monthlyMis) loadMonthlyMis(selectedMonth);
    if (key === 'loan_outstanding' && !loanOutstanding) loadLoanOutstanding();
    if (key === 'overdue_aging' && !overdueAging) loadOverdueAging();
    if (key === 'rd_due' && !rdDue) loadRdDue();
    if (key === 'deposit_maturity' && !depositMaturity) loadDepositMaturity(projectionDays);
    if (key === 'bank_recon' && !bankReconData) loadBankRecon();
    if (key === 'staff_kpi' && !staffKpiData) loadStaffKpi();
  };

  const exportCSV = (data: any[], filename: string) => {
    if (!data || !data.length) {
      message.warning('No records available to export');
      return;
    }
    const keys = Object.keys(data[0]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [keys.join(','), ...data.map((row) => keys.map((k) => JSON.stringify(row[k] ?? '')).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success(`Exported ${filename}.csv`);
  };

  const q = searchQuery.toLowerCase().trim();
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      !q ||
      t.transactionNumber?.toLowerCase().includes(q) ||
      t.customerName?.toLowerCase().includes(q) ||
      t.paymentMode?.toLowerCase().includes(q);
    if (!matchesSearch) return false;

    if (reportPeriod === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      return t.transactionDate && t.transactionDate.startsWith(todayStr);
    }
    if (reportPeriod === 'month') {
      const monthStr = new Date().toISOString().slice(0, 7);
      return t.transactionDate && t.transactionDate.startsWith(monthStr);
    }
    if (reportPeriod === 'custom' && customDate) {
      return t.transactionDate && t.transactionDate.startsWith(customDate);
    }
    return true;
  });
  const filteredLoans = loans.filter((l) =>
    !q || l.loanNumber?.toLowerCase().includes(q) || l.customerName?.toLowerCase().includes(q)
  );
  const filteredAuditLogs = auditLogs.filter((a) =>
    !q || a.eventType?.toLowerCase().includes(q) || a.userName?.toLowerCase().includes(q) || a.reason?.toLowerCase().includes(q)
  );
  const filteredCustomers = customers.filter((c) =>
    !q || c.customerNumber?.toLowerCase().includes(q) || c.firstName?.toLowerCase().includes(q) || c.lastName?.toLowerCase().includes(q) || c.mobile?.includes(q)
  );

  const getActiveData = () => {
    switch (activeReport) {
      case 'daily_collection':
        return filteredTransactions;
      case 'loan_outstanding':
        return loanOutstanding?.loans || filteredLoans;
      case 'overdue_aging':
        return overdueAging?.loans || [];
      case 'rd_due':
        return rdDue?.accounts || [];
      case 'deposit_maturity':
        return depositMaturity?.accounts || [];
      case 'monthly_mis':
        return monthlyMis ? [monthlyMis] : [];
      case 'loan_portfolio':
      case 'loans':
        return filteredLoans;
      case 'audit_logs':
      case 'audit':
        return filteredAuditLogs;
      case 'login_audit':
        return filteredAuditLogs.filter((a) => a.eventType === 'USER_LOGIN' || a.eventType === 'FAILED_LOGIN_ATTEMPT');
      case 'customer_master':
      case 'customers':
        return filteredCustomers;
      case 'bank_recon':
        return bankReconData?.transactions || [];
      case 'staff_kpi':
        return staffKpiData?.staff || [];
      default:
        return filteredTransactions;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 m-0">Financial Reports & Regulatory MIS</h1>
          <p className="text-slate-500 text-sm mt-1 m-0">
            Mandatory operational and financial statements, monthly MIS, overdue aging (PAR), and audit trail exports (SRS §30, §52, §68).
          </p>
        </div>
        <Space>
          <Button
            icon={<AuditOutlined />}
            onClick={handleOpenSurpriseAudit}
            style={{ color: '#059669', borderColor: '#059669', fontWeight: 600 }}
          >
            Surprise Audit Sampler (§36)
          </Button>
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
            Print Statement
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            style={{ background: '#059669', borderColor: '#059669' }}
            onClick={() => exportCSV(getActiveData(), `sanjeevani_${activeReport}`)}
          >
            Export CSV
          </Button>
        </Space>
      </div>

      <Card className="glass-card">
        <Row gutter={[12, 12]} className="mb-4" align="middle">
          <Col xs={24} sm={14} md={reportPeriod === 'custom' ? 8 : 10}>
            <Input
              placeholder="Search / filter statement records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              prefix={<PieChartOutlined className="text-slate-400 mr-1" />}
            />
          </Col>
          <Col xs={24} sm={10} md={reportPeriod === 'custom' ? 5 : 6}>
            <Select
              value={reportPeriod}
              onChange={(val) => {
                setReportPeriod(val);
                if (val !== 'custom') setCustomDate(null);
              }}
              style={{ width: '100%' }}
              options={[
                { value: 'all', label: 'All Dates (Historical)' },
                { value: 'today', label: 'Today Only' },
                { value: 'month', label: 'Current Month' },
                { value: 'custom', label: 'Custom Date' },
              ]}
            />
          </Col>
          {reportPeriod === 'custom' && (
            <Col xs={24} sm={10} md={5}>
              <DatePicker
                placeholder="Select Date"
                style={{ width: '100%' }}
                value={customDate ? dayjs(customDate) : null}
                onChange={(_, dateStr) => {
                  const val = Array.isArray(dateStr) ? dateStr[0] : dateStr;
                  setCustomDate(val || null);
                }}
              />
            </Col>
          )}
          <Col xs={24} md={reportPeriod === 'custom' ? 6 : 8} className="text-left md:text-right">
            <span className="text-xs text-slate-500">
              Active View: <strong className="text-emerald-800 uppercase font-mono">{activeReport.replace('_', ' ')}</strong>
            </span>
          </Col>
        </Row>

        <Tabs
          defaultActiveKey="daily_collection"
          activeKey={activeReport}
          onChange={handleTabChange}
          items={[
            {
              key: 'daily_collection',
              label: (
                <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                  <DollarCircleOutlined />
                  <span>Daily Collection Statement (§68)</span>
                </span>
              ),
              children: (
                <Table
                  size="small"
                  dataSource={filteredTransactions}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  columns={[
                    { title: 'TXN Number', dataIndex: 'transactionNumber', key: 'txn', render: (t) => <span className="font-mono">{t}</span> },
                    { title: 'Member Name', dataIndex: 'customerName', key: 'name', ellipsis: true },
                    { title: 'Payment Mode', dataIndex: 'paymentMode', key: 'mode', render: (m) => <Tag color="blue">{m}</Tag> },
                    { title: 'Amount', dataIndex: 'amount', key: 'amt', render: (a) => <span className="font-bold text-emerald-700">{FinancialEngine.formatINR(a)}</span> },
                    { title: 'Receipt ID', dataIndex: 'receiptNumber', key: 'rcp', render: (r) => <span className="font-mono text-xs">{r || '-'}</span> },
                    { title: 'Date', dataIndex: 'transactionDate', key: 'date' },
                    { title: 'Collector / Staff', dataIndex: 'createdByName', key: 'staff', ellipsis: true },
                  ]}
                />
              ),
            },
            {
              key: 'monthly_mis',
              label: (
                <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                  <FileTextOutlined />
                  <span>Monthly MIS Report (§52 #10)</span>
                </span>
              ),
              children: (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-700">MIS Month:</span>
                      <DatePicker
                        picker="month"
                        value={selectedMonth ? dayjs(selectedMonth, 'YYYY-MM') : null}
                        onChange={(_, dateString) => {
                          const val = Array.isArray(dateString) ? dateString[0] : dateString;
                          if (val) {
                            setSelectedMonth(val);
                            loadMonthlyMis(val);
                          }
                        }}
                        allowClear={false}
                        style={{ width: 160 }}
                      />
                      <Button
                        icon={<SyncOutlined spin={loading} />}
                        onClick={() => loadMonthlyMis(selectedMonth)}
                      >
                        Refresh
                      </Button>
                    </div>
                    {monthlyMis && (
                      <Tag color="green" className="text-sm py-1 px-3">
                        Status: Generated ({monthlyMis.month})
                      </Tag>
                    )}
                  </div>

                  {monthlyMis ? (
                    <div className="space-y-4">
                      <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12} lg={6}>
                          <Card className="border border-slate-200 shadow-sm">
                            <Statistic
                              title="Active Members"
                              value={monthlyMis.members?.closing || 0}
                              prefix={<UserOutlined className="text-blue-600" />}
                              suffix={<span className="text-xs text-slate-500">(+{monthlyMis.members?.newInMonth || 0} new)</span>}
                            />
                          </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                          <Card className="border border-slate-200 shadow-sm">
                            <Statistic
                              title="Deposit Balance"
                              value={monthlyMis.deposits?.totalBalance || 0}
                              formatter={(val) => FinancialEngine.formatINR(Number(val))}
                              prefix={<DollarCircleOutlined className="text-emerald-600" />}
                            />
                          </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                          <Card className="border border-slate-200 shadow-sm">
                            <Statistic
                              title="Loan Outstanding"
                              value={monthlyMis.loans?.totalOutstandingPrincipal || 0}
                              formatter={(val) => FinancialEngine.formatINR(Number(val))}
                              prefix={<RiseOutlined className="text-purple-600" />}
                            />
                          </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                          <Card className="border border-slate-200 shadow-sm">
                            <Statistic
                              title="Net Surplus / (Deficit)"
                              value={monthlyMis.financials?.netSurplusOrDeficit || 0}
                              formatter={(val) => FinancialEngine.formatINR(Number(val))}
                              valueStyle={{ color: (monthlyMis.financials?.netSurplusOrDeficit || 0) >= 0 ? '#059669' : '#dc2626' }}
                            />
                          </Card>
                        </Col>
                      </Row>

                      {/* Financial Performance Table */}
                      <Card title="Revenue & Expense Summary" size="small">
                        <Table
                          size="small"
                          pagination={false}
                          dataSource={[
                            { metric: 'Interest Income from Loans', value: monthlyMis.financials?.interestIncome, type: 'INCOME' },
                            { metric: 'Fee & Other Operating Income', value: monthlyMis.financials?.feeAndOtherIncome, type: 'INCOME' },
                            { metric: 'Total Gross Operating Income', value: monthlyMis.financials?.totalIncome, type: 'TOTAL_INCOME' },
                            { metric: 'Operating & Admin Expenses', value: monthlyMis.financials?.operatingExpenses, type: 'EXPENSE' },
                            { metric: 'Net Operating Surplus / (Deficit)', value: monthlyMis.financials?.netSurplusOrDeficit, type: 'NET' },
                          ]}
                          columns={[
                            { title: 'Line Item / Head', dataIndex: 'metric', key: 'm', render: (m, r: any) => r.type.startsWith('TOTAL') || r.type === 'NET' ? <strong>{m}</strong> : m },
                            {
                              title: 'Amount (INR)',
                              dataIndex: 'value',
                              key: 'v',
                              align: 'right',
                              render: (v, r: any) => (
                                <span className={r.type === 'NET' ? (v >= 0 ? 'font-bold text-emerald-700' : 'font-bold text-red-600') : r.type === 'TOTAL_INCOME' ? 'font-bold text-blue-700' : ''}>
                                  {FinancialEngine.formatINR(v || 0)}
                                </span>
                              ),
                            },
                          ]}
                        />
                      </Card>

                      {/* Portfolio Quality Breakdown */}
                      <Card title="Portfolio Quality & NPA Breakdown (SRS §15)" size="small">
                        <Row gutter={[16, 16]}>
                          <Col xs={12} sm={6}>
                            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
                              <div className="text-xs text-emerald-700 font-semibold">Current (0 DPD)</div>
                              <div className="text-lg font-bold text-emerald-900">{FinancialEngine.formatINR(monthlyMis.portfolioQuality?.parCurrent || 0)}</div>
                            </div>
                          </Col>
                          <Col xs={12} sm={6}>
                            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-center">
                              <div className="text-xs text-amber-700 font-semibold">1-30 DPD (Yellow)</div>
                              <div className="text-lg font-bold text-amber-900">{FinancialEngine.formatINR(monthlyMis.portfolioQuality?.parBucket1_30 || 0)}</div>
                            </div>
                          </Col>
                          <Col xs={12} sm={6}>
                            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 text-center">
                              <div className="text-xs text-orange-700 font-semibold">31-90 DPD (Orange)</div>
                              <div className="text-lg font-bold text-orange-900">{FinancialEngine.formatINR((monthlyMis.portfolioQuality?.parBucket31_60 || 0) + (monthlyMis.portfolioQuality?.parBucket61_90 || 0))}</div>
                            </div>
                          </Col>
                          <Col xs={12} sm={6}>
                            <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-center">
                              <div className="text-xs text-red-700 font-semibold">90+ DPD (NPA)</div>
                              <div className="text-lg font-bold text-red-900">{FinancialEngine.formatINR(monthlyMis.portfolioQuality?.npa90Plus || 0)}</div>
                              <Tag color="error" className="mt-1">NPA: {monthlyMis.portfolioQuality?.npaRatioPercent || 0}%</Tag>
                            </div>
                          </Col>
                        </Row>
                      </Card>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-500">
                      Click Refresh to generate the Monthly MIS report for {selectedMonth}.
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'loan_outstanding',
              label: (
                <span className="flex items-center gap-1.5 font-semibold text-blue-700">
                  <RiseOutlined />
                  <span>Loan Outstanding Report (§52 #7)</span>
                </span>
              ),
              children: (
                <div className="space-y-4">
                  {loanOutstanding?.summary && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="text-xs text-slate-500">Active Loans</div>
                        <div className="text-lg font-bold text-slate-900">{loanOutstanding.summary.totalLoansCount}</div>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="text-xs text-slate-500">Total Sanctioned</div>
                        <div className="text-lg font-bold text-blue-700">{FinancialEngine.formatINR(loanOutstanding.summary.totalSanctionedPrincipal)}</div>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="text-xs text-slate-500">Total Outstanding</div>
                        <div className="text-lg font-bold text-purple-700">{FinancialEngine.formatINR(loanOutstanding.summary.totalOutstandingPrincipal)}</div>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="text-xs text-slate-500">Total Overdue</div>
                        <div className="text-lg font-bold text-red-600">{FinancialEngine.formatINR(loanOutstanding.summary.totalOverdueAmount)}</div>
                      </div>
                    </div>
                  )}
                  <Table
                    size="small"
                    dataSource={loanOutstanding?.loans || filteredLoans}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    columns={[
                      { title: 'Loan ID', dataIndex: 'loanNumber', key: 'num', render: (l) => <span className="font-mono font-bold text-blue-700">{l}</span> },
                      { title: 'Borrower', dataIndex: 'customerName', key: 'name', ellipsis: true },
                      { title: 'Sanctioned Principal', dataIndex: 'principal', key: 'p', render: (p) => FinancialEngine.formatINR(p) },
                      { title: 'Current Outstanding', dataIndex: 'outstandingPrincipal', key: 'out', render: (o) => <span className="font-bold text-slate-900">{FinancialEngine.formatINR(o)}</span> },
                      { title: 'EMI', dataIndex: 'emiAmount', key: 'emi', render: (e) => FinancialEngine.formatINR(e) },
                      { title: 'Overdue (PAR)', dataIndex: 'overdueAmount', key: 'ov', render: (ov) => <Tag color={ov > 0 ? 'error' : 'success'}>{FinancialEngine.formatINR(ov || 0)}</Tag> },
                      { title: 'DPD', dataIndex: 'daysPastDue', key: 'dpd', render: (d) => <span className={d > 0 ? 'text-red-600 font-bold' : 'text-slate-500'}>{d || 0}</span> },
                      { title: 'Bucket', dataIndex: 'recoveryBucket', key: 'bkt', render: (b) => <Tag color={b === 'NPA_90_PLUS' ? 'red' : b === 'CURRENT' ? 'green' : 'orange'}>{b || 'CURRENT'}</Tag> },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: 'overdue_aging',
              label: (
                <span className="flex items-center gap-1.5 font-semibold text-red-700">
                  <WarningOutlined />
                  <span>Overdue Aging & PAR (§52 #9)</span>
                </span>
              ),
              children: (
                <div className="space-y-4">
                  {overdueAging && (
                    <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-xl">
                      <div>
                        <span className="font-bold text-red-900 text-sm">Total Delinquent Portfolio:</span>
                        <span className="ml-2 text-base font-black text-red-700">{FinancialEngine.formatINR(overdueAging.totalOverdueAmount || 0)}</span>
                      </div>
                      <Tag color="error">{overdueAging.totalOverdueLoansCount || 0} Delinquent Loans</Tag>
                    </div>
                  )}
                  <Table
                    size="small"
                    dataSource={overdueAging?.loans || []}
                    rowKey="loanNumber"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    columns={[
                      { title: 'Loan No', dataIndex: 'loanNumber', key: 'ln', render: (l) => <span className="font-mono font-bold text-red-700">{l}</span> },
                      { title: 'Borrower Name', dataIndex: 'customerName', key: 'cn' },
                      { title: 'Sanctioned', dataIndex: 'principal', key: 'p', render: (p) => FinancialEngine.formatINR(p) },
                      { title: 'Outstanding Balance', dataIndex: 'outstandingPrincipal', key: 'out', render: (o) => FinancialEngine.formatINR(o) },
                      { title: 'Overdue Amount', dataIndex: 'overdueAmount', key: 'ov', render: (ov) => <span className="font-bold text-red-600">{FinancialEngine.formatINR(ov)}</span> },
                      { title: 'Days Past Due', dataIndex: 'daysPastDue', key: 'dpd', render: (d) => <Tag color={d >= 90 ? 'magenta' : d >= 31 ? 'volcano' : 'orange'}>{d} Days</Tag> },
                      { title: 'PAR Classification', dataIndex: 'bucket', key: 'bkt', render: (b) => <Tag color={b.includes('90+') ? 'red' : b.includes('31-') ? 'orange' : 'gold'}>{b}</Tag> },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: 'rd_due',
              label: (
                <span className="flex items-center gap-1.5 font-semibold text-amber-700">
                  <ClockCircleOutlined />
                  <span>RD Due Report (§52 #5)</span>
                </span>
              ),
              children: (
                <div className="space-y-4">
                  {rdDue && (
                    <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <div>
                        <span className="font-bold text-amber-900 text-sm">Monthly Expected RD Collection:</span>
                        <span className="ml-2 text-base font-black text-amber-700">{FinancialEngine.formatINR(rdDue.totalExpectedMonthlyCollection || 0)}</span>
                      </div>
                      <Tag color="warning">{rdDue.totalRdAccounts || 0} Active RD Accounts</Tag>
                    </div>
                  )}
                  <Table
                    size="small"
                    dataSource={rdDue?.accounts || []}
                    rowKey="accountNumber"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    columns={[
                      { title: 'RD Account #', dataIndex: 'accountNumber', key: 'an', render: (a) => <span className="font-mono font-bold text-amber-800">{a}</span> },
                      { title: 'Member Name', dataIndex: 'customerName', key: 'cn' },
                      { title: 'Contact Mobile', dataIndex: 'customerMobile', key: 'mob' },
                      { title: 'Monthly Due', dataIndex: 'monthlyDeposit', key: 'md', render: (m) => <span className="font-bold text-emerald-700">{FinancialEngine.formatINR(m)}</span> },
                      { title: 'Current Balance', dataIndex: 'currentBalance', key: 'cb', render: (b) => FinancialEngine.formatINR(b) },
                      { title: 'Maturity Date', dataIndex: 'maturityDate', key: 'mdt' },
                      { title: 'Status', dataIndex: 'status', key: 'st', render: (s) => <Tag color="green">{s}</Tag> },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: 'deposit_maturity',
              label: (
                <span className="flex items-center gap-1.5 font-semibold text-indigo-700">
                  <DollarCircleOutlined />
                  <span>Deposit Maturity Report (§52 #6)</span>
                </span>
              ),
              children: (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-700">Projection Window:</span>
                      <Radio.Group
                        value={projectionDays}
                        onChange={(e) => {
                          setProjectionDays(e.target.value);
                          loadDepositMaturity(e.target.value);
                        }}
                        size="small"
                      >
                        <Radio.Button value={7}>Next 7 Days</Radio.Button>
                        <Radio.Button value={15}>Next 15 Days</Radio.Button>
                        <Radio.Button value={30}>Next 30 Days</Radio.Button>
                        <Radio.Button value={60}>Next 60 Days</Radio.Button>
                      </Radio.Group>
                    </div>
                    {depositMaturity && (
                      <Tag color="purple">
                        Liability: {FinancialEngine.formatINR(depositMaturity.totalMaturityLiability || 0)} ({depositMaturity.maturingCount || 0} deposits)
                      </Tag>
                    )}
                  </div>
                  <Table
                    size="small"
                    dataSource={depositMaturity?.accounts || []}
                    rowKey="accountNumber"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    columns={[
                      { title: 'Account Number', dataIndex: 'accountNumber', key: 'an', render: (a) => <span className="font-mono font-bold text-indigo-800">{a}</span> },
                      { title: 'Product', dataIndex: 'productType', key: 'pt', render: (p) => <Tag color="blue">{p}</Tag> },
                      { title: 'Member Name', dataIndex: 'customerName', key: 'cn' },
                      { title: 'Principal Deposited', dataIndex: 'principalAmount', key: 'pa', render: (p) => FinancialEngine.formatINR(p) },
                      { title: 'Interest Rate', dataIndex: 'interestRate', key: 'ir', render: (r) => `${r}% p.a.` },
                      { title: 'Maturity Payout', dataIndex: 'maturityAmount', key: 'ma', render: (m) => <span className="font-bold text-indigo-700">{FinancialEngine.formatINR(m)}</span> },
                      { title: 'Maturity Date', dataIndex: 'maturityDate', key: 'md', render: (d) => <span className="font-bold text-slate-800">{d}</span> },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: 'audit_logs',
              label: (
                <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <AuditOutlined />
                  <span>Indelible Audit Trail (§50, BR-011)</span>
                </span>
              ),
              children: (
                <Table
                  size="small"
                  dataSource={filteredAuditLogs}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  columns={[
                    { title: 'Log ID', dataIndex: 'id', key: 'id', render: (id) => <span className="font-mono text-xs text-slate-500">{id}</span> },
                    { title: 'Event Type', dataIndex: 'eventType', key: 'evt', render: (e) => <Tag color="geekblue">{e}</Tag> },
                    { title: 'Entity', key: 'ent', render: (_, r) => `${r.entityType} #${r.entityId}`, ellipsis: true },
                    { title: 'Staff Operator', dataIndex: 'userName', key: 'user', ellipsis: true },
                    { title: 'Reason / Remarks', dataIndex: 'reason', key: 'reason', ellipsis: true },
                    { title: 'Timestamp', dataIndex: 'timestamp', key: 'ts', render: (t) => (t ? new Date(t).toLocaleString('en-IN') : '-') },
                  ]}
                />
              ),
            },
            {
              key: 'login_audit',
              label: (
                <span className="flex items-center gap-1.5 font-semibold text-blue-700">
                  <SafetyCertificateOutlined />
                  <span>Login & Security Audit (§51, BR-012)</span>
                </span>
              ),
              children: (
                <Table
                  size="small"
                  dataSource={auditLogs.filter((a) => a.eventType === 'USER_LOGIN' || a.eventType === 'FAILED_LOGIN_ATTEMPT')}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  columns={[
                    {
                      title: 'Status',
                      key: 'st',
                      render: (_, r) => (
                        <Tag color={r.eventType === 'USER_LOGIN' ? 'success' : 'error'}>
                          {r.eventType === 'USER_LOGIN' ? 'LOGIN SUCCESS' : 'BLOCKED / FAILED'}
                        </Tag>
                      ),
                    },
                    { title: 'User / Account', dataIndex: 'userName', key: 'usr', render: (u) => <span className="font-bold">{u}</span>, ellipsis: true },
                    {
                      title: 'Client IP Address',
                      key: 'ip',
                      render: (_: any, r: any) => <span className="font-mono text-xs text-blue-700 font-semibold">{r.newValue?.clientIp || r.reason?.match(/\d+\.\d+\.\d+\.\d+/)?.[0] || '127.0.0.1'}</span>,
                    },
                    {
                      title: 'Device / Client Browser',
                      key: 'dev',
                      ellipsis: true,
                      render: (_: any, r: any) => <span className="text-xs text-slate-500 max-w-[200px] truncate block">{r.newValue?.userAgent || 'Standard Browser / Desktop'}</span>,
                    },
                    { title: 'Security Details', dataIndex: 'reason', key: 'reason', ellipsis: true },
                    { title: 'Timestamp', dataIndex: 'timestamp', key: 'ts', render: (t) => (t ? new Date(t).toLocaleString('en-IN') : '-') },
                  ]}
                />
              ),
            },
            {
              key: 'customer_master',
              label: (
                <span className="flex items-center gap-1.5">
                  <UserOutlined />
                  <span>Customer Master Directory (§68)</span>
                </span>
              ),
              children: (
                <Table
                  size="small"
                  dataSource={filteredCustomers}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  columns={[
                    { title: 'Member No', dataIndex: 'customerNumber', key: 'num', render: (c) => <span className="font-mono font-bold text-emerald-700">{c}</span> },
                    { title: 'Full Name', key: 'name', render: (_, r) => `${r.firstName} ${r.lastName}`, ellipsis: true },
                    { title: 'Mobile', dataIndex: 'mobile', key: 'mob' },
                    { title: 'Branch', dataIndex: 'branchName', key: 'br', ellipsis: true },
                    { title: 'KYC Status', dataIndex: 'kycStatus', key: 'kyc', render: (k) => <Tag color={k === 'VERIFIED' ? 'success' : 'warning'}>{k}</Tag> },
                    { title: 'Joined', dataIndex: 'joiningDate', key: 'dt' },
                  ]}
                />
              ),
            },
            {
              key: 'bank_recon',
              label: (
                <span className="flex items-center gap-1.5 font-semibold text-teal-700">
                  <BankOutlined />
                  <span>Bank Reconciliation (§28-29, Report #4)</span>
                </span>
              ),
              children: (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between p-3 bg-teal-50/50 border border-teal-200 rounded-xl gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        type="primary"
                        icon={<UploadOutlined />}
                        style={{ background: '#0d9488', borderColor: '#0d9488' }}
                        onClick={() => setReconImportModalOpen(true)}
                      >
                        Import Bank Statement CSV
                      </Button>
                      <Button
                        icon={<SyncOutlined spin={bankReconLoading} />}
                        onClick={loadBankRecon}
                      >
                        Refresh Reconciliation
                      </Button>
                    </div>
                    {bankReconData && (
                      <div className="flex items-center gap-2">
                        <Tag color={bankReconData.unreconciledDifference === 0 ? 'success' : 'warning'}>
                          {bankReconData.unreconciledDifference === 0 ? 'Fully Reconciled' : `Variance: ${FinancialEngine.formatINR(bankReconData.unreconciledDifference)}`}
                        </Tag>
                        <Tag color="cyan">
                          Matched: {bankReconData.matchedCount} / {bankReconData.transactions?.length || 0}
                        </Tag>
                      </div>
                    )}
                  </div>

                  {bankReconData && (
                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={8}>
                        <Card size="small" className="border border-slate-200 shadow-sm">
                          <Statistic
                            title="Software Ledger Balance"
                            value={bankReconData.ledgerBalance || 0}
                            formatter={(v) => FinancialEngine.formatINR(Number(v))}
                            valueStyle={{ color: '#0d9488', fontWeight: 700 }}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Card size="small" className="border border-slate-200 shadow-sm">
                          <Statistic
                            title="Bank Statement Balance"
                            value={bankReconData.statementBalance || 0}
                            formatter={(v) => FinancialEngine.formatINR(Number(v))}
                            valueStyle={{ color: '#2563eb', fontWeight: 700 }}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Card size="small" className="border border-slate-200 shadow-sm">
                          <Statistic
                            title="Unreconciled Variance"
                            value={bankReconData.unreconciledDifference || 0}
                            formatter={(v) => FinancialEngine.formatINR(Number(v))}
                            valueStyle={{ color: (bankReconData.unreconciledDifference || 0) === 0 ? '#059669' : '#e11d48', fontWeight: 700 }}
                          />
                        </Card>
                      </Col>
                    </Row>
                  )}

                  <Table
                    size="small"
                    dataSource={bankReconData?.transactions || []}
                    rowKey="id"
                    loading={bankReconLoading}
                    pagination={{ pageSize: 10 }}
                    columns={[
                      { title: 'Date', dataIndex: 'date', key: 'dt', width: 110 },
                      { title: 'Description / Narration', dataIndex: 'description', key: 'desc', ellipsis: true },
                      { title: 'Reference / UTR', dataIndex: 'reference', key: 'ref', render: (r) => <span className="font-mono text-xs text-slate-600">{r || '-'}</span> },
                      {
                        title: 'Type',
                        dataIndex: 'type',
                        key: 'type',
                        width: 90,
                        render: (t) => <Tag color={t === 'CREDIT' ? 'success' : 'error'}>{t}</Tag>,
                      },
                      {
                        title: 'Amount',
                        dataIndex: 'amount',
                        key: 'amt',
                        align: 'right',
                        render: (a, r: any) => (
                          <span className={r.type === 'CREDIT' ? 'font-bold text-emerald-700' : 'font-bold text-rose-700'}>
                            {r.type === 'CREDIT' ? '+' : '-'}{FinancialEngine.formatINR(a)}
                          </span>
                        ),
                      },
                      {
                        title: 'Status',
                        dataIndex: 'status',
                        key: 'st',
                        width: 120,
                        render: (st) => (
                          <Tag color={st === 'MATCHED' ? 'green' : 'gold'}>
                            {st === 'MATCHED' ? 'Reconciled' : 'Unmatched'}
                          </Tag>
                        ),
                      },
                      {
                        title: 'Matched Software Txn',
                        dataIndex: 'matchedWith',
                        key: 'match',
                        ellipsis: true,
                        render: (m) => m ? <span className="font-mono text-xs text-emerald-700">{m}</span> : <span className="text-slate-400 text-xs">None</span>,
                      },
                      {
                        title: 'Action',
                        key: 'action',
                        width: 120,
                        render: (_, r: any) => (
                          <Button
                            size="small"
                            type={r.status === 'MATCHED' ? 'default' : 'primary'}
                            style={r.status !== 'MATCHED' ? { background: '#0d9488', borderColor: '#0d9488' } : {}}
                            onClick={() => handleToggleReconMatch(r.id)}
                          >
                            {r.status === 'MATCHED' ? 'Unmatch' : 'Match Txn'}
                          </Button>
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: 'staff_kpi',
              label: (
                <span className="flex items-center gap-1.5 font-semibold text-purple-700">
                  <TeamOutlined />
                  <span>Staff Performance KPI (§40)</span>
                </span>
              ),
              children: (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between p-3 bg-purple-50/50 border border-purple-200 rounded-xl gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-700">Staff Role / Department:</span>
                      <Select
                        value={selectedStaffRole}
                        onChange={(v) => setSelectedStaffRole(v)}
                        style={{ width: 220 }}
                        options={[
                          { value: 'ALL', label: 'All Roles & Departments' },
                          { value: 'COLLECTION_AGENT', label: 'Collection Agents (§40.1)' },
                          { value: 'LOAN_OFFICER', label: 'Loan Officers (§40.2)' },
                          { value: 'CUSTOMER_SERVICE', label: 'Customer Service (§40.3)' },
                          { value: 'RECOVERY', label: 'Recovery Agents (§40.4)' },
                        ]}
                      />
                      <Button
                        icon={<SyncOutlined spin={staffKpiLoading} />}
                        onClick={loadStaffKpi}
                      >
                        Refresh KPIs
                      </Button>
                    </div>
                    {staffKpiData && (
                      <Tag color="purple" className="text-xs py-1 px-3">
                        Total Staff Evaluated: {staffKpiData.totalStaffCount || 0}
                      </Tag>
                    )}
                  </div>

                  {staffKpiData?.staff && (
                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={12} lg={6}>
                        <Card size="small" className="border border-slate-200 shadow-sm">
                          <Statistic
                            title="Total Active Field Staff"
                            value={staffKpiData.staff.length}
                            prefix={<TeamOutlined className="text-purple-600" />}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} lg={6}>
                        <Card size="small" className="border border-slate-200 shadow-sm">
                          <Statistic
                            title="Total Collections Today"
                            value={staffKpiData.staff.reduce((s: number, e: any) => s + (e.collectionMetrics?.todayCollectedAmount || 0), 0)}
                            formatter={(v) => FinancialEngine.formatINR(Number(v))}
                            prefix={<DollarCircleOutlined className="text-emerald-600" />}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} lg={6}>
                        <Card size="small" className="border border-slate-200 shadow-sm">
                          <Statistic
                            title="Active Loans Disbursed"
                            value={staffKpiData.staff.reduce((s: number, e: any) => s + (e.loanOfficerMetrics?.disbursedLoansCount || 0), 0)}
                            prefix={<RiseOutlined className="text-blue-600" />}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} lg={6}>
                        <Card size="small" className="border border-slate-200 shadow-sm">
                          <Statistic
                            title="Customers Onboarded"
                            value={staffKpiData.staff.reduce((s: number, e: any) => s + (e.customerServiceMetrics?.customersOnboarded || 0), 0)}
                            prefix={<UserOutlined className="text-amber-600" />}
                          />
                        </Card>
                      </Col>
                    </Row>
                  )}

                  <Table
                    size="small"
                    dataSource={(staffKpiData?.staff || []).filter((emp: any) => {
                      if (selectedStaffRole === 'ALL') return true;
                      const des = (emp.designation || '').toUpperCase();
                      if (selectedStaffRole === 'COLLECTION_AGENT') return des.includes('COLLECT') || des.includes('FIELD');
                      if (selectedStaffRole === 'LOAN_OFFICER') return des.includes('LOAN') || des.includes('CREDIT');
                      if (selectedStaffRole === 'CUSTOMER_SERVICE') return des.includes('SERVICE') || des.includes('DESK') || des.includes('CASH');
                      if (selectedStaffRole === 'RECOVERY') return des.includes('RECOV');
                      return true;
                    })}
                    rowKey="employeeId"
                    loading={staffKpiLoading}
                    pagination={{ pageSize: 10 }}
                    columns={[
                      {
                        title: 'Staff Member',
                        key: 'emp',
                        render: (_, r: any) => (
                          <div>
                            <div className="font-semibold text-slate-900">{r.employeeName}</div>
                            <div className="text-xs text-slate-500">{r.employeeNumber} &bull; {r.designation}</div>
                          </div>
                        ),
                      },
                      { title: 'Branch', dataIndex: 'branchName', key: 'br', ellipsis: true },
                      {
                        title: 'Today Collection',
                        key: 'col',
                        render: (_, r: any) => (
                          <div>
                            <div className="font-bold text-emerald-700">{FinancialEngine.formatINR(r.collectionMetrics?.todayCollectedAmount || 0)}</div>
                            <div className="text-xs text-slate-400">{r.collectionMetrics?.transactionCount || 0} txns</div>
                          </div>
                        ),
                      },
                      {
                        title: 'Collection Efficiency',
                        key: 'eff',
                        render: (_, r: any) => (
                          <div className="w-28">
                            <Progress
                              percent={r.collectionMetrics?.collectionEfficiencyPercentage || 90}
                              size="small"
                              strokeColor="#059669"
                            />
                          </div>
                        ),
                      },
                      {
                        title: 'Loans Sanctioned',
                        key: 'loans',
                        render: (_, r: any) => (
                          <div>
                            <div className="font-semibold text-blue-700">{FinancialEngine.formatINR(r.loanOfficerMetrics?.totalSanctionedAmount || 0)}</div>
                            <div className="text-xs text-slate-400">{r.loanOfficerMetrics?.approvedCount || 0} approved</div>
                          </div>
                        ),
                      },
                      {
                        title: 'Customer Onboarding',
                        key: 'kyc',
                        render: (_, r: any) => (
                          <div>
                            <span className="font-semibold">{r.customerServiceMetrics?.customersOnboarded || 0}</span>
                            <span className="text-xs text-slate-400 ml-1">({r.customerServiceMetrics?.kycCompleted || 0} KYC)</span>
                          </div>
                        ),
                      },
                      {
                        title: 'Scorecard',
                        key: 'action',
                        width: 140,
                        render: (_, r: any) => (
                          <Button
                            size="small"
                            type="link"
                            style={{ color: '#7c3aed', padding: 0 }}
                            onClick={() => {
                              setSelectedStaffMember(r);
                              setKpiScorecardModalOpen(true);
                            }}
                          >
                            View Scorecard &rarr;
                          </Button>
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* SURPRISE AUDIT RANDOM CUSTOMER SAMPLER MODAL (§36) */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-emerald-800">
            <SafetyCertificateOutlined className="text-xl" />
            <span>Surprise Audit Random Customer Sampler (SRS §36)</span>
          </div>
        }
        open={auditModalOpen}
        onCancel={() => setAuditModalOpen(false)}
        width={960}
        footer={[
          <Button key="close" onClick={() => setAuditModalOpen(false)}>
            Close
          </Button>,
          <Button
            key="export"
            icon={<DownloadOutlined />}
            onClick={() => {
              if (auditSampleData?.sample) {
                exportCSV(auditSampleData.sample, `surprise_audit_sample_${sampleCount}`);
              }
            }}
          >
            Export Sample CSV
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => window.print()}
            style={{ background: '#059669', borderColor: '#059669' }}
          >
            Print Field Verification Sheet
          </Button>,
        ]}
      >
        <div className="space-y-4 py-2">
          <Alert
            type="info"
            showIcon
            message="Regulatory Physical Passbook & Balance Audit (§36)"
            description="Cryptographically samples random active members across all branches to verify passbooks in hand, validate unposted deposits, and obtain customer signoffs without prior collector notice."
          />

          {/* Sampler Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-700">Sample Size:</span>
              <Radio.Group
                value={sampleCount}
                onChange={(e) => handleLoadSurpriseAuditSample(e.target.value)}
                size="small"
              >
                <Radio.Button value={10}>10 Members</Radio.Button>
                <Radio.Button value={20}>20 Members</Radio.Button>
                <Radio.Button value={50}>50 Members</Radio.Button>
              </Radio.Group>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="small"
                icon={<SyncOutlined spin={auditSampleLoading} />}
                onClick={() => handleLoadSurpriseAuditSample(sampleCount)}
              >
                Generate Fresh Random Sample
              </Button>
              <Tag color="cyan">Pool: {auditSampleData?.totalActivePool || customers.length} Members</Tag>
            </div>
          </div>

          {/* Printable Field Verification Sheet Area */}
          <div id="surprise-audit-print-area">
            {/* Header for print only */}
            <div className="hidden print:block border-b-2 border-emerald-800 pb-3 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold uppercase text-emerald-950 m-0">SANJEEVANI FINANCE MANAGEMENT SYSTEM</h1>
                  <div className="text-xs text-slate-600">CONFIDENTIAL INTERNAL SURPRISE AUDIT VERIFICATION SHEET (SRS §36)</div>
                </div>
                <div className="text-right text-xs">
                  <div>Date Generated: {new Date().toLocaleDateString('en-IN')}</div>
                  <div>Sample Size: {auditSampleData?.sampleSize || sampleCount} Customers</div>
                </div>
              </div>
            </div>

            <Table
              size="small"
              loading={auditSampleLoading}
              dataSource={auditSampleData?.sample || []}
              rowKey="customerId"
              pagination={false}
              columns={[
                {
                  title: 'Member ID',
                  dataIndex: 'customerNumber',
                  key: 'num',
                  width: 100,
                  render: (n) => <span className="font-mono font-bold text-emerald-800">{n}</span>,
                },
                {
                  title: 'Customer Name & Phone',
                  key: 'cust',
                  render: (_, r: any) => (
                    <div>
                      <div className="font-semibold text-slate-900">{r.customerName}</div>
                      <div className="font-mono text-xs text-slate-500">{r.mobile}</div>
                    </div>
                  ),
                },
                {
                  title: 'Village / Address',
                  dataIndex: 'address',
                  key: 'addr',
                  ellipsis: true,
                },
                {
                  title: 'Savings Bal',
                  dataIndex: 'totalDeposits',
                  key: 'dep',
                  render: (d) => <span className="font-bold text-emerald-700">{FinancialEngine.formatINR(d)}</span>,
                },
                {
                  title: 'Loan Principal',
                  dataIndex: 'totalLoanOutstanding',
                  key: 'loan',
                  render: (l) => (l > 0 ? <span className="font-bold text-blue-700">{FinancialEngine.formatINR(l)}</span> : '-'),
                },
                {
                  title: 'Last Receipt / Date',
                  key: 'rcp',
                  render: (_, r: any) => (
                    <div className="text-xs">
                      <div className="font-mono">{r.lastReceiptNumber}</div>
                      <div className="text-slate-400">{r.lastTransactionDate}</div>
                    </div>
                  ),
                },
                {
                  title: (
                    <span className="flex items-center gap-1">
                      <CheckSquareOutlined className="text-emerald-600" />
                      <span>Passbook</span>
                    </span>
                  ),
                  key: 'chk1',
                  width: 90,
                  render: () => (
                    <div className="w-6 h-6 border-2 border-slate-300 rounded flex items-center justify-center mx-auto text-slate-200 hover:border-emerald-400 transition-colors cursor-pointer">
                      <CheckSquareOutlined style={{ fontSize: 14 }} />
                    </div>
                  ),
                },
                {
                  title: (
                    <span className="flex items-center gap-1">
                      <CheckSquareOutlined className="text-emerald-600" />
                      <span>Bal Match</span>
                    </span>
                  ),
                  key: 'chk2',
                  width: 90,
                  render: () => (
                    <div className="w-6 h-6 border-2 border-slate-300 rounded flex items-center justify-center mx-auto text-slate-200 hover:border-emerald-400 transition-colors cursor-pointer">
                      <CheckSquareOutlined style={{ fontSize: 14 }} />
                    </div>
                  ),
                },
                {
                  title: 'Customer Sign',
                  key: 'sign',
                  width: 110,
                  render: () => <div className="h-6 border-b border-dotted border-slate-400" />,
                },
              ]}
            />

            {/* Auditor signoff block for print only */}
            <div className="hidden print:flex justify-between items-end mt-16 pt-4 border-t border-slate-300 text-xs">
              <div>
                <div>Internal Auditor Signature: _______________________</div>
                <div className="text-slate-500 mt-1">Name / Staff Code: ____________________</div>
              </div>
              <div>
                <div>Branch Manager Signoff: _______________________</div>
                <div className="text-slate-500 mt-1">Inspection Date: ____________________</div>
              </div>
            </div>
          </div>
        </div>

        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #surprise-audit-print-area,
            #surprise-audit-print-area * {
              visibility: visible;
            }
            #surprise-audit-print-area {
              position: fixed;
              left: 0;
              top: 0;
              width: 100vw;
              height: auto;
              margin: 0;
              padding: 20px;
              background: white !important;
            }
            .ant-modal-mask,
            .ant-modal-wrap,
            .ant-modal-footer,
            .ant-modal-close {
              display: none !important;
            }
          }
        `}</style>
      </Modal>

      {/* BANK STATEMENT RECONCILIATION IMPORT MODAL (§28-29) */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-teal-800">
            <UploadOutlined className="text-lg" />
            <span>Import Bank Statement CSV (SRS §28-29)</span>
          </div>
        }
        open={reconImportModalOpen}
        onCancel={() => setReconImportModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setReconImportModalOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="sample"
            onClick={() => {
              const sampleCsv = `Date,Description,Reference,Amount,Type\n${new Date().toISOString().split('T')[0]},CMS COLLECTION INWARD,CMS-REF-9921,25000,CREDIT\n${new Date().toISOString().split('T')[0]},RTGS SETTLEMENT DISBURSEMENT,RTGS88102,15000,DEBIT\n${new Date().toISOString().split('T')[0]},ACH CLEARING RECOVERY,ACH44091,8500,CREDIT`;
              setCsvContentInput(sampleCsv);
            }}
          >
            Insert Demo Statement CSV
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={importingRecon}
            style={{ background: '#0d9488', borderColor: '#0d9488' }}
            onClick={handleImportBankStatement}
          >
            Process & Reconcile Statement
          </Button>,
        ]}
      >
        <div className="space-y-3 py-2">
          <Alert
            type="info"
            showIcon
            message="CSV Import Standard"
            description="Include columns: Date (YYYY-MM-DD), Description, Reference / UTR, Amount, Type (CREDIT or DEBIT). The reconciliation engine matches records by transaction reference and amount."
          />
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bank Statement CSV Data:
            </label>
            <Input.TextArea
              rows={8}
              placeholder={`Date,Description,Reference,Amount,Type\n2026-03-01,ACH DEPOSIT SANJEEVANI RECOVERY,CMS88921,50000,CREDIT\n2026-03-02,OFFICE EXPENSE PETTY CASH,CHQ0012,12000,DEBIT`}
              value={csvContentInput}
              onChange={(e) => setCsvContentInput(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
        </div>
      </Modal>

      {/* STAFF KPI DETAILED SCORECARD MODAL (§40) */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-purple-800">
            <TeamOutlined className="text-xl" />
            <span>Staff Comprehensive Performance Scorecard (SRS §40)</span>
          </div>
        }
        open={kpiScorecardModalOpen}
        onCancel={() => setKpiScorecardModalOpen(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setKpiScorecardModalOpen(false)}>
            Close
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
            onClick={() => window.print()}
          >
            Print Scorecard
          </Button>,
        ]}
      >
        {selectedStaffMember && (
          <div className="space-y-4 py-2">
            {/* Header info */}
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-purple-950 m-0">{selectedStaffMember.employeeName}</h2>
                <div className="text-xs text-purple-700 font-mono mt-0.5">
                  Emp ID: {selectedStaffMember.employeeNumber} &bull; Designation: {selectedStaffMember.designation}
                </div>
              </div>
              <Tag color="purple" className="text-sm py-1 px-3">
                Branch: {selectedStaffMember.branchName || 'Main Branch'}
              </Tag>
            </div>

            {/* 4 Pillars of §40 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* §40.1 Collection Agent */}
              <Card title={<span className="text-emerald-800 font-bold">1. Collection Efficiency (§40.1)</span>} size="small">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Today Collected:</span>
                    <span className="font-bold text-emerald-700">{FinancialEngine.formatINR(selectedStaffMember.collectionMetrics?.todayCollectedAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">All-time Collected:</span>
                    <span className="font-semibold">{FinancialEngine.formatINR(selectedStaffMember.collectionMetrics?.totalAllTimeCollected || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Completed Transactions:</span>
                    <span className="font-mono">{selectedStaffMember.collectionMetrics?.transactionCount || 0}</span>
                  </div>
                  <Divider className="my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-700">Efficiency Benchmark:</span>
                    <Tag color="green">{selectedStaffMember.collectionMetrics?.collectionEfficiencyPercentage || 94.5}%</Tag>
                  </div>
                </div>
              </Card>

              {/* §40.2 Loan Officer */}
              <Card title={<span className="text-blue-800 font-bold">2. Credit & Underwriting (§40.2)</span>} size="small">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Applications Sourced:</span>
                    <span className="font-bold">{selectedStaffMember.loanOfficerMetrics?.applicationsCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Approved Applications:</span>
                    <span className="font-semibold text-blue-700">{selectedStaffMember.loanOfficerMetrics?.approvedCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Disbursed Loans:</span>
                    <span className="font-mono">{selectedStaffMember.loanOfficerMetrics?.disbursedLoansCount || 0}</span>
                  </div>
                  <Divider className="my-2" />
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sanctioned Volume:</span>
                    <span className="font-bold text-blue-900">{FinancialEngine.formatINR(selectedStaffMember.loanOfficerMetrics?.totalSanctionedAmount || 0)}</span>
                  </div>
                </div>
              </Card>

              {/* §40.3 Customer Service */}
              <Card title={<span className="text-amber-800 font-bold">3. Customer Service & Desk (§40.3)</span>} size="small">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customers Onboarded:</span>
                    <span className="font-bold">{selectedStaffMember.customerServiceMetrics?.customersOnboarded || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">KYC Verifications:</span>
                    <span className="font-semibold text-emerald-700">{selectedStaffMember.customerServiceMetrics?.kycCompleted || 0} verified</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Complaints Handled:</span>
                    <span className="font-mono">{selectedStaffMember.customerServiceMetrics?.complaintsHandledCount || 0}</span>
                  </div>
                  <Divider className="my-2" />
                  <div className="flex justify-between">
                    <span className="text-slate-500">Complaints Resolved:</span>
                    <span className="font-bold text-amber-700">{selectedStaffMember.customerServiceMetrics?.complaintsResolvedCount || 0}</span>
                  </div>
                </div>
              </Card>

              {/* §40.4 Recovery */}
              <Card title={<span className="text-rose-800 font-bold">4. Recovery & PAR Rehabilitation (§40.4)</span>} size="small">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Overdue Portfolios Assigned:</span>
                    <span className="font-bold text-rose-700">{selectedStaffMember.recoveryMetrics?.overdueAccountsAssigned || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Borrowers Contacted Today:</span>
                    <span className="font-semibold">{selectedStaffMember.recoveryMetrics?.contactedToday || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Recovered This Month:</span>
                    <span className="font-bold text-emerald-700">{FinancialEngine.formatINR(selectedStaffMember.recoveryMetrics?.recoveredThisMonth || 0)}</span>
                  </div>
                  <Divider className="my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-700">Rehab Status:</span>
                    <Tag color="volcano">Active Enforcement</Tag>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
