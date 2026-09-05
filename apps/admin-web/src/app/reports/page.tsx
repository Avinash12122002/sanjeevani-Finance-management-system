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
  message,
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
} from '@ant-design/icons';
import { fetchApi } from '@/lib/api-client';
import { FinancialEngine } from '@sanjeevani/financial-engine';

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('daily_collection');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [reportPeriod, setReportPeriod] = useState('all');

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

  const exportCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [keys.join(','), ...data.map((row) => keys.map((k) => JSON.stringify(row[k] || '')).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const q = searchQuery.toLowerCase().trim();
  const filteredTransactions = transactions.filter((t) =>
    !q || t.transactionNumber?.toLowerCase().includes(q) || t.customerName?.toLowerCase().includes(q) || t.paymentMode?.toLowerCase().includes(q)
  );
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
            25+ mandatory operational and financial statements, audit trail exports, and PAR delinquency analysis (SRS §68, §106).
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
          <Col xs={24} sm={14} md={10}>
            <Input
              placeholder="Search / filter statement records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              prefix={<PieChartOutlined className="text-slate-400 mr-1" />}
            />
          </Col>
          <Col xs={24} sm={10} md={6}>
            <Select
              value={reportPeriod}
              onChange={setReportPeriod}
              style={{ width: '100%' }}
              options={[
                { value: 'all', label: 'All Dates (Historical)' },
                { value: 'today', label: 'Today Only' },
                { value: 'month', label: 'Current Month' },
              ]}
            />
          </Col>
          <Col xs={24} md={8} className="text-left md:text-right">
            <span className="text-xs text-slate-500">
              Showing <strong className="text-slate-800">{getActiveData().length}</strong> matching records
            </span>
          </Col>
        </Row>

        <Tabs
          defaultActiveKey="daily_collection"
          onChange={(k) => setActiveReport(k)}
          items={[
            {
              key: 'daily_collection',
              label: 'Daily Collection Statement (§68)',
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
              key: 'loan_portfolio',
              label: (
                <span className="flex items-center gap-1.5">
                  <PieChartOutlined />
                  <span>Loan Outstanding Portfolio (§68)</span>
                </span>
              ),
              children: (
                <Table
                  size="small"
                  dataSource={filteredLoans}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  columns={[
                    { title: 'Loan ID', dataIndex: 'loanNumber', key: 'num', render: (l) => <span className="font-mono font-bold text-blue-700">{l}</span> },
                    { title: 'Member', dataIndex: 'customerName', key: 'name', ellipsis: true },
                    { title: 'Principal Disbursed', dataIndex: 'principal', key: 'p', render: (p) => FinancialEngine.formatINR(p) },
                    { title: 'Outstanding Balance', dataIndex: 'outstandingPrincipal', key: 'out', render: (o) => <span className="font-bold text-red-600">{FinancialEngine.formatINR(o)}</span> },
                    { title: 'Monthly EMI', dataIndex: 'emiAmount', key: 'emi', render: (e) => FinancialEngine.formatINR(e) },
                    { title: 'Overdue PAR', dataIndex: 'overdueAmount', key: 'ov', render: (ov) => <Tag color={ov > 0 ? 'error' : 'success'}>{FinancialEngine.formatINR(ov || 0)}</Tag> },
                    { title: 'Bucket', dataIndex: 'recoveryBucket', key: 'bkt', render: (b) => <Tag>{b}</Tag> },
                  ]}
                />
              ),
            },
            {
              key: 'audit_logs',
              label: 'Indelible Audit Trail (§50, BR-011)',
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
              label: 'Login & Security Audit (§51, BR-012)',
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
                  render: (l) => l > 0 ? <span className="font-bold text-blue-700">{FinancialEngine.formatINR(l)}</span> : '-',
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
                  render: () => <div className="w-6 h-6 border-2 border-slate-300 rounded flex items-center justify-center mx-auto text-slate-200 hover:border-emerald-400 transition-colors cursor-pointer"><CheckSquareOutlined style={{ fontSize: 14 }} /></div>,
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
                  render: () => <div className="w-6 h-6 border-2 border-slate-300 rounded flex items-center justify-center mx-auto text-slate-200 hover:border-emerald-400 transition-colors cursor-pointer"><CheckSquareOutlined style={{ fontSize: 14 }} /></div>,
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
    </div>
  );
}
