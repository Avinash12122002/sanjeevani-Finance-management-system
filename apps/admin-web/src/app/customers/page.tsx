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
  ShareAltOutlined,
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
      alternateMobile: record.alternateMobile || '',
      email: record.email,
      dateOfBirth: record.dateOfBirth,
      gender: record.gender || 'MALE',
      aadhaar: record.aadhaar || '',
      pan: record.pan || '',
      addressLine1: record.addressLine1,
      city: record.city || 'Delhi',
      state: record.state || 'Delhi',
      postalCode: record.postalCode || '110086',
      status: record.status || 'ACTIVE',
      kycStatus: record.kycStatus || 'VERIFIED',
      riskCategory: record.riskCategory || 'LOW',
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
        if (selectedCustomer360 && selectedCustomer360.profile.id === selectedCustomer.id) {
          handleOpen360(selectedCustomer.id);
        }
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
          <Avatar size={28} style={{ backgroundColor: '#059669', fontSize: 13 }}>{r.firstName?.[0] || 'M'}</Avatar>
          <span className="font-semibold text-slate-800">{`${r.firstName} ${r.lastName}`}</span>
        </div>
      ),
    },
    {
      title: 'Contact',
      dataIndex: 'mobile',
      key: 'mobile',
      render: (m: string) => (
        <span className="font-mono text-slate-700 font-medium">{m}</span>
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
      width: 140,
      render: (_: any, r: ICustomer) => (
        <Space size={4}>
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
            title="Delete Member"
            description={`Delete ${r.firstName} ${r.lastName}?`}
            onConfirm={() => handleDeleteCustomer(r.id, `${r.firstName} ${r.lastName}`)}
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

  const filtered = customers.filter(
    (c) =>
      c.customerNumber?.toLowerCase().includes(search.toLowerCase()) ||
      c.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      c.lastName?.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile?.includes(search) ||
      c.pan?.toLowerCase().includes(search.toLowerCase()) ||
      c.aadhaar?.includes(search),
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
          size="small"
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          onRow={(record) => ({
            onClick: (e: any) => {
              if (e.target.closest('button') || e.target.closest('.ant-popconfirm') || e.target.closest('.ant-popover')) return;
              handleOpen360(record.id);
            },
            className: 'cursor-pointer hover:bg-emerald-50/50 transition-colors',
          })}
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
        onCancel={() => { setCreateModalVisible(false); form.resetFields(); }}
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
              <Form.Item name="city" label="City / District" initialValue="Delhi">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="state" label="State" initialValue="Delhi">
                <Select
                  options={[
                    { label: 'Delhi', value: 'Delhi' },
                    { label: 'Uttar Pradesh', value: 'Uttar Pradesh' },
                    { label: 'Haryana', value: 'Haryana' },
                    { label: 'Rajasthan', value: 'Rajasthan' },
                    { label: 'Punjab', value: 'Punjab' },
                    { label: 'Other', value: 'Other' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="postalCode" label="PIN Code" initialValue="110086">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="alternateMobile" label="Alternate Mobile (Optional)">
                <Input placeholder="Secondary contact" maxLength={10} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" className="text-xs text-slate-500 font-semibold m-0 mb-3">
            Statutory KYC Identification (PAN & Aadhaar)
          </Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="pan"
                label="Income Tax PAN"
                rules={[
                  {
                    pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
                    message: 'Format: ABCDE1234F',
                  },
                ]}
              >
                <Input
                  placeholder="e.g. ABCDE1234F"
                  maxLength={10}
                  style={{ textTransform: 'uppercase' }}
                  onChange={(e) => {
                    form.setFieldValue('pan', e.target.value.toUpperCase());
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="aadhaar"
                label="Aadhaar Card UID"
                rules={[
                  {
                    pattern: /^[0-9]{12}$/,
                    message: '12-digit Aadhaar required',
                  },
                ]}
              >
                <Input placeholder="12-digit UID Number" maxLength={12} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="riskCategory" label="Risk Classification" initialValue="LOW">
                <Select
                  options={[
                    { label: 'LOW RISK', value: 'LOW' },
                    { label: 'MEDIUM RISK', value: 'MEDIUM' },
                    { label: 'HIGH RISK', value: 'HIGH' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="kycStatus" label="Initial KYC Status" initialValue="VERIFIED">
                <Select
                  options={[
                    { label: 'VERIFIED', value: 'VERIFIED' },
                    { label: 'PENDING', value: 'PENDING' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <Button onClick={() => { setCreateModalVisible(false); form.resetFields(); }}>Cancel</Button>
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
        onCancel={() => { setEditModalVisible(false); editForm.resetFields(); setSelectedCustomer(null); }}
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
              <Form.Item name="state" label="State">
                <Select
                  options={[
                    { label: 'Delhi', value: 'Delhi' },
                    { label: 'Uttar Pradesh', value: 'Uttar Pradesh' },
                    { label: 'Haryana', value: 'Haryana' },
                    { label: 'Rajasthan', value: 'Rajasthan' },
                    { label: 'Punjab', value: 'Punjab' },
                    { label: 'Other', value: 'Other' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="postalCode" label="PIN Code">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" className="text-xs text-slate-500 font-semibold m-0 mb-3">
            Statutory KYC Identification (PAN & Aadhaar)
          </Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="pan"
                label="Income Tax PAN"
                rules={[
                  {
                    pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
                    message: 'Format: ABCDE1234F',
                  },
                ]}
              >
                <Input
                  placeholder="e.g. ABCDE1234F"
                  maxLength={10}
                  style={{ textTransform: 'uppercase' }}
                  onChange={(e) => {
                    editForm.setFieldValue('pan', e.target.value.toUpperCase());
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="aadhaar"
                label="Aadhaar Card UID"
                rules={[
                  {
                    pattern: /^[0-9]{12}$/,
                    message: '12-digit Aadhaar required',
                  },
                ]}
              >
                <Input placeholder="12-digit UID Number" maxLength={12} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="alternateMobile" label="Alternate Mobile">
                <Input placeholder="Secondary phone" maxLength={10} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="riskCategory" label="Risk Classification">
                <Select
                  options={[
                    { label: 'LOW RISK', value: 'LOW' },
                    { label: 'MEDIUM RISK', value: 'MEDIUM' },
                    { label: 'HIGH RISK', value: 'HIGH' },
                  ]}
                />
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

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="status" label="Membership Status">
                <Select
                  options={[
                    { label: 'ACTIVE', value: 'ACTIVE' },
                    { label: 'INACTIVE', value: 'INACTIVE' },
                    { label: 'SUSPENDED', value: 'SUSPENDED' },
                    { label: 'BLOCKED', value: 'BLOCKED' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <Button onClick={() => { setEditModalVisible(false); editForm.resetFields(); setSelectedCustomer(null); }}>Cancel</Button>
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
            <div className="flex items-center justify-between w-full pr-4">
              <div>
                <span className="font-bold text-slate-800 text-lg">
                  {selectedCustomer360.profile.firstName} {selectedCustomer360.profile.lastName}
                </span>
                <Tag color="emerald" className="ml-2 font-mono">
                  {selectedCustomer360.profile.customerNumber}
                </Tag>
              </div>
              <Space>
                <Tag color={selectedCustomer360.profile.kycStatus === 'VERIFIED' ? 'success' : 'warning'}>
                  KYC: {selectedCustomer360.profile.kycStatus}
                </Tag>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => {
                    handleOpenEditCustomer(selectedCustomer360.profile);
                  }}
                >
                  Edit Profile
                </Button>
              </Space>
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

            {/* Customer Self-Service Portal Access Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl text-xs">
              <div className="flex items-center gap-2.5">
                <SafetyCertificateOutlined className="text-emerald-700 text-lg shrink-0" />
                <div>
                  <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <span>Customer Self-Service Portal</span>
                    <Tag color="success" className="text-[10px] m-0">MSG91 OTP ENABLED</Tag>
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">
                    Login Mobile: +91 {selectedCustomer360.profile.mobile}
                  </div>
                </div>
              </div>
              <Button
                size="small"
                type="primary"
                ghost
                icon={<ShareAltOutlined />}
                onClick={() => {
                  const portalUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/portal/login`;
                  const inviteText = `Dear ${selectedCustomer360.profile.firstName}, you can now view your Sanjeevani Finance Savings, RD, Loans, and Passbook on your mobile: ${portalUrl}\nSign in with your registered mobile: ${selectedCustomer360.profile.mobile}`;
                  navigator.clipboard.writeText(inviteText);
                  message.success('Customer Portal invitation text copied to clipboard!');
                }}
              >
                Copy Portal Invite
              </Button>
            </div>

            <Tabs
              defaultActiveKey="overview"
              items={[
                {
                  key: 'overview',
                  label: 'Profile & KYC',
                  children: (
                    <div className="space-y-4">
                      <Descriptions bordered column={2} size="small">
                        <Descriptions.Item label="Member ID">
                          <span className="font-mono font-bold text-emerald-800">{selectedCustomer360.profile.customerNumber}</span>
                        </Descriptions.Item>
                        <Descriptions.Item label="System UUID">
                          <span className="font-mono text-xs text-slate-500">{selectedCustomer360.profile.id}</span>
                        </Descriptions.Item>
                        <Descriptions.Item label="Father/Spouse">
                          {selectedCustomer360.profile.fatherOrSpouseName || 'Not Specified'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Mobile">
                          <span className="font-mono font-semibold">{selectedCustomer360.profile.mobile}</span>
                        </Descriptions.Item>
                        <Descriptions.Item label="Email Address">
                          {selectedCustomer360.profile.email || 'Not Provided'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Date of Birth / Gender">
                          {selectedCustomer360.profile.dateOfBirth || 'N/A'} ({selectedCustomer360.profile.gender || 'MALE'})
                        </Descriptions.Item>
                        <Descriptions.Item label="Aadhaar UID">
                          <span className="font-mono text-xs font-semibold">
                            {selectedCustomer360.profile.aadhaar || <Tag color="default">Not Provided</Tag>}
                          </span>
                        </Descriptions.Item>
                        <Descriptions.Item label="Income Tax PAN">
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {selectedCustomer360.profile.pan || <Tag color="default">Not Provided</Tag>}
                          </span>
                        </Descriptions.Item>
                        <Descriptions.Item label="Risk Category">
                          <Tag color={selectedCustomer360.profile.riskCategory === 'HIGH' ? 'red' : 'green'}>
                            {selectedCustomer360.profile.riskCategory || 'LOW'}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Assigned Collector">
                          <span className="font-mono text-xs">{selectedCustomer360.profile.assignedCollectorId || 'USR-006'}</span>
                        </Descriptions.Item>
                        <Descriptions.Item label="Branch">
                          {selectedCustomer360.profile.branchName || 'Head Office - Main Branch (Delhi)'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Registered Date">
                          {selectedCustomer360.profile.createdAt ? new Date(selectedCustomer360.profile.createdAt).toLocaleString('en-IN') : selectedCustomer360.profile.joiningDate || 'N/A'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Address" span={2}>
                          {selectedCustomer360.profile.addressLine1 || selectedCustomer360.profile.address}, {selectedCustomer360.profile.city || 'Delhi'} - {selectedCustomer360.profile.postalCode || '110086'} ({selectedCustomer360.profile.state || 'Delhi'})
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
