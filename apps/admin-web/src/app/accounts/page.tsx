'use client';

import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
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
} from 'antd';
import {
  BankOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { fetchApi, postApi, patchApi, deleteApi } from '@/lib/api-client';
import { FinancialEngine } from '@sanjeevani/financial-engine';
import { IAccount, ProductType } from '@sanjeevani/shared-types';

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
      title: 'Member / Customer',
      key: 'customer',
      ellipsis: true,
      render: (_: any, r: IAccount) => (
        <div>
          <div className="font-semibold">{r.customerName}</div>
          <div className="text-xs text-slate-500 font-mono">{r.customerNumber}</div>
        </div>
      ),
    },
    {
      title: 'Product Type',
      dataIndex: 'productType',
      key: 'productType',
      render: (t: string) => <Tag color={t === 'RD' ? 'green' : t === 'TERM_DEPOSIT' ? 'blue' : 'default'}>{t}</Tag>,
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
      render: (bal: number) => <span className="font-bold text-emerald-700">{FinancialEngine.formatINR(bal)}</span>,
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
      render: (st: string) => <Tag color={st === 'ACTIVE' ? 'success' : 'default'}>{st}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_: any, r: IAccount) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleOpenViewDetails(r)} />
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
            <span>Open New Deposit Account (RD / Term Deposit)</span>
          </div>
        }
        open={openModalVisible}
        onCancel={() => setOpenModalVisible(false)}
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
                .filter((p) => p.productType === ProductType.RD || p.productType === ProductType.TERM_DEPOSIT)
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

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <Button onClick={() => setOpenModalVisible(false)}>Cancel</Button>
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
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateAccount}>
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
          <Form.Item name="currentBalance" label="Current Balance (₹)">
            <InputNumber min={0} className="w-full" />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <Button onClick={() => setEditModalVisible(false)}>Cancel</Button>
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
              <Descriptions.Item label="Branch ID">
                <span className="font-mono text-xs">{viewAccount.branchId}</span>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Drawer>
    </div>
  );
}
