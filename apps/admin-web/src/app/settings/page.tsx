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
  Drawer,
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
  ShoppingOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { fetchApi, postApi, patchApi, deleteApi } from '@/lib/api-client';
import { noEmojiRule } from '@/lib/emoji-sanitizer';
import { FinancialEngine } from '@sanjeevani/financial-engine';

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
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

  const [addProductModal, setAddProductModal] = useState(false);
  const [editProductModal, setEditProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Universal View Detail Drawer State
  const [viewRecord, setViewRecord] = useState<any>(null);
  const [viewRecordType, setViewRecordType] = useState<'STAFF' | 'PRODUCT' | 'BRANCH' | ''>('');
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);

  const handleOpenViewDetails = (record: any, type: 'STAFF' | 'PRODUCT' | 'BRANCH') => {
    setViewRecord(record);
    setViewRecordType(type);
    setViewDrawerOpen(true);
  };

  const [submitting, setSubmitting] = useState(false);

  const [staffForm] = Form.useForm();
  const [editStaffForm] = Form.useForm();
  const [branchForm] = Form.useForm();
  const [editBranchForm] = Form.useForm();
  const [productForm] = Form.useForm();
  const [editProductForm] = Form.useForm();

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
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sfms_user');
      if (stored) {
        try {
          setCurrentUser(JSON.parse(stored));
        } catch (e) {}
      }
    }
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

  // Product CRUD Handlers
  const handleAddProduct = async (values: any) => {
    setSubmitting(true);
    try {
      const res = await postApi('/products', values);
      if (res.success) {
        message.success(`Financial Product [${values.productName}] created successfully!`);
        setAddProductModal(false);
        productForm.resetFields();
        loadSettingsData();
      } else {
        message.error(res.message || 'Failed to create financial product.');
      }
    } catch (err: any) {
      message.error('An error occurred while creating product.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditProduct = (record: any) => {
    setSelectedProduct(record);
    editProductForm.setFieldsValue({
      productName: record.productName,
      productType: record.productType,
      interestRate: record.interestRate,
      minimumAmount: record.minimumAmount,
      maximumAmount: record.maximumAmount,
      minimumTenureMonths: record.minimumTenureMonths,
      maximumTenureMonths: record.maximumTenureMonths,
      isEnabled: record.isEnabled ?? true,
    });
    setEditProductModal(true);
  };

  const handleUpdateProduct = async (values: any) => {
    if (!selectedProduct) return;
    setSubmitting(true);
    try {
      const res = await patchApi(`/products/${selectedProduct.id}`, values);
      if (res.success) {
        message.success(`Product [${values.productName}] updated successfully!`);
        setEditProductModal(false);
        editProductForm.resetFields();
        loadSettingsData();
      } else {
        message.error(res.message || 'Failed to update product.');
      }
    } catch (err: any) {
      message.error('An error occurred while updating product.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    try {
      const res = await deleteApi(`/products/${id}`);
      if (res.success) {
        message.success(`Product [${name}] removed.`);
        loadSettingsData();
      } else {
        message.error(res.message || 'Failed to remove product.');
      }
    } catch (err: any) {
      message.error('Error removing product.');
    }
  };

  if (currentUser && !currentUser.roles?.includes('SUPER_ADMIN')) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center max-w-xl mx-auto my-12 space-y-4 shadow-sm">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center text-2xl mx-auto border border-amber-200">
          <SettingOutlined />
        </div>
        <h2 className="text-xl font-bold text-slate-900 m-0">Restricted Administration Access</h2>
        <p className="text-slate-500 text-sm">
          System Master Data, Staff Management, and Scheme Rules are strictly reserved for Super Administrators (Managing Directors).
        </p>
        <Button
          type="primary"
          onClick={() => (window.location.href = '/')}
          style={{ background: '#059669', borderColor: '#059669' }}
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 m-0">System Configuration & Master Control</h1>
          <p className="text-slate-500 text-sm mt-1 m-0">
            Full admin power: Manage staff logins, branches, financial products, compliance switches, and global parameters without accessing the database.
          </p>
        </div>
        <Space wrap>
          <Button
            icon={<ShoppingOutlined />}
            size="large"
            onClick={() => setAddProductModal(true)}
          >
            + Add Product
          </Button>
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
                  size="small"
                  dataSource={employees}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  onRow={(record) => ({
                    onClick: (e: any) => {
                      if (e.target.closest('button') || e.target.closest('.ant-popconfirm') || e.target.closest('.ant-popover')) return;
                      handleOpenViewDetails(record, 'STAFF');
                    },
                    className: 'cursor-pointer hover:bg-emerald-50/50 transition-colors',
                  })}
                  columns={[
                    {
                      title: 'Staff Member',
                      key: 'staff',
                      render: (_: any, r: any) => (
                        <div>
                          <div className="font-semibold text-slate-800">{r.name}</div>
                          <div className="text-xs font-mono text-emerald-700 font-bold">{r.employeeNumber}</div>
                        </div>
                      ),
                    },
                    {
                      title: 'Role',
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
                    {
                      title: 'Contact',
                      key: 'contact',
                      render: (_: any, r: any) => (
                        <div>
                          <div className="font-mono text-xs">{r.mobile}</div>
                          {r.email && <div className="text-xs text-slate-400 truncate max-w-[150px]">{r.email}</div>}
                        </div>
                      ),
                    },
                    { title: 'Branch', dataIndex: 'branchName', key: 'br', ellipsis: true },
                    {
                      title: 'Status',
                      dataIndex: 'employmentStatus',
                      key: 'st',
                      width: 90,
                      render: (s) => <Tag color={s === 'ACTIVE' ? 'green' : 'default'}>{s || 'ACTIVE'}</Tag>,
                    },
                    {
                      title: 'Actions',
                      key: 'actions',
                      width: 140,
                      render: (_: any, record: any) => (
                        <Space size={4}>
                          <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handleOpenViewDetails(record, 'STAFF')}
                          />
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleOpenEditStaff(record)}
                          >
                            Edit
                          </Button>
                          <Popconfirm
                            title="Delete Staff"
                            description={`Delete ${record.name}?`}
                            onConfirm={() => handleDeleteStaff(record.id, record.name)}
                            okText="Delete"
                            cancelText="Cancel"
                            okButtonProps={{ danger: true }}
                          >
                            <Button size="small" danger icon={<DeleteOutlined />} />
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
            key: 'products',
            label: `Financial Products Master (${products.length})`,
            children: (
              <Card
                className="glass-card"
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    style={{ background: '#059669', borderColor: '#059669' }}
                    onClick={() => setAddProductModal(true)}
                  >
                    Create Product
                  </Button>
                }
              >
                <Table
                  size="small"
                  dataSource={products}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  onRow={(record) => ({
                    onClick: (e: any) => {
                      if (e.target.closest('button') || e.target.closest('.ant-popconfirm') || e.target.closest('.ant-popover')) return;
                      handleOpenViewDetails(record, 'PRODUCT');
                    },
                    className: 'cursor-pointer hover:bg-emerald-50/50 transition-colors',
                  })}
                  columns={[
                    {
                      title: 'Product',
                      key: 'prod',
                      render: (_: any, r: any) => (
                        <div>
                          <div className="font-semibold text-slate-800">{r.productName}</div>
                          <div className="text-xs font-mono text-emerald-700 font-bold">{r.productCode}</div>
                        </div>
                      ),
                    },
                    { title: 'Category', dataIndex: 'productType', key: 'type', render: (t) => <Tag color="blue">{t}</Tag> },
                    { title: 'Interest Rate', dataIndex: 'interestRate', key: 'rate', render: (r) => <span className="font-bold text-indigo-700">{r}% p.a.</span> },
                    { title: 'Tenure Limits', key: 'tenure', render: (_: any, r: any) => `${r.minimumTenureMonths || 1} - ${r.maximumTenureMonths || 60} Mo` },
                    {
                      title: 'Amount Bounds',
                      key: 'bounds',
                      render: (_: any, r: any) => (
                        <div className="text-xs">
                          {FinancialEngine.formatINR(r.minimumAmount || 500)} - {FinancialEngine.formatINR(r.maximumAmount || 1000000)}
                        </div>
                      ),
                    },
                    { title: 'Status', dataIndex: 'isEnabled', key: 'st', width: 90, render: (e) => <Tag color={e ? 'green' : 'default'}>{e ? 'ENABLED' : 'DISABLED'}</Tag> },
                    {
                      title: 'Actions',
                      key: 'actions',
                      width: 140,
                      render: (_: any, record: any) => (
                        <Space size={4}>
                          <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handleOpenViewDetails(record, 'PRODUCT')}
                          />
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleOpenEditProduct(record)}
                          >
                            Edit
                          </Button>
                          <Popconfirm
                            title="Delete Product"
                            description={`Delete ${record.productName}?`}
                            onConfirm={() => handleDeleteProduct(record.id, record.productName)}
                            okText="Delete"
                            cancelText="Cancel"
                            okButtonProps={{ danger: true }}
                          >
                            <Button size="small" danger icon={<DeleteOutlined />} />
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
                  size="small"
                  dataSource={branches}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  onRow={(record) => ({
                    onClick: (e: any) => {
                      if (e.target.closest('button') || e.target.closest('.ant-popconfirm') || e.target.closest('.ant-popover')) return;
                      handleOpenViewDetails(record, 'BRANCH');
                    },
                    className: 'cursor-pointer hover:bg-emerald-50/50 transition-colors',
                  })}
                  columns={[
                    {
                      title: 'Branch',
                      key: 'br',
                      render: (_: any, r: any) => (
                        <div>
                          <div className="font-semibold text-slate-800">{r.name}</div>
                          <div className="text-xs font-mono text-emerald-700 font-bold">{r.branchCode}</div>
                        </div>
                      ),
                    },
                    {
                      title: 'Location',
                      key: 'loc',
                      ellipsis: true,
                      render: (_: any, r: any) => (
                        <div className="text-xs">
                          <div>{r.city ? `${r.city}, ${r.state || ''}` : r.address || '-'}</div>
                          {r.phone && <div className="text-slate-400 font-mono">{r.phone}</div>}
                        </div>
                      ),
                    },
                    { title: 'Status', dataIndex: 'status', key: 'st', width: 90, render: (s) => <Tag color={s === 'ACTIVE' ? 'success' : 'default'}>{s || 'ACTIVE'}</Tag> },
                    {
                      title: 'Actions',
                      key: 'actions',
                      width: 140,
                      render: (_: any, record: any) => (
                        <Space size={4}>
                          <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handleOpenViewDetails(record, 'BRANCH')}
                          />
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleOpenEditBranch(record)}
                          >
                            Edit
                          </Button>
                          <Popconfirm
                            title="Delete Branch"
                            description={`Delete branch ${record.name}?`}
                            onConfirm={() => handleDeleteBranch(record.id, record.name)}
                            okText="Delete"
                            cancelText="Cancel"
                            okButtonProps={{ danger: true }}
                          >
                            <Button size="small" danger icon={<DeleteOutlined />} />
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

      {/* Add New Product Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800">
            <ShoppingOutlined className="text-emerald-600" />
            <span>Create Financial Scheme / Product</span>
          </div>
        }
        open={addProductModal}
        onCancel={() => setAddProductModal(false)}
        footer={null}
        width={600}
      >
        <Form form={productForm} layout="vertical" onFinish={handleAddProduct} className="mt-4">
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                label="Product Name"
                name="productName"
                rules={[{ required: true, message: 'Enter product name' }]}
              >
                <Input placeholder="e.g. Sanjeevani Easy Business Loan" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Product Type"
                name="productType"
                rules={[{ required: true, message: 'Select product type' }]}
                initialValue="PERSONAL_LOAN"
              >
                <Select
                  options={[
                    { value: 'PERSONAL_LOAN', label: 'Personal Loan' },
                    { value: 'BUSINESS_LOAN', label: 'Business Loan' },
                    { value: 'GOLD_LOAN', label: 'Gold Loan' },
                    { value: 'MICRO_LOAN', label: 'Micro Enterprise Loan' },
                    { value: 'RECURRING_DEPOSIT', label: 'Recurring Deposit (RD)' },
                    { value: 'TERM_DEPOSIT', label: 'Term Deposit (FD)' },
                    { value: 'SAVINGS', label: 'Savings Account' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Interest Rate (% p.a.)"
                name="interestRate"
                rules={[{ required: true, message: 'Enter rate' }]}
                initialValue={14}
              >
                <InputNumber min={0} max={100} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Min Amount (₹)" name="minimumAmount" initialValue={5000}>
                <InputNumber min={100} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Max Amount (₹)" name="maximumAmount" initialValue={500000}>
                <InputNumber min={1000} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Min Tenure (Months)" name="minimumTenureMonths" initialValue={6}>
                <InputNumber min={1} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Max Tenure (Months)" name="maximumTenureMonths" initialValue={36}>
                <InputNumber min={1} className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button onClick={() => setAddProductModal(false)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              style={{ background: '#059669', borderColor: '#059669' }}
            >
              Create Product
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800">
            <EditOutlined className="text-emerald-600" />
            <span>Edit Product: {selectedProduct?.productName}</span>
          </div>
        }
        open={editProductModal}
        onCancel={() => setEditProductModal(false)}
        footer={null}
        width={600}
      >
        <Form form={editProductForm} layout="vertical" onFinish={handleUpdateProduct} className="mt-4">
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                label="Product Name"
                name="productName"
                rules={[{ required: true, message: 'Enter product name' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Product Type"
                name="productType"
                rules={[{ required: true, message: 'Select product type' }]}
              >
                <Select
                  options={[
                    { value: 'PERSONAL_LOAN', label: 'Personal Loan' },
                    { value: 'BUSINESS_LOAN', label: 'Business Loan' },
                    { value: 'GOLD_LOAN', label: 'Gold Loan' },
                    { value: 'MICRO_LOAN', label: 'Micro Enterprise Loan' },
                    { value: 'RECURRING_DEPOSIT', label: 'Recurring Deposit (RD)' },
                    { value: 'TERM_DEPOSIT', label: 'Term Deposit (FD)' },
                    { value: 'SAVINGS', label: 'Savings Account' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Interest Rate (% p.a.)"
                name="interestRate"
                rules={[{ required: true, message: 'Enter rate' }]}
              >
                <InputNumber min={0} max={100} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Min Amount (₹)" name="minimumAmount">
                <InputNumber min={100} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Max Amount (₹)" name="maximumAmount">
                <InputNumber min={1000} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Min Tenure (Months)" name="minimumTenureMonths">
                <InputNumber min={1} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Max Tenure (Months)" name="maximumTenureMonths">
                <InputNumber min={1} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Status" name="isEnabled">
                <Select
                  options={[
                    { value: true, label: 'Enabled / Offering to Customers' },
                    { value: false, label: 'Disabled / Suspended' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button onClick={() => setEditProductModal(false)}>Cancel</Button>
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

      {/* UNIVERSAL RECORD DETAILS DRAWER */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <EyeOutlined className="text-emerald-600 text-lg" />
            <span className="font-bold text-slate-800 text-base">
              {viewRecordType === 'BRANCH' && `Branch Details: ${viewRecord?.name || viewRecord?.branchCode}`}
              {viewRecordType === 'STAFF' && `Staff User Profile: ${viewRecord?.name || viewRecord?.employeeNumber}`}
              {viewRecordType === 'PRODUCT' && `Financial Product: ${viewRecord?.productName || viewRecord?.productCode}`}
            </span>
          </div>
        }
        open={viewDrawerOpen}
        onClose={() => {
          setViewDrawerOpen(false);
          setViewRecord(null);
        }}
        width={580}
      >
        {viewRecord && viewRecordType === 'BRANCH' && (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-emerald-700 font-semibold uppercase">Branch Code</div>
                <div className="text-xl font-bold font-mono text-emerald-950">{viewRecord.branchCode}</div>
              </div>
              <Tag color={viewRecord.status === 'ACTIVE' ? 'success' : 'default'} className="px-3 py-1 text-sm font-semibold">
                {viewRecord.status || 'ACTIVE'}
              </Tag>
            </div>
            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="Branch Name">{viewRecord.name}</Descriptions.Item>
              <Descriptions.Item label="Official Address">{viewRecord.address || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="City">{viewRecord.city || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="State">{viewRecord.state || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Official Contact Phone">{viewRecord.phone || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="System ID"><span className="font-mono text-xs">{viewRecord.id}</span></Descriptions.Item>
              <Descriptions.Item label="Opening Date">{viewRecord.openedAt || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Record Created">{viewRecord.createdAt ? new Date(viewRecord.createdAt).toLocaleString('en-IN') : 'N/A'}</Descriptions.Item>
            </Descriptions>
          </div>
        )}

        {viewRecord && viewRecordType === 'STAFF' && (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-emerald-700 font-semibold uppercase">Employee ID</div>
                <div className="text-xl font-bold font-mono text-emerald-950">{viewRecord.employeeNumber}</div>
              </div>
              <Tag color="purple" className="px-3 py-1 text-sm font-semibold">
                {viewRecord.designation || 'STAFF'}
              </Tag>
            </div>
            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="Full Name">{viewRecord.name}</Descriptions.Item>
              <Descriptions.Item label="Mobile (Login Username)">{viewRecord.mobile}</Descriptions.Item>
              <Descriptions.Item label="Email Address">{viewRecord.email || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Assigned Branch">{viewRecord.branchName || 'Head Office'}</Descriptions.Item>
              <Descriptions.Item label="Employment Status">
                <Tag color={viewRecord.employmentStatus === 'ACTIVE' ? 'green' : 'default'}>{viewRecord.employmentStatus || 'ACTIVE'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="System ID"><span className="font-mono text-xs">{viewRecord.id}</span></Descriptions.Item>
              <Descriptions.Item label="Joined Date">{viewRecord.joinedAt || viewRecord.joiningDate || 'N/A'}</Descriptions.Item>
            </Descriptions>
          </div>
        )}

        {viewRecord && viewRecordType === 'PRODUCT' && (
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-blue-700 font-semibold uppercase">Product Code</div>
                <div className="text-xl font-bold font-mono text-blue-950">{viewRecord.productCode}</div>
              </div>
              <Tag color={viewRecord.isEnabled ? 'green' : 'default'} className="px-3 py-1 text-sm font-semibold">
                {viewRecord.isEnabled ? 'ACTIVE / OFFERED' : 'DISABLED'}
              </Tag>
            </div>
            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="Product Name">{viewRecord.productName}</Descriptions.Item>
              <Descriptions.Item label="Product Category"><Tag color="blue">{viewRecord.productType}</Tag></Descriptions.Item>
              <Descriptions.Item label="Annual Interest Rate"><span className="font-bold text-indigo-700">{viewRecord.interestRate}% p.a.</span></Descriptions.Item>
              <Descriptions.Item label="Tenure Limits">{viewRecord.minimumTenureMonths || 1} to {viewRecord.maximumTenureMonths || 60} Months</Descriptions.Item>
              <Descriptions.Item label="Minimum Amount">{FinancialEngine.formatINR(viewRecord.minimumAmount || 500)}</Descriptions.Item>
              <Descriptions.Item label="Maximum Amount">{FinancialEngine.formatINR(viewRecord.maximumAmount || 1000000)}</Descriptions.Item>
              <Descriptions.Item label="System ID"><span className="font-mono text-xs">{viewRecord.id}</span></Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Drawer>
    </div>
  );
}
