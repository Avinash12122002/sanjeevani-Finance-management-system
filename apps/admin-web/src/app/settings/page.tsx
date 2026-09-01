'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Tabs,
  Space,
  Form,
  Input,
  Select,
  InputNumber,
  Modal,
  Switch,
  Row,
  Col,
  Descriptions,
  message,
} from 'antd';
import {
  SettingOutlined,
  BranchesOutlined,
  TeamOutlined,
  UserAddOutlined,
  PlusOutlined,
  BankOutlined,
  AppstoreAddOutlined,
} from '@ant-design/icons';
import { fetchApi, postApi } from '@/lib/api-client';

export default function SettingsPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [addStaffModal, setAddStaffModal] = useState(false);
  const [addBranchModal, setAddBranchModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [staffForm] = Form.useForm();
  const [branchForm] = Form.useForm();

  // Feature Flags (SRS §43)
  const [featureFlags, setFeatureFlags] = useState({
    RD_PRODUCT: true,
    TERM_DEPOSIT: true,
    COMMITTEE: false,
    LUCKY_DRAW: false,
    PREMATURE_WITHDRAWAL: true,
    LOAN_GUARANTOR: true,
    CASH_DISBURSEMENT: true,
  });

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    setLoading(true);
    const [bRes, eRes, pRes] = await Promise.all([
      fetchApi('/branches'),
      fetchApi('/employees'),
      fetchApi('/products'),
    ]);

    if (bRes.success && bRes.data) setBranches(bRes.data);
    if (eRes.success && eRes.data) setEmployees(eRes.data);
    if (pRes.success && pRes.data) setProducts(pRes.data);
    setLoading(false);
  };

  const handleToggleFlag = (key: string, checked: boolean) => {
    setFeatureFlags({ ...featureFlags, [key]: checked });
    message.success(`Compliance Feature Flag [${key}] updated to ${checked ? 'ENABLED' : 'DISABLED'}`);
  };

  const handleAddStaff = async (values: any) => {
    setSubmitting(true);
    try {
      const res = await postApi('/employees', values);
      if (res.success) {
        message.success(`Staff member [${values.name}] added successfully! Login credentials created.`);
        setAddStaffModal(false);
        staffForm.resetFields();
        loadSettingsData();
      } else {
        message.error(res.message || 'Failed to add staff member.');
      }
    } catch (err: any) {
      message.error('An error occurred while creating staff member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddBranch = async (values: any) => {
    setSubmitting(true);
    try {
      const res = await postApi('/branches', values);
      if (res.success) {
        message.success(`Branch [${values.name}] created successfully!`);
        setAddBranchModal(false);
        branchForm.resetFields();
        loadSettingsData();
      } else {
        message.error(res.message || 'Failed to create branch.');
      }
    } catch (err: any) {
      message.error('An error occurred while creating branch.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 m-0">System Configuration & Management Master</h1>
          <p className="text-slate-500 text-sm mt-1 m-0">
            Multi-branch network, staff role authorizations, product master and regulatory feature gating (SRS §43, §104).
          </p>
        </div>
        <Space wrap>
          <Button
            icon={<BankOutlined />}
            size="large"
            onClick={() => setAddBranchModal(true)}
          >
            + Add Branch
          </Button>
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            size="large"
            style={{ background: '#059669', borderColor: '#059669' }}
            onClick={() => setAddStaffModal(true)}
          >
            + Add Staff User
          </Button>
        </Space>
      </div>

      <Tabs
        defaultActiveKey="staff"
        items={[
          {
            key: 'staff',
            label: `Staff Users & Roles (${employees.length})`,
            children: (
              <Card
                className="glass-card"
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    style={{ background: '#059669', borderColor: '#059669' }}
                    onClick={() => setAddStaffModal(true)}
                  >
                    Add Staff Member
                  </Button>
                }
              >
                <Table
                  dataSource={employees}
                  rowKey="id"
                  loading={loading}
                  scroll={{ x: 800 }}
                  columns={[
                    { title: 'Employee ID', dataIndex: 'employeeNumber', key: 'emp', render: (e) => <span className="font-mono font-bold text-emerald-700">{e}</span> },
                    { title: 'Staff Name', dataIndex: 'name', key: 'name' },
                    {
                      title: 'Role / Designation',
                      dataIndex: 'designation',
                      key: 'role',
                      render: (r) => {
                        let color = 'blue';
                        if (r?.includes('MANAGER')) color = 'purple';
                        else if (r?.includes('CASHIER')) color = 'green';
                        else if (r?.includes('RECOVERY')) color = 'orange';
                        return <Tag color={color}>{r}</Tag>;
                      },
                    },
                    { title: 'Mobile / Login ID', dataIndex: 'mobile', key: 'mob' },
                    { title: 'Email', dataIndex: 'email', key: 'email' },
                    { title: 'Assigned Branch', dataIndex: 'branchName', key: 'br' },
                    { title: 'Status', dataIndex: 'employmentStatus', key: 'st', render: (s) => <Tag color="green">{s}</Tag> },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'branches',
            label: `Operating Branches (${branches.length})`,
            children: (
              <Card
                className="glass-card"
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    style={{ background: '#059669', borderColor: '#059669' }}
                    onClick={() => setAddBranchModal(true)}
                  >
                    Add Branch
                  </Button>
                }
              >
                <Table
                  dataSource={branches}
                  rowKey="id"
                  loading={loading}
                  scroll={{ x: 800 }}
                  columns={[
                    { title: 'Branch Code', dataIndex: 'branchCode', key: 'code', render: (c) => <span className="font-mono font-bold text-emerald-700">{c}</span> },
                    { title: 'Branch Name', dataIndex: 'name', key: 'name' },
                    { title: 'Address', dataIndex: 'address', key: 'address' },
                    { title: 'City', dataIndex: 'city', key: 'city' },
                    { title: 'State', dataIndex: 'state', key: 'state' },
                    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
                    { title: 'Status', dataIndex: 'status', key: 'st', render: (s) => <Tag color="success">{s}</Tag> },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'flags',
            label: 'Compliance Feature Flags (§43, BR-019)',
            children: (
              <Card className="glass-card" title="Operational Compliance & Legal Feature Switches">
                <div className="space-y-4">
                  <div className="text-xs text-slate-500">
                    Feature switches allow Sanjeevani management to enable or disable financial products dynamically without code deployments.
                  </div>

                  <div className="space-y-3">
                    {[
                      { key: 'RD_PRODUCT', title: 'Recurring Deposit (RD) Product Operations', desc: 'Allows opening and collecting on monthly RD accounts' },
                      { key: 'TERM_DEPOSIT', title: 'Term Deposit / Fixed Deposit Operations', desc: 'Allows opening term certificates' },
                      { key: 'COMMITTEE', title: 'Committee / Chit Fund Module (§42)', desc: 'Must remain OFF unless explicitly permitted by local jurisdiction' },
                      { key: 'LUCKY_DRAW', title: 'Lucky Draw & Promotional Scheme (§44)', desc: 'Must remain OFF unless permitted' },
                      { key: 'PREMATURE_WITHDRAWAL', title: 'Allow Premature Account Closures', desc: 'Enforces premature penalty deduction' },
                      { key: 'LOAN_GUARANTOR', title: 'Mandatory Guarantor Requirement', desc: 'Requires guarantor records on loans over ₹ 50,000' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                          <div className="font-bold text-sm text-slate-800">{item.title}</div>
                          <div className="text-xs text-slate-500">{item.desc}</div>
                        </div>
                        <Switch
                          checked={(featureFlags as any)[item.key]}
                          onChange={(checked) => handleToggleFlag(item.key, checked)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ),
          },
          {
            key: 'config',
            label: 'System Parameters (§104)',
            children: (
              <Card className="glass-card" title="Global Operational Parameters">
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="Company Name">Sanjeevani Finance Operations Ltd.</Descriptions.Item>
                  <Descriptions.Item label="Financial Year">FY 2026-2027 (April - March)</Descriptions.Item>
                  <Descriptions.Item label="Base Currency">INR (₹ - Indian Rupee)</Descriptions.Item>
                  <Descriptions.Item label="Timezone">Asia/Kolkata (IST +05:30)</Descriptions.Item>
                  <Descriptions.Item label="Customer ID Prefix">SJF-CUS-</Descriptions.Item>
                  <Descriptions.Item label="Loan ID Prefix">SJF-LN-</Descriptions.Item>
                  <Descriptions.Item label="Receipt ID Prefix">SJF-RCP-</Descriptions.Item>
                  <Descriptions.Item label="Daily Closing Cutoff">19:30 IST</Descriptions.Item>
                  <Descriptions.Item label="Maker-Checker Limit">₹ 1,00,000 (Branch Manager)</Descriptions.Item>
                  <Descriptions.Item label="Director Approval Limit">&gt; ₹ 3,00,000</Descriptions.Item>
                </Descriptions>
              </Card>
            ),
          },
        ]}
      />

      {/* Add New Staff Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800">
            <UserAddOutlined className="text-emerald-600" />
            <span>Create Staff Member & Login User Account</span>
          </div>
        }
        open={addStaffModal}
        onCancel={() => setAddStaffModal(false)}
        footer={null}
        width={600}
      >
        <Form form={staffForm} layout="vertical" onFinish={handleAddStaff} className="mt-4">
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Full Staff Name"
                name="name"
                rules={[{ required: true, message: 'Please enter full name' }]}
              >
                <Input placeholder="e.g. Ramesh Sharma" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Mobile Number (Login ID)"
                name="mobile"
                rules={[
                  { required: true, message: 'Please enter mobile number' },
                  { pattern: /^[0-9]{10}$/, message: 'Must be 10 digits' },
                ]}
              >
                <Input placeholder="10-digit mobile" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Official Email" name="email">
                <Input placeholder="e.g. ramesh@sanjeevanifinance.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Staff Role / Designation"
                name="designation"
                rules={[{ required: true, message: 'Select role' }]}
                initialValue="LOAN_OFFICER"
              >
                <Select
                  options={[
                    { value: 'BRANCH_MANAGER', label: 'Branch Manager (Approvals & Operations)' },
                    { value: 'CASHIER', label: 'Cashier / Teller (Counter Cash & Vault)' },
                    { value: 'LOAN_OFFICER', label: 'Loan Officer (Origination & Appraisal)' },
                    { value: 'ACCOUNTANT', label: 'Accountant (General Ledger & Reconciliation)' },
                    { value: 'RECOVERY_OFFICER', label: 'Recovery & Field Officer' },
                    { value: 'CUSTOMER_SERVICE', label: 'Customer Service Executive' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Assigned Branch"
                name="branchId"
                rules={[{ required: true, message: 'Select branch' }]}
                initialValue={branches[0]?.id || 'BR-001'}
              >
                <Select
                  options={branches.map((b) => ({
                    value: b.id,
                    label: `${b.name} (${b.branchCode})`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Monthly Salary (₹)" name="salary" initialValue={25000}>
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Initial Password"
                name="password"
                initialValue="Password@123"
                extra="Default setup password is Password@123"
              >
                <Input.Password placeholder="Password@123" />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button onClick={() => setAddStaffModal(false)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              style={{ background: '#059669', borderColor: '#059669' }}
            >
              Create Staff User
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Add New Branch Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800">
            <BankOutlined className="text-emerald-600" />
            <span>Register New Operating Branch</span>
          </div>
        }
        open={addBranchModal}
        onCancel={() => setAddBranchModal(false)}
        footer={null}
        width={550}
      >
        <Form form={branchForm} layout="vertical" onFinish={handleAddBranch} className="mt-4">
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Branch Name"
                name="name"
                rules={[{ required: true, message: 'Enter branch name' }]}
              >
                <Input placeholder="e.g. South Agra City Branch" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="Physical Address"
                name="address"
                rules={[{ required: true, message: 'Enter branch address' }]}
              >
                <Input placeholder="e.g. Shop 12, Main Market" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="City"
                name="city"
                rules={[{ required: true, message: 'Enter city' }]}
              >
                <Input placeholder="e.g. Agra" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="State"
                name="state"
                rules={[{ required: true, message: 'Enter state' }]}
                initialValue="Uttar Pradesh"
              >
                <Input placeholder="State" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Contact Phone" name="phone">
                <Input placeholder="e.g. +91 562 2520102" />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button onClick={() => setAddBranchModal(false)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              style={{ background: '#059669', borderColor: '#059669' }}
            >
              Register Branch
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
