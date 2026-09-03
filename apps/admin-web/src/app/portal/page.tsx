'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Tabs,
  Table,
  Tag,
  Button,
  Statistic,
  Modal,
  Form,
  Input,
  Select,
  message,
  Descriptions,
  Spin,
  Empty,
  Badge,
  Alert,
} from 'antd';
import {
  UserOutlined,
  WalletOutlined,
  BankOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  LogoutOutlined,
  CalendarOutlined,
  CustomerServiceOutlined,
  PrinterOutlined,
  LockOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { FinancialEngine } from '@/shared/financial-engine';

export default function CustomerPortalPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [complaintModal, setComplaintModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [receiptModal, setReceiptModal] = useState(false);
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [complaintForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const router = useRouter();

  useEffect(() => {
    loadCustomerData();
  }, []);

  const loadCustomerData = async () => {
    const token = localStorage.getItem('sfms_customer_token');
    if (!token) {
      router.replace('/portal/login');
      return;
    }

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiBase}/portal/me`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setData(json.data);
      } else {
        message.error('Session expired. Please sign in again.');
        localStorage.removeItem('sfms_customer_token');
        router.replace('/portal/login');
      }
    } catch (err: any) {
      message.error('Unable to fetch account details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sfms_customer_token');
    localStorage.removeItem('sfms_customer');
    message.success('Signed out successfully');
    router.replace('/portal/login');
  };

  const handleFileComplaint = async (values: any) => {
    setSubmittingComplaint(true);
    const token = localStorage.getItem('sfms_customer_token');
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiBase}/portal/complaint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        message.success(json.message || 'Support ticket created successfully!');
        setComplaintModal(false);
        complaintForm.resetFields();
        loadCustomerData();
      } else {
        message.error(json.message || 'Failed to submit complaint.');
      }
    } catch (err: any) {
      message.error(err.message || 'Network error');
    } finally {
      setSubmittingComplaint(false);
    }
  };

  const handleChangePassword = async (values: any) => {
    const token = localStorage.getItem('sfms_customer_token');
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiBase}/portal/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        message.success(json.message || 'Password updated successfully!');
        setPasswordModal(false);
        passwordForm.resetFields();
      } else {
        message.error(json.message || 'Failed to change password.');
      }
    } catch (err: any) {
      message.error(err.message || 'Network error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Spin size="large" />
        <p className="mt-4 text-emerald-400 font-semibold text-sm">Loading your Sanjeevani account...</p>
      </div>
    );
  }

  if (!data) return null;

  const { customer, summary, accounts, loans, passbook, receipts, complaints, nominees } = data;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Top Mobile-Friendly Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white shadow-lg sticky top-0 z-30 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-300 flex items-center justify-center text-slate-900 font-black text-xl shadow-md">
              S
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-300">SANJEEVANI FINANCE</div>
              <div className="font-extrabold text-sm sm:text-base leading-tight text-white flex items-center gap-2">
                <span>{customer.fullName}</span>
                <Tag color="success" className="text-[10px] m-0 border-none font-mono">
                  {customer.customerNumber}
                </Tag>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              icon={<CustomerServiceOutlined />}
              size="small"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              onClick={() => setComplaintModal(true)}
            >
              Support
            </Button>
            <Button
              icon={<LogoutOutlined />}
              size="small"
              danger
              type="primary"
              onClick={handleLogout}
            >
              Exit
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-3 sm:p-6 space-y-5">
        {/* Profile Card & KYC Status Alert */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-2xl shrink-0">
              {customer.firstName ? customer.firstName[0] : 'M'}
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">{customer.fullName}</div>
              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                <span>📱 {customer.mobile}</span>
                <span>•</span>
                <span>📍 {customer.city || customer.branchName || 'Agra Branch'}</span>
                <span>•</span>
                <span>Joined: {customer.joiningDate || '2026'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Tag color={customer.kycStatus === 'VERIFIED' ? 'success' : 'warning'} className="px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1">
              <SafetyCertificateOutlined />
              KYC {customer.kycStatus || 'VERIFIED'}
            </Tag>
            <Button size="small" icon={<LockOutlined />} onClick={() => setPasswordModal(true)}>
              Change PIN
            </Button>
          </div>
        </div>

        {/* Next EMI Due Alert (If Active Loan Exists) */}
        {summary.nextEmiAmount > 0 && (
          <Alert
            message={
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ClockCircleOutlined className="text-amber-600 text-lg" />
                  <span className="font-bold text-slate-800">
                    Next EMI Payment Due: {FinancialEngine.formatINR(summary.nextEmiAmount)}
                  </span>
                  {summary.nextDueDate && (
                    <span className="text-xs text-slate-500 font-medium">on or before {summary.nextDueDate}</span>
                  )}
                </div>
                <div className="text-xs text-slate-600">
                  Pay via field collector or deposit at your nearest Sanjeevani branch.
                </div>
              </div>
            }
            type="warning"
            showIcon={false}
            className="rounded-2xl border-amber-200 bg-amber-50/80 shadow-sm p-4"
          />
        )}

        {/* 4 Primary Portfolio Metric Cards */}
        <Row gutter={[12, 12]}>
          <Col xs={12} sm={6}>
            <Card className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Savings Balance</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
                {FinancialEngine.formatINR(summary.totalSavings)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <WalletOutlined /> {accounts.savings.length} Savings Account(s)
              </div>
            </Card>
          </Col>

          <Col xs={12} sm={6}>
            <Card className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">RD Deposits</div>
              <div className="text-xl sm:text-2xl font-black text-teal-700 mt-1">
                {FinancialEngine.formatINR(summary.totalRdDeposited)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <CalendarOutlined /> {accounts.rd.length} Monthly RD(s)
              </div>
            </Card>
          </Col>

          <Col xs={12} sm={6}>
            <Card className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fixed Deposits</div>
              <div className="text-xl sm:text-2xl font-black text-indigo-700 mt-1">
                {FinancialEngine.formatINR(summary.totalFdPrincipal)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <BankOutlined /> {accounts.fd.length} Certificate(s)
              </div>
            </Card>
          </Col>

          <Col xs={12} sm={6}>
            <Card className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loan Outstanding</div>
              <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1">
                {FinancialEngine.formatINR(summary.totalLoanOutstanding)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <FileTextOutlined /> {loans.length} Active Loan(s)
              </div>
            </Card>
          </Col>
        </Row>

        {/* Main Tabbed Customer Sections */}
        <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden p-1 sm:p-4">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'overview',
                label: 'Passbook & History',
                children: (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800 m-0">Recent Transactions & Passbook Entries</h3>
                      <Tag color="blue">{passbook.length} Entries</Tag>
                    </div>

                    <Table
                      dataSource={passbook}
                      rowKey="id"
                      size="small"
                      pagination={{ pageSize: 8 }}
                      columns={[
                        {
                          title: 'Date',
                          dataIndex: 'transactionDate',
                          key: 'dt',
                          render: (d: any, r: any) => (
                            <div className="text-xs">
                              <div className="font-semibold text-slate-800">{d ? new Date(d).toLocaleDateString('en-IN') : '-'}</div>
                              <div className="text-slate-400 font-mono text-[10px]">{r.transactionNumber}</div>
                            </div>
                          ),
                        },
                        {
                          title: 'Particulars',
                          dataIndex: 'remarks',
                          key: 'rem',
                          render: (t: any, r: any) => (
                            <div className="text-xs">
                              <div className="font-medium text-slate-800">{r.transactionType || 'Account Activity'}</div>
                              <div className="text-slate-500 text-[11px]">{t || r.paymentMode}</div>
                            </div>
                          ),
                        },
                        {
                          title: 'Type',
                          dataIndex: 'transactionType',
                          key: 'tp',
                          render: (t) => {
                            const isCredit = t?.includes('DEPOSIT') || t?.includes('RECOVERY') || t?.includes('REPAYMENT');
                            return (
                              <Tag color={isCredit ? 'green' : 'red'} className="text-xs font-semibold">
                                {isCredit ? '+ CR' : '- DR'}
                              </Tag>
                            );
                          },
                        },
                        {
                          title: 'Amount',
                          dataIndex: 'amount',
                          key: 'amt',
                          render: (a) => (
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">
                              {FinancialEngine.formatINR(a || 0)}
                            </span>
                          ),
                        },
                      ]}
                    />
                  </div>
                ),
              },
              {
                key: 'rd',
                label: `My RD Accounts (${accounts.rd.length})`,
                children: (
                  <div className="space-y-4">
                    {accounts.rd.length === 0 ? (
                      <Empty description="No active Recurring Deposit accounts" />
                    ) : (
                      accounts.rd.map((rd: any) => (
                        <Card key={rd.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                            <div>
                              <span className="font-mono font-bold text-emerald-700 text-base">{rd.accountNumber}</span>
                              <div className="text-xs text-slate-500 mt-0.5">Recurring Deposit • Monthly Sanchay</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-400">Total Saved Till Date</div>
                              <div className="text-lg font-black text-emerald-700">
                                {FinancialEngine.formatINR(rd.currentBalance || 0)}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                            <div>
                              <div className="text-slate-400">Monthly Installment</div>
                              <div className="font-bold text-slate-800">{FinancialEngine.formatINR(rd.monthlyDeposit || 1000)}</div>
                            </div>
                            <div>
                              <div className="text-slate-400">Interest Rate</div>
                              <div className="font-bold text-indigo-700">{rd.interestRate || 8.5}% p.a.</div>
                            </div>
                            <div>
                              <div className="text-slate-400">Opening Date</div>
                              <div className="font-bold text-slate-800">{rd.openingDate || '-'}</div>
                            </div>
                            <div>
                              <div className="text-slate-400">Status</div>
                              <Tag color="success">{rd.status || 'ACTIVE'}</Tag>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                ),
              },
              {
                key: 'fd',
                label: `Fixed Deposits (${accounts.fd.length})`,
                children: (
                  <div className="space-y-4">
                    {accounts.fd.length === 0 ? (
                      <Empty description="No active Term / Fixed Deposit certificates" />
                    ) : (
                      accounts.fd.map((fd: any) => (
                        <Card key={fd.id} className="rounded-xl border border-indigo-100 bg-indigo-50/20 p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
                            <div>
                              <div className="text-xs font-mono font-bold text-indigo-700">CERTIFICATE #{fd.accountNumber}</div>
                              <div className="text-base font-bold text-slate-900 mt-0.5">Sanjeevani Term Deposit Plan</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-400">Principal Certificate Value</div>
                              <div className="text-xl font-black text-indigo-700">
                                {FinancialEngine.formatINR(fd.principalAmount || 0)}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                            <div>
                              <div className="text-slate-400">Annual Return</div>
                              <div className="font-bold text-indigo-700">{fd.interestRate || 9.0}% p.a.</div>
                            </div>
                            <div>
                              <div className="text-slate-400">Tenure</div>
                              <div className="font-bold text-slate-800">{fd.tenureMonths || 12} Months</div>
                            </div>
                            <div>
                              <div className="text-slate-400">Maturity Date</div>
                              <div className="font-bold text-emerald-700">{fd.maturityDate || '-'}</div>
                            </div>
                            <div>
                              <div className="text-slate-400">Maturity Value</div>
                              <div className="font-bold text-emerald-700">{FinancialEngine.formatINR(fd.maturityAmount || 0)}</div>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                ),
              },
              {
                key: 'loans',
                label: `My Loans (${loans.length})`,
                children: (
                  <div className="space-y-4">
                    {loans.length === 0 ? (
                      <Empty description="No active loans" />
                    ) : (
                      loans.map((loan: any) => (
                        <Card key={loan.id} className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                            <div>
                              <span className="font-mono font-bold text-amber-700 text-base">{loan.loanNumber}</span>
                              <div className="text-xs text-slate-500 mt-0.5">Sanctioned Loan Facility</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-400">Outstanding Balance</div>
                              <div className="text-xl font-black text-amber-700">
                                {FinancialEngine.formatINR(loan.outstandingPrincipal || 0)}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                            <div>
                              <div className="text-slate-400">Sanctioned Amount</div>
                              <div className="font-bold text-slate-800">{FinancialEngine.formatINR(loan.principal || 0)}</div>
                            </div>
                            <div>
                              <div className="text-slate-400">Monthly EMI</div>
                              <div className="font-bold text-slate-800">{FinancialEngine.formatINR(loan.emiAmount || 0)}</div>
                            </div>
                            <div>
                              <div className="text-slate-400">Interest Rate</div>
                              <div className="font-bold text-slate-800">{loan.annualInterestRate || 12}% p.a.</div>
                            </div>
                            <div>
                              <div className="text-slate-400">Status</div>
                              <Tag color={loan.daysPastDue > 0 ? 'volcano' : 'green'}>
                                {loan.daysPastDue > 0 ? `${loan.daysPastDue} DPD OVERDUE` : 'REGULAR / GREEN'}
                              </Tag>
                            </div>
                          </div>

                          {loan.installments && loan.installments.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-slate-200">
                              <div className="text-xs font-bold text-slate-700 mb-2">Upcoming & Recent EMI Installments</div>
                              <Table
                                dataSource={loan.installments}
                                rowKey="id"
                                size="small"
                                pagination={{ pageSize: 5 }}
                                columns={[
                                  { title: '#', dataIndex: 'installmentNumber', key: 'num', width: 50 },
                                  { title: 'Due Date', dataIndex: 'dueDate', key: 'dd' },
                                  { title: 'EMI Due', dataIndex: 'totalDue', key: 'td', render: (v) => FinancialEngine.formatINR(v || 0) },
                                  {
                                    title: 'Status',
                                    dataIndex: 'status',
                                    key: 'st',
                                    render: (st) => (
                                      <Tag color={st === 'PAID' ? 'green' : st === 'OVERDUE' ? 'red' : 'orange'}>
                                        {st}
                                      </Tag>
                                    ),
                                  },
                                ]}
                              />
                            </div>
                          )}
                        </Card>
                      ))
                    )}
                  </div>
                ),
              },
              {
                key: 'receipts',
                label: `Digital Receipts (${receipts.length})`,
                children: (
                  <div className="space-y-4">
                    <Table
                      dataSource={receipts}
                      rowKey="id"
                      size="small"
                      pagination={{ pageSize: 8 }}
                      columns={[
                        {
                          title: 'Receipt #',
                          dataIndex: 'receiptNumber',
                          key: 'rn',
                          render: (n) => <span className="font-mono font-bold text-emerald-700">{n}</span>,
                        },
                        {
                          title: 'Date',
                          dataIndex: 'generatedAt',
                          key: 'dt',
                          render: (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '-'),
                        },
                        { title: 'Payment Mode', dataIndex: 'paymentMode', key: 'pm' },
                        {
                          title: 'Amount',
                          dataIndex: 'amount',
                          key: 'amt',
                          render: (a) => <span className="font-bold text-slate-800">{FinancialEngine.formatINR(a || 0)}</span>,
                        },
                        {
                          title: 'Action',
                          key: 'act',
                          render: (_, r) => (
                            <Button
                              size="small"
                              icon={<PrinterOutlined />}
                              onClick={() => {
                                setSelectedReceipt(r);
                                setReceiptModal(true);
                              }}
                            >
                              View Receipt
                            </Button>
                          ),
                        },
                      ]}
                    />
                  </div>
                ),
              },
              {
                key: 'support',
                label: `Support & Grievance (${complaints.length})`,
                children: (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800 m-0">My Grievance & Support Tickets</h3>
                      <Button
                        type="primary"
                        icon={<CustomerServiceOutlined />}
                        size="small"
                        onClick={() => setComplaintModal(true)}
                        className="bg-emerald-700"
                      >
                        File New Complaint
                      </Button>
                    </div>

                    <Table
                      dataSource={complaints}
                      rowKey="id"
                      size="small"
                      pagination={{ pageSize: 5 }}
                      columns={[
                        {
                          title: 'Ticket #',
                          dataIndex: 'complaintNumber',
                          key: 'num',
                          render: (n) => <span className="font-mono font-bold text-emerald-700">{n}</span>,
                        },
                        { title: 'Category', dataIndex: 'category', key: 'cat' },
                        { title: 'Details', dataIndex: 'description', key: 'desc', ellipsis: true },
                        {
                          title: 'Status',
                          dataIndex: 'status',
                          key: 'st',
                          render: (s) => (
                            <Tag color={s === 'CLOSED' || s === 'RESOLVED' ? 'green' : 'orange'}>
                              {s}
                            </Tag>
                          ),
                        },
                      ]}
                    />
                  </div>
                ),
              },
              {
                key: 'profile',
                label: 'Profile & Nominee',
                children: (
                  <div className="space-y-4">
                    <Descriptions title="Member Account Details" bordered column={{ xs: 1, sm: 2 }} size="small">
                      <Descriptions.Item label="Customer ID">{customer.customerNumber}</Descriptions.Item>
                      <Descriptions.Item label="Full Name">{customer.fullName}</Descriptions.Item>
                      <Descriptions.Item label="Mobile Number">{customer.mobile}</Descriptions.Item>
                      <Descriptions.Item label="Registered Address">{customer.address || '-'}</Descriptions.Item>
                      <Descriptions.Item label="City & State">{customer.city ? `${customer.city}, ${customer.state || ''}` : '-'}</Descriptions.Item>
                      <Descriptions.Item label="KYC Status">
                        <Tag color="success">{customer.kycStatus || 'VERIFIED'}</Tag>
                      </Descriptions.Item>
                    </Descriptions>

                    {nominees && nominees.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Registered Nominee Information</h4>
                        {nominees.map((n: any) => (
                          <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                            <div><span className="text-slate-400">Name:</span> <span className="font-bold text-slate-800">{n.name}</span></div>
                            <div><span className="text-slate-400">Relationship:</span> {n.relationship}</div>
                            <div><span className="text-slate-400">Share Percentage:</span> {n.percentage}%</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </div>

      {/* File Complaint Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800">
            <CustomerServiceOutlined className="text-emerald-700" />
            <span>File Customer Grievance / Complaint</span>
          </div>
        }
        open={complaintModal}
        onCancel={() => setComplaintModal(false)}
        footer={null}
      >
        <Form form={complaintForm} layout="vertical" onFinish={handleFileComplaint} className="mt-4">
          <Form.Item
            name="category"
            label="Grievance Category"
            initialValue="ACCOUNT_SERVICES"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="ACCOUNT_SERVICES">Passbook / Account Issue</Select.Option>
              <Select.Option value="COLLECTION_RECEIPT">Receipt or Payment Mismatch</Select.Option>
              <Select.Option value="LOAN_SERVICES">Loan Application or EMI Discrepancy</Select.Option>
              <Select.Option value="MATURITY_PAYOUT">Maturity Claim Delay</Select.Option>
              <Select.Option value="STAFF_BEHAVIOR">Staff Conduct</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Complaint Details"
            rules={[{ required: true, message: 'Please explain your concern' }]}
          >
            <Input.TextArea rows={4} placeholder="Describe the issue in detail..." />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            loading={submittingComplaint}
            block
            className="bg-emerald-700 hover:bg-emerald-600 rounded-xl h-10 font-bold"
          >
            Submit Grievance Ticket
          </Button>
        </Form>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800">
            <LockOutlined className="text-emerald-700" />
            <span>Update Account Password / PIN</span>
          </div>
        }
        open={passwordModal}
        onCancel={() => setPasswordModal(false)}
        footer={null}
      >
        <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword} className="mt-4">
          <Form.Item
            name="newPassword"
            label="New Password / PIN"
            rules={[{ required: true, min: 4, message: 'Password must be at least 4 characters' }]}
          >
            <Input.Password placeholder="Enter new password" />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
            className="bg-emerald-700 hover:bg-emerald-600 rounded-xl h-10 font-bold"
          >
            Save New Password
          </Button>
        </Form>
      </Modal>

      {/* Official Receipt Printable Modal */}
      <Modal
        open={receiptModal}
        onCancel={() => setReceiptModal(false)}
        footer={[
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>
            Print Receipt
          </Button>,
          <Button key="close" onClick={() => setReceiptModal(false)}>
            Close
          </Button>,
        ]}
      >
        {selectedReceipt && (
          <div className="p-4 border border-dashed border-slate-300 rounded-xl text-center space-y-3">
            <div className="font-extrabold text-emerald-800 tracking-wider text-base">SANJEEVANI FINANCE</div>
            <div className="text-xs text-slate-500">Official Digital Payment Receipt</div>
            <div className="text-xs font-mono font-bold text-slate-700">{selectedReceipt.receiptNumber}</div>
            <div className="text-2xl font-black text-slate-900 py-2">
              {FinancialEngine.formatINR(selectedReceipt.amount || 0)}
            </div>
            <div className="text-xs text-slate-600 text-left space-y-1 pt-2 border-t border-slate-200">
              <div><span className="text-slate-400">Member:</span> {customer.fullName} ({customer.customerNumber})</div>
              <div><span className="text-slate-400">Date:</span> {new Date(selectedReceipt.generatedAt).toLocaleString('en-IN')}</div>
              <div><span className="text-slate-400">Payment Mode:</span> {selectedReceipt.paymentMode || 'Cash'}</div>
              <div><span className="text-slate-400">Status:</span> <Tag color="green">CONFIRMED</Tag></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
