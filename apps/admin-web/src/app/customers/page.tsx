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
  Popconfirm,
  message,
  Divider,
} from 'antd';
import {
  UserAddOutlined,
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
  PhoneOutlined,
  HomeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { fetchApi, postApi, patchApi, deleteApi } from '@/lib/api-client';
import { FinancialEngine } from '@sanjeevani/financial-engine';
import { ICustomer } from '@sanjeevani/shared-types';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedCustomer360, setSelectedCustomer360] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

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
    setSubmitting(true);
    try {
      const res = await postApi('/customers', values);

      if (res.success) {
        message.success(`Member registered successfully: ${res.data?.customerNumber || 'Registered'}`);
        setCreateModalVisible(false);
        form.resetFields();
        loadCustomers();
      } else {
        message.error(res.message || res.error || 'Failed to register customer');
      }
    } catch (err: any) {
      message.error('An error occurred while creating member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditCustomer = (record: ICustomer) => {
    setSelectedCustomer(record);
    editForm.setFieldsValue({
      firstName: record.firstName,
      middleName: record.middleName,
      lastName: record.lastName,
      fatherOrSpouseName: record.fatherOrSpouseName,
      mobile: record.mobile,
      email: record.email,
      dateOfBirth: record.dateOfBirth,
      gender: record.gender || 'MALE',
      addressLine1: record.addressLine1,
      city: record.city,
      state: record.state,
      postalCode: record.postalCode,
      status: record.status || 'ACTIVE',
      kycStatus: record.kycStatus || 'VERIFIED',
    });
    setEditModalVisible(true);
  };

  const handleUpdateCustomer = async (values: any) => {
    if (!selectedCustomer) return;
    setSubmitting(true);
    try {
      const res = await patchApi(`/customers/${selectedCustomer.id}`, values);
      if (res.success) {
        message.success(`Member ${values.firstName} ${values.lastName} updated successfully!`);
        setEditModalVisible(false);
        editForm.resetFields();
        loadCustomers();
      } else {
        message.error(res.message || 'Failed to update member.');
      }
    } catch (err: any) {
      message.error('An error occurred while updating member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    try {
      const res = await deleteApi(`/customers/${id}`);
      if (res.success) {
        message.success(`Member [${name}] removed.`);
        loadCustomers();
      } else {
        message.error(res.message || 'Failed to delete member.');
      }
    } catch (err: any) {
      message.error('Error deleting member.');
    }
  };

  const columns = [
    {
      title: 'Member ID',
      dataIndex: 'customerNumber',
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
      title: 'Contact',
      dataIndex: 'mobile',
      key: 'mobile',
      render: (m: string) => (
        <div>
          <div className="font-medium text-slate-700">{m}</div>
          <span className="text-xs text-slate-400">Mobile Verified</span>
        </div>
      ),
    },
    {
      title: 'Branch',
      dataIndex: 'branchName',
      key: 'branch',
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
        <Space>
          <Button
            type="primary"
            ghost
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleOpen360(r.id)}
          >
            360°
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEditCustomer(r)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete Customer Member"
            description={`Are you sure you want to remove member ${r.firstName} ${r.lastName}?`}
            onConfirm={() => handleDeleteCustomer(r.id, `${r.firstName} ${r.lastName}`)}
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
          scroll={{ x: 900 }}
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

          <Divider orientation="left" className="text-xs text-slate-500 font-semibold m-0 mb-3">
            KYC Identity Document (Optional)
          </Divider>
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item name="kycDocumentType" label="Document Type" initialValue="AADHAAR">
                <Select
                  options={[
                    { label: 'Aadhaar Card (UIDAI)', value: 'AADHAAR' },
                    { label: 'PAN Card (Income Tax)', value: 'PAN' },
                    { label: 'Voter ID Card', value: 'VOTER_ID' },
                    { label: 'Driving License', value: 'DRIVING_LICENSE' },
                    { label: 'Passport', value: 'PASSPORT' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item name="kycDocumentNumber" label="Document / Card Number">
                <Input placeholder="e.g. 12-digit Aadhaar / 10-char PAN" />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <Button onClick={() => setCreateModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ background: '#059669', borderColor: '#059669' }}>
              Create Member Account
            </Button>
          </div>
        </Form>
      </Modal>

      {/* EDIT MEMBER PROFILE MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-emerald-700 font-bold">
            <EditOutlined /> Edit Member Profile: {selectedCustomer?.firstName} {selectedCustomer?.lastName}
          </div>
        }
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        width={680}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateCustomer}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="firstName" label="First Name" rules={[{ required: true, message: 'First name is required' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastName" label="Last Name" rules={[{ required: true, message: 'Last name is required' }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="fatherOrSpouseName" label="Father / Spouse Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="mobile" label="Primary Mobile" rules={[{ required: true, pattern: /^[0-9]{10}$/, message: 'Valid 10-digit mobile required' }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="gender" label="Gender">
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
              <Form.Item name="dateOfBirth" label="Date of Birth">
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="email" label="Email Address">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="addressLine1" label="Residential Address" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="city" label="City / District">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="postalCode" label="PIN Code">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="kycStatus" label="KYC Status">
                <Select
                  options={[
                    { label: 'VERIFIED', value: 'VERIFIED' },
                    { label: 'PENDING', value: 'PENDING' },
                    { label: 'REJECTED', value: 'REJECTED' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <Button onClick={() => setEditModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ background: '#059669', borderColor: '#059669' }}>
              Save Changes
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
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                              <div className="flex items-center gap-2">
                                <SafetyCertificateOutlined className="text-emerald-600" />
                                <span className="font-semibold text-xs text-slate-800">{k.documentType}:</span>
                                <span className="font-mono text-xs text-slate-600">{k.documentNumber}</span>
                              </div>
                              <Tag color="success">VERIFIED</Tag>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'loans',
                  label: `Loans (${selectedCustomer360.loans.length})`,
                  children: (
                    <Table
                      dataSource={selectedCustomer360.loans}
                      rowKey="id"
                      pagination={false}
                      size="small"
                      columns={[
                        { title: 'Loan Number', dataIndex: 'loanNumber', render: (n) => <span className="font-mono font-bold text-emerald-700">{n}</span> },
                        { title: 'Principal', dataIndex: 'principal', render: (p) => FinancialEngine.formatINR(p) },
                        { title: 'EMI', dataIndex: 'emiAmount', render: (e) => FinancialEngine.formatINR(e) },
                        { title: 'Outstanding', dataIndex: 'outstandingPrincipal', render: (o) => <span className="text-red-600 font-bold">{FinancialEngine.formatINR(o)}</span> },
                        { title: 'Status', dataIndex: 'status', render: (s) => <Tag color="green">{s}</Tag> },
                      ]}
                    />
                  ),
                },
                {
                  key: 'deposits',
                  label: `Deposits (${selectedCustomer360.accounts.length})`,
                  children: (
                    <Table
                      dataSource={selectedCustomer360.accounts}
                      rowKey="id"
                      pagination={false}
                      size="small"
                      columns={[
                        { title: 'Account Number', dataIndex: 'accountNumber', render: (a) => <span className="font-mono font-bold text-blue-700">{a}</span> },
                        { title: 'Product', dataIndex: 'productType' },
                        { title: 'Balance', dataIndex: 'currentBalance', render: (b) => <span className="text-emerald-700 font-bold">{FinancialEngine.formatINR(b)}</span> },
                        { title: 'Maturity Date', dataIndex: 'maturityDate' },
                      ]}
                    />
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
