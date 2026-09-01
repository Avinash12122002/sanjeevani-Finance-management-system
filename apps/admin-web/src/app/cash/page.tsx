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
} from 'antd';
import {
  AuditOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { fetchApi, postApi } from '@/lib/api-client';
import { FinancialEngine } from '@sanjeevani/financial-engine';
import { ICashDrawer, CashDrawerStatus } from '@sanjeevani/shared-types';

export default function CashDrawerPage() {
  const [currentDrawer, setCurrentDrawer] = useState<ICashDrawer | null>(null);
  const [history, setHistory] = useState<ICashDrawer[]>([]);
  const [loading, setLoading] = useState(false);
  const [reconcileModalVisible, setReconcileModalVisible] = useState(false);
  const [form] = Form.useForm();

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

    const res = await postApi('/cash-drawers/reconcile-close', {
      drawerId: currentDrawer?.id,
      physicalCashCount: totalPhysical,
      denominationDetails: denominations,
      reconciliationNotes: values.notes,
    });

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
        <Tag color={st === 'MATCHED' ? 'success' : st === 'OPEN' ? 'blue' : 'error'}>
          {st}
        </Tag>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 m-0">Cashier Drawer Balancing & Vault Control</h1>
          <p className="text-slate-500 text-sm mt-1 m-0">
            Daily physical cash reconciliation, denomination counting, and discrepancy detection (SRS §33, §34, BR-006).
          </p>
        </div>
        {currentDrawer?.status === CashDrawerStatus.OPEN && (
          <Button
            type="primary"
            icon={<LockOutlined />}
            onClick={() => setReconcileModalVisible(true)}
            style={{ background: '#059669', borderColor: '#059669', height: 40 }}
          >
            Physical Count & Close Drawer
          </Button>
        )}
      </div>

      {/* Active Drawer Live Summary */}
      {currentDrawer && (
        <Card className="glass-card" title={<span className="font-bold text-slate-800">Active Business Date Cash Drawer ({currentDrawer.businessDate})</span>}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 font-semibold uppercase">OPENING BALANCE</div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {FinancialEngine.formatINR(currentDrawer.openingBalance)}
                </div>
                <div className="text-xs text-slate-500 mt-1">Vault opening</div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="text-xs text-emerald-800 font-semibold uppercase">CASH RECEIVED (+)</div>
                <div className="text-2xl font-black text-emerald-700 mt-1">
                  {FinancialEngine.formatINR(currentDrawer.cashReceived)}
                </div>
                <div className="text-xs text-emerald-700 mt-1">Collections & Deposits</div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                <div className="text-xs text-red-800 font-semibold uppercase">CASH PAID OUT (-)</div>
                <div className="text-2xl font-black text-red-700 mt-1">
                  {FinancialEngine.formatINR(currentDrawer.cashPaid)}
                </div>
                <div className="text-xs text-red-700 mt-1">Disbursements / Withdrawals</div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="text-xs text-blue-800 font-semibold uppercase">EXPECTED CLOSING</div>
                <div className="text-2xl font-black text-blue-900 mt-1">
                  {FinancialEngine.formatINR(currentDrawer.expectedClosingBalance)}
                </div>
                <div className="text-xs text-blue-700 mt-1">Status: <Tag color="blue">{currentDrawer.status}</Tag></div>
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {/* Drawer History */}
      <Card className="glass-card" title="Historical Drawer Closures & Audit Records">
        <Table columns={historyColumns} dataSource={history} rowKey="id" loading={loading} scroll={{ x: 850 }} />
      </Card>

      {/* PHYSICAL CASH COUNT MODAL (DENOMINATIONS) */}
      <Modal
        title="Physical Cash Reconciliation & Denomination Count"
        open={reconcileModalVisible}
        onCancel={() => setReconcileModalVisible(false)}
        footer={null}
        width={620}
      >
        <Form form={form} layout="vertical" onFinish={handleReconcileClose}>
          <div className="text-xs text-slate-500 mb-4">
            Count and enter note quantities to calculate total physical vault cash.
          </div>

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
            <Button onClick={() => setReconcileModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ background: '#059669', borderColor: '#059669' }}>
              Confirm Reconciliation & Lock Drawer
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
