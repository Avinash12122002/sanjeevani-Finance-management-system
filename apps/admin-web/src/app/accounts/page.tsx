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
  Alert,
  Radio,
  Tooltip,
} from 'antd';
import {
  BankOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  PrinterOutlined,
  StopOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { fetchApi, postApi, patchApi, deleteApi } from '@/lib/api-client';
import { FinancialEngine } from '@sanjeevani/financial-engine';
import { IAccount, ProductType } from '@sanjeevani/shared-types';
import DepositCertificateModal from '@/components/print/DepositCertificateModal';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<IAccount[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [openModalVisible, setOpenModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<IAccount | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // View Details Drawer State
  const [viewAccount, setViewAccount] = useState<IAccount | null>(null);
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);

  // Printable Certificate State (§8)
  const [certModalVisible, setCertModalVisible] = useState(false);
  const [selectedCertAccount, setSelectedCertAccount] = useState<any>(null);
  const [selectedCertCustomer, setSelectedCertCustomer] = useState<any>(null);

  // Premature Closure State (§8)
  const [prematureModalVisible, setPrematureModalVisible] = useState(false);
  const [selectedPrematureAccount, setSelectedPrematureAccount] = useState<any>(null);
  const [prematureCalc, setPrematureCalc] = useState<any>(null);
  const [prematureLoading, setPrematureLoading] = useState(false);
  const [prematureExecuting, setPrematureExecuting] = useState(false);
  const [prematurePenaltyOverride, setPrematurePenaltyOverride] = useState<number>(2.0);
  const [prematurePaymentMode, setPrematurePaymentMode] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [prematureRemarks, setPrematureRemarks] = useState<string>('');

  const handleOpenCertificate = (account: IAccount) => {
    const customer = customers.find((c) => c.id === account.customerId || c.customerNumber === account.customerNumber);
    setSelectedCertAccount(account);
    setSelectedCertCustomer(customer);
    setCertModalVisible(true);
  };

  const handleOpenPrematureModal = async (account: IAccount) => {
    setSelectedPrematureAccount(account);
    setPrematurePenaltyOverride(2.0);
    setPrematurePaymentMode('CASH');
    setPrematureRemarks('');
    setPrematureModalVisible(true);
    setPrematureLoading(true);
    try {
      const res = await postApi(`/accounts/${account.id}/calculate-premature`, { penaltyRateOverride: 2.0 });
      if (res.success && res.data) {
        setPrematureCalc(res.data);
      }
    } catch {
      message.error('Failed to calculate premature breakdown');
    } finally {
      setPrematureLoading(false);
    }
  };

  const handleRecalculatePremature = async (override: number) => {
    if (!selectedPrematureAccount) return;
    setPrematurePenaltyOverride(override);
    setPrematureLoading(true);
    try {
      const res = await postApi(`/accounts/${selectedPrematureAccount.id}/calculate-premature`, { penaltyRateOverride: override });
      if (res.success && res.data) {
        setPrematureCalc(res.data);
      }
    } catch {
      message.error('Failed to recalculate premature payout');
    } finally {
      setPrematureLoading(false);
    }
  };

  const handleExecutePremature = async () => {
    if (!selectedPrematureAccount) return;
    setPrematureExecuting(true);
    try {
      const res = await postApi(`/accounts/${selectedPrematureAccount.id}/execute-premature`, {
        penaltyRateOverride: prematurePenaltyOverride,
        paymentMode: prematurePaymentMode,
        remarks: prematureRemarks,
      });
      if (res.success) {
        message.success(res.message || 'Account closed prematurely and payout executed successfully.');
        setPrematureModalVisible(false);
        if (viewDrawerOpen) setViewDrawerOpen(false);
        loadData();
      } else {
        message.error(res.message || 'Failed to execute premature closure');
      }
    } catch {
      message.error('Error executing premature closure');
    } finally {
      setPrematureExecuting(false);
    }
  };

  const handleOpenViewDetails = (account: IAccount) => {
    setViewAccount(account);
    setViewDrawerOpen(true);
  };

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [aRes, pRes, cRes] = await Promise.all([
      fetchApi('/accounts'),
      fetchApi('/products'),
      fetchApi('/customers'),
    ]);

    if (aRes.success && aRes.data) setAccounts(aRes.data.items || aRes.data);
    if (pRes.success && pRes.data) setProducts(pRes.data);
    if (cRes.success && cRes.data) setCustomers(cRes.data.items || cRes.data);
    setLoading(false);
  };

  const handleOpenAccount = async (values: any) => {
    setSubmitting(true);
    const res = await postApi('/accounts', values);
    setSubmitting(false);

    if (res.success) {
      message.success(`Account opened successfully: ${res.data?.accountNumber || 'Opened'}`);
      setOpenModalVisible(false);
      form.resetFields();
      loadData();
    } else {
      message.error(res.message || res.error || 'Failed to open account');
    }
  };

  const handleOpenEdit = (record: IAccount) => {
    setSelectedAccount(record);
    editForm.setFieldsValue({
      status: record.status,
      currentBalance: record.currentBalance,
      nomineeName: record.nomineeName || '',
      nomineeRelationship: record.nomineeRelationship || 'Spouse',
      nomineeMobile: record.nomineeMobile || '',
      tenureMonths: record.tenureMonths || 12,
      remarks: record.remarks || '',
    });
    setEditModalVisible(true);
  };

  const handleUpdateAccount = async (values: any) => {
    if (!selectedAccount) return;
    setSubmitting(true);
    const res = await patchApi(`/accounts/${selectedAccount.id}`, values);
    setSubmitting(false);
    if (res.success) {
      message.success(`Account ${selectedAccount.accountNumber} updated.`);
      setEditModalVisible(false);
      loadData();
    } else {
      message.error(res.message || 'Failed to update account.');
    }
  };

  const handleDeleteAccount = async (id: string, accNo: string) => {
    const res = await deleteApi(`/accounts/${id}`);
    if (res.success) {
      message.success(`Account [${accNo}] deleted.`);
      loadData();
    } else {
      message.error(res.message || 'Failed to delete account.');
    }
  };

  const columns = [
    {
      title: 'Account Number',
      dataIndex: 'accountNumber',
      key: 'accountNumber',
      render: (acc: string) => <span className="font-mono font-bold text-blue-700">{acc}</span>,
    },
    {
      title: 'Member Name',
      dataIndex: 'customerName',
      key: 'customerName',
      ellipsis: true,
      render: (name: string) => <span className="font-semibold text-slate-800">{name}</span>,
    },
    {
      title: 'Product Type',
      dataIndex: 'productType',
      key: 'productType',
      render: (t: string) => (
        <Tag color={t === 'RD' ? 'green' : t === 'TERM_DEPOSIT' ? 'blue' : t === 'SAVINGS' ? 'purple' : 'default'}>
          {t}
        </Tag>
      ),
    },
    {
      title: 'Monthly / Deposit Amount',
      dataIndex: 'principalAmount',
      key: 'principalAmount',
      render: (a: number) => <span>{FinancialEngine.formatINR(a)}</span>,
    },
    {
      title: 'Current Balance',
      dataIndex: 'currentBalance',
      key: 'currentBalance',
      render: (bal: number) => (
        <span className="font-bold text-emerald-700 flex items-center gap-1">
          <DollarOutlined className="text-xs text-emerald-600" />
          {FinancialEngine.formatINR(bal)}
        </span>
      ),
    },
    {
      title: 'Maturity Amount',
      dataIndex: 'maturityAmount',
      key: 'maturityAmount',
      render: (m: number) => <span className="font-semibold">{FinancialEngine.formatINR(m || 0)}</span>,
    },
    {
      title: 'Interest / Tenure',
      key: 'terms',
      render: (_: any, r: IAccount) => <span>{r.tenureMonths} Mo @ {r.interestRate}%</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => (
        <Tag
          icon={st === 'ACTIVE' ? <SafetyCertificateOutlined /> : undefined}
          color={st === 'ACTIVE' ? 'success' : 'default'}
        >
          {st}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 170,
      render: (_: any, r: IAccount) => (
        <Space size={4}>
          <Tooltip title="View Details">
            <Button size="small" icon={<EyeOutlined />} onClick={() => handleOpenViewDetails(r)} />
          </Tooltip>
          {(r.productType === ProductType.RD || r.productType === ProductType.TERM_DEPOSIT) && (
            <Tooltip title="Print Formal Certificate (§8)">
              <Button
                size="small"
                icon={<PrinterOutlined />}
                onClick={() => handleOpenCertificate(r)}
                style={{ color: '#059669', borderColor: '#059669' }}
              />
            </Tooltip>
          )}
          {r.status === 'ACTIVE' && (r.productType === ProductType.RD || r.productType === ProductType.TERM_DEPOSIT) && (
            <Tooltip title="Premature Closure & Penalty (§8)">
              <Button
                size="small"
                danger
                ghost
                icon={<StopOutlined />}
                onClick={() => handleOpenPrematureModal(r)}
              />
            </Tooltip>
          )}
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(r)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete Account"
            description={`Delete ${r.accountNumber}?`}
            onConfirm={() => handleDeleteAccount(r.id, r.accountNumber)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const [activeTab, setActiveTab] = useState<string>('ALL');

  const filteredAccounts = accounts.filter((a) => {
    if (activeTab === 'ALL') return true;
    return a.productType === activeTab;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BankOutlined className="text-emerald-600 text-lg" />
            <h1 className="text-2xl font-bold text-slate-900 m-0">Recurring Deposits & Term Deposits</h1>
          </div>
          <p className="text-slate-500 text-sm m-0">
            Deposit product portfolio, scheduled installment tracking and compound maturity calculation (SRS §14, §19, §21).
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setOpenModalVisible(true)}
          style={{ background: '#059669', borderColor: '#059669', height: 40 }}
        >
          Open New Deposit Account
        </Button>
      </div>

      <Card className="glass-card">
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k)}
          items={[
            { key: 'ALL', label: `All Accounts (${accounts.length})` },
            { key: ProductType.RD, label: `Recurring Deposits (${accounts.filter((a) => a.productType === ProductType.RD).length})` },
            { key: ProductType.TERM_DEPOSIT, label: `Term Deposits (${accounts.filter((a) => a.productType === ProductType.TERM_DEPOSIT).length})` },
            { key: ProductType.SAVINGS, label: `Savings Accounts (${accounts.filter((a) => a.productType === ProductType.SAVINGS).length})` },
          ]}
        />
        <Table
          size="small"
          columns={columns}
          dataSource={filteredAccounts}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          onRow={(record) => ({
            onClick: (e: any) => {
              if (e.target.closest('button') || e.target.closest('.ant-popconfirm') || e.target.closest('.ant-popover')) return;
              handleOpenViewDetails(record);
            },
            className: 'cursor-pointer hover:bg-emerald-50/50 transition-colors',
          })}
        />
      </Card>

      {/* OPEN DEPOSIT ACCOUNT MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <BankOutlined className="text-emerald-600" />
            <span>Open New Deposit Account (RD / Term Deposit / Savings)</span>
          </div>
        }
        open={openModalVisible}
        onCancel={() => {
          setOpenModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleOpenAccount}>
          <Form.Item name="customerId" label="Select Registered Member" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Search member by name or ID"
              optionFilterProp="children"
              options={customers.map((c) => ({
                label: `${c.customerNumber} - ${c.firstName} ${c.lastName} (${c.mobile})`,
                value: c.id,
              }))}
            />
          </Form.Item>

          <Form.Item name="productId" label="Deposit Scheme / Product" rules={[{ required: true }]}>
            <Select
              placeholder="Select deposit product"
              options={products
                .filter(
                  (p) =>
                    p.productType === ProductType.RD ||
                    p.productType === ProductType.TERM_DEPOSIT ||
                    p.productType === ProductType.SAVINGS,
                )
                .map((p) => ({
                  label: `${p.productName} (${p.productType}) - ${p.interestRate}% p.a.`,
                  value: p.id,
                }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="principalAmount"
                label="Monthly Installment / Deposit Amount (₹)"
                rules={[{ required: true }]}
              >
                <InputNumber min={500} step={500} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tenureMonths" label="Tenure (Months)" initialValue={12} rules={[{ required: true }]}>
                <Select
                  options={[
                    { label: '6 Months', value: 6 },
                    { label: '12 Months (1 Year)', value: 12 },
                    { label: '24 Months (2 Years)', value: 24 },
                    { label: '36 Months (3 Years)', value: 36 },
                    { label: '60 Months (5 Years)', value: 60 },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="nomineeName" label="Nominee Full Name">
                <Input placeholder="e.g. Rekha Bachchan" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="nomineeRelationship" label="Nominee Relationship" initialValue="Spouse">
                <Select
                  options={[
                    { label: 'Spouse', value: 'Spouse' },
                    { label: 'Father', value: 'Father' },
                    { label: 'Mother', value: 'Mother' },
                    { label: 'Son', value: 'Son' },
                    { label: 'Daughter', value: 'Daughter' },
                    { label: 'Brother', value: 'Brother' },
                    { label: 'Sister', value: 'Sister' },
                    { label: 'Other', value: 'Other' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="nomineeMobile" label="Nominee Contact Mobile">
                <Input placeholder="10-digit mobile" maxLength={10} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="remarks" label="Account Remarks / Purpose">
                <Input placeholder="Optional special notes" />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <Button
              onClick={() => {
                setOpenModalVisible(false);
                form.resetFields();
              }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ background: '#059669', borderColor: '#059669' }}>
              Open Account
            </Button>
          </div>
        </Form>
      </Modal>

      {/* EDIT ACCOUNT MODAL */}
      <Modal
        title={`Edit Deposit Account: ${selectedAccount?.accountNumber}`}
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setSelectedAccount(null);
        }}
        footer={null}
        width={500}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateAccount}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="status" label="Account Status" rules={[{ required: true }]}>
                <Select
                  options={[
                    { label: 'ACTIVE', value: 'ACTIVE' },
                    { label: 'MATURED', value: 'MATURED' },
                    { label: 'CLOSED', value: 'CLOSED' },
                    { label: 'FROZEN', value: 'FROZEN' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="currentBalance" label="Current Balance (₹)">
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="nomineeName" label="Nominee Name">
                <Input placeholder="Nominee full name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="nomineeRelationship" label="Nominee Relationship">
                <Select
                  options={[
                    { label: 'Spouse', value: 'Spouse' },
                    { label: 'Father', value: 'Father' },
                    { label: 'Mother', value: 'Mother' },
                    { label: 'Son', value: 'Son' },
                    { label: 'Daughter', value: 'Daughter' },
                    { label: 'Brother', value: 'Brother' },
                    { label: 'Sister', value: 'Sister' },
                    { label: 'Other', value: 'Other' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="nomineeMobile" label="Nominee Mobile">
                <Input placeholder="10-digit mobile" maxLength={10} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="remarks" label="Remarks / Special Notes">
                <Input placeholder="Internal notes" />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <Button
              onClick={() => {
                setEditModalVisible(false);
                editForm.resetFields();
                setSelectedAccount(null);
              }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ background: '#059669', borderColor: '#059669' }}>
              Save Changes
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ACCOUNT DETAILS DRAWER */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <EyeOutlined className="text-emerald-600 text-lg" />
            <span className="font-bold text-slate-800 text-base">
              Deposit Account Details: {viewAccount?.accountNumber}
            </span>
          </div>
        }
        open={viewDrawerOpen}
        onClose={() => {
          setViewDrawerOpen(false);
          setViewAccount(null);
        }}
        width={560}
      >
        {viewAccount && (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-emerald-700 font-semibold uppercase">Account Balance</div>
                <div className="text-2xl font-bold font-mono text-emerald-950">
                  {FinancialEngine.formatINR(viewAccount.currentBalance)}
                </div>
              </div>
              <Tag color={viewAccount.status === 'ACTIVE' ? 'success' : 'default'} className="px-3 py-1 text-sm font-semibold">
                {viewAccount.status}
              </Tag>
            </div>

            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="Account Number">
                <span className="font-mono font-bold text-emerald-700">{viewAccount.accountNumber}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Member Name">{viewAccount.customerName || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Member Number">
                <span className="font-mono">{viewAccount.customerNumber || 'N/A'}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Product Type">
                <Tag color="blue">{viewAccount.productType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Product Name">{viewAccount.productName || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Interest Rate">
                <span className="font-bold text-indigo-700">{viewAccount.interestRate}% p.a.</span>
              </Descriptions.Item>
              <Descriptions.Item label="Monthly Installment / Principal">
                {FinancialEngine.formatINR(viewAccount.principalAmount)}
              </Descriptions.Item>
              <Descriptions.Item label="Tenure">{viewAccount.tenureMonths} Months</Descriptions.Item>
              <Descriptions.Item label="Opening Date">{viewAccount.openingDate || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Maturity Date">{viewAccount.maturityDate || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Expected Maturity Amount">
                <span className="font-bold text-emerald-700">
                  {FinancialEngine.formatINR(viewAccount.maturityAmount || viewAccount.currentBalance)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Nominee Details">
                {viewAccount.nomineeName ? (
                  <span>
                    <strong>{viewAccount.nomineeName}</strong> ({viewAccount.nomineeRelationship || 'Nominee'})
                    {viewAccount.nomineeMobile ? ` • +91 ${viewAccount.nomineeMobile}` : ''}
                  </span>
                ) : (
                  <Tag color="default">No Nominee Registered</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Remarks / Notes">
                {viewAccount.remarks || 'Standard Account'}
              </Descriptions.Item>
              <Descriptions.Item label="Branch ID">
                <span className="font-mono text-xs">{viewAccount.branchId}</span>
              </Descriptions.Item>
            </Descriptions>

            {/* Quick Actions inside Drawer */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              {(viewAccount.productType === ProductType.RD || viewAccount.productType === ProductType.TERM_DEPOSIT) && (
                <Button
                  type="primary"
                  icon={<PrinterOutlined />}
                  onClick={() => handleOpenCertificate(viewAccount)}
                  style={{ background: '#059669', borderColor: '#059669' }}
                >
                  Print Formal Certificate (§8)
                </Button>
              )}
              {viewAccount.status === 'ACTIVE' && (viewAccount.productType === ProductType.RD || viewAccount.productType === ProductType.TERM_DEPOSIT) && (
                <Button
                  danger
                  icon={<StopOutlined />}
                  onClick={() => handleOpenPrematureModal(viewAccount)}
                >
                  Premature Closure & Penalty
                </Button>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* PRINTABLE DEPOSIT CERTIFICATE MODAL (§8) */}
      <DepositCertificateModal
        visible={certModalVisible}
        onClose={() => setCertModalVisible(false)}
        account={selectedCertAccount}
        customer={selectedCertCustomer}
      />

      {/* AUTOMATED PREMATURE CLOSURE & PENALTY MODAL (§8) */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-rose-700">
            <StopOutlined />
            <span>Premature Withdrawal & Penalty Engine (SRS §8)</span>
          </div>
        }
        open={prematureModalVisible}
        onCancel={() => {
          setPrematureModalVisible(false);
          setSelectedPrematureAccount(null);
          setPrematureCalc(null);
        }}
        width={720}
        footer={[
          <Button key="cancel" onClick={() => setPrematureModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="execute"
            danger
            type="primary"
            loading={prematureExecuting}
            disabled={!prematureCalc}
            onClick={handleExecutePremature}
          >
            Confirm & Execute Payout ({prematureCalc ? FinancialEngine.formatINR(prematureCalc.totalPayout) : '...'})
          </Button>,
        ]}
      >
        <div className="space-y-4 py-2">
          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            message="Contractual Premature Penalty Policy"
            description="Closing this deposit before contractual maturity triggers a regulatory penalty deduction (Standard: 2.0% p.a. interest deduction). The ledger will immediately debit the liability and issue payout."
          />

          {prematureLoading ? (
            <div className="text-center py-10 text-slate-400 text-sm">Calculating premature interest and penalties...</div>
          ) : prematureCalc ? (
            <div className="space-y-4">
              {/* Account Quick Info */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Account: </span>
                  <span className="font-mono font-bold text-slate-800">{prematureCalc.accountNumber}</span>
                  <span className="text-slate-400 mx-2">•</span>
                  <span className="text-slate-500">Member: </span>
                  <span className="font-semibold text-slate-800">{prematureCalc.customerName}</span>
                </div>
                <Tag color="purple">{prematureCalc.productType}</Tag>
              </div>

              {/* Live Financial Breakdown Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-2 bg-slate-50 p-3 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <div>Financial Parameter</div>
                  <div className="text-right">Breakdown Value</div>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  <div className="grid grid-cols-2 p-3">
                    <span className="text-slate-600">Principal Amount Deposited</span>
                    <span className="text-right font-bold text-slate-900">{FinancialEngine.formatINR(prematureCalc.principal)}</span>
                  </div>
                  <div className="grid grid-cols-2 p-3">
                    <span className="text-slate-600">Elapsed Period</span>
                    <span className="text-right font-medium text-slate-800">{prematureCalc.elapsedDays} Days ({prematureCalc.elapsedMonths} Months)</span>
                  </div>
                  <div className="grid grid-cols-2 p-3">
                    <span className="text-slate-600">Contractual Interest Rate</span>
                    <span className="text-right font-semibold text-slate-700">{prematureCalc.originalRate}% p.a.</span>
                  </div>
                  <div className="grid grid-cols-2 p-3 items-center">
                    <span className="text-rose-600 font-medium">Penalty Rate Deduction</span>
                    <div className="flex items-center justify-end gap-2">
                      <InputNumber
                        size="small"
                        min={0}
                        max={10}
                        step={0.5}
                        value={prematurePenaltyOverride}
                        onChange={(val) => handleRecalculatePremature(val || 0)}
                        addonAfter="%"
                        style={{ width: 110 }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 p-3">
                    <span className="text-emerald-700 font-medium">Effective Post-Penalty Rate</span>
                    <span className="text-right font-bold text-emerald-700">{prematureCalc.revisedRate}% p.a.</span>
                  </div>
                  <div className="grid grid-cols-2 p-3">
                    <span className="text-slate-500">Gross Accrued Interest (Without Penalty)</span>
                    <span className="text-right text-slate-500">{FinancialEngine.formatINR(prematureCalc.grossAccruedInterest)}</span>
                  </div>
                  <div className="grid grid-cols-2 p-3 bg-rose-50/50">
                    <span className="text-rose-700 font-semibold">Penalty Deduction Forfeited</span>
                    <span className="text-right font-bold text-rose-700">- {FinancialEngine.formatINR(prematureCalc.penaltyAmount)}</span>
                  </div>
                  <div className="grid grid-cols-2 p-3 bg-emerald-50/40">
                    <span className="text-emerald-900 font-semibold">Net Interest Payable</span>
                    <span className="text-right font-bold text-emerald-900">+ {FinancialEngine.formatINR(prematureCalc.netAccruedInterest)}</span>
                  </div>
                  <div className="grid grid-cols-2 p-4 bg-emerald-50 border-t-2 border-emerald-500 text-sm">
                    <span className="font-bold text-emerald-950">TOTAL NET PAYOUT PAYABLE</span>
                    <span className="text-right font-extrabold text-emerald-950 text-base font-mono">
                      {FinancialEngine.formatINR(prematureCalc.totalPayout)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Settlement Mode and Notes */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div>
                  <div className="text-xs font-semibold text-slate-700 mb-1.5">Disbursement / Settlement Mode</div>
                  <Radio.Group
                    value={prematurePaymentMode}
                    onChange={(e) => setPrematurePaymentMode(e.target.value)}
                  >
                    <Radio value="CASH">Cash in Vault (COA-1010)</Radio>
                    <Radio value="BANK_TRANSFER">Bank Account (COA-1020)</Radio>
                  </Radio.Group>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-700 mb-1">Premature Closure Reason / Remarks</div>
                  <Input
                    placeholder="e.g., Emergency medical funds requested by member"
                    value={prematureRemarks}
                    onChange={(e) => setPrematureRemarks(e.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
