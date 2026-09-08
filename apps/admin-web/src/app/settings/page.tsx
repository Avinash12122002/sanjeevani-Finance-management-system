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
  Radio,
  Alert,
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
  DatabaseOutlined,
  ReloadOutlined,
  SearchOutlined,
  CopyOutlined,
  TableOutlined,
  DollarCircleOutlined,
  UploadOutlined,
  DownloadOutlined,
  PrinterOutlined,
  IdcardOutlined,
  SafetyCertificateOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { fetchApi, postApi, patchApi, deleteApi } from '@/lib/api-client';
import { noEmojiRule } from '@/lib/emoji-sanitizer';
import { FinancialEngine } from '@sanjeevani/financial-engine';
import { UserRole, PriorityLevel, ComplaintStatus } from '@sanjeevani/shared-types';
import { PayslipModal } from '@/components/print/PayslipPrintView';
import { maskAadhaar } from '@/lib/html-sanitizer';

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

  // Database Explorer (All 21 PostgreSQL Tables) State & Handlers
  const ALL_DB_TABLE_NAMES = [
    'accounts',
    'audit_logs',
    'branches',
    'cash_drawers',
    'chart_of_accounts',
    'committee_groups',
    'committee_installments',
    'committee_members',
    'committee_payouts',
    'complaints',
    'customer_documents',
    'customers',
    'daily_closures',
    'employees',
    'journal_entries',
    'loans',
    'products',
    'receipts',
    'repayment_schedules',
    'transactions',
    'users',
  ];

  const [dbTables, setDbTables] = useState<any[]>(() =>
    ALL_DB_TABLE_NAMES.map((name) => ({
      name,
      rowCount: 0,
      columnCount: 0,
      columns: [],
    }))
  );
  const [selectedTable, setSelectedTable] = useState<string>('accounts');
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [loadingTableRows, setLoadingTableRows] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [inspectDrawerOpen, setInspectDrawerOpen] = useState(false);
  const [inspectRow, setInspectRow] = useState<any>(null);
  const [addRowModalOpen, setAddRowModalOpen] = useState(false);
  const [editRowModalOpen, setEditRowModalOpen] = useState(false);
  const [selectedRowToEdit, setSelectedRowToEdit] = useState<any>(null);
  const [addRowForm] = Form.useForm();
  const [editRowForm] = Form.useForm();
  const [savingRow, setSavingRow] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [forcingSync, setForcingSync] = useState(false);

  const loadDbTables = async () => {
    try {
      const [res, syncRes] = await Promise.all([
        fetchApi('/database/tables'),
        fetchApi('/database/sync-status'),
      ]);
      if (res.success && res.data) {
        setDbTables(res.data);
      }
      if (syncRes.success && syncRes.data) {
        setSyncStatus(syncRes.data);
      }
    } catch (e) {
      console.error('Failed to load database tables or sync status', e);
    }
  };

  const handleForceSync = async () => {
    setForcingSync(true);
    const res = await postApi('/database/sync-force', {});
    setForcingSync(false);
    if (res.success && res.data) {
      setSyncStatus(res.data);
      message.success('Database in-memory cache synchronized with PostgreSQL!');
      loadDbTables();
      loadTableRows(selectedTable);
    } else {
      message.error(res.message || 'Failed to sync database');
    }
  };

  const loadTableRows = async (tableName: string) => {
    setLoadingTableRows(true);
    const res = await fetchApi(`/database/tables/${tableName}`);
    if (res.success && res.data) {
      setTableRows(res.data.items || res.data || []);
    }
    setLoadingTableRows(false);
  };

  const handleDeleteDbRow = async (id: string) => {
    try {
      const res = await deleteApi(`/database/tables/${selectedTable}/${id}`);
      if (res.success) {
        message.success(`Record ${id} successfully removed from ${selectedTable}.`);
        loadTableRows(selectedTable);
        loadDbTables();
      } else {
        message.error(res.message || `Failed to delete record from ${selectedTable}`);
      }
    } catch {
      message.error('An error occurred while deleting record.');
    }
  };

  const handleOpenEditRow = (row: any) => {
    setSelectedRowToEdit(row);
    editRowForm.setFieldsValue(row);
    setEditRowModalOpen(true);
  };

  const handleSaveEditRow = async (values: any) => {
    if (!selectedRowToEdit?.id) return;
    setSavingRow(true);
    try {
      const res = await patchApi(`/database/tables/${selectedTable}/${selectedRowToEdit.id}`, values);
      if (res.success) {
        message.success(`Record ${selectedRowToEdit.id} updated successfully.`);
        setEditRowModalOpen(false);
        loadTableRows(selectedTable);
        loadSettingsData();
      } else {
        message.error(res.message || 'Failed to update record');
      }
    } catch {
      message.error('Error updating record.');
    } finally {
      setSavingRow(false);
    }
  };

  const handleSaveNewRow = async (values: any) => {
    setSavingRow(true);
    try {
      const res = await postApi(`/database/tables/${selectedTable}`, values);
      if (res.success) {
        message.success(`New record added to ${selectedTable}.`);
        setAddRowModalOpen(false);
        addRowForm.resetFields();
        loadTableRows(selectedTable);
        loadDbTables();
        loadSettingsData();
      } else {
        message.error(res.message || 'Failed to add record');
      }
    } catch {
      message.error('Error creating record.');
    } finally {
      setSavingRow(false);
    }
  };

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
    loadDbTables();
    loadTableRows('accounts');
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    loadHrData();
    loadPayrollData(payrollMonth);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // HR & 7-Day Training State & Handlers (SRS §43, §44)
  // ─────────────────────────────────────────────────────────────────────────────
  const [onboardingList, setOnboardingList] = useState<any[]>([]);
  const [trainingCurriculum, setTrainingCurriculum] = useState<any[]>([]);
  const [trainingModalOpen, setTrainingModalOpen] = useState(false);
  const [trainingCandidateId, setTrainingCandidateId] = useState<string>('');
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [leaveRequestsList, setLeaveRequestsList] = useState<any[]>([]);
  const [addCandidateModal, setAddCandidateModal] = useState(false);
  const [candidateForm] = Form.useForm();

  const loadHrData = async () => {
    try {
      const [oRes, aRes, lRes] = await Promise.all([
        fetchApi('/hr/onboarding'),
        fetchApi('/hr/attendance'),
        fetchApi('/hr/leaves'),
      ]);
      if (oRes.success && oRes.data) setOnboardingList(oRes.data);
      if (aRes.success && aRes.data) setAttendanceList(aRes.data);
      if (lRes.success && lRes.data) setLeaveRequestsList(lRes.data);
    } catch {}
  };

  const handleAdvanceCandidateStage = async (id: string, stage: string) => {
    try {
      const res = await patchApi(`/hr/onboarding/${id}/stage`, { stage });
      if (res.success) {
        message.success(`Candidate advanced to ${stage}`);
        loadHrData();
      } else {
        message.error(res.message || 'Failed to update stage');
      }
    } catch {
      message.error('Error advancing candidate stage');
    }
  };

  const handleOpenTrainingModal = async (empId: string) => {
    setTrainingCandidateId(empId);
    setTrainingModalOpen(true);
    try {
      const res = await fetchApi(`/hr/training/${empId}`);
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data.curriculum || res.data.days || []);
        setTrainingCurriculum(list);
      }
    } catch {
      message.error('Failed to load employee training curriculum');
    }
  };

  const handlePassTrainingDay = async (day: number) => {
    try {
      const res = await postApi(`/hr/training/${trainingCandidateId}/day/${day}`, {
        status: 'PASSED',
        examScore: 85,
        instructorNotes: 'Curriculum verified and certified (SRS §44)',
      });
      if (res.success) {
        message.success(`Day ${day} curriculum marked PASSED!`);
        handleOpenTrainingModal(trainingCandidateId);
      } else {
        message.error(res.message || 'Failed to certify training day');
      }
    } catch {
      message.error('Error certifying training day');
    }
  };

  const handleApproveLeaveRequest = async (leaveId: string) => {
    try {
      const res = await patchApi(`/hr/leaves/${leaveId}/approve`, {});
      if (res.success) {
        message.success('Employee leave approved.');
        loadHrData();
      } else {
        message.error(res.message || 'Leave approval failed');
      }
    } catch {
      message.error('Error approving leave');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Payroll Management State & Handlers (SRS §41, §49 Module 18)
  // ─────────────────────────────────────────────────────────────────────────────
  const [payrollMonth, setPayrollMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [payrollList, setPayrollList] = useState<any[]>([]);
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [generatingPayroll, setGeneratingPayroll] = useState(false);

  const loadPayrollData = async (month: string) => {
    try {
      const res = await fetchApi(`/payroll?month=${month}`);
      if (res.success && res.data) setPayrollList(res.data);
    } catch {}
  };

  const handleGeneratePayroll = async () => {
    setGeneratingPayroll(true);
    try {
      const res = await postApi('/payroll/generate', { month: payrollMonth });
      if (res.success) {
        message.success(`Monthly payroll generated with 4-factor incentives (SRS §41)`);
        loadPayrollData(payrollMonth);
      } else {
        message.error(res.message || 'Failed to generate payroll');
      }
    } catch {
      message.error('Error generating payroll');
    } finally {
      setGeneratingPayroll(false);
    }
  };

  const handleDisbursePayroll = async (id: string) => {
    try {
      const res = await postApi(`/payroll/${id}/disburse`, { paymentMode: 'BANK_TRANSFER' });
      if (res.success) {
        message.success('Salary disbursed! Posted double-entry journal: Dr Salaries, Cr Bank.');
        loadPayrollData(payrollMonth);
      } else {
        message.error(res.message || 'Disbursement failed');
      }
    } catch {
      message.error('Error disbursing payroll');
    }
  };

  const handleViewPayslip = async (id: string) => {
    try {
      const res = await fetchApi(`/payroll/${id}/payslip`);
      if (res.success && res.data) {
        setSelectedPayslip(res.data);
        setPayslipModalOpen(true);
      }
    } catch {
      message.error('Failed to load payslip data');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Bulk Data Import State & Handlers (SRS §50)
  // ─────────────────────────────────────────────────────────────────────────────
  const [importEntityType, setImportEntityType] = useState<'customers' | 'accounts' | 'loans'>('customers');
  const [importCsvText, setImportCsvText] = useState('');
  const [importValidationResult, setImportValidationResult] = useState<any[]>([]);
  const [validatingImport, setValidatingImport] = useState(false);
  const [committingImport, setCommittingImport] = useState(false);

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetchApi(`/import/template/${importEntityType}`);
      if (res.success && res.data) {
        const headers = res.data.headers.join(',');
        const sample = res.data.sampleRows.map((r: any[]) => r.join(',')).join('\n');
        const csv = `${headers}\n${sample}`;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sanjeevani_${importEntityType}_template.csv`;
        a.click();
        URL.revokeObjectURL(url);
        message.success(`Downloaded ${importEntityType} template.csv`);
      }
    } catch {
      message.error('Failed to download template');
    }
  };

  const handleValidateCsv = async () => {
    if (!importCsvText.trim()) {
      message.warning('Please enter or paste CSV records first');
      return;
    }
    setValidatingImport(true);
    try {
      const lines = importCsvText.trim().split('\n');
      if (lines.length < 2) {
        message.error('CSV must have header row and at least 1 record');
        setValidatingImport(false);
        return;
      }
      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      const rows = lines.slice(1).map((line) => {
        const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        const obj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          obj[h] = vals[idx] || '';
        });
        return obj;
      });

      const res = await postApi('/import/validate', {
        entityType: importEntityType,
        rows,
      });
      if (res.success && res.data) {
        setImportValidationResult(res.data);
        message.success(`Validated ${rows.length} rows against business rules`);
      } else {
        message.error(res.message || 'Validation failed');
      }
    } catch {
      message.error('Error parsing CSV input');
    } finally {
      setValidatingImport(false);
    }
  };

  const handleCommitImport = async () => {
    if (!importValidationResult.length) {
      message.warning('Please validate records first');
      return;
    }
    const validRows = importValidationResult.filter((r) => r.isValid).map((r) => r.data);
    if (!validRows.length) {
      message.error('No valid rows available to import');
      return;
    }
    setCommittingImport(true);
    try {
      const res: any = await postApi(`/import/commit/${importEntityType}`, { entityType: importEntityType, rows: validRows });
      if (res.success) {
        const count = res.data?.committedCount || res.committedCount || validRows.length;
        message.success(`Migration Committed! Added ${count} records to database.`);
        setImportCsvText('');
        setImportValidationResult([]);
        loadSettingsData();
      } else {
        message.error(res.message || 'Import commit failed');
      }
    } catch {
      message.error('Error committing import to database');
    } finally {
      setCommittingImport(false);
    }
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
      address: record.address || '',
      aadhaarOrPan: record.aadhaarOrPan || '',
      emergencyContact: record.emergencyContact || '',
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
      pinCode: record.pinCode || '110086',
      email: record.email || '',
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
    const userRole = record.role || (Array.isArray(record.roles) ? record.roles[0] : record.roles) || UserRole.LOAN_OFFICER;
    editUserForm.setFieldsValue({
      username: record.username,
      email: record.email,
      mobile: record.mobile,
      role: userRole,
      roles: record.roles || [userRole],
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

  if (currentUser && !currentUser.roles?.some((r: string) => r === 'SUPER_ADMIN' || r === 'GENERAL_MANAGER')) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center max-w-xl mx-auto my-12 space-y-4 shadow-sm">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center text-2xl mx-auto border border-amber-200">
          <SettingOutlined />
        </div>
        <h2 className="text-xl font-bold text-slate-900 m-0">Restricted Administration Access</h2>
        <p className="text-slate-500 text-sm">
          System Master Data, Staff Management, and Scheme Rules are strictly reserved for Super Administrators and General Managers.
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

  const renderTabHeader = (title: string, count?: number, fullTitle?: string, icon?: React.ReactNode) => (
    <span
      className="text-[11px] font-medium whitespace-nowrap inline-flex items-center gap-1 leading-none tracking-tight"
      title={fullTitle || `${title}${count !== undefined ? ` (${count})` : ''}`}
    >
      {icon}
      <span>{title}</span>
      {count !== undefined && (
        <span className="text-[10px] text-slate-500 font-mono ml-0.5">({count})</span>
      )}
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
        className="compact-settings-tabs"
        tabBarGutter={2}
        tabBarStyle={{ marginBottom: 12 }}
        items={[
          {
            key: 'staff',
            label: renderTabHeader('Staff', employees.length, 'Staff Members', <TeamOutlined className="text-emerald-600 text-xs" />),
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
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{r.name}</span>
                          <span className="text-xs font-mono text-emerald-700 font-bold">({r.employeeNumber})</span>
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
                        <span className="font-mono text-xs text-slate-700">{r.mobile}</span>
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
            label: renderTabHeader('Users', users.length, 'User Accounts & Logins', <KeyOutlined className="text-blue-600 text-xs" />),
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
                          <div className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center font-bold text-emerald-800 text-xs shrink-0">
                            {r.username?.charAt(0)?.toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-800 truncate">{r.username}</span>
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
                      width: 160,
                      render: (_: any, r: any) => (
                        <span className="font-mono text-xs text-slate-700">{r.mobile || r.email || '—'}</span>
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
            label: renderTabHeader('Products', products.length, 'Financial Products Master', <AppstoreAddOutlined className="text-indigo-600 text-xs" />),
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
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{r.productName}</span>
                          <span className="text-xs font-mono text-emerald-700 font-bold">({r.productCode})</span>
                        </div>
                      ),
                    },
                    { title: 'Category', dataIndex: 'productType', key: 'type', render: (t) => <Tag color="blue">{t}</Tag> },
                    { title: 'Interest Rate', dataIndex: 'interestRate', key: 'rate', render: (r) => <span className="font-bold text-indigo-700">{r != null ? `${r}% p.a.` : 'N/A'}</span> },
                    { title: 'Tenure Limits', key: 'tenure', render: (_: any, r: any) => `${r.minimumTenureMonths ?? r.minTenureMonths ?? 1} - ${r.maximumTenureMonths ?? r.maxTenureMonths ?? 60} Mo` },
                    {
                      title: 'Amount Bounds',
                      key: 'bounds',
                      render: (_: any, r: any) => (
                        <div className="text-xs">
                          {FinancialEngine.formatINR(r.minimumAmount ?? r.minAmount ?? 0)} - {FinancialEngine.formatINR(r.maximumAmount ?? r.maxAmount ?? 0)}
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
            label: renderTabHeader('Branches', branches.length, 'Operating Branches', <BranchesOutlined className="text-amber-600 text-xs" />),
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
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{r.name}</span>
                          <span className="text-xs font-mono text-emerald-700 font-bold">({r.branchCode})</span>
                        </div>
                      ),
                    },
                    {
                      title: 'Location',
                      key: 'loc',
                      ellipsis: true,
                      render: (_: any, r: any) => (
                        <span className="text-xs text-slate-700">{r.city ? `${r.city}, ${r.state || 'Delhi'}` : r.address || 'Delhi'}</span>
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
            label: renderTabHeader('Complaints', complaints.length, 'Complaints & Grievances', <AlertOutlined className="text-rose-600 text-xs" />),
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
                        <span className="font-semibold text-slate-800">{r.customerName || 'General Customer'}</span>
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
                        if (p === PriorityLevel.CRITICAL || p === PriorityLevel.HIGH) color = 'red';
                        else if (p === PriorityLevel.MEDIUM) color = 'orange';
                        else if (p === PriorityLevel.LOW) color = 'green';
                        return <Tag color={color}>{p || PriorityLevel.MEDIUM}</Tag>;
                      },
                    },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      key: 'st',
                      width: 120,
                      render: (s: string) => {
                        let color = 'default';
                        if (s === ComplaintStatus.OPEN) color = 'gold';
                        else if (s === ComplaintStatus.IN_PROGRESS) color = 'blue';
                        else if (s === ComplaintStatus.RESOLVED) color = 'green';
                        else if (s === ComplaintStatus.CLOSED) color = 'default';
                        return <Tag color={color}>{s || ComplaintStatus.OPEN}</Tag>;
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
            label: renderTabHeader('Compliance', undefined, 'Compliance Feature Flags (§43, BR-019)', <SafetyCertificateOutlined className="text-cyan-600 text-xs" />),
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
            label: renderTabHeader('Config', undefined, 'System Parameters (§104)', <SettingOutlined className="text-slate-600 text-xs" />),
            children: (
              <Card className="glass-card" title="Global Operational Parameters">
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="Company Name">Sanjeevani Finance Operations Ltd.</Descriptions.Item>
                  <Descriptions.Item label="Financial Year">
                    {(() => {
                      const now = new Date();
                      const year = now.getFullYear();
                      const startYear = now.getMonth() >= 3 ? year : year - 1;
                      return `FY ${startYear}-${startYear + 1} (April - March)`;
                    })()}
                  </Descriptions.Item>
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
          {
            key: 'db_explorer',
            label: renderTabHeader('Database', dbTables.length || 21, 'PostgreSQL Database Explorer', <TableOutlined className="text-teal-600 text-xs" />),
            children: (
              <Card
                className="glass-card"
                title={
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1">
                    <div className="flex items-center gap-2.5">
                      <DatabaseOutlined className="text-emerald-600 text-lg" />
                      <div>
                        <div className="font-bold text-slate-800 text-base flex items-center gap-2 flex-wrap">
                          <span>PostgreSQL Database Explorer & Inspector</span>
                          <Tag color="emerald" className="font-mono text-xs m-0">{dbTables.length || 21} TABLES CONNECTED</Tag>
                          {syncStatus && (
                            <Tag color={syncStatus.allInSync ? 'success' : 'warning'} className="font-mono text-xs m-0">
                              {syncStatus.allInSync ? '✅ 100% IN-SYNC' : `${syncStatus.inSyncTables}/${syncStatus.totalTables} IN-SYNC`}
                            </Tag>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-normal">
                          Read, Create, Update & Delete 100% of rows and columns saved in PostgreSQL.
                        </div>
                      </div>
                    </div>
                  </div>
                }
                extra={
                  <Space wrap>
                    <Button
                      icon={<SyncOutlined />}
                      loading={forcingSync}
                      onClick={handleForceSync}
                      style={{ color: '#059669', borderColor: '#059669' }}
                    >
                      Force DB Sync
                    </Button>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={() => {
                        loadDbTables();
                        loadTableRows(selectedTable);
                      }}
                      loading={loadingTableRows}
                    >
                      Refresh Table
                    </Button>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      style={{ background: '#059669', borderColor: '#059669' }}
                      onClick={() => {
                        addRowForm.resetFields();
                        setAddRowModalOpen(true);
                      }}
                    >
                      + Insert Row in {selectedTable}
                    </Button>
                  </Space>
                }
              >
                <div className="space-y-4">
                  {/* Table Selection & Filter Bar */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-700">Select Database Table:</span>
                      <Select
                        value={selectedTable}
                        onChange={(val) => {
                          setSelectedTable(val);
                          loadTableRows(val);
                        }}
                        style={{ width: 280 }}
                        options={dbTables.map((t) => ({
                          label: (
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-semibold">{t.name}</span>
                              <Tag color="blue" className="text-[10px] m-0">{t.rowCount} rows</Tag>
                            </div>
                          ),
                          value: t.name,
                        }))}
                      />
                      <Tag color="purple" className="font-mono text-xs">
                        Active Table: {selectedTable} ({tableRows.length} Loaded)
                      </Tag>
                    </div>

                    <div className="w-full md:w-64">
                      <Input
                        placeholder={`Search in ${selectedTable}...`}
                        prefix={<SearchOutlined className="text-slate-400" />}
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        allowClear
                        size="small"
                      />
                    </div>
                  </div>

                  {/* Dynamic Database Table displaying 100% of columns */}
                  <Table
                    size="small"
                    loading={loadingTableRows}
                    dataSource={tableRows.filter((r) => {
                      if (!tableSearch) return true;
                      const searchLower = tableSearch.toLowerCase();
                      return Object.values(r).some((val) =>
                        String(val || '').toLowerCase().includes(searchLower)
                      );
                    })}
                    rowKey={(record) => record.id || record.account_number || record.customer_number || record.branch_code || Math.random().toString()}
                    pagination={{ pageSize: 15, showTotal: (t) => `Total ${t} records in ${selectedTable}` }}
                    scroll={{ x: 'max-content' }}
                    columns={[
                      ...(tableRows.length > 0
                        ? Object.keys(tableRows[0]).map((key) => ({
                            title: <span className="font-mono font-semibold text-slate-700 text-xs">{key}</span>,
                            dataIndex: key,
                            key: key,
                            render: (val: any) => {
                              if (val === null || val === undefined) {
                                return <span className="text-slate-300 italic text-xs">null</span>;
                              }
                              if (typeof val === 'boolean') {
                                return <Tag color={val ? 'green' : 'default'}>{val ? 'TRUE' : 'FALSE'}</Tag>;
                              }
                              if (typeof val === 'object') {
                                return (
                                  <span className="font-mono text-[11px] text-slate-600 max-w-[140px] truncate inline-block" title={JSON.stringify(val)}>
                                    {JSON.stringify(val)}
                                  </span>
                                );
                              }
                              if (key.includes('status')) {
                                return <Tag color={val === 'ACTIVE' || val === 'OPEN' || val === 'POSTED' || val === 'VERIFIED' ? 'green' : 'blue'}>{String(val)}</Tag>;
                              }
                              if (key === 'id' || key.endsWith('_id') || key.endsWith('_code') || key.endsWith('_number')) {
                                return <span className="font-mono text-xs font-semibold text-emerald-800">{String(val)}</span>;
                              }
                              return (
                                <span className="text-xs text-slate-700 max-w-[200px] truncate inline-block" title={String(val)}>
                                  {String(val)}
                                </span>
                              );
                            },
                          }))
                        : [
                            {
                              title: 'Status',
                              key: 'empty',
                              render: () => <span className="text-slate-400">No records found in {selectedTable}</span>,
                            },
                          ]),
                      {
                        title: 'Row Actions',
                        key: 'row_actions',
                        fixed: 'right',
                        width: 140,
                        render: (_: any, record: any) => (
                          <Space size={4}>
                            <Button
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => {
                                setInspectRow(record);
                                setInspectDrawerOpen(true);
                              }}
                              title="Inspect Complete Database Row"
                            />
                            <Button
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => handleOpenEditRow(record)}
                              title="Edit Record"
                            />
                            <Popconfirm
                              title="Delete Database Record"
                              description={`Permanently delete ${record.id || 'this row'} from ${selectedTable}?`}
                              onConfirm={() => handleDeleteDbRow(record.id)}
                              okText="Delete"
                              cancelText="Cancel"
                              okButtonProps={{ danger: true }}
                            >
                              <Button size="small" danger icon={<DeleteOutlined />} title="Delete Row" />
                            </Popconfirm>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </div>
              </Card>
            ),
          },
          {
            key: 'hr',
            label: renderTabHeader('HR', onboardingList.length, 'HR Onboarding & 7-Day Training (SRS §43, §44)', <IdcardOutlined className="text-emerald-600 text-xs" />),
            children: (
              <div className="space-y-4">
                <Card
                  title={
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">Staff Onboarding Pipeline (SRS §43)</span>
                      <Space>
                        <Button icon={<ReloadOutlined />} size="small" onClick={loadHrData}>
                          Refresh HR
                        </Button>
                      </Space>
                    </div>
                  }
                  className="glass-card"
                  size="small"
                >
                  <Table
                    size="small"
                    dataSource={onboardingList}
                    rowKey="id"
                    pagination={{ pageSize: 5 }}
                    columns={[
                      {
                        title: 'Candidate Name',
                        key: 'name',
                        render: (_, r) => (
                          <div>
                            <span className="font-semibold text-slate-900">{r.candidateName}</span>
                            <span className="text-xs text-slate-500 font-mono block">+91 {r.mobile}</span>
                          </div>
                        ),
                      },
                      { title: 'Designation', dataIndex: 'designation', key: 'desig', render: (d) => <Tag color="blue">{d}</Tag> },
                      {
                        title: 'Current Stage',
                        dataIndex: 'stage',
                        key: 'stg',
                        render: (s) => {
                          let color = 'orange';
                          if (s === 'CONFIRMED') color = 'green';
                          else if (s === 'TRAINING') color = 'purple';
                          else if (s === 'PROBATION') color = 'cyan';
                          return <Tag color={color}>{s}</Tag>;
                        },
                      },
                      {
                        title: 'Interview Score',
                        dataIndex: 'interviewScore',
                        key: 'sc',
                        render: (sc) => <span className="font-bold text-slate-700">{sc ? `${sc} / 100` : 'Pending'}</span>,
                      },
                      {
                        title: 'Training Progress',
                        key: 'tr',
                        render: (_, r) => (
                          <Button
                            size="small"
                            type="primary"
                            ghost
                            icon={<SafetyCertificateOutlined />}
                            onClick={() => handleOpenTrainingModal(r.id)}
                          >
                            7-Day Training (§44)
                          </Button>
                        ),
                      },
                      {
                        title: 'Advance Stage',
                        key: 'act',
                        render: (_, r) => (
                          <Select
                            size="small"
                            value={r.stage}
                            style={{ width: 140 }}
                            onChange={(val) => handleAdvanceCandidateStage(r.id, val)}
                            options={[
                              { value: 'INTERVIEW', label: '1. Interview' },
                              { value: 'DOC_VERIFIED', label: '2. Doc Verified' },
                              { value: 'REFERENCE_CHECKED', label: '3. Ref Checked' },
                              { value: 'OFFER_ISSUED', label: '4. Offer Issued' },
                              { value: 'APPOINTMENT_LETTER', label: '5. Appointment' },
                              { value: 'TRAINING', label: '6. Training' },
                              { value: 'PROBATION', label: '7. Probation' },
                              { value: 'CONFIRMED', label: '8. Confirmed' },
                            ]}
                          />
                        ),
                      },
                    ]}
                  />
                </Card>

                {/* Attendance & Leaves Row */}
                <Row gutter={16}>
                  <Col xs={24} lg={12}>
                    <Card title="Today's Attendance Logs" size="small" className="glass-card">
                      <Table
                        size="small"
                        dataSource={attendanceList}
                        rowKey="id"
                        pagination={{ pageSize: 5 }}
                        columns={[
                          { title: 'Employee', dataIndex: 'employeeName', key: 'en' },
                          { title: 'Check In', dataIndex: 'checkIn', key: 'ci', render: (t) => t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-' },
                          { title: 'Status', dataIndex: 'status', key: 'st', render: (s) => <Tag color={s === 'PRESENT' ? 'green' : 'orange'}>{s}</Tag> },
                        ]}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} lg={12}>
                    <Card title="Leave Requests" size="small" className="glass-card">
                      <Table
                        size="small"
                        dataSource={leaveRequestsList}
                        rowKey="id"
                        pagination={{ pageSize: 5 }}
                        columns={[
                          { title: 'Staff', dataIndex: 'employeeName', key: 'en' },
                          { title: 'Type', dataIndex: 'leaveType', key: 'lt', render: (t) => <Tag color="geekblue">{t}</Tag> },
                          { title: 'Days', dataIndex: 'daysCount', key: 'dc', render: (d) => `${d} Days` },
                          { title: 'Status', dataIndex: 'status', key: 'st', render: (s) => <Tag color={s === 'APPROVED' ? 'green' : 'orange'}>{s}</Tag> },
                          {
                            title: 'Action',
                            key: 'act',
                            render: (_, r) => r.status === 'PENDING' ? (
                              <Button size="small" type="primary" onClick={() => handleApproveLeaveRequest(r.id)}>
                                Approve
                              </Button>
                            ) : null,
                          },
                        ]}
                      />
                    </Card>
                  </Col>
                </Row>
              </div>
            ),
          },
          {
            key: 'payroll',
            label: renderTabHeader('Payroll', payrollList.length, 'Payroll & Incentives (SRS §41, §49)', <DollarCircleOutlined className="text-blue-600 text-xs" />),
            children: (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-700">Payroll Month:</span>
                    <Input
                      type="month"
                      value={payrollMonth}
                      onChange={(e) => {
                        setPayrollMonth(e.target.value);
                        loadPayrollData(e.target.value);
                      }}
                      style={{ width: 160 }}
                      size="small"
                    />
                    <Button
                      type="primary"
                      icon={<DollarCircleOutlined />}
                      size="small"
                      loading={generatingPayroll}
                      onClick={handleGeneratePayroll}
                      style={{ background: '#059669', borderColor: '#059669' }}
                    >
                      Generate Monthly Payroll (§41)
                    </Button>
                  </div>
                  <Button size="small" icon={<ReloadOutlined />} onClick={() => loadPayrollData(payrollMonth)}>
                    Refresh
                  </Button>
                </div>

                <Card className="glass-card" size="small">
                  <Table
                    size="small"
                    dataSource={payrollList}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    columns={[
                      {
                        title: 'Employee',
                        key: 'emp',
                        render: (_, r) => (
                          <div>
                            <span className="font-semibold text-slate-900">{r.employeeName}</span>
                            <span className="text-xs font-mono text-slate-500 block">{r.employeeNumber}</span>
                          </div>
                        ),
                      },
                      { title: 'Designation', dataIndex: 'designation', key: 'desig' },
                      {
                        title: 'Basic Pay',
                        dataIndex: 'basicSalary',
                        key: 'bp',
                        render: (b) => FinancialEngine.formatINR(b),
                      },
                      {
                        title: 'Incentive (SRS §41)',
                        dataIndex: 'incentiveAmount',
                        key: 'inc',
                        render: (i) => <span className="font-bold text-emerald-700">{FinancialEngine.formatINR(i || 0)}</span>,
                      },
                      {
                        title: 'Gross Salary',
                        dataIndex: 'grossSalary',
                        key: 'gs',
                        render: (g) => FinancialEngine.formatINR(g),
                      },
                      {
                        title: 'Deductions',
                        dataIndex: 'totalDeductions',
                        key: 'td',
                        render: (d) => <span className="text-rose-600">{FinancialEngine.formatINR(d || 0)}</span>,
                      },
                      {
                        title: 'Net Payable',
                        dataIndex: 'netPayable',
                        key: 'np',
                        render: (n) => <span className="font-bold text-slate-900">{FinancialEngine.formatINR(n)}</span>,
                      },
                      {
                        title: 'Status',
                        dataIndex: 'status',
                        key: 'st',
                        render: (s) => (
                          <Tag color={s === 'DISBURSED' ? 'green' : s === 'APPROVED' ? 'blue' : 'default'}>
                            {s}
                          </Tag>
                        ),
                      },
                      {
                        title: 'Actions',
                        key: 'act',
                        render: (_, r) => (
                          <Space size={4}>
                            {r.status !== 'DISBURSED' && (
                              <Popconfirm
                                title="Disburse Salary"
                                description="Execute payment and post double-entry disbursement journal (Dr Salaries, Cr Bank)?"
                                onConfirm={() => handleDisbursePayroll(r.id)}
                                okText="Disburse"
                              >
                                <Button size="small" type="primary" style={{ background: '#059669', borderColor: '#059669' }}>
                                  Disburse
                                </Button>
                              </Popconfirm>
                            )}
                            <Button size="small" icon={<PrinterOutlined />} onClick={() => handleViewPayslip(r.id)}>
                              Payslip
                            </Button>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </Card>
              </div>
            ),
          },
          {
            key: 'data_import',
            label: renderTabHeader('Import', undefined, 'Bulk Data Migration Wizard (SRS §50)', <UploadOutlined className="text-purple-600 text-xs" />),
            children: (
              <div className="space-y-4">
                <Alert
                  type="info"
                  showIcon
                  message="8-Step Legacy Data Migration Utility (SRS §50)"
                  description="Pre-flight validation checks every row against existing database records to prevent duplicate mobile numbers, verify PIN codes, and maintain double-entry balance integrity before committing."
                />

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-700">Entity Type:</span>
                      <Radio.Group
                        value={importEntityType}
                        onChange={(e) => {
                          setImportEntityType(e.target.value);
                          setImportValidationResult([]);
                        }}
                        size="small"
                      >
                        <Radio.Button value="customers">Customers / Members</Radio.Button>
                        <Radio.Button value="accounts">Accounts (RD / FD)</Radio.Button>
                        <Radio.Button value="loans">Existing Loans</Radio.Button>
                      </Radio.Group>
                    </div>

                    <Button icon={<DownloadOutlined />} size="small" onClick={handleDownloadTemplate}>
                      Download CSV Template
                    </Button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Paste CSV Content (or enter records):
                    </label>
                    <Input.TextArea
                      rows={5}
                      value={importCsvText}
                      onChange={(e) => setImportCsvText(e.target.value)}
                      placeholder="e.g. fullName,mobile,dateOfBirth,gender,aadhaar,pan,address,city,state,pinCode&#10;Rajesh Kumar,9876543210,1985-05-15,MALE,123456789012,ABCDE1234F,H.No 123 Sector 4,Delhi,Delhi,110086"
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <Button
                      type="primary"
                      icon={<SafetyCertificateOutlined />}
                      loading={validatingImport}
                      onClick={handleValidateCsv}
                      style={{ background: '#2563eb', borderColor: '#2563eb' }}
                    >
                      Pre-Validate CSV Records
                    </Button>

                    {importValidationResult.length > 0 && (
                      <Button
                        type="primary"
                        icon={<UploadOutlined />}
                        loading={committingImport}
                        onClick={handleCommitImport}
                        style={{ background: '#059669', borderColor: '#059669' }}
                      >
                        Commit Valid Records to Database
                      </Button>
                    )}
                  </div>
                </div>

                {/* Validation Results Table */}
                {importValidationResult.length > 0 && (
                  <Card title={`Validation Report (${importValidationResult.length} Rows)`} size="small" className="glass-card">
                    <Table
                      size="small"
                      dataSource={importValidationResult}
                      rowKey="rowNumber"
                      pagination={{ pageSize: 5 }}
                      columns={[
                        { title: 'Row #', dataIndex: 'rowNumber', key: 'rn', width: 70 },
                        {
                          title: 'Primary Data',
                          key: 'data',
                          render: (_, r) => (
                            <span className="font-mono text-xs">
                              {r.data.fullName || r.data.customerNumber || r.data.principalAmount || JSON.stringify(r.data)}
                            </span>
                          ),
                        },
                        {
                          title: 'Validation Status',
                          key: 'st',
                          render: (_, r) => (
                            <Tag color={r.isValid ? 'success' : 'error'}>
                              {r.isValid ? 'VALID' : 'INVALID'}
                            </Tag>
                          ),
                        },
                        {
                          title: 'Errors / Warnings',
                          key: 'err',
                          render: (_, r) => (
                            <div>
                              {r.errors?.map((err: string, idx: number) => (
                                <Tag color="error" key={idx} className="mb-0.5">{err}</Tag>
                              ))}
                              {r.warnings?.map((w: string, idx: number) => (
                                <Tag color="warning" key={idx} className="mb-0.5">{w}</Tag>
                              ))}
                            </div>
                          ),
                        },
                      ]}
                    />
                  </Card>
                )}
              </div>
            ),
          },
        ]}
      />

      {/* 7-DAY TRAINING CURRICULUM MODAL (SRS §44) */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-emerald-800">
            <SafetyCertificateOutlined />
            <span>7-Day Induction & Practical Training Schedule (SRS §44)</span>
          </div>
        }
        open={trainingModalOpen}
        onCancel={() => setTrainingModalOpen(false)}
        width={750}
        footer={[
          <Button key="close" onClick={() => setTrainingModalOpen(false)}>
            Close
          </Button>,
        ]}
      >
        <div className="space-y-4 py-2">
          <Alert
            type="info"
            showIcon
            message="Mandatory Operational Certification Guard"
            description="Employees cannot receive field collection permissions or loan underwriting authority until Day 7 practical examination is marked PASSED (SRS §44)."
          />

          <Table
            size="small"
            dataSource={trainingCurriculum}
            rowKey="day"
            pagination={false}
            columns={[
              { title: 'Day', dataIndex: 'day', key: 'd', width: 60, render: (d) => <Tag color="blue">Day {d}</Tag> },
              { title: 'Curriculum Module', dataIndex: 'title', key: 't', render: (t) => <span className="font-semibold text-slate-800">{t}</span> },
              { title: 'SOP Coverage', dataIndex: 'description', key: 'desc', ellipsis: true },
              {
                title: 'Status',
                dataIndex: 'status',
                key: 'st',
                render: (s) => <Tag color={s === 'PASSED' ? 'green' : 'orange'}>{s}</Tag>,
              },
              {
                title: 'Certify',
                key: 'cert',
                render: (_, r) => (
                  <Button
                    size="small"
                    type="primary"
                    disabled={r.status === 'PASSED'}
                    onClick={() => handlePassTrainingDay(r.day)}
                    style={r.status !== 'PASSED' ? { background: '#059669', borderColor: '#059669' } : undefined}
                  >
                    {r.status === 'PASSED' ? 'Passed' : 'Mark Passed'}
                  </Button>
                ),
              },
            ]}
          />
        </div>
      </Modal>

      {/* SALARY PAYSLIP MODAL (SRS §49 MODULE 18) */}
      <PayslipModal
        open={payslipModalOpen}
        data={selectedPayslip}
        onClose={() => setPayslipModalOpen(false)}
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
                rules={[{ required: true, message: 'Please enter full name' }, noEmojiRule]}
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
              <Form.Item label="Aadhaar / PAN Number" name="aadhaarOrPan">
                <Input placeholder="e.g. ABCDE1234F or 12-digit UID" style={{ textTransform: 'uppercase' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Emergency Contact Mobile" name="emergencyContact">
                <Input placeholder="10-digit emergency number" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Residential Address" name="address">
                <Input placeholder="Current residential address of staff" />
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
            <Col span={12}>
              <Form.Item label="Aadhaar / PAN Number" name="aadhaarOrPan">
                <Input placeholder="e.g. ABCDE1234F or 12-digit UID" style={{ textTransform: 'uppercase' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Emergency Contact Mobile" name="emergencyContact">
                <Input placeholder="10-digit emergency number" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Residential Address" name="address">
                <Input placeholder="Current residential address of staff" />
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
                <Input placeholder="e.g. Connaught Place Delhi Branch" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="Physical Address"
                name="address"
                rules={[{ required: true, message: 'Enter branch address' }]}
              >
                <Input placeholder="e.g. Connaught Place, Central Delhi" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="City"
                name="city"
                rules={[{ required: true, message: 'Enter city' }]}
                initialValue="Delhi"
              >
                <Input placeholder="e.g. Delhi" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="State"
                name="state"
                rules={[{ required: true, message: 'Enter state' }]}
                initialValue="Delhi"
              >
                <Input placeholder="State" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="PIN Code" name="pinCode" initialValue="110086" rules={[{ required: true, message: 'Enter PIN code' }]}>
                <Input placeholder="e.g. 110086" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Branch Email" name="email">
                <Input placeholder="e.g. branch.cp@sanjeevanifinance.com" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Contact Phone" name="phone">
                <Input placeholder="e.g. +91 11 23456789" />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button onClick={() => { setAddBranchModal(false); branchForm.resetFields(); }}>Cancel</Button>
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
        onCancel={() => { setEditBranchModal(false); editBranchForm.resetFields(); setSelectedBranch(null); }}
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
              <Form.Item label="PIN Code" name="pinCode">
                <Input placeholder="e.g. 110086" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Branch Email" name="email">
                <Input placeholder="e.g. branch.cp@sanjeevanifinance.com" />
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
            <Button onClick={() => { setEditBranchModal(false); editBranchForm.resetFields(); setSelectedBranch(null); }}>Cancel</Button>
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
        onCancel={() => { setAddProductModal(false); productForm.resetFields(); }}
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
            <Button onClick={() => { setAddProductModal(false); productForm.resetFields(); }}>Cancel</Button>
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
        onCancel={() => { setEditProductModal(false); editProductForm.resetFields(); setSelectedProduct(null); }}
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
            <Button onClick={() => { setEditProductModal(false); editProductForm.resetFields(); setSelectedProduct(null); }}>Cancel</Button>
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
        onCancel={() => { setAddUserModal(false); userForm.resetFields(); }}
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
            <Button onClick={() => { setAddUserModal(false); userForm.resetFields(); }}>Cancel</Button>
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
        onCancel={() => { setEditUserModal(false); editUserForm.resetFields(); setSelectedUser(null); }}
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
            <Button onClick={() => { setEditUserModal(false); editUserForm.resetFields(); setSelectedUser(null); }}>Cancel</Button>
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
            <AlertOutlined className="text-amber-500 text-base" />
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
                initialValue={PriorityLevel.MEDIUM}
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { value: PriorityLevel.LOW, label: 'Low Priority' },
                    { value: PriorityLevel.MEDIUM, label: 'Medium Priority' },
                    { value: PriorityLevel.HIGH, label: 'High Priority' },
                    { value: PriorityLevel.CRITICAL, label: 'Critical / Urgent' },
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
              <Descriptions.Item label="PIN / Postal Code">{viewRecord.pinCode || '110086'}</Descriptions.Item>
              <Descriptions.Item label="Branch Email">{viewRecord.email || 'head.office@sanjeevanifinance.com'}</Descriptions.Item>
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
              <Descriptions.Item label="Employee ID / Number"><span className="font-mono font-bold text-emerald-800">{viewRecord.employeeNumber}</span></Descriptions.Item>
              <Descriptions.Item label="Designation / Role"><Tag color="purple">{viewRecord.designation || 'STAFF'}</Tag></Descriptions.Item>
              <Descriptions.Item label="Statutory ID (Aadhaar / PAN)">
                <span className="font-mono font-bold text-emerald-700">
                  {viewRecord.aadhaarOrPan && /^\d{12}$/.test(viewRecord.aadhaarOrPan.replace(/\s/g, ''))
                    ? maskAadhaar(viewRecord.aadhaarOrPan)
                    : viewRecord.aadhaarOrPan || 'Not Specified'}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Mobile (Login Username)">{viewRecord.mobile}</Descriptions.Item>
              <Descriptions.Item label="Emergency Contact Mobile">{viewRecord.emergencyContact || 'Not Specified'}</Descriptions.Item>
              <Descriptions.Item label="Email Address">{viewRecord.email || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Residential Address">{viewRecord.address || 'Not Specified'}</Descriptions.Item>
              <Descriptions.Item label="Assigned Branch">{viewRecord.branchName || 'Head Office'}</Descriptions.Item>
              <Descriptions.Item label="Branch Code"><span className="font-mono text-xs">{viewRecord.branchCode || 'N/A'}</span></Descriptions.Item>
              <Descriptions.Item label="Base Monthly Salary (₹)"><span className="font-bold text-emerald-700">{viewRecord.salary ? FinancialEngine.formatINR(viewRecord.salary) : 'Not Specified'}</span></Descriptions.Item>
              <Descriptions.Item label="Linked User Account ID"><span className="font-mono text-xs">{viewRecord.userId || 'N/A'}</span></Descriptions.Item>
              <Descriptions.Item label="Employment Status">
                <Tag color={viewRecord.employmentStatus === 'ACTIVE' ? 'green' : 'default'}>{viewRecord.employmentStatus || 'ACTIVE'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="System UUID"><span className="font-mono text-xs">{viewRecord.id}</span></Descriptions.Item>
              <Descriptions.Item label="Joining Date">{viewRecord.joinedAt || viewRecord.joiningDate || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Record Created">{viewRecord.createdAt ? new Date(viewRecord.createdAt).toLocaleString('en-IN') : 'N/A'}</Descriptions.Item>
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
              <Descriptions.Item label="Product Code"><span className="font-mono font-bold text-blue-700">{viewRecord.productCode}</span></Descriptions.Item>
              <Descriptions.Item label="Product Category"><Tag color="blue">{viewRecord.productType}</Tag></Descriptions.Item>
              <Descriptions.Item label="Annual Interest Rate"><span className="font-bold text-indigo-700">{viewRecord.interestRate}% p.a.</span></Descriptions.Item>
              <Descriptions.Item label="Interest Method"><Tag color="purple">{viewRecord.interestMethod || 'REDUCING_BALANCE'}</Tag></Descriptions.Item>
              <Descriptions.Item label="Tenure Limits">{(viewRecord.minimumTenureMonths ?? viewRecord.minTenureMonths ?? 1)} to {(viewRecord.maximumTenureMonths ?? viewRecord.maxTenureMonths ?? 60)} Months</Descriptions.Item>
              <Descriptions.Item label="Minimum Amount">{FinancialEngine.formatINR(viewRecord.minimumAmount ?? viewRecord.minAmount ?? 0)}</Descriptions.Item>
              <Descriptions.Item label="Maximum Amount">{FinancialEngine.formatINR(viewRecord.maximumAmount ?? viewRecord.maxAmount ?? 0)}</Descriptions.Item>
              <Descriptions.Item label="Late Payment Penalty Rate"><span className="text-red-600 font-semibold">{viewRecord.penaltyRate ?? 2.0}% p.a.</span></Descriptions.Item>
              <Descriptions.Item label="Premature Withdrawal Allowed"><Tag color={viewRecord.prematureAllowed !== false ? 'blue' : 'default'}>{viewRecord.prematureAllowed !== false ? 'ALLOWED' : 'PROHIBITED'}</Tag></Descriptions.Item>
              <Descriptions.Item label="Nominee Requirement"><Tag color={viewRecord.requiresNominee ? 'orange' : 'default'}>{viewRecord.requiresNominee ? 'MANDATORY' : 'OPTIONAL'}</Tag></Descriptions.Item>
              <Descriptions.Item label="Regulatory Status"><Tag color="green">{viewRecord.regulatoryStatus || 'APPROVED'}</Tag></Descriptions.Item>
              <Descriptions.Item label="System Product ID"><span className="font-mono text-xs">{viewRecord.id}</span></Descriptions.Item>
              <Descriptions.Item label="Record Created">{viewRecord.createdAt ? new Date(viewRecord.createdAt).toLocaleString('en-IN') : 'N/A'}</Descriptions.Item>
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
              <Descriptions.Item label="System User UUID"><span className="font-mono text-xs">{viewRecord.id}</span></Descriptions.Item>
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
              <Descriptions.Item label="Linked Employee ID"><span className="font-mono text-xs font-semibold">{viewRecord.employeeId || 'N/A'}</span></Descriptions.Item>
              <Descriptions.Item label="Linked Employee Name">{viewRecord.employeeName || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Two-Factor Authentication (2FA)">
                <Tag color={viewRecord.is2faEnabled ? 'green' : 'orange'}>
                  {viewRecord.is2faEnabled ? '2FA ENABLED' : '2FA DISABLED'}
                </Tag>
              </Descriptions.Item>
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

      {/* DATABASE ROW COMPLETE INSPECTOR DRAWER */}
      <Drawer
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DatabaseOutlined className="text-emerald-600 text-lg" />
              <span className="font-bold text-slate-800">
                {selectedTable.toUpperCase()}: {inspectRow?.id || inspectRow?.account_number || inspectRow?.customer_number || 'Record Details'}
              </span>
            </div>
            <Tag color="purple" className="font-mono text-xs">
              TABLE: {selectedTable}
            </Tag>
          </div>
        }
        width={680}
        open={inspectDrawerOpen}
        onClose={() => {
          setInspectDrawerOpen(false);
          setInspectRow(null);
        }}
      >
        {inspectRow && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-xs text-slate-600">
                100% Raw Attributes from PostgreSQL Table <span className="font-mono font-bold text-emerald-800">{selectedTable}</span>
              </div>
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(inspectRow, null, 2));
                  message.success('Full record JSON copied to clipboard!');
                }}
              >
                Copy Full JSON
              </Button>
            </div>

            {/* All Columns Rendered in Descriptions Grid */}
            <Descriptions bordered column={2} size="small">
              {Object.entries(inspectRow).map(([key, val]) => (
                <Descriptions.Item
                  key={key}
                  label={<span className="font-mono font-semibold text-slate-600 text-xs">{key}</span>}
                  span={typeof val === 'object' || String(val || '').length > 40 ? 2 : 1}
                >
                  {val === null || val === undefined ? (
                    <span className="text-slate-300 italic">null</span>
                  ) : typeof val === 'boolean' ? (
                    <Tag color={val ? 'green' : 'default'}>{val ? 'TRUE' : 'FALSE'}</Tag>
                  ) : typeof val === 'object' ? (
                    <pre className="p-2 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded overflow-x-auto m-0">
                      {JSON.stringify(val, null, 2)}
                    </pre>
                  ) : (
                    <span className="font-mono text-xs text-slate-800 break-all">{String(val)}</span>
                  )}
                </Descriptions.Item>
              ))}
            </Descriptions>

            {/* Complete Raw JSON Box */}
            <div>
              <div className="text-xs font-bold text-slate-700 mb-2 uppercase">Raw JSON Payload</div>
              <pre className="p-4 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono overflow-auto max-h-60 border border-slate-800">
                {JSON.stringify(inspectRow, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <Button
                icon={<EditOutlined />}
                type="primary"
                ghost
                onClick={() => {
                  setInspectDrawerOpen(false);
                  handleOpenEditRow(inspectRow);
                }}
              >
                Edit This Record
              </Button>
              <Popconfirm
                title="Delete Database Record"
                description={`Permanently delete ${inspectRow.id || 'this row'} from ${selectedTable}?`}
                onConfirm={() => {
                  setInspectDrawerOpen(false);
                  handleDeleteDbRow(inspectRow.id);
                }}
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<DeleteOutlined />}>
                  Delete Record
                </Button>
              </Popconfirm>
            </div>
          </div>
        )}
      </Drawer>

      {/* EDIT DATABASE RECORD MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <EditOutlined className="text-emerald-600" />
            <span>Edit Record in [{selectedTable}]: {selectedRowToEdit?.id}</span>
          </div>
        }
        open={editRowModalOpen}
        onCancel={() => setEditRowModalOpen(false)}
        footer={null}
        width={640}
      >
        {selectedRowToEdit && (
          <Form form={editRowForm} layout="vertical" onFinish={handleSaveEditRow} className="mt-4">
            <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 mb-3">
                Direct Database Edit: Changes will be immediately saved to the <span className="font-mono font-bold">{selectedTable}</span> table.
              </div>
              {Object.keys(selectedRowToEdit)
                .filter((key) => key !== 'id')
                .map((key) => {
                  const val = selectedRowToEdit[key];
                  const isObject = typeof val === 'object' && val !== null;
                  return (
                    <Form.Item
                      key={key}
                      name={key}
                      label={<span className="font-mono text-xs">{key}</span>}
                    >
                      {isObject ? (
                        <Input.TextArea rows={3} placeholder="JSON string" />
                      ) : (
                        <Input />
                      )}
                    </Form.Item>
                  );
                })}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
              <Button onClick={() => setEditRowModalOpen(false)}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={savingRow}
                style={{ background: '#059669', borderColor: '#059669' }}
              >
                Save Changes to Database
              </Button>
            </div>
          </Form>
        )}
      </Modal>

      {/* ADD DATABASE RECORD MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <PlusOutlined className="text-emerald-600" />
            <span>Insert New Record into [{selectedTable}]</span>
          </div>
        }
        open={addRowModalOpen}
        onCancel={() => setAddRowModalOpen(false)}
        footer={null}
        width={640}
      >
        <Form form={addRowForm} layout="vertical" onFinish={handleSaveNewRow} className="mt-4">
          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 mb-3">
              Creating new row in table <span className="font-mono font-bold">{selectedTable}</span>. Fill in the desired database fields.
            </div>
            {(tableRows.length > 0
              ? Object.keys(tableRows[0]).filter((k) => k !== 'created_at')
              : ['name', 'code', 'status', 'description']
            ).map((col) => (
              <Form.Item
                key={col}
                name={col}
                label={<span className="font-mono text-xs">{col}</span>}
              >
                <Input placeholder={`Enter ${col}`} />
              </Form.Item>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
            <Button onClick={() => setAddRowModalOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={savingRow}
              style={{ background: '#059669', borderColor: '#059669' }}
            >
              Insert Record
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
