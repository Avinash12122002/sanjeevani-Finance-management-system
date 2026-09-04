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
  UserOutlined,
  CustomerServiceOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import { fetchApi, postApi, patchApi, deleteApi } from '@/lib/api-client';
import { noEmojiRule } from '@/lib/emoji-sanitizer';
import { FinancialEngine } from '@sanjeevani/financial-engine';
import { UserRole, PriorityLevel, ComplaintStatus } from '@sanjeevani/shared-types';

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
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

  const [addUserModal, setAddUserModal] = useState(false);
  const [editUserModal, setEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const [addComplaintModal, setAddComplaintModal] = useState(false);
  const [resolveComplaintModal, setResolveComplaintModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);

  // Universal View Detail Drawer State
  const [viewRecord, setViewRecord] = useState<any>(null);
  const [viewRecordType, setViewRecordType] = useState<'STAFF' | 'PRODUCT' | 'BRANCH' | 'USER' | 'COMPLAINT' | ''>('');
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);

  const handleOpenViewDetails = (record: any, type: 'STAFF' | 'PRODUCT' | 'BRANCH' | 'USER' | 'COMPLAINT') => {
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
  const [userForm] = Form.useForm();
  const [editUserForm] = Form.useForm();
  const [complaintForm] = Form.useForm();
  const [resolveComplaintForm] = Form.useForm();

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
    const [bRes, eRes, pRes, uRes, cRes, custRes] = await Promise.all([
      fetchApi('/branches'),
      fetchApi('/employees'),
      fetchApi('/products'),
      fetchApi('/auth/users'),
      fetchApi('/complaints'),
      fetchApi('/customers?limit=100'),
    ]);

    if (bRes.success && bRes.data) setBranches(bRes.data);
    if (eRes.success && eRes.data) setEmployees(eRes.data);
    if (pRes.success && pRes.data) setProducts(pRes.data);
    if (uRes.success && uRes.data) setUsers(uRes.data);
    if (cRes.success && cRes.data) setComplaints(cRes.data);
    if (custRes.success && custRes.data) setCustomersList(custRes.data.items || custRes.data);
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

  // User Accounts CRUD Handlers
  const handleAddUser = async (values: any) => {
    setSubmitting(true);
    try {
      const res = await postApi('/auth/users', values);
      if (res.success) {
        message.success(`User [${values.username}] created successfully!`);
        setAddUserModal(false);
        userForm.resetFields();
        loadSettingsData();
      } else {
        message.error(res.message || 'Failed to create user account.');
      }
    } catch (err: any) {
      message.error('An error occurred while creating user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditUser = (record: any) => {
    setSelectedUser(record);
    editUserForm.setFieldsValue({
      username: record.username,
      email: record.email,
      mobile: record.mobile,
      roles: record.roles || [UserRole.LOAN_OFFICER],
      branchId: record.branchId,
      isActive: record.isActive !== false,
      password: '',
    });
    setEditUserModal(true);
  };

  const handleUpdateUser = async (values: any) => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      const res = await patchApi(`/auth/users/${selectedUser.id}`, values);
      if (res.success) {
        message.success(`User [${selectedUser.username}] updated successfully!`);
        setEditUserModal(false);
        editUserForm.resetFields();
        loadSettingsData();
      } else {
        message.error(res.message || 'Failed to update user account.');
      }
    } catch (err: any) {
      message.error('An error occurred while updating user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, username: string) => {
    try {
      const res = await deleteApi(`/auth/users/${id}`);
      if (res.success) {
        message.success(`User account [${username}] deleted.`);
        loadSettingsData();
      } else {
        message.error(res.message || 'Failed to delete user account.');
      }
    } catch (err: any) {
      message.error('Error deleting user account.');
    }
  };

  // Complaint CRUD Handlers
  const handleAddComplaint = async (values: any) => {
    setSubmitting(true);
    try {
      const res = await postApi('/complaints', values);
      if (res.success) {
        message.success('Complaint ticket logged successfully!');
        setAddComplaintModal(false);
        complaintForm.resetFields();
        loadSettingsData();
      } else {
        message.error(res.message || 'Failed to log complaint ticket.');
      }
    } catch (err: any) {
      message.error('An error occurred while creating complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenResolveComplaint = (record: any) => {
    setSelectedComplaint(record);
    resolveComplaintForm.setFieldsValue({
      resolution: record.resolution || '',
    });
    setResolveComplaintModal(true);
  };

  const handleResolveComplaint = async (values: any) => {
    if (!selectedComplaint) return;
    setSubmitting(true);
    try {
      const res = await patchApi(`/complaints/${selectedComplaint.id}/resolve`, values);
      if (res.success) {
        message.success('Complaint marked as RESOLVED!');
        setResolveComplaintModal(false);
        resolveComplaintForm.resetFields();
        loadSettingsData();
      } else {
        message.error(res.message || 'Failed to resolve complaint.');
      }
    } catch (err: any) {
      message.error('An error occurred while resolving complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComplaint = async (id: string, ticketNum: string) => {
    try {
      const res = await deleteApi(`/complaints/${id}`);
      if (res.success) {
        message.success(`Complaint [${ticketNum}] deleted.`);
        loadSettingsData();
      } else {
        message.error(res.message || 'Failed to delete complaint.');
      }
    } catch (err: any) {
      message.error('Error deleting complaint.');
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

  const renderTabHeader = (title: string, count?: number, fullTitle?: string) => (
    <span
      className="text-xs font-medium max-w-[110px] md:max-w-[135px] truncate inline-block align-middle"
      title={fullTitle || `${title}${count !== undefined ? ` (${count})` : ''}`}
    >
      {title}{count !== undefined ? ` (${count})` : ''}
    </span>
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-base font-bold text-slate-900 m-0">System Configuration & Master Control</h1>
          <p className="text-slate-500 text-xs mt-0.5 m-0">
            Full admin power: Manage staff, branches, products, compliance switches, and system parameters without accessing the database.
          </p>
        </div>
        <Space wrap size={6}>
          <Button
            icon={<UserOutlined />}
            size="small"
            onClick={() => setAddUserModal(true)}
          >
            + User
          </Button>
          <Button
            icon={<CustomerServiceOutlined />}
            size="small"
            onClick={() => setAddComplaintModal(true)}
          >
            + Complaint
          </Button>
          <Button
            icon={<ShoppingOutlined />}
            size="small"
            onClick={() => setAddProductModal(true)}
          >
            + Product
          </Button>
          <Button
            icon={<BankOutlined />}
            size="small"
            onClick={() => setAddBranchModal(true)}
          >
            + Branch
          </Button>
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            size="small"
            style={{ background: '#059669', borderColor: '#059669' }}
            onClick={() => setAddStaffModal(true)}
          >
            + Staff Member
          </Button>
        </Space>
      </div>

      <Tabs
        defaultActiveKey="staff"
        size="small"
        tabBarStyle={{ marginBottom: 16 }}
        items={[
          {
            key: 'staff',
            label: renderTabHeader('Staff', employees.length, 'Staff Members'),
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
            key: 'users',
            label: renderTabHeader('Users', users.length, 'User Accounts & Logins'),
            children: (
              <Card
                className="glass-card"
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    style={{ background: '#059669', borderColor: '#059669' }}
                    onClick={() => setAddUserModal(true)}
                  >
                    Add User Account
                  </Button>
                }
              >
                <Table
                  size="small"
                  dataSource={users}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 900 }}
                  onRow={(record) => ({
                    onClick: (e: any) => {
                      if (e.target.closest('button') || e.target.closest('.ant-popconfirm') || e.target.closest('.ant-popover')) return;
                      handleOpenViewDetails(record, 'USER');
                    },
                    className: 'cursor-pointer hover:bg-emerald-50/50 transition-colors',
                  })}
                  columns={[
                    {
                      title: 'Username',
                      key: 'usr',
                      width: 160,
                      render: (_: any, r: any) => (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center font-bold text-emerald-800 text-xs shrink-0">
                            {r.username?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 truncate">{r.username}</div>
                            <div className="text-xs text-slate-400 font-mono truncate">{r.id}</div>
                          </div>
                        </div>
                      ),
                    },
                    {
                      title: 'Roles & Permissions',
                      key: 'roles',
                      width: 170,
                      render: (_: any, r: any) => (
                        <Space wrap size={[0, 4]}>
                          {(r.roles || ['LOAN_OFFICER']).map((role: string) => {
                            let color = 'blue';
                            if (role.includes('ADMIN')) color = 'red';
                            else if (role.includes('MANAGER')) color = 'purple';
                            else if (role.includes('CASHIER')) color = 'green';
                            else if (role.includes('ACCOUNTANT')) color = 'cyan';
                            return <Tag key={role} color={color}>{role}</Tag>;
                          })}
                        </Space>
                      ),
                    },
                    {
                      title: 'Contact Details',
                      key: 'contact',
                      width: 180,
                      render: (_: any, r: any) => (
                        <div>
                          <div className="font-mono text-xs text-slate-700">{r.mobile || 'No mobile'}</div>
                          <div className="text-xs text-slate-400 truncate max-w-[170px]">{r.email || 'No email'}</div>
                        </div>
                      ),
                    },
                    {
                      title: 'Branch',
                      dataIndex: 'branchName',
                      key: 'br',
                      width: 180,
                      render: (b: string) => b || 'Head Office - Main Branch',
                    },
                    {
                      title: 'Login Status',
                      key: 'status',
                      width: 110,
                      render: (_: any, r: any) => (
                        <Tag color={r.isActive !== false ? 'success' : 'error'}>
                          {r.isActive !== false ? 'ACTIVE' : 'DISABLED'}
                        </Tag>
                      ),
                    },
                    {
                      title: 'Actions',
                      key: 'actions',
                      width: 150,
                      render: (_: any, record: any) => (
                        <Space size={4}>
                          <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handleOpenViewDetails(record, 'USER')}
                            title="View User Account Details"
                          />
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleOpenEditUser(record)}
                          >
                            Edit
                          </Button>
                          <Popconfirm
                            title="Delete User Account"
                            description={`Permanently delete login account "${record.username}"?`}
                            onConfirm={() => handleDeleteUser(record.id, record.username)}
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
            label: renderTabHeader('Products', products.length, 'Financial Products Master'),
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
            label: renderTabHeader('Branches', branches.length, 'Operating Branches'),
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
            key: 'complaints',
            label: renderTabHeader('Complaints', complaints.length, 'Complaints & Grievances'),
            children: (
              <Card
                className="glass-card"
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    style={{ background: '#059669', borderColor: '#059669' }}
                    onClick={() => setAddComplaintModal(true)}
                  >
                    Log Complaint Ticket
                  </Button>
                }
              >
                <Table
                  size="small"
                  dataSource={complaints}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 1100 }}
                  onRow={(record) => ({
                    onClick: (e: any) => {
                      if (e.target.closest('button') || e.target.closest('.ant-popconfirm') || e.target.closest('.ant-popover')) return;
                      handleOpenViewDetails(record, 'COMPLAINT');
                    },
                    className: 'cursor-pointer hover:bg-emerald-50/50 transition-colors',
                  })}
                  columns={[
                    {
                      title: 'Ticket #',
                      dataIndex: 'complaintNumber',
                      key: 'num',
                      width: 140,
                      render: (n: string) => <span className="font-mono font-bold text-emerald-700">{n}</span>,
                    },
                    {
                      title: 'Customer / Member',
                      key: 'cust',
                      width: 170,
                      render: (_: any, r: any) => (
                        <div>
                          <div className="font-semibold text-slate-800">{r.customerName || 'General Customer'}</div>
                          <div className="text-xs text-slate-400 font-mono">{r.customerNumber || r.customerId}</div>
                        </div>
                      ),
                    },
                    {
                      title: 'Category',
                      dataIndex: 'category',
                      key: 'cat',
                      width: 150,
                      render: (c: string) => <Tag color="blue">{c || 'Service Request'}</Tag>,
                    },
                    {
                      title: 'Priority',
                      dataIndex: 'priority',
                      key: 'pri',
                      width: 110,
                      render: (p: string) => {
                        let color = 'default';
                        if (p === 'CRITICAL' || p === 'HIGH') color = 'red';
                        else if (p === 'MEDIUM') color = 'orange';
                        else if (p === 'LOW') color = 'green';
                        return <Tag color={color}>{p || 'MEDIUM'}</Tag>;
                      },
                    },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      key: 'st',
                      width: 120,
                      render: (s: string) => {
                        let color = 'default';
                        if (s === 'OPEN') color = 'gold';
                        else if (s === 'IN_PROGRESS') color = 'blue';
                        else if (s === 'RESOLVED') color = 'green';
                        return <Tag color={color}>{s || 'OPEN'}</Tag>;
                      },
                    },
                    {
                      title: 'Issue Description',
                      dataIndex: 'description',
                      key: 'desc',
                      width: 250,
                      render: (desc: string) => (
                        <div className="max-w-[240px] truncate text-xs text-slate-700 font-normal" title={desc}>
                          {desc || 'No description provided'}
                        </div>
                      ),
                    },
                    {
                      title: 'Resolution Notes',
                      dataIndex: 'resolution',
                      key: 'res',
                      width: 220,
                      render: (r: string) =>
                        r ? (
                          <div className="max-w-[210px] truncate text-xs text-emerald-700 font-medium" title={r}>
                            {r}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Pending</span>
                        ),
                    },
                    {
                      title: 'Actions',
                      key: 'actions',
                      width: 160,
                      fixed: 'right',
                      render: (_: any, record: any) => (
                        <Space size={4}>
                          <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handleOpenViewDetails(record, 'COMPLAINT')}
                            title="View Full Ticket Details"
                          />
                          {record.status !== 'RESOLVED' && (
                            <Button
                              size="small"
                              type="primary"
                              ghost
                              icon={<CheckCircleOutlined />}
                              onClick={() => handleOpenResolveComplaint(record)}
                            >
                              Resolve
                            </Button>
                          )}
                          <Popconfirm
                            title="Delete Complaint"
                            description={`Delete ticket ${record.complaintNumber}?`}
                            onConfirm={() => handleDeleteComplaint(record.id, record.complaintNumber)}
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
            label: renderTabHeader('Compliance', undefined, 'Compliance Feature Flags (§43, BR-019)'),
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
            label: renderTabHeader('Parameters', undefined, 'System Parameters (§104)'),
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

      {/* Add New User Account Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800">
            <UserAddOutlined className="text-emerald-600" />
            <span>Create Login User Account (Credentials)</span>
          </div>
        }
        open={addUserModal}
        onCancel={() => setAddUserModal(false)}
        footer={null}
        width={580}
      >
        <Form form={userForm} layout="vertical" onFinish={handleAddUser} className="mt-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Username / Login Handle"
                name="username"
                rules={[{ required: true, message: 'Please enter username' }]}
              >
                <Input placeholder="e.g. ashish_admin" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Initial Password"
                name="password"
                rules={[{ required: true, message: 'Please enter password' }]}
              >
                <Input.Password placeholder="Password@123" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Role / Permission Level"
                name="role"
                initialValue="LOAN_OFFICER"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { value: 'SUPER_ADMIN', label: 'Super Admin (Full System Access)' },
                    { value: 'BRANCH_MANAGER', label: 'Branch Manager' },
                    { value: 'ACCOUNTANT', label: 'Accountant' },
                    { value: 'CASHIER', label: 'Cashier' },
                    { value: 'LOAN_OFFICER', label: 'Loan Officer' },
                    { value: 'RECOVERY_OFFICER', label: 'Recovery Officer' },
                    { value: 'CUSTOMER_SERVICE', label: 'Customer Service' },
                    { value: 'AUDITOR', label: 'Auditor (Read Only)' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Assigned Branch"
                name="branchId"
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
              <Form.Item label="Email Address" name="email">
                <Input placeholder="e.g. ashish@gmail.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Mobile Number" name="mobile">
                <Input placeholder="e.g. 9876543210" />
              </Form.Item>
            </Col>
          </Row>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button onClick={() => setAddUserModal(false)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              style={{ background: '#059669', borderColor: '#059669' }}
            >
              Create User Account
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Edit User Account & Reset Password Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800">
            <EditOutlined className="text-emerald-600" />
            <span>Edit User: {selectedUser?.username}</span>
          </div>
        }
        open={editUserModal}
        onCancel={() => setEditUserModal(false)}
        footer={null}
        width={580}
      >
        <Form form={editUserForm} layout="vertical" onFinish={handleUpdateUser} className="mt-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Username"
                name="username"
                rules={[{ required: true, message: 'Please enter username' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Reset Password (Leave blank to keep current)"
                name="password"
              >
                <Input.Password placeholder="New password" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Role" name="role">
                <Select
                  options={[
                    { value: 'SUPER_ADMIN', label: 'Super Admin' },
                    { value: 'BRANCH_MANAGER', label: 'Branch Manager' },
                    { value: 'ACCOUNTANT', label: 'Accountant' },
                    { value: 'CASHIER', label: 'Cashier' },
                    { value: 'LOAN_OFFICER', label: 'Loan Officer' },
                    { value: 'RECOVERY_OFFICER', label: 'Recovery Officer' },
                    { value: 'CUSTOMER_SERVICE', label: 'Customer Service' },
                    { value: 'AUDITOR', label: 'Auditor' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Branch" name="branchId">
                <Select
                  options={branches.map((b) => ({
                    value: b.id,
                    label: `${b.name} (${b.branchCode})`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Email Address" name="email">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Mobile Number" name="mobile">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Account Status" name="isActive" valuePropName="checked">
                <Switch checkedChildren="ACTIVE" unCheckedChildren="DISABLED" />
              </Form.Item>
            </Col>
          </Row>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button onClick={() => setEditUserModal(false)}>Cancel</Button>
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

      {/* Log Complaint / Ticket Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800">
            <CustomerServiceOutlined className="text-emerald-600" />
            <span>Log Member Complaint / Service Request</span>
          </div>
        }
        open={addComplaintModal}
        onCancel={() => setAddComplaintModal(false)}
        footer={null}
        width={580}
      >
        <Form form={complaintForm} layout="vertical" onFinish={handleAddComplaint} className="mt-4">
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Customer / Member"
                name="customerId"
                rules={[{ required: true, message: 'Please select customer' }]}
              >
                <Select
                  showSearch
                  placeholder="Search customer by name or phone"
                  optionFilterProp="label"
                  options={customersList.map((c) => ({
                    value: c.id,
                    label: `${c.firstName} ${c.lastName} (${c.customerNumber || c.mobile})`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Category"
                name="category"
                initialValue="Service Request"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { value: 'Service Request', label: 'Service Request' },
                    { value: 'Account Inquiry', label: 'Account Inquiry' },
                    { value: 'Loan Discrepancy', label: 'Loan Discrepancy' },
                    { value: 'Passbook / Statement', label: 'Passbook / Statement' },
                    { value: 'Payment Dispute', label: 'Payment Dispute' },
                    { value: 'General Feedback', label: 'General Feedback' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Priority"
                name="priority"
                initialValue="MEDIUM"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { value: 'LOW', label: 'Low Priority' },
                    { value: 'MEDIUM', label: 'Medium Priority' },
                    { value: 'HIGH', label: 'High Priority' },
                    { value: 'CRITICAL', label: 'Critical / Urgent' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="Issue Description"
                name="description"
                rules={[{ required: true, message: 'Please provide issue description' }]}
              >
                <Input.TextArea rows={3} placeholder="Describe the grievance or request in detail..." />
              </Form.Item>
            </Col>
          </Row>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button onClick={() => setAddComplaintModal(false)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              style={{ background: '#059669', borderColor: '#059669' }}
            >
              Submit Ticket
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Resolve Complaint Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800">
            <CheckCircleOutlined className="text-emerald-600" />
            <span>Resolve Ticket: {selectedComplaint?.complaintNumber}</span>
          </div>
        }
        open={resolveComplaintModal}
        onCancel={() => setResolveComplaintModal(false)}
        footer={null}
        width={500}
      >
        <Form form={resolveComplaintForm} layout="vertical" onFinish={handleResolveComplaint} className="mt-4">
          <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-xs text-slate-500 uppercase font-semibold">Complaint Summary</div>
            <div className="text-sm font-medium text-slate-800 mt-1">{selectedComplaint?.description}</div>
          </div>
          <Form.Item
            label="Resolution Action & Remarks"
            name="resolution"
            rules={[{ required: true, message: 'Please enter resolution notes' }]}
          >
            <Input.TextArea rows={4} placeholder="Specify actions taken, refund processed, or explanation provided..." />
          </Form.Item>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button onClick={() => setResolveComplaintModal(false)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              style={{ background: '#059669', borderColor: '#059669' }}
            >
              Mark Resolved
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
              {viewRecordType === 'USER' && `User Account Details: ${viewRecord?.username || viewRecord?.id}`}
              {viewRecordType === 'COMPLAINT' && `Grievance Ticket Details: ${viewRecord?.complaintNumber || viewRecord?.id}`}
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

        {viewRecord && viewRecordType === 'USER' && (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-200 text-emerald-900 flex items-center justify-center font-bold text-base">
                  {viewRecord.username?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <div className="text-xs text-emerald-700 font-semibold uppercase">Username / ID</div>
                  <div className="text-xl font-bold font-mono text-emerald-950">{viewRecord.username}</div>
                </div>
              </div>
              <Tag color={viewRecord.isActive !== false ? 'success' : 'error'} className="px-3 py-1 text-sm font-semibold">
                {viewRecord.isActive !== false ? 'ACTIVE' : 'DISABLED'}
              </Tag>
            </div>
            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="Username">{viewRecord.username}</Descriptions.Item>
              <Descriptions.Item label="Roles & Permissions">
                <Space wrap size={[0, 4]}>
                  {(viewRecord.roles || ['LOAN_OFFICER']).map((r: string) => {
                    let color = 'blue';
                    if (r.includes('ADMIN')) color = 'red';
                    else if (r.includes('MANAGER')) color = 'purple';
                    else if (r.includes('CASHIER')) color = 'green';
                    else if (r.includes('ACCOUNTANT')) color = 'cyan';
                    return <Tag key={r} color={color}>{r}</Tag>;
                  })}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Mobile Number">{viewRecord.mobile || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Email Address">{viewRecord.email || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Assigned Branch">{viewRecord.branchName || 'Head Office - Main Branch'}</Descriptions.Item>
              <Descriptions.Item label="System User ID"><span className="font-mono text-xs">{viewRecord.id}</span></Descriptions.Item>
              <Descriptions.Item label="Account Status">
                <Tag color={viewRecord.isActive !== false ? 'green' : 'red'}>
                  {viewRecord.isActive !== false ? 'Active & Permitted' : 'Disabled / Suspended'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Account Created">{viewRecord.createdAt ? new Date(viewRecord.createdAt).toLocaleString('en-IN') : 'N/A'}</Descriptions.Item>
            </Descriptions>
          </div>
        )}

        {viewRecord && viewRecordType === 'COMPLAINT' && (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-emerald-700 font-semibold uppercase">Complaint Ticket</div>
                <div className="text-xl font-bold font-mono text-emerald-950">{viewRecord.complaintNumber}</div>
              </div>
              <div className="flex items-center gap-2">
                <Tag
                  color={
                    viewRecord.status === 'RESOLVED' ? 'green' : viewRecord.status === 'IN_PROGRESS' ? 'blue' : 'gold'
                  }
                  className="px-3 py-1 text-sm font-semibold"
                >
                  {viewRecord.status || 'OPEN'}
                </Tag>
                <Tag
                  color={
                    viewRecord.priority === 'CRITICAL' || viewRecord.priority === 'HIGH'
                      ? 'red'
                      : viewRecord.priority === 'MEDIUM'
                      ? 'orange'
                      : 'green'
                  }
                  className="px-2.5 py-1 text-xs font-bold"
                >
                  {viewRecord.priority || 'MEDIUM'}
                </Tag>
              </div>
            </div>
            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="Ticket Number">
                <span className="font-mono font-bold text-emerald-800">{viewRecord.complaintNumber}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Customer / Member">
                <div>
                  <div className="font-semibold text-slate-800">{viewRecord.customerName || 'General Customer'}</div>
                  <div className="text-xs text-slate-400 font-mono">{viewRecord.customerNumber || viewRecord.customerId}</div>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Category">
                <Tag color="blue">{viewRecord.category || 'Service Request'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Submission Date">
                {viewRecord.createdAt ? new Date(viewRecord.createdAt).toLocaleString('en-IN') : 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Subject">
                <span className="font-semibold text-slate-800">{viewRecord.subject || 'Member Service Grievance'}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Issue Description">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {viewRecord.description || 'No detailed description provided.'}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Resolution Status">
                {viewRecord.resolution ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium whitespace-pre-wrap">
                    {viewRecord.resolution}
                  </div>
                ) : (
                  <span className="text-slate-400 italic">Pending Resolution</span>
                )}
              </Descriptions.Item>
              {viewRecord.resolvedAt && (
                <Descriptions.Item label="Resolved Date">
                  {new Date(viewRecord.resolvedAt).toLocaleString('en-IN')}
                </Descriptions.Item>
              )}
              {viewRecord.resolvedBy && (
                <Descriptions.Item label="Resolved By">{viewRecord.resolvedBy}</Descriptions.Item>
              )}
              <Descriptions.Item label="System Ticket ID">
                <span className="font-mono text-xs text-slate-500">{viewRecord.id}</span>
              </Descriptions.Item>
            </Descriptions>

            {viewRecord.status !== 'RESOLVED' && (
              <Button
                type="primary"
                style={{ background: '#059669', borderColor: '#059669' }}
                icon={<CheckCircleOutlined />}
                onClick={() => {
                  setViewDrawerOpen(false);
                  handleOpenResolveComplaint(viewRecord);
                }}
                block
                className="rounded-xl h-11 font-bold text-sm shadow-md"
              >
                Resolve This Ticket Now
              </Button>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
