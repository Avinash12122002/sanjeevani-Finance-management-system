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
  Popconfirm,
  message,
} from 'antd';
import {
  BankOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
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
    const res = await postApi('/accounts', values);

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
    const res = await patchApi(`/accounts/${selectedAccount.id}`, values);
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
      title: 'Customer Name',
      key: 'customer',
      render: (_: any, r: IAccount) => (
        <div>
          <div className="font-semibold text-slate-800">{r.customerName}</div>
          <div className="font-mono text-xs text-slate-400">{r.customerNumber}</div>
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
      render: (_: any, r: IAccount) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(r)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete Deposit Account"
            description={`Delete account ${r.accountNumber}?`}
            onConfirm={() => handleDeleteAccount(r.id, r.accountNumber)}
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

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 m-0">Recurring Deposits & Term Deposits</h1>
          <p className="text-slate-500 text-sm mt-1 m-0">
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
        <Table columns={columns} dataSource={accounts} rowKey="id" loading={loading} scroll={{ x: 900 }} />
      </Card>

      {/* OPEN DEPOSIT ACCOUNT MODAL */}
      <Modal
        title="Open New Deposit Account (RD / Term Deposit)"
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
            <Button type="primary" htmlType="submit" style={{ background: '#059669', borderColor: '#059669' }}>
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
            <Button type="primary" htmlType="submit" style={{ background: '#059669', borderColor: '#059669' }}>
              Save Changes
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
