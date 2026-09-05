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
  InputNumber,
  Input,
  message,
  Divider,
  Alert,
  Space,
  Descriptions,
  Drawer,
} from 'antd';
import {
  AuditOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  LockOutlined,
  EyeOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { fetchApi, postApi } from '@/lib/api-client';
import { FinancialEngine } from '@sanjeevani/financial-engine';
import { ICashDrawer, CashDrawerStatus } from '@sanjeevani/shared-types';

export default function CashDrawerPage() {
  const [currentDrawer, setCurrentDrawer] = useState<ICashDrawer | null>(null);
  const [history, setHistory] = useState<ICashDrawer[]>([]);
  const [loading, setLoading] = useState(false);
  const [reconcileModalVisible, setReconcileModalVisible] = useState(false);
  const [openDrawerModalVisible, setOpenDrawerModalVisible] = useState(false);
  const [selectedDrawer, setSelectedDrawer] = useState<ICashDrawer | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form] = Form.useForm();
  const [openDrawerForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleOpenDrawer = async (values: any) => {
    setSubmitting(true);
    const res = await postApi('/cash-drawers/open', {
      openingBalance: Number(values.openingBalance) || 0,
    });
    setSubmitting(false);

    if (res.success && res.data) {
      message.success('Cash Drawer Session opened successfully!');
      setOpenDrawerModalVisible(false);
      openDrawerForm.resetFields();
      loadCashData();
    } else {
      message.error(res.message || res.error || 'Failed to open drawer session');
    }
  };

  // Denominations state
  const [denominations, setDenominations] = useState<Record<string, number>>({
    '500': 0,
    '200': 0,
    '100': 0,
    '50': 0,
    '20': 0,
    '10': 0,
    coins: 0,
  });

  useEffect(() => {
    loadCashData();
  }, []);

  const loadCashData = async () => {
    setLoading(true);
    const [cRes, hRes] = await Promise.all([
      fetchApi<ICashDrawer>('/cash-drawers/current'),
      fetchApi<ICashDrawer[]>('/cash-drawers/history'),
    ]);

    if (cRes.success && cRes.data) setCurrentDrawer(cRes.data);
    if (hRes.success && hRes.data) setHistory(hRes.data);
    setLoading(false);
  };

  const calculateTotalDenomination = () => {
    return (
      (denominations['500'] || 0) * 500 +
      (denominations['200'] || 0) * 200 +
      (denominations['100'] || 0) * 100 +
      (denominations['50'] || 0) * 50 +
      (denominations['20'] || 0) * 20 +
      (denominations['10'] || 0) * 10 +
      (denominations['coins'] || 0)
    );
  };


  const handleReconcileClose = async (values: any) => {
    const totalPhysical = calculateTotalDenomination();

    setSubmitting(true);
    const res = await postApi('/cash-drawers/reconcile-close', {
      drawerId: currentDrawer?.id,
      physicalCashCount: totalPhysical,
      denominationDetails: denominations,
      reconciliationNotes: values.notes,
    });
    setSubmitting(false);

    if (res.success && res.data) {
      const st = res.data?.drawer?.status || res.data?.status;
      if (st === 'MATCHED') {
        message.success('Cash Drawer perfectly MATCHED and closed.');
      } else {
        message.warning(`Cash Drawer closed with difference: ₹ ${res.data?.drawer?.difference || 0}`);
      }
      setReconcileModalVisible(false);
      loadCashData();
    } else {
      message.error(res.message || res.error || 'Failed to reconcile drawer');
    }
  };

  const historyColumns = [
    {
      title: 'Business Date',
      dataIndex: 'businessDate',
      key: 'date',
    },
    {
      title: 'Cashier Name',
      dataIndex: 'cashierName',
      key: 'cashier',
    },
    {
      title: 'Opening Vault Balance',
      dataIndex: 'openingBalance',
      key: 'open',
      render: (v: number) => FinancialEngine.formatINR(v),
    },
    {
      title: 'Cash Received',
      dataIndex: 'cashReceived',
      key: 'in',
      render: (v: number) => <span className="text-emerald-700 font-bold">{FinancialEngine.formatINR(v)}</span>,
    },
    {
      title: 'Cash Paid Out',
      dataIndex: 'cashPaid',
      key: 'out',
      render: (v: number) => <span className="text-red-600 font-semibold">{FinancialEngine.formatINR(v)}</span>,
    },
    {
      title: 'Expected Closing',
      dataIndex: 'expectedClosingBalance',
      key: 'exp',
      render: (v: number) => FinancialEngine.formatINR(v),
    },
    {
      title: 'Physical Count',
      dataIndex: 'physicalClosingBalance',
      key: 'phys',
      render: (v: number) => (v ? FinancialEngine.formatINR(v) : '-'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => (
        <Tag
          icon={st === 'MATCHED' ? <CheckCircleOutlined /> : st === 'OPEN' ? undefined : <WarningOutlined />}
          color={st === 'MATCHED' ? 'success' : st === 'OPEN' ? 'blue' : 'error'}
        >
          {st}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, r: ICashDrawer) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedDrawer(r);
            setDrawerOpen(true);
          }}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AuditOutlined className="text-emerald-600 text-lg" />
            <h1 className="text-2xl font-bold text-slate-900 m-0">Cashier Drawer Balancing & Vault Control</h1>
          </div>
          <p className="text-slate-500 text-sm m-0">
            Daily physical cash reconciliation, denomination counting, and discrepancy detection (SRS §33, §34, BR-006).
          </p>
        </div>
        <Space>
          {currentDrawer?.status === CashDrawerStatus.OPEN ? (
            <Button
              type="primary"
              icon={<LockOutlined />}
              onClick={() => setReconcileModalVisible(true)}
              style={{ background: '#059669', borderColor: '#059669', height: 40 }}
            >
              Physical Count & Close Drawer
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setOpenDrawerModalVisible(true)}
              style={{ background: '#0284c7', borderColor: '#0284c7', height: 40 }}
            >
              Open New Drawer Session
            </Button>
          )}
        </Space>
      </div>

      {/* Active Drawer Live Summary */}
      {currentDrawer && (
        <Card className="glass-card" title={<span className="font-bold text-slate-800">Active Business Date Cash Drawer ({currentDrawer.businessDate})</span>}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <Statistic
                  title={<span className="text-xs text-slate-500 font-semibold uppercase">OPENING BALANCE</span>}
                  value={currentDrawer.openingBalance}
                  formatter={(val) => <span className="text-2xl font-black text-slate-900">{FinancialEngine.formatINR(Number(val))}</span>}
                />
                <div className="text-xs text-slate-500 mt-1">Vault opening</div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <Statistic
                  title={<span className="text-xs text-emerald-800 font-semibold uppercase">CASH RECEIVED (+)</span>}
                  value={currentDrawer.cashReceived}
                  formatter={(val) => <span className="text-2xl font-black text-emerald-700">{FinancialEngine.formatINR(Number(val))}</span>}
                />
                <div className="text-xs text-emerald-700 mt-1">Collections & Deposits</div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                <Statistic
                  title={<span className="text-xs text-red-800 font-semibold uppercase">CASH PAID OUT (-)</span>}
                  value={currentDrawer.cashPaid}
                  formatter={(val) => <span className="text-2xl font-black text-red-700">{FinancialEngine.formatINR(Number(val))}</span>}
                />
                <div className="text-xs text-red-700 mt-1">Disbursements / Withdrawals</div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <Statistic
                  title={<span className="text-xs text-blue-800 font-semibold uppercase">EXPECTED CLOSING</span>}
                  value={currentDrawer.expectedClosingBalance}
                  formatter={(val) => <span className="text-2xl font-black text-blue-900">{FinancialEngine.formatINR(Number(val))}</span>}
                />
                <div className="text-xs text-blue-700 mt-1">Status: <Tag color="blue">{currentDrawer.status}</Tag></div>
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {/* Drawer Closing History Table */}
      <Card className="glass-card" title="Historical Cash Drawer Closures & Audit Log (SRS §34)">
        <Table
          size="small"
          columns={historyColumns}
          dataSource={history}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          onRow={(record) => ({
            onClick: (e: any) => {
              if (e.target.closest('button') || e.target.closest('.ant-popconfirm') || e.target.closest('.ant-popover')) return;
              setSelectedDrawer(record);
              setDrawerOpen(true);
            },
            className: 'cursor-pointer hover:bg-emerald-50/50 transition-colors',
          })}
        />
      </Card>

      {/* PHYSICAL CASH COUNT MODAL (DENOMINATIONS) */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <AuditOutlined className="text-emerald-600" />
            <span>Physical Cash Reconciliation & Denomination Count</span>
          </div>
        }
        open={reconcileModalVisible}
        onCancel={() => { setReconcileModalVisible(false); form.resetFields(); }}
        footer={null}
        width={620}
      >
        <Form form={form} layout="vertical" onFinish={handleReconcileClose}>
          <Alert
            message="Vault Cash Count Verification (BR-006)"
            description="Count and enter all physical note quantities in cashier vault to detect any shortages or overages."
            type="info"
            showIcon
            icon={<WarningOutlined />}
            className="mb-4 text-xs"
          />

          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            {['500', '200', '100', '50', '20', '10'].map((denom) => (
              <div key={denom} className="flex items-center justify-between">
                <span className="font-bold text-xs">₹ {denom} Notes:</span>
                <InputNumber
                  min={0}
                  value={denominations[denom]}
                  onChange={(val) => setDenominations({ ...denominations, [denom]: val || 0 })}
                  className="w-24"
                />
              </div>
            ))}
            <div className="flex items-center justify-between col-span-2 pt-2 border-t border-slate-200">
              <span className="font-bold text-xs">Coins Total (₹):</span>
              <InputNumber
                min={0}
                value={denominations['coins']}
                onChange={(val) => setDenominations({ ...denominations, coins: val || 0 })}
                className="w-24"
              />
            </div>
          </div>

          {/* Real-time calculated total vs expected */}
          <div className="mt-4 p-4 bg-slate-900 text-white rounded-lg space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Total Physical Cash Counted:</span>
              <span className="font-bold text-emerald-400 text-base">{FinancialEngine.formatINR(calculateTotalDenomination())}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">System Expected Closing:</span>
              <span className="font-bold text-white">{FinancialEngine.formatINR(currentDrawer?.expectedClosingBalance || 0)}</span>
            </div>
            <Divider style={{ borderColor: '#334155', margin: '8px 0' }} />
            <div className="flex justify-between text-xs font-bold">
              <span>Difference / Variance:</span>
              <span className={calculateTotalDenomination() === (currentDrawer?.expectedClosingBalance || 0) ? 'text-emerald-400' : 'text-amber-400'}>
                {FinancialEngine.formatINR(calculateTotalDenomination() - (currentDrawer?.expectedClosingBalance || 0))}
              </span>
            </div>
          </div>

          <Form.Item name="notes" label="Reconciliation Notes / Remarks" className="mt-3">
            <Input.TextArea rows={2} placeholder="Shift notes, vault verification comments" />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <Button onClick={() => { setReconcileModalVisible(false); form.resetFields(); }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ background: '#059669', borderColor: '#059669' }}>
              Confirm Reconciliation & Lock Drawer
            </Button>
          </div>
        </Form>
      </Modal>

      {/* CASH DRAWER AUDIT DETAILS DRAWER */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <EyeOutlined className="text-emerald-600 text-lg" />
            <span className="font-bold text-slate-800 text-base">
              Cash Drawer Audit: {selectedDrawer?.businessDate} ({selectedDrawer?.cashierName || 'Cashier'})
            </span>
          </div>
        }
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedDrawer(null);
        }}
        width={560}
      >
        {selectedDrawer && (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-emerald-700 font-semibold uppercase">Physical Closing Vault Cash</div>
                <div className="text-2xl font-bold font-mono text-emerald-950">
                  {FinancialEngine.formatINR(selectedDrawer.physicalClosingBalance || selectedDrawer.expectedClosingBalance || 0)}
                </div>
              </div>
              <Tag color={selectedDrawer.status === 'MATCHED' ? 'success' : selectedDrawer.status === 'OPEN' ? 'blue' : 'error'} className="px-3 py-1 text-sm font-semibold">
                {selectedDrawer.status}
              </Tag>
            </div>

            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="Business Date">
                <span className="font-mono font-bold">{selectedDrawer.businessDate}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Cashier In-Charge">{selectedDrawer.cashierName || 'Assigned Cashier'}</Descriptions.Item>
              <Descriptions.Item label="Opening Balance">
                {FinancialEngine.formatINR(selectedDrawer.openingBalance)}
              </Descriptions.Item>
              <Descriptions.Item label="Total Cash Received (+)">
                <span className="font-bold text-emerald-700">{FinancialEngine.formatINR(selectedDrawer.cashReceived)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Total Cash Paid Out (-)">
                <span className="font-bold text-red-600">{FinancialEngine.formatINR(selectedDrawer.cashPaid)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="System Expected Closing">
                <span className="font-bold">{FinancialEngine.formatINR(selectedDrawer.expectedClosingBalance)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Physical Cash Counted">
                <span className="font-bold">{selectedDrawer.physicalClosingBalance ? FinancialEngine.formatINR(selectedDrawer.physicalClosingBalance) : 'Not Counted'}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Discrepancy / Variance">
                <span className={selectedDrawer.difference === 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                  {FinancialEngine.formatINR(selectedDrawer.difference || 0)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Reconciliation Notes">
                {selectedDrawer.reconciliationNotes || 'Standard shift closure'}
              </Descriptions.Item>
              <Descriptions.Item label="Audit Record ID">
                <span className="font-mono text-xs">{selectedDrawer.id}</span>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Drawer>

      {/* OPEN DRAWER SESSION MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <AuditOutlined className="text-emerald-600" />
            <span>Open Cash Drawer Session</span>
          </div>
        }
        open={openDrawerModalVisible}
        onCancel={() => { setOpenDrawerModalVisible(false); openDrawerForm.resetFields(); }}
        footer={null}
        width={480}
      >
        <Form form={openDrawerForm} layout="vertical" onFinish={handleOpenDrawer}>
          <div className="mb-4 text-xs text-slate-500">
            Open the cashier vault drawer session for today. Enter the physical morning cash float available in the drawer.
          </div>
          <Form.Item
            label="Opening Float / Cash in Vault (₹)"
            name="openingBalance"
            rules={[{ required: true, message: 'Please specify opening balance' }]}
            initialValue={0}
          >
            <InputNumber
              style={{ width: '100%' }}
              size="large"
              min={0}
              placeholder="0.00"
              formatter={(value) => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => (value ? (value.replace(/₹\s?|(,*)/g, '') as any) : '')}
            />
          </Form.Item>
          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => { setOpenDrawerModalVisible(false); openDrawerForm.resetFields(); }}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              style={{ background: '#0284c7', borderColor: '#0284c7' }}
            >
              Start Drawer Session
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
