'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Tag,
  Table,
  Modal,
  Form,
  Input,
  message,
  Space,
  Tabs,
  Descriptions,
  Drawer,
} from 'antd';
import {
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { fetchApi, postApi } from '@/lib/api-client';
import { FinancialEngine } from '@sanjeevani/financial-engine';

export interface IPendingVerification {
  id: string;
  entityType:
    | 'LARGE_LOAN_DISBURSEMENT'
    | 'LARGE_WITHDRAWAL'
    | 'PREMATURE_ACCOUNT_CLOSURE'
    | 'MANUAL_JOURNAL_ADJUSTMENT'
    | 'FEE_OR_INTEREST_WAIVER'
    | 'CASH_MISMATCH_WRITE_OFF';
  entityId: string;
  entityReference: string;
  amount: number;
  description: string;
  requestedBy: string;
  requestedByName: string;
  branchId: string;
  branchName: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedByName?: string;
  approverComments?: string;
  rejectionReason?: string;
  createdAt: string;
  verifiedAt?: string;
}

export default function VerificationsPage() {
  const [pendingList, setPendingList] = useState<IPendingVerification[]>([]);
  const [historyList, setHistoryList] = useState<IPendingVerification[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<IPendingVerification | null>(null);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [approveForm] = Form.useForm();
  const [rejectForm] = Form.useForm();

  useEffect(() => {
    loadVerifications();
  }, []);

  const loadVerifications = async () => {
    setLoading(true);
    try {
      const [pendingRes, historyRes] = await Promise.all([
        fetchApi('/verifications/pending'),
        fetchApi('/verifications/history'),
      ]);

      if (pendingRes.success && Array.isArray(pendingRes.data)) {
        setPendingList(pendingRes.data);
      }
      if (historyRes.success && Array.isArray(historyRes.data)) {
        setHistoryList(historyRes.data);
      }
    } catch {
      message.error('Failed to load verification requests.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (values: { comments?: string }) => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      const res = await postApi(`/verifications/${selectedItem.id}/approve`, {
        comments: values.comments || 'Approved by Authorizer',
      });
      if (res.success) {
        message.success(`Request ${selectedItem.entityReference} approved successfully!`);
        setApproveModalOpen(false);
        setDetailsDrawerOpen(false);
        approveForm.resetFields();
        setSelectedItem(null);
        loadVerifications();
      } else {
        message.error(res.message || res.error || 'Approval failed.');
      }
    } catch {
      message.error('An error occurred during approval.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (values: { reason: string }) => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      const res = await postApi(`/verifications/${selectedItem.id}/reject`, {
        reason: values.reason,
      });
      if (res.success) {
        message.success(`Request ${selectedItem.entityReference} rejected.`);
        setRejectModalOpen(false);
        setDetailsDrawerOpen(false);
        rejectForm.resetFields();
        setSelectedItem(null);
        loadVerifications();
      } else {
        message.error(res.message || res.error || 'Rejection failed.');
      }
    } catch {
      message.error('An error occurred during rejection.');
    } finally {
      setSubmitting(false);
    }
  };

  const getEntityTypeLabel = (type: string) => {
    switch (type) {
      case 'LARGE_LOAN_DISBURSEMENT':
        return <Tag color="blue">Loan Disbursement (&gt;₹1L)</Tag>;
      case 'LARGE_WITHDRAWAL':
        return <Tag color="volcano">Large Withdrawal</Tag>;
      case 'PREMATURE_ACCOUNT_CLOSURE':
        return <Tag color="purple">Premature Closure</Tag>;
      case 'MANUAL_JOURNAL_ADJUSTMENT':
        return <Tag color="gold">Manual Journal</Tag>;
      case 'FEE_OR_INTEREST_WAIVER':
        return <Tag color="cyan">Fee/Interest Waiver</Tag>;
      case 'CASH_MISMATCH_WRITE_OFF':
        return <Tag color="red">Cash Mismatch Write-Off</Tag>;
      default:
        return <Tag color="default">{type.replace(/_/g, ' ')}</Tag>;
    }
  };

  const totalPendingAmount = pendingList.reduce((sum, item) => sum + (item.amount || 0), 0);
  const highValueCount = pendingList.filter((item) => item.amount >= 100000).length;

  const pendingColumns = [
    {
      title: 'Verification ID',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => <span className="font-mono text-xs font-semibold text-slate-700">{id}</span>,
    },
    {
      title: 'Operation Type',
      dataIndex: 'entityType',
      key: 'type',
      render: (type: string) => getEntityTypeLabel(type),
    },
    {
      title: 'Reference / Subject',
      dataIndex: 'entityReference',
      key: 'ref',
      render: (ref: string, r: IPendingVerification) => (
        <div>
          <div className="font-semibold text-slate-800 text-xs">{ref}</div>
          <div className="text-[11px] text-slate-400 truncate max-w-xs">{r.description}</div>
        </div>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amt: number) => (
        <span className="font-bold text-slate-900 font-mono">
          {FinancialEngine.formatINR(amt)}
        </span>
      ),
    },
    {
      title: 'Initiated By (Maker)',
      key: 'maker',
      render: (_: any, r: IPendingVerification) => (
        <div>
          <div className="text-xs font-medium text-slate-700">{r.requestedByName}</div>
          <div className="text-[10px] text-slate-400">{r.branchName}</div>
        </div>
      ),
    },
    {
      title: 'Submitted At',
      dataIndex: 'createdAt',
      key: 'date',
      render: (dt: string) => (
        <span className="text-xs text-slate-500">
          {dt ? new Date(dt).toLocaleString('en-IN') : 'N/A'}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (_: any, r: IPendingVerification) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedItem(r);
              setDetailsDrawerOpen(true);
            }}
          >
            Review
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<CheckCircleOutlined />}
            style={{ background: '#059669', borderColor: '#059669' }}
            onClick={() => {
              setSelectedItem(r);
              setApproveModalOpen(true);
            }}
          >
            Approve
          </Button>
          <Button
            size="small"
            danger
            icon={<CloseCircleOutlined />}
            onClick={() => {
              setSelectedItem(r);
              setRejectModalOpen(true);
            }}
          >
            Reject
          </Button>
        </Space>
      ),
    },
  ];

  const historyColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => <span className="font-mono text-xs">{id}</span>,
    },
    {
      title: 'Operation Type',
      dataIndex: 'entityType',
      key: 'type',
      render: (type: string) => getEntityTypeLabel(type),
    },
    {
      title: 'Reference',
      dataIndex: 'entityReference',
      key: 'ref',
      render: (ref: string) => <span className="font-semibold text-xs">{ref}</span>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amt: number) => <span className="font-mono font-bold">{FinancialEngine.formatINR(amt)}</span>,
    },
    {
      title: 'Maker',
      dataIndex: 'requestedByName',
      key: 'maker',
      render: (name: string) => <span className="text-xs">{name}</span>,
    },
    {
      title: 'Checker / Approver',
      dataIndex: 'approvedByName',
      key: 'checker',
      render: (name: string) => <span className="text-xs">{name || 'N/A'}</span>,
    },
    {
      title: 'Decision Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag
          icon={status === 'APPROVED' ? <CheckCircleOutlined /> : status === 'REJECTED' ? <CloseCircleOutlined /> : <ClockCircleOutlined />}
          color={status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'error' : 'warning'}
        >
          {status}
        </Tag>
      ),
    },
    {
      title: 'Decision Notes',
      key: 'notes',
      render: (_: any, r: IPendingVerification) => (
        <span className="text-xs text-slate-500">
          {r.status === 'REJECTED' ? r.rejectionReason : r.approverComments || 'Approved without remarks'}
        </span>
      ),
    },
    {
      title: 'Decision Date',
      dataIndex: 'verifiedAt',
      key: 'verifiedAt',
      render: (dt: string) => <span className="text-xs text-slate-400">{dt ? new Date(dt).toLocaleString('en-IN') : 'N/A'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 text-2xl">
            <SafetyCertificateOutlined />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 m-0">Four-Eyes Verification Queue (SRS §38)</h1>
            <p className="text-xs text-slate-500 m-0">
              Mandatory dual-control authorizer desk — preventing single-point unauthorized transactions and fraud.
            </p>
          </div>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadVerifications} loading={loading}>
          Refresh Queue
        </Button>
      </div>

      {/* KPI METRIC TILES */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card className="glass-card">
            <Statistic
              title="Pending Dual Authorizations"
              value={pendingList.length}
              valueStyle={{ color: pendingList.length > 0 ? '#d97706' : '#059669', fontWeight: 800 }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="glass-card">
            <Statistic
              title="High-Value Items (≥ ₹1,00,000)"
              value={highValueCount}
              valueStyle={{ color: highValueCount > 0 ? '#dc2626' : '#059669', fontWeight: 800 }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="glass-card">
            <Statistic
              title="Total Funds Awaiting Dual Clearance"
              value={FinancialEngine.formatINR(totalPendingAmount)}
              valueStyle={{ color: '#1e293b', fontWeight: 800 }}
            />
          </Card>
        </Col>
      </Row>

      {/* MAIN CONTENT TABS */}
      <Card className="glass-card">
        <Tabs
          defaultActiveKey="pending"
          items={[
            {
              key: 'pending',
              label: (
                <span className="flex items-center gap-2 font-semibold">
                  <ClockCircleOutlined />
                  Pending Approvals
                  <Tag color="orange">{pendingList.length}</Tag>
                </span>
              ),
              children: (
                <Table
                  size="middle"
                  columns={pendingColumns}
                  dataSource={pendingList}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  locale={{ emptyText: 'No transactions currently pending Four-Eyes dual control approval.' }}
                />
              ),
            },
            {
              key: 'history',
              label: (
                <span className="flex items-center gap-2 font-semibold">
                  <CheckCircleOutlined />
                  Verification Audit Trail
                  <Tag color="default">{historyList.length}</Tag>
                </span>
              ),
              children: (
                <Table
                  size="middle"
                  columns={historyColumns}
                  dataSource={historyList}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 15 }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* TRANSACTION DETAILS DRAWER */}
      <Drawer
        title="Verification Request Deep-Dive"
        open={detailsDrawerOpen}
        onClose={() => {
          setDetailsDrawerOpen(false);
          setSelectedItem(null);
        }}
        width={560}
      >
        {selectedItem && (
          <div className="space-y-6">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 font-semibold uppercase">Authorized Clearance Amount</div>
                <div className="text-2xl font-black font-mono text-emerald-900">
                  {FinancialEngine.formatINR(selectedItem.amount)}
                </div>
              </div>
              {getEntityTypeLabel(selectedItem.entityType)}
            </div>

            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Verification Reference">
                <span className="font-mono font-bold text-slate-800">{selectedItem.entityReference}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Operation Scope">{selectedItem.entityType.replace(/_/g, ' ')}</Descriptions.Item>
              <Descriptions.Item label="Detailed Narration">{selectedItem.description}</Descriptions.Item>
              <Descriptions.Item label="Submitting Maker">{selectedItem.requestedByName} ({selectedItem.requestedBy})</Descriptions.Item>
              <Descriptions.Item label="Operating Branch">{selectedItem.branchName} ({selectedItem.branchId})</Descriptions.Item>
              <Descriptions.Item label="Submission Timestamp">{new Date(selectedItem.createdAt).toLocaleString('en-IN')}</Descriptions.Item>
            </Descriptions>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => setRejectModalOpen(true)}
              >
                Reject Transaction
              </Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                style={{ background: '#059669', borderColor: '#059669' }}
                onClick={() => setApproveModalOpen(true)}
              >
                Approve & Execute
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* APPROVE CONFIRMATION MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-emerald-700 font-bold">
            <CheckCircleOutlined /> Confirm Dual-Control Approval: {selectedItem?.entityReference}
          </div>
        }
        open={approveModalOpen}
        onCancel={() => {
          setApproveModalOpen(false);
          approveForm.resetFields();
        }}
        footer={null}
        width={480}
      >
        <Form form={approveForm} layout="vertical" onFinish={handleApprove}>
          <div className="text-xs text-slate-600 mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
            You are approving <strong>{selectedItem?.entityReference}</strong> for{' '}
            <strong>{FinancialEngine.formatINR(selectedItem?.amount || 0)}</strong> under the Four-Eyes principle.
          </div>
          <Form.Item name="comments" label="Approval Remarks (Optional)">
            <Input.TextArea rows={3} placeholder="e.g. Identity and KYC documents confirmed. Sanction approved." />
          </Form.Item>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <Button onClick={() => setApproveModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ background: '#059669', borderColor: '#059669' }}>
              Confirm Clearance
            </Button>
          </div>
        </Form>
      </Modal>

      {/* REJECT CONFIRMATION MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-red-600 font-bold">
            <CloseCircleOutlined /> Reject Dual-Control Request: {selectedItem?.entityReference}
          </div>
        }
        open={rejectModalOpen}
        onCancel={() => {
          setRejectModalOpen(false);
          rejectForm.resetFields();
        }}
        footer={null}
        width={480}
      >
        <Form form={rejectForm} layout="vertical" onFinish={handleReject}>
          <Form.Item
            name="reason"
            label="Rejection Reason (Mandatory)"
            rules={[{ required: true, message: 'Please provide reason for rejection' }]}
          >
            <Input.TextArea rows={3} placeholder="State reason for rejecting this transaction..." />
          </Form.Item>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <Button onClick={() => setRejectModalOpen(false)}>Cancel</Button>
            <Button danger type="primary" htmlType="submit" loading={submitting}>
              Confirm Rejection
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
