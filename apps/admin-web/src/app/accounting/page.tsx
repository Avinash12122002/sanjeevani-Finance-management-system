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
  Popconfirm,
  message,
  Divider,
} from 'antd';
import {
  BookOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  MinusCircleOutlined,
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
    { ledgerAccountId: 'COA-1010', debitAmount: 10000, creditAmount: 0 },
    { ledgerAccountId: 'COA-4010', debitAmount: 0, creditAmount: 10000 },
  ]);
  const [journalDescription, setJournalDescription] = useState('Operating Adjustment');

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

  const balanceCheck = FinancialEngine.validateJournalBalance(journalLines);

  const handlePostJournal = async () => {
    if (!balanceCheck.isValid) {
      message.error(`Unbalanced Journal: Total Debits (₹ ${balanceCheck.totalDebit}) do not match Credits (₹ ${balanceCheck.totalCredit})`);
      return;
    }

    const res = await postApi('/accounting/journals', {
      description: journalDescription,
      lines: journalLines,
    });

    if (res.success) {
      message.success(`Journal Entry ${res.data?.journalNumber || 'Posted'} posted successfully!`);
      setJournalModalVisible(false);
      loadAccountingData();
    } else {
      message.error(res.message || res.error || 'Failed to post journal');
    }
  };

  const handleCreateAccount = async (values: any) => {
    const res = await postApi('/accounting/chart-of-accounts', values);
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
    const res = await patchApi(`/accounting/chart-of-accounts/${selectedAccount.id}`, values);
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
        <Space>
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
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 m-0">Double-Entry Accounting & Financial Statements</h1>
          <p className="text-slate-500 text-sm mt-1 m-0">
            Chart of accounts, balanced journal postings, automated double-entry verification, P&L and Balance Sheet (SRS §38–§41, BR-016).
          </p>
        </div>
        <Space>
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
                <Table columns={coaColumns} dataSource={coa} rowKey="id" loading={loading} scroll={{ x: 800 }} />
              </Card>
            ),
          },
          {
            key: 'journals',
            label: `Posted Journals (${journals.length})`,
            children: (
              <Card className="glass-card">
                <Table columns={journalColumns} dataSource={journals} rowKey="id" loading={loading} scroll={{ x: 800 }} />
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
                    <Tag color="success" className="ml-2 font-mono">
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
                      title: 'Debit Amount (₹)',
                      dataIndex: 'debit',
                      key: 'dr',
                      render: (d) => (d > 0 ? FinancialEngine.formatINR(d) : '-'),
                    },
                    {
                      title: 'Credit Amount (₹)',
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
        ]}
      />

      {/* NEW JOURNAL ENTRY MODAL WITH REAL-TIME BALANCE VALIDATOR (BR-016) */}
      <Modal
        title="Create Balanced Double-Entry Journal Entry"
        open={journalModalVisible}
        onCancel={() => setJournalModalVisible(false)}
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
        onCancel={() => setAddAccountModal(false)}
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
            <Button onClick={() => setAddAccountModal(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ background: '#059669', borderColor: '#059669' }}>
              Create Account
            </Button>
          </div>
        </Form>
      </Modal>

      {/* EDIT LEDGER ACCOUNT MODAL */}
      <Modal
        title={`Edit Ledger Account: ${selectedAccount?.accountName}`}
        open={editAccountModal}
        onCancel={() => setEditAccountModal(false)}
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
            <Button onClick={() => setEditAccountModal(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ background: '#059669', borderColor: '#059669' }}>
              Save Changes
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
