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
  Upload,
  Image,
  Alert,
  Progress,
  Tooltip,
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
  UploadOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  InboxOutlined,
  FilePdfOutlined,
  PaperClipOutlined,
  CloudUploadOutlined,
  FileTextOutlined,
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

  // Bulk Register Importer State (§50)
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [bulkRows, setBulkRows] = useState<any[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<any>(null);

  // KYC Document Scans State (§6, §47)
  const [customerDocs, setCustomerDocs] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>('AADHAAR_FRONT');

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

  const loadCustomerDocs = async (customerId: string) => {
    setDocsLoading(true);
    const res = await fetchApi(`/documents/customer/${customerId}`);
    if (res.success && res.data) {
      setCustomerDocs(res.data);
    } else {
      setCustomerDocs([]);
    }
    setDocsLoading(false);
  };

  const handleOpen360 = async (customerId: string) => {
    const res = await fetchApi(`/customers/${customerId}/360`);
    if (res.success && res.data) {
      setSelectedCustomer360(res.data);
      setDrawerVisible(true);
      loadCustomerDocs(customerId);
    }
  };

  const handleUploadDoc = async (file: File) => {
    if (!selectedCustomer360?.profile?.id) return;
    setUploadingDoc(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', selectedDocType);
    try {
      const res = await fetchApi(`/documents/upload/${selectedCustomer360.profile.id}`, {
        method: 'POST',
        body: formData,
      });
      if (res.success) {
        message.success('Document uploaded and linked successfully!');
        loadCustomerDocs(selectedCustomer360.profile.id);
      } else {
        message.error(res.message || 'Failed to upload document');
      }
    } catch (err) {
      message.error('Upload error');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    const res = await deleteApi(`/documents/${docId}`);
    if (res.success) {
      message.success('Document removed');
      if (selectedCustomer360?.profile?.id) {
        loadCustomerDocs(selectedCustomer360.profile.id);
      }
    } else {
      message.error(res.message || 'Failed to delete document');
    }
  };

  const downloadSampleCsv = () => {
    const headers = 'fullName,mobile,address,openingBalance,productType,joiningDate,nomineeName,nomineeRelation\n';
    const sampleRows = [
      'Ramesh Kumar,9876543210,"Sector 14 Rohini Delhi",5000,SAVINGS,2026-01-10,Sunita Devi,SPOUSE',
      'Pooja Sharma,9811223344,"Pitampura Village Delhi",10000,RD,2026-02-01,Amit Sharma,BROTHER',
      'Satish Verma,9899001122,"Narela Mandi Delhi",25000,TERM_DEPOSIT,2026-01-15,Rekha Verma,SPOUSE'
    ].join('\n');
    const blob = new Blob([headers + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sanjeevani_members_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvFileChange = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length <= 1) {
        message.warning('CSV file is empty or contains only header row.');
        return;
      }
      const parsed = lines.slice(1).map((line, idx) => {
        const regex = /(?:^|,)(\"(?:[^\"]+|\"\")*\"|[^,]*)/g;
        const cols: string[] = [];
        let match;
        while ((match = regex.exec(line)) !== null) {
          let val = match[1];
          if (val.startsWith(',')) val = val.substring(1);
          val = val.trim().replace(/^["']|["']$/g, '').replace(/""/g, '"');
          cols.push(val);
          if (regex.lastIndex === line.length) break;
        }
        return {
          key: idx,
          fullName: cols[0] || '',
          mobile: cols[1] || '',
          address: cols[2] || '',
          openingBalance: Number(cols[3]) || 0,
          productType: cols[4] || 'SAVINGS',
          joiningDate: cols[5] || new Date().toISOString().split('T')[0],
          nomineeName: cols[6] || '',
          nomineeRelation: cols[7] || 'SPOUSE',
          isValid: Boolean(cols[0] && cols[1] && cols[1].length >= 10 && cols[2])
        };
      });
      setBulkRows(parsed);
      setBulkResult(null);
      message.success(`Parsed ${parsed.length} rows from CSV`);
    };
    reader.readAsText(file);
    return false;
  };

  const handleExecuteBulkImport = async () => {
    if (bulkRows.length === 0) {
      message.warning('Please select a CSV file first.');
      return;
    }
    const validRows = bulkRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      message.error('None of the rows in the CSV have valid name, mobile, and address.');
      return;
    }
    setBulkLoading(true);
    try {
      const res = await postApi('/customers/bulk-import', {
      rows: validRows.map(r => {
          const nameParts = (r.fullName || '').trim().split(' ');
          const firstName = nameParts[0] || r.fullName;
          const lastName = nameParts.slice(1).join(' ') || '';
          return {
            firstName,
            lastName,
            mobile: r.mobile,
            addressLine1: r.address,
            openingBalance: r.openingBalance,
            openingProductType: r.productType,
            joiningDate: r.joiningDate,
            nomineeName: r.nomineeName,
            nomineeRelationship: r.nomineeRelation
          };
        })
      });
      if (res.success) {
        setBulkResult(res.data);
        message.success(`Bulk migration successful! Imported ${res.data.importedCount} members.`);
        loadCustomers();
      } else {
        message.error(res.message || 'Bulk migration failed.');
      }
    } catch (err: any) {
      message.error('An error occurred during bulk migration.');
    } finally {
      setBulkLoading(false);
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
      render: (m: string, r: ICustomer) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 font-mono text-slate-700 font-medium text-xs">
            <PhoneOutlined className="text-emerald-600 text-xs" />
            <span>{m}</span>
          </div>
          {r.addressLine1 && (
            <Tooltip title={`${r.addressLine1}, ${r.city || ''} ${r.postalCode || ''}`}>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate max-w-[160px]">
                <HomeOutlined className="text-slate-400 text-[10px]" />
                <span className="truncate">{r.addressLine1}</span>
              </div>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'KYC Status',
      dataIndex: 'kycStatus',
      key: 'kycStatus',
      render: (status: string) => (
        <Tag
          icon={status === 'VERIFIED' ? <CheckCircleOutlined /> : status === 'PENDING' ? <ClockCircleOutlined /> : undefined}
          color={status === 'VERIFIED' ? 'success' : status === 'PENDING' ? 'warning' : 'error'}
        >
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
        <Space>
          <Button
            icon={<UploadOutlined />}
            onClick={() => setBulkModalVisible(true)}
            style={{ height: 40 }}
          >
            Import Legacy Registers (§50)
          </Button>
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => setCreateModalVisible(true)}
            style={{ background: '#059669', borderColor: '#059669', height: 40 }}
          >
            Register New Member
          </Button>
        </Space>
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
                <Tag
                  icon={selectedCustomer360.profile.kycStatus === 'VERIFIED' ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
                  color={selectedCustomer360.profile.kycStatus === 'VERIFIED' ? 'success' : 'warning'}
                >
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
                      {(() => {
                        let score = 30;
                        if (selectedCustomer360.profile.mobile) score += 15;
                        if (selectedCustomer360.profile.aadhaar) score += 20;
                        if (selectedCustomer360.profile.pan) score += 15;
                        if (customerDocs.length > 0) score += 20;
                        return (
                          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                              <span className="flex items-center gap-1.5">
                                <SafetyCertificateOutlined className="text-emerald-600 text-sm" />
                                KYC Profile Completion
                              </span>
                              <span className="font-mono text-emerald-700 font-bold">{score}% Complete</span>
                            </div>
                            <Progress
                              percent={score}
                              strokeColor={{ '0%': '#10b981', '100%': '#059669' }}
                              size="small"
                              status={score === 100 ? 'success' : 'active'}
                            />
                          </div>
                        );
                      })()}
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
                          <span className="font-mono font-semibold flex items-center gap-1 text-slate-800">
                            <PhoneOutlined className="text-emerald-600 text-xs" />
                            {selectedCustomer360.profile.mobile}
                          </span>
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
                          <span className="flex items-start gap-1.5 text-slate-700">
                            <HomeOutlined className="text-slate-400 mt-0.5 text-xs shrink-0" />
                            <span>
                              {selectedCustomer360.profile.addressLine1 || selectedCustomer360.profile.address}, {selectedCustomer360.profile.city || 'Delhi'} - {selectedCustomer360.profile.postalCode || '110086'} ({selectedCustomer360.profile.state || 'Delhi'})
                            </span>
                          </span>
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
                {
                  key: 'documents',
                  label: `KYC Scans & Files (${customerDocs.length})`,
                  children: (
                    <div className="space-y-4">
                      {/* Document Upload Card */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Upload Physical KYC Scan / Photo (§6, §47)</span>
                          <Select
                            value={selectedDocType}
                            onChange={(val) => setSelectedDocType(val)}
                            size="small"
                            style={{ width: 180 }}
                            options={[
                              { label: 'Customer Photo', value: 'PHOTO' },
                              { label: 'Aadhaar Card (Front)', value: 'AADHAAR_FRONT' },
                              { label: 'Aadhaar Card (Back)', value: 'AADHAAR_BACK' },
                              { label: 'PAN Card Scan', value: 'PAN' },
                              { label: 'Member Signature', value: 'SIGNATURE' },
                              { label: 'Bank Passbook / Cheque', value: 'PASSBOOK' },
                            ]}
                          />
                        </div>

                        <Upload.Dragger
                          multiple={false}
                          accept="image/*,application/pdf"
                          beforeUpload={(file) => {
                            handleUploadDoc(file);
                            return false;
                          }}
                          showUploadList={false}
                          disabled={uploadingDoc}
                          className="bg-white border-dashed border-emerald-300 rounded-lg p-3"
                        >
                          <p className="ant-upload-drag-icon text-emerald-600 mb-1">
                            <CloudUploadOutlined style={{ fontSize: 28 }} />
                          </p>
                          <p className="text-xs text-slate-700 font-medium">Click or drag file to upload {selectedDocType.replace('_', ' ')}</p>
                          <p className="text-[11px] text-slate-400">Supports JPG, PNG, PDF up to 5MB</p>
                        </Upload.Dragger>
                      </div>

                      {/* Documents List */}
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                          <PaperClipOutlined className="text-slate-600" />
                          <span>Attached Scans & Files ({customerDocs.length})</span>
                        </div>
                        {docsLoading ? (
                          <div className="text-center py-6 text-slate-400 text-xs">Loading documents...</div>
                        ) : customerDocs.length === 0 ? (
                          <div className="p-6 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200 text-xs text-slate-400">
                            No physical KYC documents or scans uploaded for this member yet.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {customerDocs.map((doc: any) => {
                              const isImg = doc.mimeType?.startsWith('image/') || doc.fileName?.match(/\.(jpg|jpeg|png|webp)$/i);
                              const isPdf = doc.fileName?.toLowerCase().endsWith('.pdf');
                              const fullUrl = doc.fileUrl?.startsWith('http') ? doc.fileUrl : `http://127.0.0.1:4000${doc.fileUrl}`;
                              return (
                                <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-emerald-300 transition-colors">
                                  <div className="flex items-center gap-3">
                                    {isImg ? (
                                      <Image
                                        src={fullUrl}
                                        alt={doc.documentType}
                                        width={48}
                                        height={48}
                                        className="rounded object-cover border border-slate-200"
                                        fallback="https://via.placeholder.com/48?text=DOC"
                                      />
                                    ) : isPdf ? (
                                      <div className="w-12 h-12 bg-red-50 text-red-600 rounded flex flex-col items-center justify-center font-bold text-[10px] border border-red-200">
                                        <FilePdfOutlined className="text-base mb-0.5" />
                                        <span>PDF</span>
                                      </div>
                                    ) : (
                                      <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded flex flex-col items-center justify-center font-bold text-[10px] border border-slate-200">
                                        <FileTextOutlined className="text-base mb-0.5" />
                                        <span>DOC</span>
                                      </div>
                                    )}
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-xs text-slate-800">{doc.fileName}</span>
                                        <Tag color="cyan" className="text-[10px]">{doc.documentType}</Tag>
                                      </div>
                                      <div className="text-[11px] text-slate-400 mt-0.5">
                                        {(doc.fileSize / 1024).toFixed(1)} KB • Uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-IN')} by {doc.uploadedBy}
                                      </div>
                                    </div>
                                  </div>
                                  <Space size="small">
                                    <Button
                                      size="small"
                                      icon={<EyeOutlined />}
                                      href={fullUrl}
                                      target="_blank"
                                    >
                                      View
                                    </Button>
                                    <Popconfirm
                                      title="Delete document"
                                      description="Are you sure you want to permanently delete this document?"
                                      onConfirm={() => handleDeleteDoc(doc.id)}
                                      okText="Delete"
                                      cancelText="Cancel"
                                      okButtonProps={{ danger: true }}
                                    >
                                      <Button size="small" danger icon={<DeleteOutlined />} />
                                    </Popconfirm>
                                  </Space>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Drawer>

      {/* BULK REGISTER IMPORTER MODAL (§50) */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <FileExcelOutlined className="text-emerald-600 text-lg" />
            <span className="font-bold text-slate-800">Legacy Paper-Register Bulk Importer (SRS §50)</span>
          </div>
        }
        open={bulkModalVisible}
        onCancel={() => {
          setBulkModalVisible(false);
          setBulkRows([]);
          setBulkResult(null);
        }}
        width={850}
        footer={[
          <Button key="close" onClick={() => setBulkModalVisible(false)}>
            Close
          </Button>,
          <Button
            key="import"
            type="primary"
            loading={bulkLoading}
            disabled={bulkRows.length === 0}
            onClick={handleExecuteBulkImport}
            style={{ background: '#059669', borderColor: '#059669' }}
          >
            Execute Bulk Migration ({bulkRows.filter((r) => r.isValid).length} Members)
          </Button>,
        ]}
      >
        <div className="space-y-4 py-2">
          <Alert
            type="info"
            showIcon
            message="Zero-Friction Paper Register Migration"
            description="Upload existing physical register records via CSV. The engine will sequentially assign permanent SJF-XXXXXX member numbers, initialize member KYC, open initial deposit accounts, and balance the opening ledger."
          />

          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <div className="text-xs font-bold text-slate-800">Step 1: Download Standard Template</div>
              <div className="text-[11px] text-slate-500">Includes correct headers: Name, Mobile, Address, Opening Balance, Product, Nominee.</div>
            </div>
            <Button icon={<DownloadOutlined />} onClick={downloadSampleCsv} size="small">
              Download Template (.CSV)
            </Button>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-800 mb-1.5">Step 2: Upload Filled Register CSV File</div>
            <Upload.Dragger
              accept=".csv,text/csv"
              beforeUpload={(file) => handleCsvFileChange(file)}
              showUploadList={false}
              className="bg-slate-50 border-dashed border-emerald-300 p-4"
            >
              <p className="ant-upload-drag-icon text-emerald-600 mb-1">
                <InboxOutlined style={{ fontSize: 32 }} />
              </p>
              <p className="text-xs text-slate-700 font-semibold">Click or drag CSV register here to inspect and preview</p>
              <p className="text-[11px] text-slate-400">File will be validated in memory before any data is written to the database</p>
            </Upload.Dragger>
          </div>

          {bulkResult && (
            <Alert
              type="success"
              showIcon
              message="Migration Complete!"
              description={`Successfully imported ${bulkResult.importedCount} members. Assigned Member IDs: ${bulkResult.createdCustomerNumbers?.slice(0, 5).join(', ')}${bulkResult.createdCustomerNumbers?.length > 5 ? '...' : ''}. Total opening balance posted: ₹${bulkResult.totalOpeningBalance?.toLocaleString('en-IN') || 0}.`}
            />
          )}

          {bulkRows.length > 0 && !bulkResult && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800">
                  Step 3: Pre-flight Verification Table ({bulkRows.length} Rows Parsed)
                </span>
                <span className="text-xs text-emerald-700 font-medium">
                  {bulkRows.filter((r) => r.isValid).length} Valid • {bulkRows.filter((r) => !r.isValid).length} Incomplete
                </span>
              </div>
              <Table
                dataSource={bulkRows}
                rowKey="key"
                size="small"
                pagination={{ pageSize: 5 }}
                columns={[
                  {
                    title: 'Full Name',
                    dataIndex: 'fullName',
                    render: (t, r) => (
                      <span className={r.isValid ? 'font-semibold' : 'text-red-500 font-semibold'}>
                        {t || '(Missing)'}
                      </span>
                    ),
                  },
                  {
                    title: 'Mobile',
                    dataIndex: 'mobile',
                    render: (m, r) => (
                      <span className="font-mono text-xs">
                        {m && m.length >= 10 ? m : <Tag color="error">Invalid Mobile</Tag>}
                      </span>
                    ),
                  },
                  { title: 'Address', dataIndex: 'address', ellipsis: true },
                  {
                    title: 'Opening Bal',
                    dataIndex: 'openingBalance',
                    render: (b) => `₹${Number(b || 0).toLocaleString('en-IN')}`,
                  },
                  { title: 'Product', dataIndex: 'productType', render: (p) => <Tag color="blue">{p}</Tag> },
                  { title: 'Nominee', dataIndex: 'nomineeName' },
                  {
                    title: 'Status',
                    render: (_, r) =>
                      r.isValid ? (
                        <Tag color="success">READY</Tag>
                      ) : (
                        <Tag color="error">INCOMPLETE</Tag>
                      ),
                  },
                ]}
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
