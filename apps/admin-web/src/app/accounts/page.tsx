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
  message,
} from 'antd';
import {
  BankOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { fetchApi, postApi } from '@/lib/api-client';
import { FinancialEngine } from '@sanjeevani/financial-engine';
import { IAccount, ProductType } from '@sanjeevani/shared-types';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<IAccount[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [openModalVisible, setOpenModalVisible] = useState(false);
  const [form] = Form.useForm();

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

  const columns = [
    {
      title: 'Account Number',
      dataIndex: 'accountNumber',
      key: 'accountNumber',
      render: (num: string) => <span className="font-mono font-bold text-emerald-700">{num}</span>,
    },
    {
      title: 'Member / Customer',
      key: 'customer',
      render: (_: any, r: IAccount) => (
        <div>
          <div className="font-semibold text-slate-800">{r.customerName}</div>
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
        <Table columns={columns} dataSource={accounts} rowKey="id" loading={loading} scroll={{ x: 850 }} />
      </Card>

      {/* OPEN ACCOUNT MODAL */}
      <Modal
        title="Open Deposit / RD Account"
        open={openModalVisible}
        onCancel={() => setOpenModalVisible(false)}
        footer={null}
        width={580}
      >
        <Form form={form} layout="vertical" onFinish={handleOpenAccount}>
          <Form.Item name="customerId" label="Select Member" rules={[{ required: true }]}>
            <Select
              placeholder="Search member by Name or ID"
              options={customers.map((c) => ({
                label: `${c.customerNumber} - ${c.firstName} ${c.lastName} (${c.mobile})`,
                value: c.id,
              }))}
            />
          </Form.Item>

          <Form.Item name="productId" label="Select Deposit Product" rules={[{ required: true }]}>
            <Select
              placeholder="Choose Product"
              options={products
                .filter((p) => p.productType === 'RD' || p.productType === 'TERM_DEPOSIT' || p.productType === 'SAVINGS')
                .map((p) => ({
                  label: `${p.productName} (${p.productType}) - ${p.interestRate}% p.a.`,
                  value: p.id,
                }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="principalAmount" label="Deposit / Monthly Amount (₹)" initialValue={5000} rules={[{ required: true }]}>
                <InputNumber min={500} max={5000000} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tenureMonths" label="Tenure (Months)" initialValue={24} rules={[{ required: true }]}>
                <InputNumber min={6} max={120} className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <Button onClick={() => setOpenModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ background: '#059669', borderColor: '#059669' }}>
              Authorize & Open Account
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
