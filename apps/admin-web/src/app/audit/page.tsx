'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Row,
  Col,
  Tabs,
  Modal,
  Form,
  InputNumber,
  message,
  Alert,
} from 'antd';
import {
  AuditOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { fetchApi, postApi } from '@/lib/api-client';
import { FinancialEngine } from '@sanjeevani/financial-engine';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [surpriseSessions, setSurpriseSessions] = useState<any[]>([]);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [calendar, setCalendar] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    const [logRes, sesRes, calRes] = await Promise.all([
      fetchApi('/audit/logs'),
      fetchApi('/audit/surprise-audit'),
      fetchApi('/audit/compliance-calendar'),
    ]);

    if (logRes.success && logRes.data) setLogs(logRes.data);
    if (sesRes.success && sesRes.data) {
      setSurpriseSessions(sesRes.data);
      if (sesRes.data.length > 0) setCurrentSession(sesRes.data[0]);
    }
    if (calRes.success && calRes.data) setCalendar(calRes.data);
    setLoading(false);
  };

  const handleStartSurpriseAudit = async () => {
    setSubmitting(true);
    const res = await postApi('/audit/surprise-audit', { sampleSize: 20 });
    setSubmitting(false);

    if (res.success && res.data) {
      message.success(res.message || 'Surprise audit session initiated!');
      setCurrentSession(res.data.session);
      loadAllData();
    } else {
      message.error(res.message || 'Failed to start surprise audit');
    }
  };

  const handleVerifyCustomer = async (values: any) => {
    if (!currentSession || !selectedItem) return;
    setSubmitting(true);

    const res = await postApi(`/audit/surprise-audit/${currentSession.id}/verify-customer`, {
      customerId: selectedItem.customerId,
      confirmedBalance: values.confirmedBalance,
      notes: values.notes,
    });
    setSubmitting(false);

    if (res.success) {
      message.success('Member verification recorded successfully!');
      setVerifyModalVisible(false);
      form.resetFields();
      loadAllData();
    } else {
      message.error(res.message || 'Failed to record verification');
    }
  };

  const filteredLogs = logs.filter(
    (l) =>
      !search ||
      l.userName?.toLowerCase().includes(search.toLowerCase()) ||
      l.eventType?.toLowerCase().includes(search.toLowerCase()) ||
      l.reason?.toLowerCase().includes(search.toLowerCase()) ||
      l.entityType?.toLowerCase().includes(search.toLowerCase()),
  );

  const logColumns = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 170,
      render: (t: string) => (t ? new Date(t).toLocaleString('en-IN') : 'N/A'),
    },
    {
      title: 'Officer / Staff',
      dataIndex: 'userName',
      key: 'user',
      render: (u: string) => <span className="font-semibold text-slate-800">{u || 'System'}</span>,
    },
    {
      title: 'Action / Event',
      dataIndex: 'eventType',
      key: 'action',
      render: (a: string) => <Tag color="blue">{a}</Tag>,
    },
    {
      title: 'Entity',
      dataIndex: 'entityType',
      key: 'entity',
      render: (e: string, r: any) => (
        <span className="font-mono text-xs">
          {e}: {r.entityId}
        </span>
      ),
    },
    {
      title: 'Audit Detail / Narration',
      dataIndex: 'reason',
      key: 'reason',
      render: (r: string) => <span className="text-xs text-slate-600">{r}</span>,
    },
  ];

  const surpriseColumns = [
    {
      title: 'Member Number',
      dataIndex: 'customerNumber',
      key: 'num',
      render: (n: string) => <span className="font-mono font-bold text-emerald-800">{n}</span>,
    },
    {
      title: 'Customer Name',
      dataIndex: 'customerName',
      key: 'name',
    },
    {
      title: 'Mobile',
      dataIndex: 'mobile',
      key: 'mobile',
    },
    {
      title: 'System Balance',
      dataIndex: 'systemBalance',
      key: 'sysBal',
      render: (b: number) => <span className="font-bold">{FinancialEngine.formatINR(b)}</span>,
    },
    {
      title: 'Confirmed Balance',
      dataIndex: 'physicalConfirmedBalance',
      key: 'confBal',
      render: (b: number) =>
        b !== undefined ? (
          <span className="font-bold text-blue-700">{FinancialEngine.formatINR(b)}</span>
        ) : (
          <span className="text-slate-400 italic">Not yet audited</span>
        ),
    },
    {
      title: 'Discrepancy',
      dataIndex: 'discrepancy',
      key: 'disc',
      render: (d: number) =>
        d > 0 ? (
          <Tag color="error">₹{d} MISMATCH</Tag>
        ) : d === 0 ? (
          <Tag color="success">✓ ZERO MISMATCH</Tag>
        ) : (
          <Tag>PENDING</Tag>
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={s === 'CONFIRMED_MATCHED' ? 'success' : s === 'DISCREPANCY_FLAGGED' ? 'error' : 'warning'}>
          {s}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, r: any) => (
        <Button
          size="small"
          type="primary"
          onClick={() => {
            setSelectedItem(r);
            form.setFieldsValue({ confirmedBalance: r.systemBalance });
            setVerifyModalVisible(true);
          }}
        >
          Verify Balance
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <SafetyCertificateOutlined className="text-emerald-700 text-xl" />
            <h1 className="text-2xl font-bold text-slate-900 m-0">Audit, Governance & Surprise Verification</h1>
          </div>
          <p className="text-slate-500 text-sm m-0">
            Immutable system logs, random sampling audits, and institutional compliance (SRS §35, §36, §53).
          </p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadAllData} loading={loading}>
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={handleStartSurpriseAudit}
            loading={submitting}
            style={{ background: '#b91c1c', borderColor: '#b91c1c', height: 40 }}
          >
            Start Surprise Audit (20 Members)
          </Button>
        </Space>
      </div>

      <Tabs
        defaultActiveKey="surprise"
        items={[
          {
            key: 'surprise',
            label: (
              <span className="font-semibold flex items-center gap-1.5">
                <ThunderboltOutlined /> Surprise Audit (SRS §36)
              </span>
            ),
            children: (
              <div className="space-y-4">
                {currentSession ? (
                  <Card className="glass-card">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-2">
                      <div>
                        <div className="text-xs text-slate-500 uppercase font-semibold">ACTIVE AUDIT SESSION</div>
                        <div className="text-lg font-bold text-slate-900">
                          Session #{currentSession.id} — {currentSession.auditDate}
                        </div>
                      </div>
                      <div>
                        <Tag
                          color={
                            currentSession.status === 'COMPLETED_CLEAN'
                              ? 'success'
                              : currentSession.status === 'COMPLETED_WITH_DISCREPANCIES'
                              ? 'error'
                              : 'processing'
                          }
                          className="px-3 py-1 font-bold text-xs rounded-full"
                        >
                          {currentSession.status}
                        </Tag>
                      </div>
                    </div>

                    <Table
                      size="small"
                      columns={surpriseColumns}
                      dataSource={currentSession.items || []}
                      rowKey="customerId"
                      pagination={{ pageSize: 10 }}
                    />
                  </Card>
                ) : (
                  <Card className="text-center p-8">
                    <AuditOutlined className="text-4xl text-slate-300 mb-2" />
                    <div className="text-base font-bold text-slate-700">No Active Surprise Audit Session</div>
                    <p className="text-slate-500 text-xs mt-1 mb-4">
                      Click the button above to randomly sample 20 member accounts across active portfolios.
                    </p>
                    <Button type="primary" onClick={handleStartSurpriseAudit} loading={submitting}>
                      Launch Surprise Audit Now
                    </Button>
                  </Card>
                )}
              </div>
            ),
          },
          {
            key: 'calendar',
            label: (
              <span className="font-semibold flex items-center gap-1.5">
                <CalendarOutlined /> Compliance Calendar (SRS §35)
              </span>
            ),
            children: (
              <div className="space-y-4">
                {calendar && (
                  <Row gutter={[16, 16]}>
                    {Object.entries(calendar.cadence || {}).map(([key, item]: [string, any]) => (
                      <Col xs={24} sm={12} lg={8} key={key}>
                        <Card className="h-full border border-slate-200">
                          <div className="text-xs uppercase font-bold text-emerald-700 tracking-wider mb-1">
                            {key.toUpperCase()} ROUTINE
                          </div>
                          <div className="font-bold text-slate-900 text-sm mb-3">{item.task}</div>
                          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                            <span className="text-slate-500">Status:</span>
                            <Tag color={item.status.includes('CLEAN') || item.status === 'LOCKED' ? 'success' : 'processing'}>
                              {item.status}
                            </Tag>
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}
              </div>
            ),
          },
          {
            key: 'logs',
            label: (
              <span className="font-semibold flex items-center gap-1.5">
                <AuditOutlined /> Searchable Audit Logs (SRS §35)
              </span>
            ),
            children: (
              <div className="space-y-4">
                <Input
                  prefix={<SearchOutlined className="text-slate-400" />}
                  placeholder="Filter logs by officer, action, entity or reason..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full sm:w-96"
                  allowClear
                />
                <Table
                  size="small"
                  columns={logColumns}
                  dataSource={filteredLogs}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 15 }}
                />
              </div>
            ),
          },
        ]}
      />

      {/* VERIFY MEMBER MODAL */}
      <Modal
        title={`Audit Verification: ${selectedItem?.customerName}`}
        open={verifyModalVisible}
        onCancel={() => setVerifyModalVisible(false)}
        footer={null}
      >
        {selectedItem && (
          <Form form={form} layout="vertical" onFinish={handleVerifyCustomer}>
            <Alert
              message={`System Balance: ${FinancialEngine.formatINR(selectedItem.systemBalance)}`}
              description="Ask member for their current balance as per their passbook or oral statement."
              type="info"
              className="mb-4"
            />
            <Form.Item
              name="confirmedBalance"
              label="Member Confirmed Physical Balance (₹)"
              rules={[{ required: true, message: 'Please enter confirmed balance' }]}
            >
              <InputNumber className="w-full" min={0} />
            </Form.Item>
            <Form.Item name="notes" label="Auditor Notes / Observations">
              <Input.TextArea rows={2} placeholder="e.g. Passbook matched or verbal confirmation recorded" />
            </Form.Item>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
              <Button onClick={() => setVerifyModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Save Verification
              </Button>
            </div>
          </Form>
        )}
      </Modal>
    </div>
  );
}
