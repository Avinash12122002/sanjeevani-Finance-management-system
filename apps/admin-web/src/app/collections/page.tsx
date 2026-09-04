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
} from 'antd';
import {
  DollarCircleOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { fetchApi, postApi, deleteApi } from '@/lib/api-client';
import { FinancialEngine } from '@sanjeevani/financial-engine';
import { IReceipt, PaymentMode } from '@sanjeevani/shared-types';

export default function CollectionsPage() {
  const [collectionData, setCollectionData] = useState<any>(null);
  const [receipts, setReceipts] = useState<IReceipt[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recordModalVisible, setRecordModalVisible] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<IReceipt | null>(null);

  const [form] = Form.useForm();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [cRes, rRes, custRes, lRes, accRes] = await Promise.all([
      fetchApi('/collections/today'),
      fetchApi('/collections/receipts'),
      fetchApi('/customers'),
      fetchApi('/loans'),
      fetchApi('/accounts'),
    ]);

    if (cRes.success) setCollectionData(cRes.data);
    if (rRes.success && rRes.data) setReceipts(rRes.data);
    if (custRes.success && custRes.data) setCustomers(custRes.data.items || custRes.data);
    if (lRes.success && lRes.data) setLoans(lRes.data.items || lRes.data);
    if (accRes.success && accRes.data) setAccounts(accRes.data.items || accRes.data);
    setLoading(false);
  };

  const [submitting, setSubmitting] = useState(false);

  const handleRecordPayment = async (values: any) => {
    setSubmitting(true);
    const res = await postApi('/collections/record', values);
    setSubmitting(false);

    if (res.success && res.data) {
      message.success('Payment recorded and Digital Receipt generated!');
      setRecordModalVisible(false);
      form.resetFields();
      setCurrentReceipt(res.data.receipt || res.data);
      setReceiptModalVisible(true);
      loadData();
    } else {
      message.error(res.message || res.error || 'Failed to record payment');
    }
  };

  const handleDeleteReceipt = async (id: string, receiptNo: string) => {
    try {
      const res = await deleteApi(`/collections/receipts/${id}`);
      if (res.success) {
        message.success(`Digital Receipt [${receiptNo}] voided and removed.`);
        loadData();
      } else {
        message.error(res.message || 'Failed to delete receipt.');
      }
    } catch {
      message.error('An error occurred while deleting receipt.');
    }
  };

  const dueColumns = [
    {
      title: 'Due Category',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) => <Tag color={t === 'LOAN_EMI' ? 'blue' : 'green'}>{t.replace('_', ' ')}</Tag>,
    },
    {
      title: 'Member / Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name: string, r: any) => (
        <div>
          <div className="font-semibold text-slate-800">{name}</div>
          <div className="text-xs text-slate-500 font-mono">{r.customerNumber}</div>
        </div>
      ),
    },
    {
      title: 'Reference A/c or Loan',
      dataIndex: 'referenceNumber',
      key: 'ref',
      render: (ref: string) => <span className="font-mono">{ref}</span>,
    },
    {
      title: 'Expected Amount',
      dataIndex: 'expectedAmount',
      key: 'amount',
      render: (a: number) => <span className="font-bold text-emerald-700">{FinancialEngine.formatINR(a)}</span>,
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'date',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => <Tag color={st === 'OVERDUE' ? 'error' : 'orange'}>{st}</Tag>,
    },
  ];

  const receiptColumns = [
    {
      title: 'Receipt ID',
      dataIndex: 'receiptNumber',
      key: 'receiptNumber',
      render: (r: string) => <span className="font-mono font-bold text-emerald-700">{r}</span>,
    },
    {
      title: 'Member Name',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name: string, r: IReceipt) => (
        <div>
          <div className="font-semibold">{name}</div>
          <div className="text-xs text-slate-500 font-mono">{r.customerNumber}</div>
        </div>
      ),
    },
    {
      title: 'Payment For',
      dataIndex: 'paymentFor',
      key: 'paymentFor',
    },
    {
      title: 'Amount Collected',
      dataIndex: 'amount',
      key: 'amount',
      render: (a: number) => <span className="font-bold text-emerald-700">{FinancialEngine.formatINR(a)}</span>,
    },
    {
      title: 'Mode',
      dataIndex: 'paymentMode',
      key: 'mode',
      render: (m: string) => <Tag color="blue">{m}</Tag>,
    },
    {
      title: 'Collected At',
      dataIndex: 'generatedAt',
      key: 'time',
      render: (t: string) => new Date(t).toLocaleString('en-IN'),
    },
    {
      title: 'Action',
      key: 'action',
      width: 170,
      render: (_: any, r: IReceipt) => (
        <Space size={4}>
          <Button
            size="small"
            icon={<PrinterOutlined />}
            onClick={() => {
              setCurrentReceipt(r);
              setReceiptModalVisible(true);
            }}
          >
            View / Print
          </Button>
          <Popconfirm
            title="Void / Delete Receipt"
            description={`Delete receipt ${r.receiptNumber}?`}
            onConfirm={() => handleDeleteReceipt(r.id, r.receiptNumber)}
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

  // Customer-specific loans and accounts for the recording form
  const availableLoans = loans.filter((l) => l.customerId === selectedCustomerId && l.status === 'ACTIVE');
  const availableAccounts = accounts.filter((a) => a.customerId === selectedCustomerId && a.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <DollarCircleOutlined className="text-emerald-600 text-lg" />
            <h1 className="text-2xl font-bold text-slate-900 m-0">Field Collections & Digital Receipts</h1>
          </div>
          <p className="text-slate-500 text-sm m-0">
            Daily collection routes, counter receipts, real-time transaction generation and cashier drawer feeds (SRS §18, §31, §32).
          </p>
        </div>
        <Button
          type="primary"
          icon={<DollarCircleOutlined />}
          onClick={() => setRecordModalVisible(true)}
          style={{ background: '#059669', borderColor: '#059669', height: 40 }}
        >
          Record New Payment
        </Button>
      </div>

      {/* Summary Cards */}
      {collectionData && (
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="text-xs text-emerald-800 font-semibold uppercase">TOTAL DUE TODAY</div>
              <div className="text-2xl font-bold text-emerald-900 mt-1">
                {FinancialEngine.formatINR(collectionData.totalExpected)}
              </div>
              <div className="text-xs text-emerald-700 mt-1">
                {collectionData.assignedCount} Accounts Scheduled
              </div>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="text-xs text-blue-800 font-semibold uppercase">RECEIPTS ISSUED TODAY</div>
              <div className="text-2xl font-bold text-blue-900 mt-1">
                {receipts.length} Receipts
              </div>
              <div className="text-xs text-blue-700 mt-1">
                100% Audit Tracked (BR-013)
              </div>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
              <div className="text-xs text-purple-800 font-semibold uppercase">VAULT CASH INFLOW</div>
              <div className="text-2xl font-bold text-purple-900 mt-1">
                {FinancialEngine.formatINR(
                  receipts
                    .filter((r) => r.paymentMode === PaymentMode.CASH || !r.paymentMode)
                    .reduce((sum, r) => sum + (r.amount || 0), 0),
                )}
              </div>
              <div className="text-xs text-purple-700 mt-1">
                Cashier Drawer Active
              </div>
            </div>
          </Col>
        </Row>
      )}

      <Tabs
        defaultActiveKey="today"
        items={[
          {
            key: 'today',
            label: `Today's Scheduled Collections (${collectionData?.items?.length || 0})`,
            children: (
              <Card className="glass-card">
                <Table
                  size="small"
                  columns={dueColumns}
                  dataSource={collectionData?.items || []}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  onRow={(record) => ({
                    onClick: (e: any) => {
                      if (e.target.closest('button') || e.target.closest('.ant-popconfirm') || e.target.closest('.ant-popover')) return;
                      setSelectedCustomerId(record.customerId);
                      form.setFieldsValue({
                        customerId: record.customerId,
                        amount: record.expectedAmount,
                        paymentFor: record.paymentFor || 'LOAN_EMI',
                      });
                      setRecordModalVisible(true);
                    },
                    className: 'cursor-pointer hover:bg-emerald-50/50 transition-colors',
                  })}
                />
              </Card>
            ),
          },
          {
            key: 'receipts',
            label: `Digital Receipts Ledger (${receipts.length})`,
            children: (
              <Card className="glass-card">
                <Table
                  size="small"
                  columns={receiptColumns}
                  dataSource={receipts}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  onRow={(record) => ({
                    onClick: (e: any) => {
                      if (e.target.closest('button') || e.target.closest('.ant-popconfirm') || e.target.closest('.ant-popover')) return;
                      setCurrentReceipt(record);
                      setReceiptModalVisible(true);
                    },
                    className: 'cursor-pointer hover:bg-emerald-50/50 transition-colors',
                  })}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* RECORD PAYMENT MODAL */}
      <Modal
        title="Record Member Payment & Generate Receipt"
        open={recordModalVisible}
        onCancel={() => setRecordModalVisible(false)}
        footer={null}
        width={580}
      >
        <Form form={form} layout="vertical" onFinish={handleRecordPayment}>
          <Form.Item name="customerId" label="Select Member" rules={[{ required: true }]}>
            <Select
              placeholder="Search Member"
              onChange={(val) => setSelectedCustomerId(val)}
              options={customers.map((c) => ({
                label: `${c.customerNumber} - ${c.firstName} ${c.lastName} (${c.mobile})`,
                value: c.id,
              }))}
            />
          </Form.Item>

          {selectedCustomerId && (
            <>
              <Form.Item name="loanId" label="Apply to Active Loan (Optional)">
                <Select
                  placeholder="Select Loan Account"
                  allowClear
                  options={availableLoans.map((l) => ({
                    label: `${l.loanNumber} - EMI ${FinancialEngine.formatINR(l.emiAmount)} (Outstanding: ${FinancialEngine.formatINR(l.outstandingPrincipal)})`,
                    value: l.id,
                  }))}
                />
              </Form.Item>

              <Form.Item name="accountId" label="Apply to Deposit / RD Account (Optional)">
                <Select
                  placeholder="Select Deposit Account"
                  allowClear
                  options={availableAccounts.map((a) => ({
                    label: `${a.accountNumber} (${a.productType}) - Balance: ${FinancialEngine.formatINR(a.currentBalance)}`,
                    value: a.id,
                  }))}
                />
              </Form.Item>
            </>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="amount" label="Payment Amount (₹)" initialValue={5000} rules={[{ required: true }]}>
                <InputNumber min={1} max={1000000} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="paymentMode" label="Payment Mode" initialValue="CASH" rules={[{ required: true }]}>
                <Select
                  options={[
                    { label: 'Cash (Drawer)', value: 'CASH' },
                    { label: 'UPI / QR Code', value: 'UPI' },
                    { label: 'Bank Transfer (IMPS/NEFT)', value: 'BANK_TRANSFER' },
                    { label: 'Cheque', value: 'CHEQUE' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="referenceNumber" label="Transaction / UTR / Cheque Reference (If Digital)">
            <Input placeholder="e.g. UPI Ref # or Cheque #" />
          </Form.Item>

          <Form.Item name="remarks" label="Payment Remarks" initialValue="Monthly Installment Payment">
            <Input />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <Button onClick={() => setRecordModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ background: '#059669', borderColor: '#059669' }}>
              Confirm Payment & Print Receipt
            </Button>
          </div>
        </Form>
      </Modal>

      {/* OFFICIAL PRINTABLE DIGITAL RECEIPT MODAL (SRS §18) */}
      <Modal
        title="Official Digital Payment Receipt"
        open={receiptModalVisible}
        onCancel={() => setReceiptModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setReceiptModalVisible(false)}>
            Close
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            style={{ background: '#059669', borderColor: '#059669' }}
            onClick={() => window.print()}
          >
            Print Official Receipt
          </Button>,
        ]}
        width={560}
      >
        {currentReceipt && (
          <div id="printable-receipt" className="p-6 bg-white border border-slate-300 rounded-lg space-y-4">
            {/* Receipt Header */}
            <div className="text-center border-b border-slate-300 pb-3">
              <div className="text-lg font-black text-emerald-800 tracking-wider">
                SANJEEVANI FINANCE MANAGEMENT SYSTEM
              </div>
              <div className="text-xs text-slate-500 font-medium">
                {currentReceipt.branchName} | Official Customer Acknowledgment
              </div>
              <div className="mt-2 inline-block px-3 py-0.5 bg-emerald-50 text-emerald-800 font-mono font-bold text-xs rounded border border-emerald-200">
                RECEIPT NO: {currentReceipt.receiptNumber}
              </div>
            </div>

            {/* Receipt Details Grid */}
            <div className="grid grid-cols-2 gap-y-2 text-xs text-slate-700">
              <div>Member Name:</div>
              <div className="font-bold text-slate-900">{currentReceipt.customerName}</div>

              <div>Member ID:</div>
              <div className="font-mono font-semibold">{currentReceipt.customerNumber}</div>

              <div>Payment For:</div>
              <div className="font-semibold text-blue-800">{currentReceipt.paymentFor}</div>

              <div>Payment Mode:</div>
              <div><Tag color="blue">{currentReceipt.paymentMode}</Tag></div>

              <div>Transaction ID:</div>
              <div className="font-mono text-slate-600">{currentReceipt.transactionNumber || 'N/A'}</div>

              <div>Date & Time:</div>
              <div>{new Date(currentReceipt.generatedAt).toLocaleString('en-IN')}</div>

              <div>Collector / Cashier:</div>
              <div>{currentReceipt.collectorName || 'Head Office Staff'}</div>
            </div>

            {/* Highlighted Amount */}
            <div className="p-3 bg-slate-900 text-white rounded-md text-center">
              <div className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">AMOUNT RECEIVED</div>
              <div className="text-2xl font-black mt-0.5">
                {FinancialEngine.formatINR(currentReceipt.amount)}
              </div>
            </div>

            {/* Official Stamp & Verification */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-[11px] text-slate-500">
              <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircleOutlined /> System Verified Digital Copy
              </div>
              <div>Authorised Signatory</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
