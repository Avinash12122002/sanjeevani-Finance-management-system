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
} from 'antd';
import {
  PieChartOutlined,
  DownloadOutlined,
  PrinterOutlined,
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

  const getActiveData = () => {
    switch (activeReport) {
      case 'daily_collection':
        return transactions;
      case 'loan_portfolio':
      case 'loans':
        return loans;
      case 'audit_logs':
      case 'audit':
        return auditLogs;
      case 'login_audit':
        return auditLogs.filter((a) => a.eventType === 'USER_LOGIN' || a.eventType === 'FAILED_LOGIN_ATTEMPT');
      case 'customer_master':
      case 'customers':
        return customers;
      default:
        return transactions;
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
                  dataSource={transactions}
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
              label: 'Loan Outstanding Portfolio (§68)',
              children: (
                <Table
                  size="small"
                  dataSource={loans}
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
                  dataSource={auditLogs}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  columns={[
                    { title: 'Log ID', dataIndex: 'id', key: 'id', render: (id) => <span className="font-mono text-xs text-slate-500">{id}</span> },
                    { title: 'Event Type', dataIndex: 'eventType', key: 'evt', render: (e) => <Tag color="geekblue">{e}</Tag> },
                    { title: 'Entity', key: 'ent', render: (_, r) => `${r.entityType} #${r.entityId}`, ellipsis: true },
                    { title: 'Staff Operator', dataIndex: 'userName', key: 'user', ellipsis: true },
                    { title: 'Reason / Remarks', dataIndex: 'reason', key: 'reason', ellipsis: true },
                    { title: 'Timestamp', dataIndex: 'timestamp', key: 'ts', render: (t) => new Date(t).toLocaleString('en-IN') },
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
                    { title: 'Timestamp', dataIndex: 'timestamp', key: 'ts', render: (t) => new Date(t).toLocaleString('en-IN') },
                  ]}
                />
              ),
            },
            {
              key: 'customer_master',
              label: 'Customer Master Directory (§68)',
              children: (
                <Table
                  size="small"
                  dataSource={customers}
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
    </div>
  );
}
