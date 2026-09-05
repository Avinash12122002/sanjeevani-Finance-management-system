'use client';

import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Card,
  Row,
  Col,
  Tabs,
  Descriptions,
  Drawer,
  Popconfirm,
  message,
  Divider,
  Upload,
  Alert,
  Radio,
  Tooltip,
} from 'antd';
import {
  BookOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  MinusCircleOutlined,
  EyeOutlined,
  UploadOutlined,
  DownloadOutlined,
  SyncOutlined,
  CheckSquareOutlined,
  WarningOutlined,
  AuditOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import { fetchApi, postApi, patchApi, deleteApi } from '@/lib/api-client';
import { FinancialEngine } from '@sanjeevani/financial-engine';
import { IChartOfAccount, IJournalEntry } from '@sanjeevani/shared-types';

export default function AccountingPage() {
  const [coa, setCoa] = useState<IChartOfAccount[]>([]);
  const [journals, setJournals] = useState<IJournalEntry[]>([]);
  const [trialBalance, setTrialBalance] = useState<any>(null);
  const [pl, setPl] = useState<any>(null);
  const [bs, setBs] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [journalModalVisible, setJournalModalVisible] = useState(false);

  // View Details Drawer State
  const [viewCoa, setViewCoa] = useState<IChartOfAccount | null>(null);
  const [viewCoaDrawerOpen, setViewCoaDrawerOpen] = useState(false);
  const [viewJournal, setViewJournal] = useState<IJournalEntry | null>(null);
  const [viewJournalDrawerOpen, setViewJournalDrawerOpen] = useState(false);

  const handleOpenViewCoa = (acc: IChartOfAccount) => {
    setViewCoa(acc);
    setViewCoaDrawerOpen(true);
  };

  const handleOpenViewJournal = (entry: IJournalEntry) => {
    setViewJournal(entry);
    setViewJournalDrawerOpen(true);
  };

  // COA Modals
  const [addAccountModal, setAddAccountModal] = useState(false);
  const [editAccountModal, setEditAccountModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<IChartOfAccount | null>(null);
  const [accountForm] = Form.useForm();
  const [editAccountForm] = Form.useForm();

  // New Journal Lines State
  const [journalLines, setJournalLines] = useState<
    { ledgerAccountId: string; debitAmount: number; creditAmount: number }[]
  >([
    { ledgerAccountId: '', debitAmount: 0, creditAmount: 0 },
    { ledgerAccountId: '', debitAmount: 0, creditAmount: 0 },
  ]);
  const [journalDescription, setJournalDescription] = useState('Operating Adjustment');

  // Bank Statement Reconciliation State (§28, §29)
  const [reconData, setReconData] = useState<any>(null);
  const [reconLoading, setReconLoading] = useState(false);
  const [statementRows, setStatementRows] = useState<any[]>([]);
  const [reconFilter, setReconFilter] = useState<'ALL' | 'MATCHED' | 'UNRECORDED' | 'UNPRESENTED'>('ALL');
  const [adjustmentModal, setAdjustmentModal] = useState(false);
  const [selectedRowForAdjustment, setSelectedRowForAdjustment] = useState<any>(null);
  const [adjustmentSubmitting, setAdjustmentSubmitting] = useState(false);
  const [adjustmentForm] = Form.useForm();

  const handleRunReconciliation = async (rowsToReconcile: any[]) => {
    setReconLoading(true);
    try {
      const res = await postApi('/accounting/bank-reconciliation/match', {
        statementRows: rowsToReconcile,
      });
      if (res.success && res.data) {
        setReconData(res.data);
        message.success(`Reconciliation complete: ${res.data.matchedCount} matched, ${res.data.unrecordedCount} unrecorded.`);
      } else {
        message.error(res.message || 'Failed to match bank statement');
      }
    } catch {
      message.error('An error occurred during reconciliation matching.');
    } finally {
      setReconLoading(false);
    }
  };

  const handleLoadSampleStatement = () => {
    const today = new Date().toISOString().split('T')[0];
    const sample = [
      { date: today, narration: 'NEFT/RTGS Deposit Collection Batch', referenceNo: 'TXN-001', deposit: 25000, withdrawal: 0, balance: 525000 },
      { date: today, narration: 'Cheque Clearance Vendor Payout', referenceNo: 'CHQ-88910', deposit: 0, withdrawal: 12000, balance: 513000 },
      { date: today, narration: 'SMS Alert Charges Q3', referenceNo: 'BNK-CHG-99', deposit: 0, withdrawal: 118, balance: 512882 },
      { date: today, narration: 'Quarterly Savings Bank Interest', referenceNo: 'INT-CREDIT', deposit: 3450, withdrawal: 0, balance: 516332 },
    ];
    setStatementRows(sample);
    handleRunReconciliation(sample);
  };

  const handleStatementCsvChange = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length <= 1) {
        message.warning('CSV file is empty or contains only header row.');
        return;
      }
      const parsed = lines.slice(1).map((line, idx) => {
        const regex = /(?:^|,)(\"(?:[^\"]+|\"\")*\"|[^,]*)/g;
        const cols: string[] = [];
        let match;
        while ((match = regex.exec(line)) !== null) {
          let val = match[1];
          if (val.startsWith(',')) val = val.substring(1);
          val = val.trim().replace(/^["']|["']$/g, '').replace(/""/g, '"');
          cols.push(val);
          if (regex.lastIndex === line.length) break;
        }
        return {
          id: `STMT-${idx + 1}`,
          date: cols[0] || new Date().toISOString().split('T')[0],
          narration: cols[1] || 'Bank Entry',
          referenceNo: cols[2] || '',
          withdrawal: Number(cols[3]) || 0,
          deposit: Number(cols[4]) || 0,
          balance: Number(cols[5]) || 0,
        };
      });
      setStatementRows(parsed);
      handleRunReconciliation(parsed);
    };
    reader.readAsText(file);
    return false;
  };

  const handleOpenAdjustment = (row: any) => {
    setSelectedRowForAdjustment(row);
    adjustmentForm.setFieldsValue({
      type: row.deposit > 0 ? 'INTEREST_CREDIT' : 'BANK_CHARGE',
      amount: row.amount || row.deposit || row.withdrawal,
      narration: row.narration || '',
      referenceNo: row.referenceNo || '',
    });
    setAdjustmentModal(true);
  };

  const handleCreateAdjustment = async (values: any) => {
    setAdjustmentSubmitting(true);
    try {
      const res = await postApi('/accounting/bank-reconciliation/create-adjustment', values);
      if (res.success) {
        message.success(res.message || 'Adjustment booked into ledger!');
        setAdjustmentModal(false);
        loadAccountingData();
        if (statementRows.length > 0) {
          handleRunReconciliation(statementRows);
        }
      } else {
        message.error(res.message || 'Failed to book adjustment');
      }
    } catch {
      message.error('Adjustment error');
    } finally {
      setAdjustmentSubmitting(false);
    }
  };

  useEffect(() => {
    loadAccountingData();
  }, []);

  const loadAccountingData = async () => {
    setLoading(true);
    const [cRes, jRes, tbRes, plRes, bsRes] = await Promise.all([
      fetchApi('/accounting/chart-of-accounts'),
      fetchApi('/accounting/journals'),
      fetchApi('/accounting/trial-balance'),
      fetchApi('/accounting/profit-loss'),
      fetchApi('/accounting/balance-sheet'),
    ]);

    if (cRes.success && cRes.data) setCoa(cRes.data);
    if (jRes.success && jRes.data) setJournals(jRes.data);
    if (tbRes.success && tbRes.data) setTrialBalance(tbRes.data);
    if (plRes.success && plRes.data) setPl(plRes.data);
    if (bsRes.success && bsRes.data) setBs(bsRes.data);
    setLoading(false);
  };

  const [submitting, setSubmitting] = useState(false);

  const balanceCheck = FinancialEngine.validateJournalBalance(journalLines);

  const handlePostJournal = async () => {
    if (!balanceCheck.isValid) {
      message.error(`Unbalanced Journal: Total Debits (₹ ${balanceCheck.totalDebit}) do not match Credits (₹ ${balanceCheck.totalCredit})`);
      return;
    }

    setSubmitting(true);
    const res = await postApi('/accounting/journals', {
      description: journalDescription,
      lines: journalLines,
    });
    setSubmitting(false);

    if (res.success) {
      message.success(`Journal Entry ${res.data?.journalNumber || 'Posted'} posted successfully!`);
      setJournalModalVisible(false);
      setJournalLines([
        { ledgerAccountId: '', debitAmount: 0, creditAmount: 0 },
        { ledgerAccountId: '', debitAmount: 0, creditAmount: 0 },
      ]);
      setJournalDescription('Operating Adjustment');
      loadAccountingData();
    } else {
      message.error(res.message || res.error || 'Failed to post journal');
    }
  };

  const handleCreateAccount = async (values: any) => {
    setSubmitting(true);
    const res = await postApi('/accounting/chart-of-accounts', values);
    setSubmitting(false);
    if (res.success) {
      message.success(`Ledger Account [${values.accountName}] created!`);
      setAddAccountModal(false);
      accountForm.resetFields();
      loadAccountingData();
    } else {
      message.error(res.message || 'Failed to create ledger account');
    }
  };

  const handleOpenEditAccount = (record: IChartOfAccount) => {
    setSelectedAccount(record);
    editAccountForm.setFieldsValue({
      accountName: record.accountName,
      accountType: record.accountType,
      description: record.description,
    });
    setEditAccountModal(true);
  };

  const handleUpdateAccount = async (values: any) => {
    if (!selectedAccount) return;
    setSubmitting(true);
    const res = await patchApi(`/accounting/chart-of-accounts/${selectedAccount.id}`, values);
    setSubmitting(false);
    if (res.success) {
      message.success(`Ledger Account [${values.accountName}] updated!`);
      setEditAccountModal(false);
      editAccountForm.resetFields();
      loadAccountingData();
    } else {
      message.error(res.message || 'Failed to update ledger account');
    }
  };

  const handleDeleteAccount = async (id: string, name: string) => {
    const res = await deleteApi(`/accounting/chart-of-accounts/${id}`);
    if (res.success) {
      message.success(`Ledger Account [${name}] removed.`);
      loadAccountingData();
    } else {
      message.error(res.message || 'Failed to remove ledger account');
    }
  };

  const handleDeleteJournal = async (id: string, num: string) => {
    const res = await deleteApi(`/accounting/journals/${id}`);
    if (res.success) {
      message.success(`Journal entry [${num}] deleted successfully.`);
      loadAccountingData();
    } else {
      message.error(res.message || 'Failed to delete journal entry.');
    }
  };

  const coaColumns = [
    {
      title: 'Account Code',
      dataIndex: 'accountCode',
      key: 'code',
      render: (c: string) => <span className="font-mono font-bold text-slate-800">{c}</span>,
    },
    {
      title: 'Ledger Account Name',
      dataIndex: 'accountName',
      key: 'name',
      ellipsis: true,
      render: (name: string) => <span className="font-semibold">{name}</span>,
    },
    {
      title: 'Classification',
      dataIndex: 'accountType',
      key: 'type',
      render: (t: string) => (
        <Tag color={t === 'ASSET' ? 'blue' : t === 'LIABILITY' ? 'purple' : t === 'INCOME' ? 'green' : 'orange'}>
          {t}
        </Tag>
      ),
    },
    {
      title: 'Current Balance',
      dataIndex: 'currentBalance',
      key: 'bal',
      render: (b: number) => <span className="font-bold text-slate-900">{FinancialEngine.formatINR(b)}</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, r: IChartOfAccount) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleOpenViewCoa(r)}>
            View
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEditAccount(r)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete Ledger Account"
            description={`Delete account ${r.accountName} (${r.accountCode})?`}
            onConfirm={() => handleDeleteAccount(r.id, r.accountName)}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const journalColumns = [
    {
      title: 'Journal Number',
      dataIndex: 'journalNumber',
      key: 'num',
      render: (n: string) => <span className="font-mono font-bold text-indigo-700">{n}</span>,
    },
    {
      title: 'Date',
      dataIndex: 'businessDate',
      key: 'date',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'desc',
      ellipsis: true,
    },
    {
      title: 'Debit Total',
      dataIndex: 'totalDebit',
      key: 'dr',
      render: (dr: number) => <span className="font-semibold text-emerald-700">{FinancialEngine.formatINR(dr)}</span>,
    },
    {
      title: 'Credit Total',
      dataIndex: 'totalCredit',
      key: 'cr',
      render: (cr: number) => <span className="font-semibold text-emerald-700">{FinancialEngine.formatINR(cr)}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color="success">{s}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, r: IJournalEntry) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleOpenViewJournal(r)}>
            View
          </Button>
          <Popconfirm
            title="Void / Delete Journal Entry"
            description={`Are you sure you want to remove Journal ${r.journalNumber}?`}
            onConfirm={() => handleDeleteJournal(r.id, r.journalNumber)}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Void
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOutlined className="text-emerald-600 text-lg" />
            <h1 className="text-2xl font-bold text-slate-900 m-0">Double-Entry Accounting & Financial Statements</h1>
          </div>
          <p className="text-slate-500 text-sm m-0">
            Chart of accounts, balanced journal postings, automated double-entry verification, P&L and Balance Sheet (SRS §38–§41, BR-016).
          </p>
        </div>
        <Space>
          <Button icon={<SyncOutlined spin={loading} />} onClick={loadAccountingData}>
            Refresh
          </Button>
          <Button icon={<PlusOutlined />} onClick={() => setAddAccountModal(true)}>
            + Add Ledger Account
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setJournalModalVisible(true)}
            style={{ background: '#059669', borderColor: '#059669', height: 40 }}
          >
            Create Journal Entry
          </Button>
        </Space>
      </div>

      <Tabs
        defaultActiveKey="coa"
        items={[
          {
            key: 'coa',
            label: `Chart of Accounts (${coa.length})`,
            children: (
              <Card
                className="glass-card"
                extra={
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddAccountModal(true)} style={{ background: '#059669', borderColor: '#059669' }}>
                    Add Ledger Account
                  </Button>
                }
              >
                <Table
                  size="small"
                  columns={coaColumns}
                  dataSource={coa}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  onRow={(record) => ({
                    onClick: (e: any) => {
                      if (e.target.closest('button') || e.target.closest('.ant-popconfirm') || e.target.closest('.ant-popover')) return;
                      handleOpenViewCoa(record);
                    },
                    className: 'cursor-pointer hover:bg-emerald-50/50 transition-colors',
                  })}
                />
              </Card>
            ),
          },
          {
            key: 'journals',
            label: `Posted Journals (${journals.length})`,
            children: (
              <Card className="glass-card">
                <Table
                  size="small"
                  columns={journalColumns}
                  dataSource={journals}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  onRow={(record) => ({
                    onClick: (e: any) => {
                      if (e.target.closest('button') || e.target.closest('.ant-popconfirm') || e.target.closest('.ant-popover')) return;
                      handleOpenViewJournal(record);
                    },
                    className: 'cursor-pointer hover:bg-emerald-50/50 transition-colors',
                  })}
                />
              </Card>
            ),
          },
          {
            key: 'trial-balance',
            label: 'Trial Balance',
            children: trialBalance && (
              <Card className="glass-card">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <span className="font-bold text-slate-800 text-base">Trial Balance Summary</span>
                    <Tag
                      icon={trialBalance.isBalanced ? <CheckSquareOutlined /> : <WarningOutlined />}
                      color={trialBalance.isBalanced ? "success" : "error"}
                      className="ml-2 font-mono"
                    >
                      {trialBalance.isBalanced ? 'BALANCED: SUM(DR) === SUM(CR)' : 'UNBALANCED'}
                    </Tag>
                  </div>
                  <div className="font-mono text-xs text-slate-500">Date: {trialBalance.date}</div>
                </div>

                <Table
                  size="small"
                  pagination={false}
                  dataSource={trialBalance.items}
                  rowKey="code"
                  scroll={{ x: 750 }}
                  columns={[
                    { title: 'Code', dataIndex: 'code', key: 'code', render: (c) => <span className="font-mono">{c}</span> },
                    { title: 'Account Name', dataIndex: 'name', key: 'name' },
                    { title: 'Type', dataIndex: 'type', key: 'type' },
                    {
                      title: (
                        <Tooltip title="Total Debit balance (Asset / Expense additions)">
                          <span>Debit Amount (₹)</span>
                        </Tooltip>
                      ),
                      dataIndex: 'debit',
                      key: 'dr',
                      render: (d) => (d > 0 ? FinancialEngine.formatINR(d) : '-'),
                    },
                    {
                      title: (
                        <Tooltip title="Total Credit balance (Liability / Equity / Income additions)">
                          <span>Credit Amount (₹)</span>
                        </Tooltip>
                      ),
                      dataIndex: 'credit',
                      key: 'cr',
                      render: (c) => (c > 0 ? FinancialEngine.formatINR(c) : '-'),
                    },
                  ]}
                  summary={() => (
                    <Table.Summary.Row className="bg-slate-50 font-bold">
                      <Table.Summary.Cell index={0} colSpan={3}>
                        TOTAL TRIAL BALANCE (BALANCED)
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3} className="text-emerald-700">
                        {FinancialEngine.formatINR(trialBalance.totalDebit)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4} className="text-emerald-700">
                        {FinancialEngine.formatINR(trialBalance.totalCredit)}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              </Card>
            ),
          },
          {
            key: 'pl',
            label: 'Profit & Loss Statement',
            children: pl && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="glass-card" title={<span className="font-bold text-emerald-800">Operational Income Breakdown</span>}>
                  <div className="space-y-3">
                    {pl.incomeBreakdown?.map((acc: any) => (
                      <div key={acc.id} className="flex justify-between py-2 border-b border-slate-100 text-sm">
                        <span>{acc.accountName}</span>
                        <span className="font-bold text-emerald-700">{FinancialEngine.formatINR(acc.currentBalance)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-3 font-bold text-base text-emerald-900">
                      <span>TOTAL GROSS REVENUE</span>
                      <span>{FinancialEngine.formatINR(pl.totalIncome)}</span>
                    </div>
                  </div>
                </Card>

                <Card className="glass-card" title={<span className="font-bold text-red-800">Operating Expenses Breakdown</span>}>
                  <div className="space-y-3">
                    {pl.expenseBreakdown?.map((acc: any) => (
                      <div key={acc.id} className="flex justify-between py-2 border-b border-slate-100 text-sm">
                        <span>{acc.accountName}</span>
                        <span className="font-semibold text-red-600">{FinancialEngine.formatINR(acc.currentBalance)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-3 font-bold text-base text-red-900 border-t border-slate-200">
                      <span>TOTAL EXPENSES</span>
                      <span>{FinancialEngine.formatINR(pl.totalExpense)}</span>
                    </div>

                    <div className="p-4 bg-emerald-50 rounded-xl mt-4 border border-emerald-200 flex justify-between items-center">
                      <span className="font-bold text-emerald-900">NET OPERATIONAL PROFIT</span>
                      <span className="text-xl font-black text-emerald-700">{FinancialEngine.formatINR(pl.netProfit)}</span>
                    </div>
                  </div>
                </Card>
              </div>
            ),
          },
          {
            key: 'bs',
            label: 'Balance Sheet',
            children: bs && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="glass-card" title={<span className="font-bold text-blue-800">Total Assets</span>}>
                  <div className="space-y-3">
                    {bs.assets?.map((a: any) => (
                      <div key={a.id} className="flex justify-between py-2 border-b border-slate-100 text-sm">
                        <span>{a.accountName}</span>
                        <span className="font-semibold text-slate-800">{FinancialEngine.formatINR(a.currentBalance)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-4 font-bold text-base text-blue-900 border-t border-slate-200">
                      <span>TOTAL ASSETS</span>
                      <span>{FinancialEngine.formatINR(bs.totalAssets)}</span>
                    </div>
                  </div>
                </Card>

                <Card className="glass-card" title={<span className="font-bold text-purple-800">Liabilities & Member Equity</span>}>
                  <div className="space-y-3">
                    <div className="font-bold text-xs text-slate-500 uppercase">Liabilities</div>
                    {bs.liabilities?.map((l: any) => (
                      <div key={l.id} className="flex justify-between py-1 border-b border-slate-100 text-sm">
                        <span>{l.accountName}</span>
                        <span className="font-semibold text-slate-800">{FinancialEngine.formatINR(l.currentBalance)}</span>
                      </div>
                    ))}

                    <Divider className="my-3" />
                    <div className="font-bold text-xs text-slate-500 uppercase mt-4">Equity & Reserves</div>
                    {bs.equity?.map((e: any) => (
                      <div key={e.id} className="flex justify-between py-1 border-b border-slate-100 text-sm">
                        <span>{e.accountName}</span>
                        <span className="font-semibold text-slate-800">{FinancialEngine.formatINR(e.currentBalance)}</span>
                      </div>
                    ))}

                    <div className="flex justify-between pt-4 font-bold text-base text-purple-900 border-t border-slate-200">
                      <span>TOTAL LIABILITIES & EQUITY</span>
                      <span>{FinancialEngine.formatINR(bs.totalLiabilitiesAndEquity)}</span>
                    </div>
                  </div>
                </Card>
              </div>
            ),
          },
          {
            key: 'bank-reconciliation',
            label: `Bank Reconciliation (§28)`,
            children: (
              <div className="space-y-6">
                {/* Summary Metrics Cards */}
                <Row gutter={16}>
                  <Col span={6}>
                    <Card className="glass-card" size="small">
                      <div className="text-xs text-slate-500 font-semibold uppercase">Software Bank Balance (COA-1020)</div>
                      <div className="text-2xl font-bold font-mono text-emerald-800 mt-1">
                        {FinancialEngine.formatINR(
                          reconData ? reconData.softwareBalance : (coa.find((c) => c.accountCode === '1020' || c.id === 'COA-1020')?.currentBalance || 0),
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">Delhi Head Office Commercial Account</div>
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card className="glass-card" size="small">
                      <div className="text-xs text-slate-500 font-semibold uppercase">Bank Statement Balance</div>
                      <div className="text-2xl font-bold font-mono text-blue-900 mt-1">
                        {FinancialEngine.formatINR(
                          reconData
                            ? reconData.statementEndingBalance
                            : statementRows.length > 0
                            ? statementRows[statementRows.length - 1].balance
                            : (coa.find((c) => c.accountCode === '1020' || c.id === 'COA-1020')?.currentBalance || 0),
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">As per uploaded bank statement</div>
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card className="glass-card" size="small">
                      <div className="text-xs text-slate-500 font-semibold uppercase">Reconciliation Variance</div>
                      <div className={`text-2xl font-bold font-mono mt-1 ${reconData && reconData.variance !== 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {FinancialEngine.formatINR(reconData ? reconData.variance : 0)}
                      </div>
                      <div className="text-[11px] mt-1">
                        {reconData && reconData.variance === 0 ? (
                          <Tag color="success" className="text-[10px]">100% BALANCED</Tag>
                        ) : (
                          <Tag color="warning" className="text-[10px]">UNRECONCILED DIFFERENCE</Tag>
                        )}
                      </div>
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card className="glass-card" size="small">
                      <div className="text-xs text-slate-500 font-semibold uppercase">Matching Engine Status</div>
                      <div className="text-lg font-bold text-slate-800 mt-1">
                        {reconData ? `${reconData.matchedCount} Cleared` : 'Awaiting Statement'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {reconData ? `${reconData.unrecordedCount} Missing in Books • ${reconData.unpresentedCount} Pending in Bank` : 'Upload bank CSV to begin'}
                      </div>
                    </Card>
                  </Col>
                </Row>

                {/* Reconciliation Action Bar */}
                <Card className="glass-card">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Upload
                        accept=".csv,text/csv"
                        beforeUpload={handleStatementCsvChange}
                        showUploadList={false}
                      >
                        <Button icon={<UploadOutlined />} type="primary" style={{ background: '#059669', borderColor: '#059669' }}>
                          Upload Bank Statement (.CSV)
                        </Button>
                      </Upload>
                      <Button
                        icon={<FileExcelOutlined />}
                        onClick={handleLoadSampleStatement}
                      >
                        Load Sample Bank Statement
                      </Button>
                      <Button
                        icon={<DownloadOutlined />}
                        onClick={() => {
                          const csv = 'date,narration,referenceNo,withdrawal,deposit,balance\n2026-09-01,Opening Balance,,0,0,500000\n2026-09-02,Cash Deposit Branch,TXN-001,0,25000,525000\n2026-09-03,Cheque Clearing,CHQ-1001,15000,0,510000\n2026-09-04,Bank Charges SMS Alert,BNK-001,118,0,509882\n';
                          const blob = new Blob([csv], { type: 'text/csv' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'bank_statement_template.csv';
                          a.click();
                        }}
                      >
                        Template (.CSV)
                      </Button>
                    </div>

                    <Radio.Group
                      value={reconFilter}
                      onChange={(e) => setReconFilter(e.target.value)}
                      size="middle"
                    >
                      <Radio.Button value="ALL">All Lines</Radio.Button>
                      <Radio.Button value="MATCHED">
                        Matched ({reconData?.matchedCount || 0})
                      </Radio.Button>
                      <Radio.Button value="UNRECORDED">
                        Missing in Books ({reconData?.unrecordedCount || 0})
                      </Radio.Button>
                      <Radio.Button value="UNPRESENTED">
                        Pending in Bank ({reconData?.unpresentedCount || 0})
                      </Radio.Button>
                    </Radio.Group>
                  </div>
                </Card>

                {/* Reconciliation Comparison Table */}
                <Card className="glass-card" title="Bank Statement vs Software Ledger Matching Grid (SRS §28, §29)">
                  {reconLoading ? (
                    <div className="py-12 text-center text-slate-400 text-sm">Matching statement against software general ledger...</div>
                  ) : !reconData && statementRows.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-3">
                      <AuditOutlined className="text-4xl text-slate-400" />
                      <div className="text-slate-700 font-semibold text-sm">No Bank Statement Loaded for Reconciliation</div>
                      <p className="text-slate-400 text-xs max-w-md mx-auto">
                        Upload your bank account statement CSV or click &quot;Load Sample Bank Statement&quot; to test the automated reconciliation matching engine.
                      </p>
                      <Button type="primary" icon={<FileExcelOutlined />} onClick={handleLoadSampleStatement} style={{ background: '#059669', borderColor: '#059669' }}>
                        Load Sample Bank Statement
                      </Button>
                    </div>
                  ) : (
                    <Table
                      size="small"
                      rowKey={(r: any) => r.id || `${r.date}-${r.narration}-${r.amount}`}
                      pagination={{ pageSize: 10 }}
                      dataSource={
                        reconFilter === 'ALL'
                          ? [...(reconData?.statementRows || []), ...(reconData?.unpresentedSoftwareTxns || [])]
                          : reconFilter === 'MATCHED'
                          ? (reconData?.statementRows || []).filter((r: any) => r.status === 'MATCHED')
                          : reconFilter === 'UNRECORDED'
                          ? (reconData?.statementRows || []).filter((r: any) => r.status === 'UNRECORDED_IN_BOOKS')
                          : (reconData?.unpresentedSoftwareTxns || [])
                      }
                      columns={[
                        {
                          title: 'Date',
                          dataIndex: 'date',
                          key: 'date',
                          width: 110,
                          render: (d: string) => <span className="font-mono text-xs">{d}</span>,
                        },
                        {
                          title: 'Particulars / Description',
                          dataIndex: 'narration',
                          key: 'narration',
                          render: (desc: string, r: any) => (
                            <div>
                              <div className="font-medium text-slate-800">{desc}</div>
                              {r.referenceNo && <span className="font-mono text-[11px] text-slate-400">Ref: {r.referenceNo}</span>}
                            </div>
                          ),
                        },
                        {
                          title: 'Withdrawal / DR',
                          dataIndex: 'withdrawal',
                          key: 'withdrawal',
                          render: (w: number, r: any) => {
                            const val = w || (r.type === 'WITHDRAWAL' ? r.amount : 0);
                            return val > 0 ? <span className="font-bold text-rose-600">{FinancialEngine.formatINR(val)}</span> : '-';
                          },
                        },
                        {
                          title: 'Deposit / CR',
                          dataIndex: 'deposit',
                          key: 'deposit',
                          render: (d: number, r: any) => {
                            const val = d || (r.type === 'DEPOSIT' ? r.amount : 0);
                            return val > 0 ? <span className="font-bold text-emerald-700">{FinancialEngine.formatINR(val)}</span> : '-';
                          },
                        },
                        {
                          title: 'Running Balance',
                          dataIndex: 'balance',
                          key: 'balance',
                          render: (b: number) => (b !== undefined && b > 0 ? <span className="font-mono">{FinancialEngine.formatINR(b)}</span> : '-'),
                        },
                        {
                          title: 'Reconciliation Status',
                          dataIndex: 'status',
                          key: 'status',
                          render: (st: string) => {
                            if (st === 'MATCHED') return <Tag color="success">MATCHED & CLEARED</Tag>;
                            if (st === 'UNRECORDED_IN_BOOKS') return <Tag color="warning">UNRECORDED IN BOOKS</Tag>;
                            return <Tag color="processing">PENDING IN BANK</Tag>;
                          },
                        },
                        {
                          title: 'Action',
                          key: 'action',
                          render: (_: any, r: any) => {
                            if (r.status === 'UNRECORDED_IN_BOOKS') {
                              return (
                                <Button
                                  size="small"
                                  type="primary"
                                  ghost
                                  onClick={() => handleOpenAdjustment(r)}
                                >
                                  Book into Ledger
                                </Button>
                              );
                            }
                            return <span className="text-xs text-slate-400">-</span>;
                          },
                        },
                      ]}
                    />
                  )}
                </Card>
              </div>
            ),
          },
        ]}
      />

      {/* NEW JOURNAL ENTRY MODAL WITH REAL-TIME BALANCE VALIDATOR (BR-016) */}
      <Modal
        title="Create Balanced Double-Entry Journal Entry"
        open={journalModalVisible}
        onCancel={() => {
          setJournalModalVisible(false);
          setJournalLines([
            { ledgerAccountId: '', debitAmount: 0, creditAmount: 0 },
            { ledgerAccountId: '', debitAmount: 0, creditAmount: 0 },
          ]);
          setJournalDescription('Operating Adjustment');
        }}
        footer={null}
        width={720}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700">Journal Description / Narration</label>
            <Input
              value={journalDescription}
              onChange={(e) => setJournalDescription(e.target.value)}
              placeholder="e.g. Monthly Bank Charges Adjustment"
              className="mt-1"
            />
          </div>

          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Debit & Credit Line Items</div>

          {journalLines.map((line, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex-1">
                <label className="text-[11px] text-slate-500">Ledger Account</label>
                <Select
                  value={line.ledgerAccountId}
                  onChange={(val) => {
                    const newLines = [...journalLines];
                    newLines[idx].ledgerAccountId = val;
                    setJournalLines(newLines);
                  }}
                  className="w-full mt-1"
                  options={coa.map((c) => ({
                    value: c.id,
                    label: `${c.accountCode} - ${c.accountName} (${c.accountType})`,
                  }))}
                />
              </div>
              <div className="w-32">
                <label className="text-[11px] text-slate-500">Debit (₹)</label>
                <InputNumber
                  min={0}
                  value={line.debitAmount}
                  onChange={(val) => {
                    const newLines = [...journalLines];
                    newLines[idx].debitAmount = val || 0;
                    setJournalLines(newLines);
                  }}
                  className="w-full mt-1"
                />
              </div>
              <div className="w-32">
                <label className="text-[11px] text-slate-500">Credit (₹)</label>
                <InputNumber
                  min={0}
                  value={line.creditAmount}
                  onChange={(val) => {
                    const newLines = [...journalLines];
                    newLines[idx].creditAmount = val || 0;
                    setJournalLines(newLines);
                  }}
                  className="w-full mt-1"
                />
              </div>
              {journalLines.length > 2 && (
                <Button
                  danger
                  type="text"
                  icon={<MinusCircleOutlined />}
                  onClick={() => {
                    setJournalLines(journalLines.filter((_, i) => i !== idx));
                  }}
                  className="mt-5"
                />
              )}
            </div>
          ))}

          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            onClick={() => {
              setJournalLines([
                ...journalLines,
                { ledgerAccountId: coa[0]?.id || 'COA-1010', debitAmount: 0, creditAmount: 0 },
              ]);
            }}
          >
            Add Journal Line Item
          </Button>

          {/* Validation & Balance Status Pill */}
          <div
            className={`p-3 rounded-lg flex items-center justify-between text-sm ${
              balanceCheck.isValid ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {balanceCheck.isValid ? <CheckCircleOutlined className="text-emerald-600" /> : <MinusCircleOutlined className="text-red-600" />}
              <span className="font-semibold">{balanceCheck.isValid ? 'Balanced Double-Entry Journal' : 'Unbalanced Journal'}</span>
            </div>
            <div className="font-mono text-xs">
              Debits: ₹ {balanceCheck.totalDebit} | Credits: ₹ {balanceCheck.totalCredit}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button onClick={() => setJournalModalVisible(false)}>Cancel</Button>
            <Button
              type="primary"
              disabled={!balanceCheck.isValid}
              loading={submitting}
              onClick={handlePostJournal}
              style={{ background: balanceCheck.isValid ? '#059669' : undefined, borderColor: balanceCheck.isValid ? '#059669' : undefined }}
            >
              Post to General Ledger
            </Button>
          </div>
        </div>
      </Modal>

      {/* ADD LEDGER ACCOUNT MODAL */}
      <Modal
        title="Add New Chart of Accounts Ledger"
        open={addAccountModal}
        onCancel={() => { setAddAccountModal(false); accountForm.resetFields(); }}
        footer={null}
        width={550}
      >
        <Form form={accountForm} layout="vertical" onFinish={handleCreateAccount} className="mt-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Account Code" name="accountCode" extra="Auto-generated if left blank">
                <Input placeholder="e.g. COA-1040" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Account Classification"
                name="accountType"
                rules={[{ required: true, message: 'Select classification' }]}
                initialValue="ASSET"
              >
                <Select
                  options={[
                    { value: 'ASSET', label: 'Asset (Bank, Vault, Receivable)' },
                    { value: 'LIABILITY', label: 'Liability (Deposits, Payables)' },
                    { value: 'EQUITY', label: 'Equity & Reserves (Capital)' },
                    { value: 'INCOME', label: 'Income & Revenue (Interest, Fees)' },
                    { value: 'EXPENSE', label: 'Expense (Salaries, Rent, Operations)' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="Ledger Account Name"
                name="accountName"
                rules={[{ required: true, message: 'Enter account name' }]}
              >
                <Input placeholder="e.g. Bank of Baroda Current A/c" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Description" name="description">
                <Input placeholder="Description or purpose of this ledger" />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button onClick={() => { setAddAccountModal(false); accountForm.resetFields(); }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ background: '#059669', borderColor: '#059669' }}>
              Create Account
            </Button>
          </div>
        </Form>
      </Modal>

      {/* EDIT LEDGER ACCOUNT MODAL */}
      <Modal
        title={`Edit Ledger Account: ${selectedAccount?.accountName}`}
        open={editAccountModal}
        onCancel={() => { setEditAccountModal(false); editAccountForm.resetFields(); setSelectedAccount(null); }}
        footer={null}
        width={550}
      >
        <Form form={editAccountForm} layout="vertical" onFinish={handleUpdateAccount} className="mt-4">
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Ledger Account Name"
                name="accountName"
                rules={[{ required: true, message: 'Enter account name' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Account Classification"
                name="accountType"
                rules={[{ required: true, message: 'Select classification' }]}
              >
                <Select
                  options={[
                    { value: 'ASSET', label: 'Asset' },
                    { value: 'LIABILITY', label: 'Liability' },
                    { value: 'EQUITY', label: 'Equity & Reserves' },
                    { value: 'INCOME', label: 'Income & Revenue' },
                    { value: 'EXPENSE', label: 'Expense' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Description" name="description">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button onClick={() => { setEditAccountModal(false); editAccountForm.resetFields(); setSelectedAccount(null); }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ background: '#059669', borderColor: '#059669' }}>
              Save Changes
            </Button>
          </div>
        </Form>
      </Modal>

      {/* LEDGER ACCOUNT DETAILS DRAWER */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <EyeOutlined className="text-emerald-600 text-lg" />
            <span className="font-bold text-slate-800 text-base">
              Ledger Account: {viewCoa?.accountName} ({viewCoa?.accountCode})
            </span>
          </div>
        }
        open={viewCoaDrawerOpen}
        onClose={() => {
          setViewCoaDrawerOpen(false);
          setViewCoa(null);
        }}
        width={560}
      >
        {viewCoa && (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-emerald-700 font-semibold uppercase">Current Balance</div>
                <div className="text-2xl font-bold font-mono text-emerald-950">
                  {FinancialEngine.formatINR(viewCoa.currentBalance)}
                </div>
              </div>
              <Tag color={viewCoa.accountType === 'ASSET' ? 'blue' : viewCoa.accountType === 'LIABILITY' ? 'purple' : viewCoa.accountType === 'INCOME' ? 'green' : 'orange'} className="px-3 py-1 text-sm font-semibold">
                {viewCoa.accountType}
              </Tag>
            </div>

            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="Account Code">
                <span className="font-mono font-bold text-emerald-700">{viewCoa.accountCode}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Account Name">{viewCoa.accountName}</Descriptions.Item>
              <Descriptions.Item label="Classification">{viewCoa.accountType}</Descriptions.Item>
              <Descriptions.Item label="Description">{viewCoa.description || 'General Ledger Account'}</Descriptions.Item>
              <Descriptions.Item label="Normal Balance Rule">
                {viewCoa.accountType === 'ASSET' || viewCoa.accountType === 'EXPENSE' ? 'Debit Normal (DR + / CR -)' : 'Credit Normal (CR + / DR -)'}
              </Descriptions.Item>
              <Descriptions.Item label="System ID">
                <span className="font-mono text-xs">{viewCoa.id}</span>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Drawer>

      {/* JOURNAL ENTRY DETAILS DRAWER */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <EyeOutlined className="text-emerald-600 text-lg" />
            <span className="font-bold text-slate-800 text-base">
              Journal Entry Breakdown: {viewJournal?.journalNumber}
            </span>
          </div>
        }
        open={viewJournalDrawerOpen}
        onClose={() => {
          setViewJournalDrawerOpen(false);
          setViewJournal(null);
        }}
        width={650}
      >
        {viewJournal && (
          <div className="space-y-6">
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-indigo-700 font-semibold uppercase">Total Balanced Volume</div>
                <div className="text-2xl font-bold font-mono text-indigo-950">
                  {FinancialEngine.formatINR(viewJournal.totalDebit)}
                </div>
              </div>
              <Tag color="success" className="px-3 py-1 text-sm font-semibold">
                POSTED & BALANCED
              </Tag>
            </div>

            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Journal Number" span={2}>
                <span className="font-mono font-bold text-indigo-700">{viewJournal.journalNumber}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Posting Date">{viewJournal.businessDate}</Descriptions.Item>
              <Descriptions.Item label="Source Module">{(viewJournal as any).sourceModule || 'GENERAL_JOURNAL'}</Descriptions.Item>
              <Descriptions.Item label="Description" span={2}>{viewJournal.description}</Descriptions.Item>
            </Descriptions>

            <div>
              <div className="font-bold text-slate-800 mb-2">Double-Entry Ledger Lines</div>
              <Table
                size="small"
                pagination={false}
                dataSource={viewJournal.lines}
                rowKey={(record, index) => (record as any).id || (record as any).ledgerAccountId || `line-${index}`}
                columns={[
                  { title: 'Ledger Account', dataIndex: 'ledgerAccountId', key: 'acc', render: (id) => <span className="font-mono font-semibold">{id}</span> },
                  { title: 'Debit (DR)', dataIndex: 'debitAmount', key: 'dr', render: (dr) => dr > 0 ? <span className="font-bold text-emerald-700">{FinancialEngine.formatINR(dr)}</span> : '-' },
                  { title: 'Credit (CR)', dataIndex: 'creditAmount', key: 'cr', render: (cr) => cr > 0 ? <span className="font-bold text-blue-700">{FinancialEngine.formatINR(cr)}</span> : '-' },
                ]}
              />
            </div>
          </div>
        )}
      </Drawer>

      {/* BOOK BANK ADJUSTMENT MODAL (§28) */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <AuditOutlined className="text-emerald-600" />
            <span>Book Unrecorded Bank Entry into General Ledger</span>
          </div>
        }
        open={adjustmentModal}
        onCancel={() => {
          setAdjustmentModal(false);
          setSelectedRowForAdjustment(null);
          adjustmentForm.resetFields();
        }}
        footer={null}
        width={560}
      >
        <Form
          form={adjustmentForm}
          layout="vertical"
          onFinish={handleCreateAdjustment}
          className="pt-2"
        >
          <Alert
            type="info"
            showIcon
            message="Direct Ledger Post to Bank COA-1020"
            description="Booking this entry will immediately create offsetting double-entry journals in the Chart of Accounts and update the live bank ledger balance."
            className="mb-4"
          />

          <Form.Item
            name="type"
            label="Adjustment Nature"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { label: 'Bank Fee / SMS / Service Charges (Expense DR)', value: 'BANK_CHARGE' },
                { label: 'Quarterly Savings Interest Credit (Income CR)', value: 'INTEREST_CREDIT' },
                { label: 'Direct Member Deposit / RTGS (Liability CR)', value: 'DIRECT_DEPOSIT' },
                { label: 'Direct Vendor Debit / Standing Instruction', value: 'DIRECT_DEBIT' },
              ]}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Amount (₹)"
                rules={[{ required: true, message: 'Amount is required' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  precision={2}
                  placeholder="e.g. 118"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="referenceNo" label="Bank Ref / UTR / Cheque No">
                <Input placeholder="e.g. UTR12345678" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="narration"
            label="Entry Particulars / Ledger Narration"
            rules={[{ required: true, message: 'Narration required' }]}
          >
            <Input placeholder="e.g. Bank SMS Alert Charges for Q3" />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button onClick={() => setAdjustmentModal(false)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={adjustmentSubmitting}
              style={{ background: '#059669', borderColor: '#059669' }}
            >
              Post Adjustment to Ledger
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
