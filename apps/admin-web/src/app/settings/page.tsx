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
  Popconfirm,
  message,
} from 'antd';
import {
  SettingOutlined,
  BranchesOutlined,
  TeamOutlined,
  UserAddOutlined,
  PlusOutlined,
  BankOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreAddOutlined,
} from '@ant-design/icons';
import { fetchApi, postApi, patchApi, deleteApi } from '@/lib/api-client';

export default function SettingsPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [addStaffModal, setAddStaffModal] = useState(false);
  const [editStaffModal, setEditStaffModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  const [addBranchModal, setAddBranchModal] = useState(false);
  const [editBranchModal, setEditBranchModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);

  const [submitting, setSubmitting] = useState(false);

  const [staffForm] = Form.useForm();
  const [editStaffForm] = Form.useForm();
  const [branchForm] = Form.useForm();
  const [editBranchForm] = Form.useForm();

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

  // Staff CRUD Handlers
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

  const handleOpenEditStaff = (record: any) => {
    setSelectedStaff(record);
    editStaffForm.setFieldsValue({
      name: record.name,
      mobile: record.mobile,
      email: record.email,
      designation: record.designation,
      branchId: record.branchId,
      salary: record.salary,
      employmentStatus: record.employmentStatus || 'ACTIVE',
    });
    setEditStaffModal(true);
  };

  const handleUpdateStaff = async (values: any) => {
    if (!selectedStaff) return;
    setSubmitting(true);
    try {
      const res = await patchApi(`/employees/${selectedStaff.id}`, values);
      if (res.success) {
        message.success(`Staff member [${values.name}] updated successfully!`);
        setEditStaffModal(false);
        editStaffForm.resetFields();
        loadSettingsData();
      } else {
        message.error(res.message || 'Failed to update staff member.');
      }
    } catch (err: any) {
      message.error('An error occurred while updating staff member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    try {
      const res = await deleteApi(`/employees/${id}`);
      if (res.success) {
        message.success(`Staff member [${name}] deleted.`);
        loadSettingsData();
      } else {
        message.error(res.message || 'Failed to delete staff member.');
      }
    } catch (err: any) {
      message.error('Error deleting staff member.');
    }
  };

  // Branch CRUD Handlers
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

  const handleOpenEditBranch = (record: any) => {
    setSelectedBranch(record);
    editBranchForm.setFieldsValue({
      name: record.name,
      address: record.address,
      city: record.city,
      state: record.state,
      phone: record.phone,
      status: record.status || 'ACTIVE',
    });
    setEditBranchModal(true);
  };

  const handleUpdateBranch = async (values: any) => {
    if (!selectedBranch) return;
    setSubmitting(true);
    try {
      const res = await patchApi(`/branches/${selectedBranch.id}`, values);
      if (res.success) {
        message.success(`Branch [${values.name}] updated successfully!`);
        setEditBranchModal(false);
        editBranchForm.resetFields();
        loadSettingsData();
      } else {
        message.error(res.message || 'Failed to update branch.');
      }
    } catch (err: any) {
      message.error('An error occurred while updating branch.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBranch = async (id: string, name: string) => {
    try {
      const res = await deleteApi(`/branches/${id}`);
      if (res.success) {
        message.success(`Branch [${name}] removed.`);
        loadSettingsData();
      } else {
        message.error(res.message || 'Failed to remove branch.');
      }
    } catch (err: any) {
      message.error('Error removing branch.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 m-0">System Configuration & Management Master</h1>
          <p className="text-slate-500 text-sm mt-1 m-0">
            Full admin control: Add, edit, or delete staff, operating branches, compliance switches, and global parameters.
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
                  scroll={{ x: 900 }}
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
                        else if (r?.includes('ADMIN')) color = 'red';
                        return <Tag color={color}>{r}</Tag>;
                      },
                    },
                    { title: 'Mobile / Login ID', dataIndex: 'mobile', key: 'mob' },
                    { title: 'Email', dataIndex: 'email', key: 'email' },
                    { title: 'Assigned Branch', dataIndex: 'branchName', key: 'br' },
                    {
                      title: 'Status',
                      dataIndex: 'employmentStatus',
                      key: 'st',
                      render: (s) => <Tag color={s === 'ACTIVE' ? 'green' : 'default'}>{s || 'ACTIVE'}</Tag>,
                    },
                    {
                      title: 'Actions',
                      key: 'actions',
                      render: (_: any, record: any) => (
                        <Space>
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleOpenEditStaff(record)}
                          >
                            Edit
                          </Button>
                          <Popconfirm
                            title="Delete Staff Member"
                            description={`Are you sure you want to delete ${record.name}? Login access will be revoked.`}
                            onConfirm={() => handleDeleteStaff(record.id, record.name)}
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
                  scroll={{ x: 900 }}
                  columns={[
                    { title: 'Branch Code', dataIndex: 'branchCode', key: 'code', render: (c) => <span className="font-mono font-bold text-emerald-700">{c}</span> },
                    { title: 'Branch Name', dataIndex: 'name', key: 'name' },
                    { title: 'Address', dataIndex: 'address', key: 'address' },
                    { title: 'City', dataIndex: 'city', key: 'city' },
                    { title: 'State', dataIndex: 'state', key: 'state' },
                    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
                    { title: 'Status', dataIndex: 'status', key: 'st', render: (s) => <Tag color={s === 'ACTIVE' ? 'success' : 'default'}>{s || 'ACTIVE'}</Tag> },
                    {
                      title: 'Actions',
                      key: 'actions',
                      render: (_: any, record: any) => (
                        <Space>
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleOpenEditBranch(record)}
                          >
                            Edit
                          </Button>
                          <Popconfirm
                            title="Delete Branch"
                            description={`Delete operating branch ${record.name}?`}
                            onConfirm={() => handleDeleteBranch(record.id, record.name)}
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

      {/* Edit Staff Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800">
            <EditOutlined className="text-emerald-600" />
            <span>Edit Staff Member: {selectedStaff?.name}</span>
          </div>
        }
        open={editStaffModal}
        onCancel={() => setEditStaffModal(false)}
        footer={null}
        width={600}
      >
        <Form form={editStaffForm} layout="vertical" onFinish={handleUpdateStaff} className="mt-4">
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Full Staff Name"
                name="name"
                rules={[{ required: true, message: 'Please enter full name' }]}
              >
                <Input />
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
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Official Email" name="email">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Staff Role / Designation"
                name="designation"
                rules={[{ required: true, message: 'Select role' }]}
              >
                <Select
                  options={[
                    { value: 'SUPER_ADMIN', label: 'Super Admin / Director (Full System Access)' },
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
              <Form.Item label="Monthly Salary (₹)" name="salary">
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Employment Status" name="employmentStatus">
                <Select
                  options={[
                    { value: 'ACTIVE', label: 'Active (Permitted Login)' },
                    { value: 'INACTIVE', label: 'Inactive / Suspended' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button onClick={() => setEditStaffModal(false)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              style={{ background: '#059669', borderColor: '#059669' }}
            >
              Save Changes
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

      {/* Edit Branch Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800">
            <EditOutlined className="text-emerald-600" />
            <span>Edit Operating Branch: {selectedBranch?.name}</span>
          </div>
        }
        open={editBranchModal}
        onCancel={() => setEditBranchModal(false)}
        footer={null}
        width={550}
      >
        <Form form={editBranchForm} layout="vertical" onFinish={handleUpdateBranch} className="mt-4">
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Branch Name"
                name="name"
                rules={[{ required: true, message: 'Enter branch name' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="Physical Address"
                name="address"
                rules={[{ required: true, message: 'Enter branch address' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="City"
                name="city"
                rules={[{ required: true, message: 'Enter city' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="State"
                name="state"
                rules={[{ required: true, message: 'Enter state' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Contact Phone" name="phone">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Branch Status" name="status">
                <Select
                  options={[
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'INACTIVE', label: 'Inactive / Closed' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button onClick={() => setEditBranchModal(false)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              style={{ background: '#059669', borderColor: '#059669' }}
            >
              Save Changes
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
