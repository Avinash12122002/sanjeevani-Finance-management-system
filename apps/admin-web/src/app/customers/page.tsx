'use client';

import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Tag,
  Space,
  Modal,
  Form,
  Select,
  Drawer,
  Descriptions,
  Tabs,
  Avatar,
  Card,
  Row,
  Col,
  message,
  Divider,
} from 'antd';
import {
  UserAddOutlined,
  SearchOutlined,
  EyeOutlined,
  SafetyCertificateOutlined,
  PhoneOutlined,
  HomeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { fetchApi } from '@/lib/api-client';
import { FinancialEngine } from '@sanjeevani/financial-engine';
import { ICustomer } from '@sanjeevani/shared-types';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedCustomer360, setSelectedCustomer360] = useState<any>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    const res = await fetchApi('/customers');
    if (res.success && res.data) {
      setCustomers(res.data.items || res.data);
    }
    setLoading(false);
  };

  const handleOpen360 = async (customerId: string) => {
    const res = await fetchApi(`/customers/${customerId}/360`);
    if (res.success && res.data) {
      setSelectedCustomer360(res.data);
      setDrawerVisible(true);
    }
  };

  const handleCreateCustomer = async (values: any) => {
    const res = await fetchApi('/customers', {
      method: 'POST',
      body: JSON.stringify(values),
    });

    if (res.success) {
      message.success(`Member registered successfully: ${res.data.customerNumber}`);
      setCreateModalVisible(false);
      form.resetFields();
      loadCustomers();
    } else {
      message.error(res.error || 'Failed to register customer');
    }
  };

  const columns = [
    {
      title: 'Member ID',
      dataKey: 'customerNumber',
      key: 'customerNumber',
      render: (_: any, r: ICustomer) => (
        <span className="font-mono font-bold text-emerald-700">{r.customerNumber}</span>
      ),
    },
    {
      title: 'Customer Name',
      key: 'name',
      render: (_: any, r: ICustomer) => (
        <div className="flex items-center gap-2">
          <Avatar style={{ backgroundColor: '#059669' }}>{r.firstName[0]}</Avatar>
          <div>
            <div className="font-semibold text-slate-800">{`${r.firstName} ${r.lastName}`}</div>
            <div className="text-xs text-slate-500">{r.fatherOrSpouseName}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Mobile',
      dataIndex: 'mobile',
      key: 'mobile',
      render: (m: string) => <span className="font-mono">{m}</span>,
    },
    {
      title: 'City / Branch',
      key: 'location',
      render: (_: any, r: ICustomer) => (
        <div>
          <div>{r.city}</div>
          <div className="text-xs text-slate-500">{r.branchName}</div>
        </div>
      ),
    },
    {
      title: 'KYC Status',
      dataIndex: 'kycStatus',
      key: 'kycStatus',
      render: (status: string) => (
        <Tag color={status === 'VERIFIED' ? 'success' : status === 'PENDING' ? 'warning' : 'error'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Joining Date',
      dataIndex: 'joiningDate',
      key: 'joiningDate',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, r: ICustomer) => (
        <Button
          type="primary"
          ghost
          icon={<EyeOutlined />}
          size="small"
          onClick={() => handleOpen360(r.id)}
        >
          View 360°
        </Button>
      ),
    },
  ];

  const filtered = customers.filter(
    (c) =>
      c.customerNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.firstName.toLowerCase().includes(search.toLowerCase()) ||
      c.lastName.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile.includes(search),
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 m-0">Member Directory & Customer 360°</h1>
          <p className="text-slate-500 text-sm mt-1 m-0">
            Centralized member database, KYC status records, and linked financial portfolios (SRS §9, §69).
          </p>
        </div>
        <Button
          type="primary"
          icon={<UserAddOutlined />}
          onClick={() => setCreateModalVisible(true)}
          style={{ background: '#059669', borderColor: '#059669', height: 40 }}
        >
          Register New Member
        </Button>
      </div>

      {/* Table Card */}
      <Card className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <Input
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="Search by Member ID, Name, or Mobile Number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 380 }}
          />
          <div className="text-xs text-slate-500 font-medium">
            Showing {filtered.length} of {customers.length} Members
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={loading}
          scroll={{ x: 850 }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* NEW MEMBER REGISTRATION MODAL (SRS §9) */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-emerald-700 font-bold">
            <UserAddOutlined /> Register New Member (Auto ID: SJF-CUS-XXXXXX)
          </div>
        }
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={680}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateCustomer}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="firstName" label="First Name" rules={[{ required: true, message: 'First name is required' }]}>
                <Input placeholder="e.g. Rajesh" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastName" label="Last Name" rules={[{ required: true, message: 'Last name is required' }]}>
                <Input placeholder="e.g. Sharma" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="fatherOrSpouseName" label="Father / Spouse Name" rules={[{ required: true }]}>
                <Input placeholder="e.g. M. L. Sharma" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="mobile" label="Primary Mobile (Duplicate Protected)" rules={[{ required: true, pattern: /^[0-9]{10}$/, message: 'Valid 10-digit mobile required' }]}>
                <Input placeholder="10-digit mobile" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="gender" label="Gender" initialValue="MALE">
                <Select
                  options={[
                    { label: 'Male', value: 'MALE' },
                    { label: 'Female', value: 'FEMALE' },
                    { label: 'Other', value: 'OTHER' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="dateOfBirth" label="Date of Birth" initialValue="1990-01-01">
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="email" label="Email Address">
                <Input placeholder="name@email.com" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="addressLine1" label="Residential Address" rules={[{ required: true }]}>
            <Input placeholder="Street, landmark, locality" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="city" label="City / District" initialValue="Agra">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="postalCode" label="PIN Code" initialValue="282001">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <Button onClick={() => setCreateModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ background: '#059669', borderColor: '#059669' }}>
              Create Member Account
            </Button>
          </div>
        </Form>
      </Modal>

      {/* CUSTOMER 360° DRAWER (SRS §69) */}
      <Drawer
        title={
          selectedCustomer360 ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 text-lg">
                  {selectedCustomer360.profile.firstName} {selectedCustomer360.profile.lastName}
                </span>
                <Tag color="emerald" className="ml-2 font-mono">
                  {selectedCustomer360.profile.customerNumber}
                </Tag>
              </div>
              <Tag color={selectedCustomer360.profile.kycStatus === 'VERIFIED' ? 'success' : 'warning'}>
                KYC: {selectedCustomer360.profile.kycStatus}
              </Tag>
            </div>
          ) : (
            'Customer 360° View'
          )
        }
        width={720}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {selectedCustomer360 && (
          <div className="space-y-6">
            {/* Top Summary Cards */}
            <Row gutter={16}>
              <Col span={12}>
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="text-xs text-emerald-800 font-semibold uppercase">TOTAL DEPOSIT SAVINGS</div>
                  <div className="text-xl font-bold text-emerald-900 mt-1">
                    {FinancialEngine.formatINR(selectedCustomer360.summary.totalDeposits)}
                  </div>
                  <div className="text-xs text-emerald-700 mt-1">
                    {selectedCustomer360.accounts.length} Active Deposit Accounts
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="text-xs text-blue-800 font-semibold uppercase">ACTIVE LOAN EXPOSURE</div>
                  <div className="text-xl font-bold text-blue-900 mt-1">
                    {FinancialEngine.formatINR(selectedCustomer360.summary.totalLoanOutstanding)}
                  </div>
                  <div className="text-xs text-blue-700 mt-1">
                    Next EMI: {FinancialEngine.formatINR(selectedCustomer360.summary.nextEmiAmount)} (Due: {selectedCustomer360.summary.nextDueDate || 'N/A'})
                  </div>
                </div>
              </Col>
            </Row>

            <Tabs
              defaultActiveKey="overview"
              items={[
                {
                  key: 'overview',
                  label: 'Profile & KYC',
                  children: (
                    <div className="space-y-4">
                      <Descriptions bordered column={2} size="small">
                        <Descriptions.Item label="Father/Spouse">
                          {selectedCustomer360.profile.fatherOrSpouseName}
                        </Descriptions.Item>
                        <Descriptions.Item label="Mobile">
                          {selectedCustomer360.profile.mobile}
                        </Descriptions.Item>
                        <Descriptions.Item label="Date of Birth">
                          {selectedCustomer360.profile.dateOfBirth}
                        </Descriptions.Item>
                        <Descriptions.Item label="Branch">
                          {selectedCustomer360.profile.branchName}
                        </Descriptions.Item>
                        <Descriptions.Item label="Address" span={2}>
                          {selectedCustomer360.profile.addressLine1}, {selectedCustomer360.profile.city} - {selectedCustomer360.profile.postalCode}
                        </Descriptions.Item>
                      </Descriptions>

                      <div className="font-bold text-slate-800 text-sm mt-4">KYC Documents Uploaded (§10)</div>
                      <div className="space-y-2">
                        {selectedCustomer360.kycDocuments.length === 0 ? (
                          <div className="text-xs text-slate-400 italic">No KYC documents uploaded yet.</div>
                        ) : (
                          selectedCustomer360.kycDocuments.map((k: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded border border-slate-200">
                              <div className="flex items-center gap-2">
                                <SafetyCertificateOutlined className="text-emerald-600" />
                                <div>
                                  <span className="font-semibold text-xs text-slate-800">{k.documentType}: </span>
                                  <span className="font-mono text-xs">{k.documentNumber}</span>
                                </div>
                              </div>
                              <Tag color="success">VERIFIED</Tag>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="font-bold text-slate-800 text-sm mt-4">Nominee Details (§11)</div>
                      <div className="space-y-2">
                        {selectedCustomer360.nominees.map((n: any, idx: number) => (
                          <div key={idx} className="p-2.5 bg-slate-50 rounded border border-slate-200 text-xs">
                            <span className="font-semibold text-slate-800">{n.name}</span> ({n.relationship}) - Share: {n.percentage}% | Mobile: {n.mobile}
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'loans',
                  label: `Loans (${selectedCustomer360.loans.length})`,
                  children: (
                    <div className="space-y-3">
                      {selectedCustomer360.loans.length === 0 ? (
                        <div className="text-xs text-slate-400 py-4 text-center">No active loans for this member.</div>
                      ) : (
                        selectedCustomer360.loans.map((ln: any, idx: number) => (
                          <Card key={idx} size="small" className="border border-slate-200">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-blue-700">{ln.loanNumber}</span>
                              <Tag color="blue">{ln.status}</Tag>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                              <div>Principal: <b>{FinancialEngine.formatINR(ln.principal)}</b></div>
                              <div>Outstanding: <b className="text-red-600">{FinancialEngine.formatINR(ln.outstandingPrincipal)}</b></div>
                              <div>Monthly EMI: <b>{FinancialEngine.formatINR(ln.emiAmount)}</b></div>
                              <div>Interest Rate: <b>{ln.annualInterestRate}% p.a.</b></div>
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  ),
                },
                {
                  key: 'accounts',
                  label: `Deposits (${selectedCustomer360.accounts.length})`,
                  children: (
                    <div className="space-y-3">
                      {selectedCustomer360.accounts.map((acc: any, idx: number) => (
                        <Card key={idx} size="small" className="border border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-emerald-700">{acc.accountNumber}</span>
                            <Tag color="green">{acc.productType}</Tag>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                            <div>Product: <b>{acc.productName}</b></div>
                            <div>Current Balance: <b className="text-emerald-700">{FinancialEngine.formatINR(acc.currentBalance)}</b></div>
                            <div>Interest Rate: <b>{acc.interestRate}%</b></div>
                            <div>Maturity Amount: <b>{FinancialEngine.formatINR(acc.maturityAmount || 0)}</b></div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ),
                },
                {
                  key: 'payments',
                  label: 'Payment History',
                  children: (
                    <div className="space-y-2">
                      {selectedCustomer360.recentTransactions.map((tx: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded border border-slate-200 text-xs">
                          <div>
                            <div className="font-mono font-semibold text-slate-800">{tx.transactionNumber}</div>
                            <div className="text-slate-500">{tx.remarks || tx.transactionType} ({tx.transactionDate})</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-emerald-700">{FinancialEngine.formatINR(tx.amount)}</div>
                            <Tag color="green" className="m-0 text-[10px]">{tx.paymentMode}</Tag>
                          </div>
                        </div>
                      ))}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Drawer>
    </div>
  );
}
