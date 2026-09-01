'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Tag,
  Table,
  Modal,
  Form,
  Input,
  message,
  Steps,
  Alert,
} from 'antd';
import {
  LockOutlined,
  UnlockOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { fetchApi, postApi } from '@/lib/api-client';
import { FinancialEngine } from '@sanjeevani/financial-engine';
import { BusinessDateStatus, IBusinessDayClosure } from '@sanjeevani/shared-types';

export default function DailyClosingPage() {
  const [closingData, setClosingData] = useState<any>(null);
  const [history, setHistory] = useState<IBusinessDayClosure[]>([]);
  const [loading, setLoading] = useState(false);
  const [reopenModalVisible, setReopenModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadClosingData();
  }, []);

  const loadClosingData = async () => {
    setLoading(true);
    const [sRes, hRes] = await Promise.all([
      fetchApi('/daily-closing/status'),
      fetchApi('/daily-closing/history'),
    ]);

    if (sRes.success && sRes.data) setClosingData(sRes.data);
    if (hRes.success && hRes.data) setHistory(hRes.data);
    setLoading(false);
  };

  const handleExecuteClosing = async () => {
    const res = await postApi('/daily-closing/execute', {});

    if (res.success) {
      message.success('Business Date successfully LOCKED! Operations closed for the day.');
      loadClosingData();
    } else {
      message.error(res.message || res.error || 'Failed to lock business date');
    }
  };

  const handleReopenDate = async (values: any) => {
    const res = await postApi('/daily-closing/reopen', values);

    if (res.success) {
      message.success('Business Date reopened with Super Admin audit logging.');
      setReopenModalVisible(false);
      form.resetFields();
      loadClosingData();
    } else {
      message.error(res.message || res.error || 'Failed to reopen date');
    }
  };

  const columns = [
    {
      title: 'Business Date',
      dataIndex: 'businessDate',
      key: 'date',
    },
    {
      title: 'Branch',
      dataIndex: 'branchName',
      key: 'branch',
    },
    {
      title: 'Collections Settled',
      dataIndex: 'totalCollections',
      key: 'col',
      render: (c: number) => <span className="font-bold text-emerald-700">{FinancialEngine.formatINR(c)}</span>,
    },
    {
      title: 'Disbursements Settled',
      dataIndex: 'totalDisbursements',
      key: 'disb',
      render: (d: number) => FinancialEngine.formatINR(d),
    },
    {
      title: 'Vault Cash Closing',
      dataIndex: 'cashInHand',
      key: 'cash',
      render: (c: number) => FinancialEngine.formatINR(c),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => (
        <Tag color={st === 'LOCKED' ? 'red' : st === 'OPEN' ? 'green' : 'orange'}>
          {st}
        </Tag>
      ),
    },
    {
      title: 'Settled At',
      dataIndex: 'closedAt',
      key: 'closedAt',
      render: (t: string) => (t ? new Date(t).toLocaleString('en-IN') : '-'),
    },
  ];

  const isLocked = closingData?.status === BusinessDateStatus.LOCKED;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 m-0">Daily Closing & Business Date Lock</h1>
          <p className="text-slate-500 text-sm mt-1 m-0">
            End-of-day multi-stage settlement, ledger locking, cashier reconciliation and date lock enforcement (SRS §63, §64, BR-009, BR-010).
          </p>
        </div>
        <div className="flex gap-2">
          {!isLocked ? (
            <Button
              type="primary"
              icon={<LockOutlined />}
              onClick={handleExecuteClosing}
              style={{ background: '#059669', borderColor: '#059669', height: 40 }}
            >
              Lock Business Date
            </Button>
          ) : (
            <Button
              danger
              icon={<UnlockOutlined />}
              onClick={() => setReopenModalVisible(true)}
              style={{ height: 40 }}
            >
              Reopen Date (Privileged)
            </Button>
          )}
        </div>
      </div>

      {/* Date Status Banner */}
      <Card className="glass-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl ${isLocked ? 'bg-red-600' : 'bg-emerald-600'}`}>
              {isLocked ? <LockOutlined /> : <CheckCircleOutlined />}
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold uppercase">CURRENT BUSINESS DATE</div>
              <div className="text-2xl font-black text-slate-900">{closingData?.currentBusinessDate}</div>
            </div>
          </div>

          <div>
            <Tag color={isLocked ? 'error' : 'success'} className="px-4 py-1.5 font-bold text-sm rounded-full">
              STATUS: {closingData?.status}
            </Tag>
          </div>
        </div>

        {/* 9-Step Closing Workflow Progress (SRS §63) */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
            Daily Closing 9-Step Pipeline (SRS §63)
          </div>
          <Steps
            size="small"
            current={isLocked ? 9 : 6}
            items={[
              { title: 'Collections' },
              { title: 'Collector Recon' },
              { title: 'Cashier Drawer' },
              { title: 'Bank Check' },
              { title: 'Pending Approval' },
              { title: 'Ledger Posted' },
              { title: 'Mismatch Check' },
              { title: 'Manager Sign-off' },
              { title: 'Date Locked' },
            ]}
          />
        </div>
      </Card>

      {/* Historical Closures */}
      <Card className="glass-card" title="Historical Daily Closures & Date Locks (BR-009)">
        <Table columns={columns} dataSource={history} rowKey="id" loading={loading} scroll={{ x: 850 }} />
      </Card>

      {/* REOPEN DATE MODAL (BR-010) */}
      <Modal
        title="Privileged Business Date Reopen (BR-010)"
        open={reopenModalVisible}
        onCancel={() => setReopenModalVisible(false)}
        footer={null}
        width={540}
      >
        <Alert
          message="Mandatory Audit Requirement"
          description="Reopening a locked business date creates an indelible audit record with IP, user identity, and mandatory reason."
          type="warning"
          showIcon
          className="mb-4"
        />
        <Form form={form} layout="vertical" onFinish={handleReopenDate}>
          <Form.Item
            name="reason"
            label="Mandatory Reason for Reopening"
            rules={[{ required: true, min: 10, message: 'Please provide detailed reason (min 10 chars)' }]}
          >
            <Input.TextArea rows={3} placeholder="Explain why adjustments on closed date are required..." />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <Button onClick={() => setReopenModalVisible(false)}>Cancel</Button>
            <Button type="primary" danger htmlType="submit">
              Authorize Reopening
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
