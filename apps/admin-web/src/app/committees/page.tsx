'use client';

import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Card,
  Row,
  Col,
  Tabs,
  message,
  Divider,
  Popconfirm,
  Progress,
  Badge,
  Drawer,
  Alert,
  Statistic,
  Tooltip,
} from 'antd';
import {
  TeamOutlined,
  PlusOutlined,
  TrophyOutlined,
  DollarCircleOutlined,
  CheckCircleOutlined,
  UserAddOutlined,
  PrinterOutlined,
  CalendarOutlined,
  SyncOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  EditOutlined,
  BankOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { fetchApi, postApi, patchApi, deleteApi } from '@/lib/api-client';
import { openReceiptPrintWindow } from '@/components/print/ReceiptPrintView';

interface CommitteeGroup {
  id: string;
  committeeNumber: string;
  name: string;
  groupType: 'FIXED_DRAW' | 'AUCTION_BIDDING';
  contributionAmount: number;
  memberCount: number;
  totalPool: number;
  organizerCommissionPercent: number;
  frequency: string;
  startDate: string;
  endDate: string;
  currentRound: number;
  status: 'ACTIVE' | 'COMPLETED';
  branchId: string;
  branchName: string;
  enrolledMembersCount: number;
  totalSlots: number;
  availableSlots: number;
  totalCollected: number;
  totalDisbursed: number;
  totalCommission: number;
  completedRounds: number;
}

interface CommitteeMember {
  id: string;
  committeeId: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  slotNumber: number;
  contributionAmount: number;
  totalPaid: number;
  totalPending: number;
  payoutStatus: 'PENDING' | 'RECEIVED';
  payoutRound: number | null;
  payoutAmount: number;
  payoutDate: string | null;
}

interface CommitteeInstallment {
  id: string;
  committeeId: string;
  roundNumber: number;
  memberId: string;
  customerId: string;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  status: 'PENDING' | 'PAID';
  paymentDate: string | null;
  paymentMode: string;
  receiptNumber: string | null;
}

interface CommitteePayout {
  id: string;
  committeeId: string;
  roundNumber: number;
  winnerMemberId: string;
  customerId: string;
  customerName: string;
  grossPool: number;
  bidDiscount: number;
  dividendPerMember: number;
  organizerCommission: number;
  netPayout: number;
  payoutDate: string;
  paymentMode: string;
}

export default function CommitteesPage() {
  const [committees, setCommittees] = useState<CommitteeGroup[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');

  // Modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [collectModalVisible, setCollectModalVisible] = useState(false);
  const [auctionModalVisible, setAuctionModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedCommitteeToEdit, setSelectedCommitteeToEdit] = useState<CommitteeGroup | null>(null);

  // Drawer details
  const [selectedCommittee, setSelectedCommittee] = useState<CommitteeGroup | null>(null);
  const [committeeDetail, setCommitteeDetail] = useState<{
    group: CommitteeGroup;
    members: CommitteeMember[];
    installments: CommitteeInstallment[];
    payouts: CommitteePayout[];
    metrics: any;
  } | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Forms
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [enrollForm] = Form.useForm();
  const [collectForm] = Form.useForm();
  const [auctionForm] = Form.useForm();

  // Real-time calculation state for create modal
  const [createContribution, setCreateContribution] = useState<number>(5000);
  const [createMembers, setCreateMembers] = useState<number>(10);
  const [createCommPercent, setCreateCommPercent] = useState<number>(2);

  // Real-time calculation state for auction modal
  const [winningBidInput, setWinningBidInput] = useState<number>(0);
  const [selectedWinnerId, setSelectedWinnerId] = useState<string>('');

  useEffect(() => {
    loadCommittees();
    loadCustomers();
  }, []);

  const loadCommittees = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/committees');
      if (res.success && res.data) {
        setCommittees(res.data);
      } else if (!res.success) {
        message.error(res.message || res.error || 'Failed to load committees');
      }
    } catch (e: any) {
      message.error(`Failed to load committees: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await fetchApi('/customers?limit=200');
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data.items || []);
        setCustomers(list);
      }
    } catch {}
  };

  const openDrawer = async (group: CommitteeGroup) => {
    setSelectedCommittee(group);
    setDrawerVisible(true);
    try {
      const res = await fetchApi(`/committees/${group.id}`);
      if (res.success && res.data) {
        setCommitteeDetail(res.data);
      } else {
        message.error(res.message || res.error || 'Failed to load committee details');
      }
    } catch (e: any) {
      message.error(`Failed to load committee details: ${e.message}`);
    }
  };

  const reloadDrawerDetail = async (groupId: string) => {
    try {
      const res = await fetchApi(`/committees/${groupId}`);
      if (res.success && res.data) {
        setCommitteeDetail(res.data);
      }
    } catch {}
    loadCommittees();
  };

  // --- 1. Create Committee Group ---
  const handleCreateSubmit = async (values: any) => {
    try {
      const res = await postApi('/committees', values);
      if (res.success && res.data) {
        message.success(`Committee "${res.data.name || ''}" (${res.data.committeeNumber || ''}) created successfully!`);
        setCreateModalVisible(false);
        createForm.resetFields();
        loadCommittees();
      } else {
        message.error(res.message || res.error || 'Failed to create committee');
      }
    } catch (e: any) {
      message.error(e.message || 'Failed to create committee');
    }
  };

  // --- 2. Enroll Member ---
  const handleEnrollSubmit = async (values: any) => {
    if (!selectedCommittee) return;
    try {
      const res = await postApi(`/committees/${selectedCommittee.id}/members`, values);
      if (res.success && res.data) {
        message.success(`Customer ${res.data.customerName || ''} enrolled in Slot #${res.data.slotNumber || ''}!`);
        setEnrollModalVisible(false);
        enrollForm.resetFields();
        reloadDrawerDetail(selectedCommittee.id);
      } else {
        message.error(res.message || res.error || 'Failed to enroll member');
      }
    } catch (e: any) {
      message.error(e.message || 'Failed to enroll member');
    }
  };

  // --- 3. Collect Installment ---
  const handleCollectSubmit = async (values: any) => {
    if (!selectedCommittee) return;
    try {
      const res = await postApi(`/committees/${selectedCommittee.id}/installments/collect`, values);
      if (res.success && res.data) {
        const receiptNo = res.data.receiptNumber || 'REC-CONFIRMED';
        message.success(`Installment of ₹${Number(values.amountPaid).toLocaleString('en-IN')} collected! Receipt: ${receiptNo}`);
        setCollectModalVisible(false);
        collectForm.resetFields();

        // Prompt to print receipt
        const member = committeeDetail?.members.find((m) => m.id === values.memberId);
        if (member && res.data.receiptNumber) {
          openReceiptPrintWindow({
            receiptNumber: res.data.receiptNumber,
            customerName: member.customerName,
            customerNumber: member.customerId,
            amount: values.amountPaid,
            paymentMode: values.paymentMode || 'CASH',
            paymentFor: `Committee Installment - ${selectedCommittee.name} (Round ${values.roundNumber}, Slot #${member.slotNumber})`,
            branchName: selectedCommittee.branchName,
            generatedAt: new Date().toISOString(),
          });
        }

        reloadDrawerDetail(selectedCommittee.id);
      } else {
        message.error(res.message || res.error || 'Failed to collect installment');
      }
    } catch (e: any) {
      message.error(e.message || 'Failed to collect installment');
    }
  };

  // --- 4. Conduct Round Auction / Lucky Draw ---
  const handleAuctionSubmit = async (values: any) => {
    if (!selectedCommittee) return;
    try {
      const res = await postApi(`/committees/${selectedCommittee.id}/rounds/auction`, values);
      if (res.success && res.data) {
        const netPayoutVal = res.data.payout?.netPayout !== undefined ? Number(res.data.payout.netPayout).toLocaleString('en-IN') : '0';
        message.success(`Round ${values.roundNumber} successfully awarded! Net Payout: ₹${netPayoutVal}`);
        setAuctionModalVisible(false);
        auctionForm.resetFields();
        reloadDrawerDetail(selectedCommittee.id);
      } else {
        message.error(res.message || res.error || 'Failed to execute auction round');
      }
    } catch (e: any) {
      message.error(e.message || 'Failed to execute auction round');
    }
  };

  // --- 5. Delete Committee ---
  const handleDeleteCommittee = async (groupId: string) => {
    try {
      const res = await deleteApi(`/committees/${groupId}`);
      if (res.success) {
        message.success('Committee group deleted successfully');
        if (selectedCommittee?.id === groupId) setDrawerVisible(false);
        loadCommittees();
      } else {
        message.error(res.message || res.error || 'Failed to delete committee');
      }
    } catch (e: any) {
      message.error(e.message || 'Failed to delete committee');
    }
  };

  // --- 6. Edit Committee ---
  const handleOpenEditCommittee = (record: CommitteeGroup) => {
    setSelectedCommitteeToEdit(record);
    editForm.setFieldsValue({
      name: record.name,
      frequency: record.frequency,
      organizerCommissionPercent: record.organizerCommissionPercent,
      status: record.status,
    });
    setEditModalVisible(true);
  };

  const handleSaveEditCommittee = async (values: any) => {
    if (!selectedCommitteeToEdit) return;
    try {
      const res = await patchApi(`/committees/${selectedCommitteeToEdit.id}`, values);
      if (res.success) {
        message.success(`Committee [${values.name || selectedCommitteeToEdit.name}] updated successfully!`);
        setEditModalVisible(false);
        loadCommittees();
        if (selectedCommittee?.id === selectedCommitteeToEdit.id) {
          reloadDrawerDetail(selectedCommitteeToEdit.id);
        }
      } else {
        message.error(res.message || res.error || 'Failed to update committee');
      }
    } catch (e: any) {
      message.error(e.message || 'Failed to update committee');
    }
  };

  // Aggregate Metrics for Top Cards
  const totalCommitteesCount = committees.length;
  const activeCommitteesCount = committees.filter((c) => c.status === 'ACTIVE').length;
  const totalPoolCirculation = committees.reduce((acc, c) => acc + (Number(c.totalPool) || 0), 0);
  const totalCollections = committees.reduce((acc, c) => acc + (Number(c.totalCollected) || 0), 0);
  const totalDisbursed = committees.reduce((acc, c) => acc + (Number(c.totalDisbursed) || 0), 0);

  const filteredCommittees = committees.filter((c) => {
    if (activeTab === 'ACTIVE') return c.status === 'ACTIVE';
    if (activeTab === 'COMPLETED') return c.status === 'COMPLETED';
    if (activeTab === 'AUCTION') return c.groupType === 'AUCTION_BIDDING';
    if (activeTab === 'FIXED') return c.groupType === 'FIXED_DRAW';
    return true;
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white text-xl shadow-md">
              <TeamOutlined />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 m-0">
                Committees Management (कमेटी / बीसी / ROSCA)
              </h1>
              <p className="text-xs text-slate-500 m-0">
                Indian Community Rotating Savings & Credit Associations • Straight Lucky Draw & Bidding Auction with Dividend Distribution
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button icon={<SyncOutlined />} onClick={loadCommittees} loading={loading}>
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ backgroundColor: '#059669', borderColor: '#059669' }}
            onClick={() => {
              createForm.resetFields();
              setCreateContribution(5000);
              setCreateMembers(10);
              setCreateCommPercent(2);
              setCreateModalVisible(true);
            }}
          >
            Create Committee Group
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card className="rounded-xl shadow-sm border-slate-200" bodyStyle={{ padding: 18 }}>
            <Tooltip title="Total active rotating committee savings groups currently running">
              <Statistic
                title={<span className="text-xs font-semibold text-slate-500 uppercase">Active Groups</span>}
                value={activeCommitteesCount}
                suffix={<span className="text-xs text-slate-400">/ {totalCommitteesCount} total</span>}
                valueStyle={{ color: '#0f172a', fontWeight: 700 }}
                prefix={<TeamOutlined style={{ color: '#059669', marginRight: 6 }} />}
              />
            </Tooltip>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="rounded-xl shadow-sm border-slate-200" bodyStyle={{ padding: 18 }}>
            <Tooltip title="Total pooled capital circulating across all committee circles">
              <Statistic
                title={<span className="text-xs font-semibold text-slate-500 uppercase">Total Pool Circulation</span>}
                value={totalPoolCirculation}
                prefix="₹"
                formatter={(val) => Number(val).toLocaleString('en-IN')}
                valueStyle={{ color: '#047857', fontWeight: 700 }}
              />
            </Tooltip>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="rounded-xl shadow-sm border-slate-200" bodyStyle={{ padding: 18 }}>
            <Tooltip title="Cumulative monthly contributions collected from all members">
              <Statistic
                title={<span className="text-xs font-semibold text-slate-500 uppercase">Total Collected to Date</span>}
                value={totalCollections}
                prefix="₹"
                formatter={(val) => Number(val).toLocaleString('en-IN')}
                valueStyle={{ color: '#0284c7', fontWeight: 700 }}
              />
            </Tooltip>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="rounded-xl shadow-sm border-slate-200" bodyStyle={{ padding: 18 }}>
            <Tooltip title="Total net payouts disbursed to round winners">
              <Statistic
                title={<span className="text-xs font-semibold text-slate-500 uppercase">Total Disbursed Payouts</span>}
                value={totalDisbursed}
                prefix="₹"
                formatter={(val) => Number(val).toLocaleString('en-IN')}
                valueStyle={{ color: '#b45309', fontWeight: 700 }}
              />
            </Tooltip>
          </Card>
        </Col>
      </Row>

      {/* Filter Tabs & Groups Table */}
      <Card className="rounded-xl shadow-sm border-slate-200">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'ALL', label: `All Groups (${committees.length})` },
            { key: 'ACTIVE', label: `Active (${committees.filter((c) => c.status === 'ACTIVE').length})` },
            { key: 'AUCTION', label: `Auction Bidding (बोली वाली)` },
            { key: 'FIXED', label: `Fixed Lucky Draw (लकी ड्रा)` },
            { key: 'COMPLETED', label: `Completed (${committees.filter((c) => c.status === 'COMPLETED').length})` },
          ]}
        />

        <Table
          dataSource={filteredCommittees}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 8 }}
          scroll={{ x: 1050 }}
          columns={[
            {
              title: 'Committee Group',
              key: 'name',
              width: 220,
              render: (_, record) => (
                <div>
                  <div className="font-bold text-slate-800 text-sm">{record.name}</div>
                  <div className="text-xs text-emerald-700 font-mono font-semibold">{record.committeeNumber}</div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <CalendarOutlined /> Started: {record.startDate}
                  </div>
                </div>
              ),
            },
            {
              title: 'Type & Rules',
              key: 'type',
              width: 170,
              render: (_, record) => (
                <div>
                  {record.groupType === 'AUCTION_BIDDING' ? (
                    <Tag color="purple" className="font-semibold">
                      Auction Bidding (बोली)
                    </Tag>
                  ) : (
                    <Tag color="cyan" className="font-semibold">
                      Fixed Lucky Draw (ड्रा)
                    </Tag>
                  )}
                  <div className="text-xs text-slate-500 mt-1">
                    Org Fee: {record.organizerCommissionPercent}%
                  </div>
                </div>
              ),
            },
            {
              title: 'Monthly Contribution',
              key: 'contribution',
              width: 180,
              render: (_, record) => (
                <div>
                  <div className="font-bold text-slate-700 text-sm">
                    ₹{record.contributionAmount?.toLocaleString('en-IN')} / month
                  </div>
                  <div className="text-xs text-slate-500">
                    Gross Pool: <span className="font-semibold text-emerald-700">₹{record.totalPool?.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ),
            },
            {
              title: 'Members / Slots',
              key: 'slots',
              width: 170,
              render: (_, record) => {
                const percent = Math.round((record.enrolledMembersCount / record.totalSlots) * 100) || 0;
                return (
                  <div className="w-36">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-1">
                      <span>{record.enrolledMembersCount} / {record.totalSlots} Slots</span>
                      <Badge
                        count={record.availableSlots > 0 ? `${record.availableSlots} open` : 'Full'}
                        style={{
                          backgroundColor: record.availableSlots > 0 ? '#0284c7' : '#059669',
                          fontSize: 10,
                          lineHeight: '16px',
                          height: '16px',
                        }}
                      />
                    </div>
                    <Progress percent={percent} size="small" status={percent === 100 ? 'success' : 'active'} showInfo={false} />
                  </div>
                );
              },
            },
            {
              title: 'Rounds Progress',
              key: 'rounds',
              width: 140,
              render: (_, record) => (
                <div>
                  <div className="text-xs font-bold text-slate-700">
                    Round {record.currentRound} of {record.totalSlots}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {record.completedRounds} rounds paid out
                  </div>
                </div>
              ),
            },
            {
              title: 'Status',
              key: 'status',
              width: 110,
              render: (_, record) => (
                <div className="flex items-center gap-1.5">
                  <Badge status={record.status === 'ACTIVE' ? 'processing' : 'default'} />
                  <Tag color={record.status === 'ACTIVE' ? 'green' : 'default'} className="font-bold">
                    {record.status}
                  </Tag>
                </div>
              ),
            },
            {
              title: 'Actions',
              key: 'actions',
              width: 150,
              fixed: 'right',
              align: 'right',
              render: (_, record) => (
                <Space size={6}>
                  <Tooltip title="Open detailed member roster, collections matrix & conduct round draw/auction">
                    <Button
                      type="primary"
                      size="small"
                      icon={<EyeOutlined />}
                      style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                      onClick={() => openDrawer(record)}
                    >
                      View
                    </Button>
                  </Tooltip>
                  <Tooltip title="Edit Committee parameters & status">
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleOpenEditCommittee(record)}
                    />
                  </Tooltip>
                  <Tooltip title="Delete committee group (only permitted before installments are collected)">
                    <Popconfirm
                      title="Delete Committee Group?"
                      description="Only committees with no paid installments can be deleted."
                      onConfirm={() => handleDeleteCommittee(record.id)}
                      okText="Delete"
                      cancelText="Cancel"
                    >
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Tooltip>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {/* --- MODAL 1: Create Committee Group --- */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <TeamOutlined className="text-emerald-600" />
            <span>Create New Committee Group (कमेटी समूह)</span>
          </div>
        }
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={620}
      >
        <Form
          form={createForm}
          layout="vertical"
          initialValues={{
            groupType: 'AUCTION_BIDDING',
            contributionAmount: 5000,
            memberCount: 10,
            organizerCommissionPercent: 2,
            frequency: 'MONTHLY',
            startDate: new Date().toISOString().split('T')[0],
          }}
          onValuesChange={(changed) => {
            if (changed.contributionAmount !== undefined) setCreateContribution(Number(changed.contributionAmount) || 0);
            if (changed.memberCount !== undefined) setCreateMembers(Number(changed.memberCount) || 0);
            if (changed.organizerCommissionPercent !== undefined) setCreateCommPercent(Number(changed.organizerCommissionPercent) || 0);
          }}
          onFinish={handleCreateSubmit}
        >
          <Form.Item
            label={<span className="font-semibold text-slate-700">Committee Name (कमेटी का नाम)</span>}
            name="name"
            rules={[{ required: true, message: 'Please enter committee name' }]}
          >
            <Input placeholder={`e.g. Laxmi Vyapar Committee ${new Date().getFullYear()} / 50K Monthly`} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={<span className="font-semibold text-slate-700">Committee Model / Type</span>}
                name="groupType"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    {
                      value: 'AUCTION_BIDDING',
                      label: 'Auction Bidding (बोली वाली कमेटी - Chit Style)',
                    },
                    {
                      value: 'FIXED_DRAW',
                      label: 'Fixed Lucky Draw (एक-एक करके पूरी रकम)',
                    },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={<span className="font-semibold text-slate-700">Frequency</span>}
                name="frequency"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { value: 'MONTHLY', label: 'Monthly (मासिक)' },
                    { value: 'WEEKLY', label: 'Weekly (साप्ताहिक)' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={<span className="font-semibold text-slate-700">Monthly Contribution per Member (₹)</span>}
                name="contributionAmount"
                rules={[{ required: true, message: 'Enter monthly contribution' }]}
              >
                <InputNumber min={500} max={1000000} step={500} style={{ width: '100%' }} prefix="₹" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={<span className="font-semibold text-slate-700">Total Members / Slots (सदस्य संख्या)</span>}
                name="memberCount"
                rules={[{ required: true, message: 'Enter total members' }]}
              >
                <InputNumber min={2} max={50} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={<span className="font-semibold text-slate-700">Organizer Commission (% शुल्क)</span>}
                name="organizerCommissionPercent"
              >
                <InputNumber min={0} max={20} step={0.5} style={{ width: '100%' }} suffix="%" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={<span className="font-semibold text-slate-700">First Round Date</span>}
                name="startDate"
                rules={[{ required: true }]}
              >
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>

          {/* Real-time Math Summary Card */}
          <Divider className="my-3" />
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 text-emerald-950">
            <div className="font-bold text-sm mb-2 flex items-center gap-2">
              <InfoCircleOutlined className="text-emerald-700" />
              <span>Committee Financial Blueprint Preview:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                Monthly Pool Size: <span className="font-bold text-emerald-900">₹{(createContribution * createMembers).toLocaleString('en-IN')}</span>
              </div>
              <div>
                Total Duration: <span className="font-bold text-emerald-900">{createMembers} Months ({createMembers} Rounds)</span>
              </div>
              <div>
                Organizer Fee per Round: <span className="font-bold text-emerald-900">₹{((createContribution * createMembers * createCommPercent) / 100).toLocaleString('en-IN')}</span>
              </div>
              <div>
                Max Payout Capacity: <span className="font-bold text-emerald-900">₹{(createContribution * createMembers).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setCreateModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ backgroundColor: '#059669', borderColor: '#059669' }}>
              Create Committee
            </Button>
          </div>
        </Form>
      </Modal>

      {/* --- MODAL 1.5: Edit Committee Group --- */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <EditOutlined className="text-emerald-600" />
            <span>Edit Committee Group: {selectedCommitteeToEdit?.name}</span>
          </div>
        }
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        width={520}
      >
        <Form form={editForm} layout="vertical" onFinish={handleSaveEditCommittee} className="mt-4">
          <Form.Item
            label={<span className="font-semibold text-slate-700">Committee Group Name</span>}
            name="name"
            rules={[{ required: true, message: 'Please enter committee group name' }]}
          >
            <Input placeholder="e.g. Rohini Sector 7 Friends Committee" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={<span className="font-semibold text-slate-700">Contribution Frequency</span>}
                name="frequency"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { label: 'Monthly (मासिक)', value: 'MONTHLY' },
                    { label: 'Weekly (साप्ताहिक)', value: 'WEEKLY' },
                    { label: 'Daily (दैनिक)', value: 'DAILY' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={<span className="font-semibold text-slate-700">Organizer Fee %</span>}
                name="organizerCommissionPercent"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} max={25} step={0.5} style={{ width: '100%' }} suffix="%" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={<span className="font-semibold text-slate-700">Operating Status</span>}
            name="status"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { label: 'Active (चालू)', value: 'ACTIVE' },
                { label: 'Completed (समाप्त)', value: 'COMPLETED' },
              ]}
            />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button onClick={() => setEditModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ backgroundColor: '#059669', borderColor: '#059669' }}>
              Save Changes
            </Button>
          </div>
        </Form>
      </Modal>

      {/* --- DRAWER: Committee Operational Workspace --- */}
      <Drawer
        title={
          selectedCommittee && (
            <div className="flex items-center justify-between w-full pr-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-slate-800">{selectedCommittee.name}</span>
                  <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {selectedCommittee.committeeNumber}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <span><CalendarOutlined /> Started: {selectedCommittee.startDate}</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-medium"><BankOutlined /> Branch: {selectedCommittee.branchName || 'Head Office'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge status={selectedCommittee.status === 'ACTIVE' ? 'processing' : 'default'} />
                <Tag color={selectedCommittee.status === 'ACTIVE' ? 'green' : 'default'} className="font-bold">
                  {selectedCommittee.status}
                </Tag>
              </div>
            </div>
          )
        }
        placement="right"
        width={960}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {committeeDetail && (
          <div>
            {/* Top Stat Summary Banner */}
            <div className="bg-slate-900 text-white rounded-xl p-5 mb-4 shadow-md">
              <Row gutter={16}>
                <Col span={6}>
                  <div className="text-xs text-slate-400 uppercase font-semibold">Monthly Contribution</div>
                  <div className="text-lg font-extrabold text-white mt-0.5">
                    ₹{committeeDetail.group.contributionAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-emerald-400 font-medium">per slot / month</div>
                </Col>
                <Col span={6}>
                  <div className="text-xs text-slate-400 uppercase font-semibold">Gross Pool</div>
                  <div className="text-lg font-extrabold text-emerald-400 mt-0.5">
                    ₹{committeeDetail.group.totalPool.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">{committeeDetail.group.memberCount} members total</div>
                </Col>
                <Col span={6}>
                  <div className="text-xs text-slate-400 uppercase font-semibold">Current Round</div>
                  <div className="text-lg font-extrabold text-amber-400 mt-0.5">
                    Round {committeeDetail.group.currentRound}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">of {committeeDetail.group.memberCount} rounds</div>
                </Col>
                <Col span={6}>
                  <div className="text-xs text-slate-400 uppercase font-semibold">Total Collections</div>
                  <div className="text-lg font-extrabold text-sky-400 mt-0.5">
                    ₹{committeeDetail.metrics.totalCollected.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">disbursed: ₹{committeeDetail.metrics.totalDisbursed.toLocaleString('en-IN')}</div>
                </Col>
              </Row>
            </div>

            <Divider className="my-3" />

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap gap-2 mb-6">
              <Tooltip title="Enroll a customer into an empty slot in this committee group">
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                  disabled={committeeDetail.members.length >= committeeDetail.group.memberCount}
                  onClick={() => {
                    enrollForm.resetFields();
                    setEnrollModalVisible(true);
                  }}
                >
                  Enroll Member ({committeeDetail.metrics.availableSlots} slots left)
                </Button>
              </Tooltip>

              <Tooltip title="Collect current round installment from a member and issue an official receipt">
                <Button
                  type="primary"
                  icon={<DollarCircleOutlined />}
                  style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                  onClick={() => {
                    collectForm.resetFields();
                    collectForm.setFieldsValue({
                      roundNumber: committeeDetail.group.currentRound,
                      amountPaid: committeeDetail.group.contributionAmount,
                      paymentMode: 'CASH',
                    });
                    setCollectModalVisible(true);
                  }}
                >
                  Collect Member Installment
                </Button>
              </Tooltip>

              <Tooltip title="Execute this round's draw or bidding auction to calculate dividend and disburse payout">
                <Button
                  type="primary"
                  icon={<TrophyOutlined />}
                  style={{ backgroundColor: '#b45309', borderColor: '#b45309' }}
                  disabled={committeeDetail.group.status === 'COMPLETED'}
                  onClick={() => {
                    auctionForm.resetFields();
                    auctionForm.setFieldsValue({
                      roundNumber: committeeDetail.group.currentRound,
                      paymentMode: 'CASH',
                    });
                    setWinningBidInput(committeeDetail.group.totalPool);
                    setSelectedWinnerId('');
                    setAuctionModalVisible(true);
                  }}
                >
                  Conduct Round {committeeDetail.group.currentRound} Draw / Bidding
                </Button>
              </Tooltip>
            </div>

            {/* Sub-Tabs: 1. Members, 2. Installments, 3. Payouts History */}
            <Tabs
              defaultActiveKey="members"
              items={[
                {
                  key: 'members',
                  label: (
                    <span className="flex items-center gap-1.5">
                      <span>Members Roster</span>
                      <Badge
                        count={committeeDetail.members.length}
                        overflowCount={99}
                        style={{ backgroundColor: '#0284c7', fontSize: 10, height: 16, lineHeight: '16px' }}
                      />
                    </span>
                  ),
                  children: (
                    <Table
                      dataSource={committeeDetail.members}
                      rowKey="id"
                      pagination={false}
                      size="small"
                      columns={[
                        {
                          title: 'Slot',
                          dataIndex: 'slotNumber',
                          key: 'slotNumber',
                          render: (slot) => (
                            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs">
                              {slot}
                            </span>
                          ),
                        },
                        {
                          title: 'Member / Customer',
                          key: 'customerName',
                          render: (_, m) => (
                            <div>
                              <div className="font-bold text-slate-800 text-sm">{m.customerName}</div>
                              <div className="text-xs text-slate-500">{m.customerMobile} • {m.customerId}</div>
                            </div>
                          ),
                        },
                        {
                          title: 'Total Contributed',
                          key: 'totalPaid',
                          render: (_, m) => (
                            <Tooltip title="Cumulative amount deposited by this member across all completed rounds">
                              <div className="font-semibold text-slate-700 cursor-help">
                                ₹{m.totalPaid.toLocaleString('en-IN')}
                              </div>
                            </Tooltip>
                          ),
                        },
                        {
                          title: 'Payout Status',
                          key: 'payoutStatus',
                          render: (_, m) => (
                            <div>
                              {m.payoutStatus === 'RECEIVED' ? (
                                <Tag color="gold" icon={<CheckCircleOutlined />} className="font-bold">
                                  Won Round {m.payoutRound} (₹{m.payoutAmount?.toLocaleString('en-IN')})
                                </Tag>
                              ) : (
                                <Tag color="blue" className="font-medium">
                                  Pending Draw
                                </Tag>
                              )}
                            </div>
                          ),
                        },
                      ]}
                    />
                  ),
                },
                {
                  key: 'installments',
                  label: (
                    <span className="flex items-center gap-1.5">
                      <span>Current Round Installments</span>
                      <Badge
                        count={committeeDetail.installments.filter((i) => i.roundNumber === committeeDetail.group.currentRound).length}
                        overflowCount={99}
                        style={{ backgroundColor: '#059669', fontSize: 10, height: 16, lineHeight: '16px' }}
                      />
                    </span>
                  ),
                  children: (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-600 uppercase">
                          Round {committeeDetail.group.currentRound} Collections Matrix
                        </span>
                        <Tag color="green" icon={<CheckCircleOutlined />} className="font-semibold">
                          Paid: {committeeDetail.installments.filter((i) => i.roundNumber === committeeDetail.group.currentRound && i.status === 'PAID').length} / {committeeDetail.members.length}
                        </Tag>
                      </div>

                      <Table
                        dataSource={committeeDetail.installments.filter((i) => i.roundNumber === committeeDetail.group.currentRound)}
                        rowKey="id"
                        pagination={false}
                        size="small"
                        columns={[
                          {
                            title: 'Member',
                            key: 'member',
                            render: (_, inst) => {
                              const member = committeeDetail.members.find((m) => m.id === inst.memberId);
                              return (
                                <div>
                                  <div className="font-semibold text-slate-800 text-sm">{member?.customerName || inst.customerId}</div>
                                  <div className="text-xs text-slate-400">Slot #{member?.slotNumber}</div>
                                </div>
                              );
                            },
                          },
                          {
                            title: 'Amount Due',
                            dataIndex: 'amountDue',
                            key: 'amountDue',
                            render: (amt) => <span className="font-bold text-slate-700">₹{amt.toLocaleString('en-IN')}</span>,
                          },
                          {
                            title: 'Status',
                            key: 'status',
                            render: (_, inst) => (
                              <Tag
                                color={inst.status === 'PAID' ? 'green' : 'orange'}
                                icon={inst.status === 'PAID' ? <CheckCircleOutlined /> : undefined}
                                className="font-bold"
                              >
                                {inst.status}
                              </Tag>
                            ),
                          },
                          {
                            title: 'Receipt / Payment Date',
                            key: 'paymentDate',
                            render: (_, inst) => (
                              <div>
                                {inst.status === 'PAID' ? (
                                  <div>
                                    <div className="text-xs font-mono font-bold text-emerald-700">{inst.receiptNumber}</div>
                                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                      <CalendarOutlined /> {inst.paymentDate} • {inst.paymentMode}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <CalendarOutlined /> Due by {inst.dueDate}
                                  </span>
                                )}
                              </div>
                            ),
                          },
                          {
                            title: 'Action',
                            key: 'action',
                            render: (_, inst) => {
                              const member = committeeDetail.members.find((m) => m.id === inst.memberId);
                              if (inst.status === 'PAID') {
                                return (
                                  <Tooltip title="Print official payment receipt">
                                    <Button
                                      size="small"
                                      icon={<PrinterOutlined />}
                                      onClick={() => {
                                        if (member) {
                                          openReceiptPrintWindow({
                                            receiptNumber: inst.receiptNumber || 'REC-XXXX',
                                            customerName: member.customerName,
                                            customerNumber: member.customerId,
                                            amount: inst.amountPaid,
                                            paymentMode: inst.paymentMode || 'CASH',
                                            paymentFor: `Committee Installment - ${committeeDetail.group.name} (Round ${inst.roundNumber}, Slot #${member.slotNumber})`,
                                            branchName: committeeDetail.group.branchName,
                                            generatedAt: inst.paymentDate || new Date().toISOString(),
                                          });
                                        }
                                      }}
                                    >
                                      Receipt
                                    </Button>
                                  </Tooltip>
                                );
                              }
                              return (
                                <Tooltip title="Record payment and generate receipt">
                                  <Button
                                    size="small"
                                    type="primary"
                                    style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                                    onClick={() => {
                                      collectForm.resetFields();
                                      collectForm.setFieldsValue({
                                        memberId: inst.memberId,
                                        roundNumber: inst.roundNumber,
                                        amountPaid: inst.amountDue,
                                        paymentMode: 'CASH',
                                      });
                                      setCollectModalVisible(true);
                                    }}
                                  >
                                    Collect
                                  </Button>
                                </Tooltip>
                              );
                            },
                          },
                        ]}
                      />
                    </div>
                  ),
                },
                {
                  key: 'payouts',
                  label: (
                    <span className="flex items-center gap-1.5">
                      <span>Disbursed Rounds History</span>
                      <Badge
                        count={committeeDetail.payouts.length}
                        overflowCount={99}
                        style={{ backgroundColor: '#7c3aed', fontSize: 10, height: 16, lineHeight: '16px' }}
                      />
                    </span>
                  ),
                  children: (
                    <Table
                      dataSource={committeeDetail.payouts}
                      rowKey="id"
                      pagination={false}
                      size="small"
                      columns={[
                        {
                          title: 'Round',
                          dataIndex: 'roundNumber',
                          key: 'roundNumber',
                          render: (r) => (
                            <Tag color="purple" icon={<CheckCircleOutlined />} className="font-bold">
                              Round {r}
                            </Tag>
                          ),
                        },
                        {
                          title: 'Winner Member',
                          dataIndex: 'customerName',
                          key: 'customerName',
                          render: (name) => <span className="font-bold text-slate-800">{name}</span>,
                        },
                        {
                          title: 'Gross Pool',
                          dataIndex: 'grossPool',
                          key: 'grossPool',
                          render: (amt) => <span>₹{amt?.toLocaleString('en-IN')}</span>,
                        },
                        {
                          title: 'Winning Bid / Net Payout',
                          dataIndex: 'netPayout',
                          key: 'netPayout',
                          render: (amt) => <span className="font-bold text-emerald-700">₹{amt?.toLocaleString('en-IN')}</span>,
                        },
                        {
                          title: 'Dividend to Each Member',
                          dataIndex: 'dividendPerMember',
                          key: 'dividendPerMember',
                          render: (amt) => (
                            <span className="text-xs font-semibold text-sky-700">
                              {amt > 0 ? `₹${amt.toLocaleString('en-IN')} saved` : '—'}
                            </span>
                          ),
                        },
                        {
                          title: 'Organizer Fee',
                          dataIndex: 'organizerCommission',
                          key: 'organizerCommission',
                          render: (amt) => <span>₹{amt?.toLocaleString('en-IN')}</span>,
                        },
                        {
                          title: 'Disbursement Date',
                          dataIndex: 'payoutDate',
                          key: 'payoutDate',
                          render: (date) => (
                            <span className="text-xs text-slate-600 flex items-center gap-1">
                              <CalendarOutlined /> {date}
                            </span>
                          ),
                        },
                      ]}
                    />
                  ),
                },
              ]}
            />
          </div>
        )}
      </Drawer>

      {/* --- MODAL 2: Enroll Member Modal --- */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <UserAddOutlined className="text-sky-600" />
            <span>Enroll Member into Slot (सदस्य जोड़ें)</span>
          </div>
        }
        open={enrollModalVisible}
        onCancel={() => setEnrollModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={enrollForm} layout="vertical" onFinish={handleEnrollSubmit}>
          <Form.Item
            label={<span className="font-semibold text-slate-700">Select Customer (ग्राहक चुनें)</span>}
            name="customerId"
            rules={[{ required: true, message: 'Please select a customer' }]}
          >
            <Select
              showSearch
              placeholder="Search by Name, Mobile, or Customer ID"
              optionFilterProp="children"
              filterOption={(input, option: any) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={(Array.isArray(customers) ? customers : []).map((c) => ({
                value: c.id,
                label: `${c.firstName || ''} ${c.lastName || ''} (${c.mobile || 'N/A'}) - ${c.customerNumber || c.id}`.trim(),
              }))}
            />
          </Form.Item>

          <Form.Item
            label={<span className="font-semibold text-slate-700">Preferred Slot Number (optional, 1..N)</span>}
            name="slotNumber"
            help="Leave empty to automatically assign next available slot"
          >
            <InputNumber min={1} max={selectedCommittee?.memberCount || 50} style={{ width: '100%' }} />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setEnrollModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}>
              Confirm Enrollment
            </Button>
          </div>
        </Form>
      </Modal>

      {/* --- MODAL 3: Collect Installment Modal --- */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <DollarCircleOutlined className="text-emerald-600" />
            <span>Collect Committee Installment (किस्त जमा करें)</span>
          </div>
        }
        open={collectModalVisible}
        onCancel={() => setCollectModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={collectForm} layout="vertical" onFinish={handleCollectSubmit}>
          <Form.Item
            label={<span className="font-semibold text-slate-700">Member (सदस्य)</span>}
            name="memberId"
            rules={[{ required: true, message: 'Select member' }]}
          >
            <Select
              placeholder="Select Member"
              options={committeeDetail?.members.map((m) => ({
                value: m.id,
                label: `Slot #${m.slotNumber}: ${m.customerName} (${m.customerMobile})`,
              }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={<span className="font-semibold text-slate-700">Round Number</span>}
                name="roundNumber"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={selectedCommittee?.memberCount || 50} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={<span className="font-semibold text-slate-700">Amount to Collect (₹)</span>}
                name="amountPaid"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={1000000} style={{ width: '100%' }} prefix="₹" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={<span className="font-semibold text-slate-700">Payment Mode (भुगतान का प्रकार)</span>}
            name="paymentMode"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 'CASH', label: 'Cash (नकद)' },
                { value: 'UPI', label: 'UPI (GPay / PhonePe / Paytm)' },
                { value: 'BANK_TRANSFER', label: 'Bank Transfer / IMPS / NEFT' },
                { value: 'CHEQUE', label: 'Cheque' },
              ]}
            />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setCollectModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ backgroundColor: '#059669', borderColor: '#059669' }}>
              Record Payment & Issue Receipt
            </Button>
          </div>
        </Form>
      </Modal>

      {/* --- MODAL 4: Conduct Round Draw / Bidding Auction Modal --- */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <TrophyOutlined className="text-amber-600" />
            <span>
              Conduct Round {selectedCommittee?.currentRound} {selectedCommittee?.groupType === 'AUCTION_BIDDING' ? 'Auction (कमेटी की बोली)' : 'Lucky Draw (लकी ड्रा)'}
            </span>
          </div>
        }
        open={auctionModalVisible}
        onCancel={() => setAuctionModalVisible(false)}
        footer={null}
        width={620}
      >
        <Form
          form={auctionForm}
          layout="vertical"
          onFinish={handleAuctionSubmit}
          onValuesChange={(changed) => {
            if (changed.winningBidAmount !== undefined) setWinningBidInput(Number(changed.winningBidAmount) || 0);
            if (changed.winnerMemberId !== undefined) setSelectedWinnerId(changed.winnerMemberId);
          }}
        >
          <Alert
            message={
              selectedCommittee?.groupType === 'AUCTION_BIDDING'
                ? 'बोली वाली कमेटी (Auction Bidding): The member who bids the lowest takes the pot early. The remaining discount (surplus) is distributed as dividend to all other members, reducing their next monthly contribution.'
                : 'लकी ड्रा (Fixed Draw): One member receives the full committee pool minus the organizer commission. Each member wins exactly once.'
            }
            type="info"
            showIcon
            className="mb-4 text-xs"
          />

          <Form.Item
            label={<span className="font-semibold text-slate-700">Winner Member (विजेता सदस्य)</span>}
            name="winnerMemberId"
            rules={[{ required: true, message: 'Please select winner member' }]}
            help="Only members who have NOT yet received a payout are eligible"
          >
            <Select
              placeholder="Select Eligible Member"
              options={committeeDetail?.members
                .filter((m) => m.payoutStatus === 'PENDING')
                .map((m) => ({
                  value: m.id,
                  label: `Slot #${m.slotNumber}: ${m.customerName} (${m.customerMobile})`,
                }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={<span className="font-semibold text-slate-700">Round Number</span>}
                name="roundNumber"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={selectedCommittee?.memberCount || 50} style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            {selectedCommittee?.groupType === 'AUCTION_BIDDING' ? (
              <Col span={12}>
                <Form.Item
                  label={<span className="font-semibold text-slate-700">Winning Bid Amount (बोली की रकम)</span>}
                  name="winningBidAmount"
                  rules={[{ required: true, message: 'Enter winning bid amount' }]}
                  help={`Gross pool: ₹${(selectedCommittee?.totalPool || 0).toLocaleString('en-IN')}`}
                >
                  <InputNumber
                    min={1}
                    max={selectedCommittee?.totalPool || 1000000}
                    step={1000}
                    style={{ width: '100%' }}
                    prefix="₹"
                  />
                </Form.Item>
              </Col>
            ) : (
              <Col span={12}>
                <Form.Item label={<span className="font-semibold text-slate-700">Payment Mode</span>} name="paymentMode">
                  <Select
                    options={[
                      { value: 'CASH', label: 'Cash' },
                      { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                      { value: 'CHEQUE', label: 'Cheque' },
                    ]}
                  />
                </Form.Item>
              </Col>
            )}
          </Row>

          {/* Real-time Math Preview for Auction */}
          <Divider className="my-3" />
          {selectedCommittee && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-amber-950">
              <div className="font-bold text-sm mb-2">Round Disbursement & Dividend Breakdown:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  Gross Pool: <span className="font-bold text-slate-800">₹{selectedCommittee.totalPool.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  Net Payout to Winner: <span className="font-bold text-emerald-800">₹{(selectedCommittee.groupType === 'AUCTION_BIDDING' ? (winningBidInput || selectedCommittee.totalPool) : (selectedCommittee.totalPool - (selectedCommittee.totalPool * (selectedCommittee.organizerCommissionPercent || 0)) / 100)).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  Organizer Fee ({selectedCommittee.organizerCommissionPercent}%): <span className="font-bold text-slate-800">₹{((selectedCommittee.totalPool * selectedCommittee.organizerCommissionPercent) / 100).toLocaleString('en-IN')}</span>
                </div>
                {selectedCommittee.groupType === 'AUCTION_BIDDING' && (
                  <div>
                    Dividend per Member: <span className="font-bold text-sky-800">₹{Math.max(0, Math.floor(((selectedCommittee.totalPool - winningBidInput) - ((selectedCommittee.totalPool * selectedCommittee.organizerCommissionPercent) / 100)) / selectedCommittee.memberCount)).toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button onClick={() => setAuctionModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ backgroundColor: '#b45309', borderColor: '#b45309' }}>
              Confirm & Disburse Winner Payout
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
