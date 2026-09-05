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
  Slider,
  message,
  Descriptions,
  Drawer,
  Popconfirm,
} from 'antd';
import {
  DollarCircleOutlined,
  CalculatorOutlined,
  FileProtectOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  EditOutlined,
  SendOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { fetchApi, postApi, patchApi, deleteApi } from '@/lib/api-client';
import { FinancialEngine } from '@sanjeevani/financial-engine';
import { ILoan, ILoanApplication, InterestMethod } from '@sanjeevani/shared-types';

export default function LoansPage() {
  const [loans, setLoans] = useState<ILoan[]>([]);
  const [applications, setApplications] = useState<ILoanApplication[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [appModalVisible, setAppModalVisible] = useState(false);
  const [assessmentModalVisible, setAssessmentModalVisible] = useState(false);
  const [selectedApp, setSelectedApp] = useState<ILoanApplication | null>(null);

  // View Details Drawer State
  const [viewLoan, setViewLoan] = useState<ILoan | null>(null);
  const [viewLoanDrawerOpen, setViewLoanDrawerOpen] = useState(false);
  const [viewApp, setViewApp] = useState<ILoanApplication | null>(null);
  const [viewAppDrawerOpen, setViewAppDrawerOpen] = useState(false);

  // Edit Loan Modal State
  const [editLoanModalVisible, setEditLoanModalVisible] = useState(false);
  const [selectedLoanToEdit, setSelectedLoanToEdit] = useState<ILoan | null>(null);
  const [editLoanForm] = Form.useForm();

  const handleOpenEditLoan = (loan: ILoan) => {
    setSelectedLoanToEdit(loan);
    editLoanForm.setFieldsValue({
      status: loan.status,
      recoveryBucket: loan.recoveryBucket || 'CURRENT',
      guarantorName: loan.guarantorName || '',
      guarantorMobile: loan.guarantorMobile || '',
      purpose: loan.purpose || '',
      remarks: loan.remarks || '',
    });
    setEditLoanModalVisible(true);
  };

  const handleUpdateLoan = async (values: any) => {
    if (!selectedLoanToEdit) return;
    setSubmitting(true);
    try {
      const res = await patchApi(`/loans/${selectedLoanToEdit.id}`, values);
      if (res.success) {
        message.success(`Loan [${selectedLoanToEdit.loanNumber}] updated successfully.`);
        setEditLoanModalVisible(false);
        loadLoanData();
      } else {
        message.error(res.message || 'Failed to update loan.');
      }
    } catch {
      message.error('An error occurred while updating loan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenViewLoan = (loan: ILoan) => {
    setViewLoan(loan);
    setViewLoanDrawerOpen(true);
  };

  const handleOpenViewApp = (app: ILoanApplication) => {
    setViewApp(app);
    setViewAppDrawerOpen(true);
  };

  // Live EMI Calculator State
  const [calcPrincipal, setCalcPrincipal] = useState<number>(100000);
  const [calcRate, setCalcRate] = useState<number>(14.0);
  const [calcTenure, setCalcTenure] = useState<number>(12);
  const [calcMethod, setCalcMethod] = useState<'REDUCING_BALANCE' | 'FLAT_RATE'>('REDUCING_BALANCE');
  const [calculatorResult, setCalculatorResult] = useState<any>(null);

  const [form] = Form.useForm();
  const [assessmentForm] = Form.useForm();

  useEffect(() => {
    loadLoanData();
    recalculateEmi(calcPrincipal, calcRate, calcTenure, calcMethod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLoanData = async () => {
    setLoading(true);
    const [lRes, aRes, cRes] = await Promise.all([
      fetchApi('/loans'),
      fetchApi('/loan-applications'),
      fetchApi('/customers'),
    ]);

    if (lRes.success && lRes.data) setLoans(lRes.data.items || lRes.data);
    if (aRes.success && aRes.data) setApplications(aRes.data.items || aRes.data);
    if (cRes.success && cRes.data) setCustomers(cRes.data.items || cRes.data);
    setLoading(false);
  };

  const recalculateEmi = (p: number, r: number, n: number, method: 'REDUCING_BALANCE' | 'FLAT_RATE') => {
    try {
      const res = FinancialEngine.calculateLoanEmi({
        principal: p,
        annualInterestRate: r,
        tenureMonths: n,
        interestMethod: method,
        startDate: new Date().toISOString().split('T')[0],
      });
      setCalculatorResult(res);
    } catch (e) {
      console.error(e);
    }
  };

  const [submitting, setSubmitting] = useState(false);

  const handleCreateApplication = async (values: any) => {
    setSubmitting(true);
    const res = await postApi('/loan-applications', values);
    setSubmitting(false);

    if (res.success) {
      message.success(`Loan Application Submitted: ${res.data?.applicationNumber || 'Submitted'}`);
      setAppModalVisible(false);
      form.resetFields();
      loadLoanData();
    } else {
      message.error(res.message || res.error || 'Failed to submit application');
    }
  };

  const handlePerformAssessment = async (values: any) => {
    if (!selectedApp) return;
    setSubmitting(true);
    const res = await postApi(`/loan-applications/${selectedApp.id}/credit-assessment`, values);
    setSubmitting(false);

    if (res.success) {
      message.success(`Credit assessment completed: Score ${res.data?.totalScore}/100 (${res.data?.riskCategory} Risk)`);
      setAssessmentModalVisible(false);
      assessmentForm.resetFields();
      loadLoanData();
    } else {
      message.error(res.message || res.error || 'Failed to complete credit assessment');
    }
  };

  const handleApproveLoan = async (appId: string) => {
    const res = await postApi(`/loan-applications/${appId}/approve`, {});

    if (res.success) {
      message.success('Loan sanctioned and marked READY_FOR_DISBURSEMENT.');
      loadLoanData();
    } else {
      message.error(res.message || res.error || 'Loan approval failed');
    }
  };

  const handleDisburseLoan = async (appId: string) => {
    const res = await postApi(`/loan-applications/${appId}/disburse`, { paymentMode: 'BANK_TRANSFER' });

    if (res.success) {
      const loanNum = res.data?.loan?.loanNumber || res.data?.loanNumber || 'Active';
      message.success(`Loan Disbursed! Activated Loan ID: ${loanNum}`);
      loadLoanData();
    } else {
      message.error(res.message || res.error || 'Disbursement failed');
    }
  };

  const handleDeleteLoan = async (id: string, loanNo: string) => {
    const res = await deleteApi(`/loans/${id}`);
    if (res.success) {
      message.success(`Loan [${loanNo}] removed.`);
      loadLoanData();
    } else {
      message.error(res.message || 'Failed to remove loan.');
    }
  };

  const handleDeleteApp = async (id: string, appNo: string) => {
    const res = await deleteApi(`/loan-applications/${id}`);
    if (res.success) {
      message.success(`Application [${appNo}] removed.`);
      loadLoanData();
    } else {
      message.error(res.message || 'Failed to remove application.');
    }
  };

  const loanColumns = [
    {
      title: 'Loan Number',
      dataIndex: 'loanNumber',
      key: 'loanNumber',
      render: (num: string) => <span className="font-mono font-bold text-blue-700">{num}</span>,
    },
    {
      title: 'Member / Customer',
      key: 'customer',
      ellipsis: true,
      render: (_: any, r: ILoan) => (
        <div>
          <div className="font-semibold text-slate-800">{r.customerName}</div>
          <div className="text-xs text-slate-500 font-mono">{r.customerNumber}</div>
        </div>
      ),
    },
    {
      title: 'Principal',
      dataIndex: 'principal',
      key: 'principal',
      render: (p: number) => <span className="font-bold">{FinancialEngine.formatINR(p)}</span>,
    },
    {
      title: 'Monthly EMI',
      dataIndex: 'emiAmount',
      key: 'emiAmount',
      render: (emi: number) => <span className="text-emerald-700 font-bold">{FinancialEngine.formatINR(emi)}</span>,
    },
    {
      title: 'Outstanding Principal',
      dataIndex: 'outstandingPrincipal',
      key: 'outstandingPrincipal',
      render: (out: number) => (
        <span className="font-bold text-red-600">{FinancialEngine.formatINR(out)}</span>
      ),
    },
    {
      title: 'Tenure / Rate',
      key: 'rate',
      render: (_: any, r: ILoan) => (
        <span className="text-xs">
          {r.tenureMonths} Mo @ {r.annualInterestRate}% p.a.
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => <Tag color={st === 'ACTIVE' ? 'blue' : 'success'}>{st}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, r: ILoan) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleOpenViewLoan(r)}>
            View
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEditLoan(r)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete Loan Account"
            description={`Delete loan ${r.loanNumber}?`}
            onConfirm={() => handleDeleteLoan(r.id, r.loanNumber)}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const appColumns = [
    {
      title: 'Application ID',
      dataIndex: 'applicationNumber',
      key: 'applicationNumber',
      render: (num: string) => <span className="font-mono font-bold">{num}</span>,
    },
    {
      title: 'Applicant',
      key: 'customerName',
      ellipsis: true,
      render: (_: any, r: ILoanApplication) => (
        <div>
          <div className="font-semibold">{r.customerName}</div>
          <div className="text-xs text-slate-500">{r.customerMobile}</div>
        </div>
      ),
    },
    {
      title: 'Amount Requested',
      dataIndex: 'requestedAmount',
      key: 'requestedAmount',
      render: (a: number) => FinancialEngine.formatINR(a),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => (
        <Tag color={st === 'READY_FOR_DISBURSEMENT' ? 'success' : st === 'MANAGER_REVIEW' ? 'purple' : 'orange'}>
          {st}
        </Tag>
      ),
    },
    {
      title: 'Risk Score',
      key: 'risk',
      render: (_: any, r: ILoanApplication) =>
        r.internalCreditScore ? (
          <Tag color={r.internalCreditScore >= 70 ? 'green' : 'orange'}>
            {r.internalCreditScore}/100 ({r.riskCategory})
          </Tag>
        ) : (
          <Tag>Pending Assessment</Tag>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, r: ILoanApplication) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleOpenViewApp(r)}
          >
            View
          </Button>
          {r.status === 'SUBMITTED' && (
            <Button
              size="small"
              type="primary"
              ghost
              onClick={() => {
                setSelectedApp(r);
                setAssessmentModalVisible(true);
              }}
            >
              Assess Credit
            </Button>
          )}
          {r.status === 'MANAGER_REVIEW' && (
            <Button size="small" type="primary" onClick={() => handleApproveLoan(r.id)}>
              Approve Sanction
            </Button>
          )}
          {r.status === 'READY_FOR_DISBURSEMENT' && (
            <Button
              size="small"
              type="primary"
              icon={<SendOutlined />}
              style={{ background: '#059669', borderColor: '#059669' }}
              onClick={() => handleDisburseLoan(r.id)}
            >
              Disburse Funds
            </Button>
          )}
          <Popconfirm
            title="Delete Loan Application"
            description={`Delete application ${r.applicationNumber}?`}
            onConfirm={() => handleDeleteApp(r.id, r.applicationNumber)}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 m-0">Loan Origination & Precision EMI Engine</h1>
          <p className="text-slate-500 text-sm mt-1 m-0">
            End-to-end loan lifecycle: Origination, Multi-factor Assessment, Approval Matrix, Reducing Balance Amortization (SRS §22–§30).
          </p>
        </div>
        <Button
          type="primary"
          icon={<DollarCircleOutlined />}
          onClick={() => setAppModalVisible(true)}
          style={{ background: '#059669', borderColor: '#059669', height: 40 }}
        >
          New Loan Application
        </Button>
      </div>

      <Tabs
        defaultActiveKey="loans"
        items={[
          {
            key: 'loans',
            label: (
              <span className="flex items-center gap-1.5">
                <DollarCircleOutlined />
                <span>Active Loan Book ({loans.length})</span>
              </span>
            ),
            children: (
              <Card className="glass-card">
                <Table
                  size="small"
                  columns={loanColumns}
                  dataSource={loans}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  onRow={(record) => ({
                    onClick: (e: any) => {
                      if (e.target.closest('button') || e.target.closest('.ant-popconfirm') || e.target.closest('.ant-popover')) return;
                      handleOpenViewLoan(record);
                    },
                    className: 'cursor-pointer hover:bg-emerald-50/50 transition-colors',
                  })}
                />
              </Card>
            ),
          },
          {
            key: 'applications',
            label: (
              <span className="flex items-center gap-1.5">
                <FileProtectOutlined />
                <span>Applications & Approvals Queue ({applications.length})</span>
              </span>
            ),
            children: (
              <Card className="glass-card">
                <Table
                  size="small"
                  columns={appColumns}
                  dataSource={applications}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  onRow={(record) => ({
                    onClick: (e: any) => {
                      if (e.target.closest('button') || e.target.closest('.ant-popconfirm') || e.target.closest('.ant-popover')) return;
                      handleOpenViewApp(record);
                    },
                    className: 'cursor-pointer hover:bg-emerald-50/50 transition-colors',
                  })}
                />
              </Card>
            ),
          },
          {
            key: 'calculator',
            label: (
              <span className="flex items-center gap-1.5">
                <CalculatorOutlined />
                <span>Interactive Precision EMI Calculator (§26)</span>
              </span>
            ),
            children: (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="glass-card lg:col-span-1" title="EMI Calculation Parameters">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700">Principal Amount (₹)</label>
                      <InputNumber
                        min={10000}
                        max={10000000}
                        step={10000}
                        value={calcPrincipal}
                        onChange={(v) => {
                          setCalcPrincipal(v || 100000);
                          recalculateEmi(v || 100000, calcRate, calcTenure, calcMethod);
                        }}
                        className="w-full mt-1"
                      />
                      <Slider
                        min={10000}
                        max={1000000}
                        step={10000}
                        value={calcPrincipal}
                        onChange={(v) => {
                          setCalcPrincipal(v);
                          recalculateEmi(v, calcRate, calcTenure, calcMethod);
                        }}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700">Annual Interest Rate (% p.a.)</label>
                      <InputNumber
                        min={1}
                        max={36}
                        step={0.5}
                        value={calcRate}
                        onChange={(v) => {
                          setCalcRate(v || 14);
                          recalculateEmi(calcPrincipal, v || 14, calcTenure, calcMethod);
                        }}
                        className="w-full mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700">Tenure (Months)</label>
                      <InputNumber
                        min={3}
                        max={120}
                        value={calcTenure}
                        onChange={(v) => {
                          setCalcTenure(v || 12);
                          recalculateEmi(calcPrincipal, calcRate, v || 12, calcMethod);
                        }}
                        className="w-full mt-1"
                      />
                      <Slider
                        min={3}
                        max={60}
                        value={calcTenure}
                        onChange={(v) => {
                          setCalcTenure(v);
                          recalculateEmi(calcPrincipal, calcRate, v, calcMethod);
                        }}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700">Calculation Method</label>
                      <Select
                        value={calcMethod}
                        onChange={(m) => {
                          setCalcMethod(m);
                          recalculateEmi(calcPrincipal, calcRate, calcTenure, m);
                        }}
                        className="w-full mt-1"
                        options={[
                          { label: 'Reducing Balance Method (Standard Banking)', value: 'REDUCING_BALANCE' },
                          { label: 'Flat Rate Method', value: 'FLAT_RATE' },
                        ]}
                      />
                    </div>
                  </div>
                </Card>

                <Card className="glass-card lg:col-span-2" title="Amortization Schedule & Result">
                  {calculatorResult && (
                    <div className="space-y-4">
                      <Row gutter={16}>
                        <Col span={8}>
                          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                            <div className="text-xs text-emerald-800 font-semibold">MONTHLY EMI</div>
                            <div className="text-xl font-bold text-emerald-900 mt-1">
                              {FinancialEngine.formatINR(calculatorResult.emiAmount)}
                            </div>
                          </div>
                        </Col>
                        <Col span={8}>
                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="text-xs text-slate-600 font-semibold">TOTAL INTEREST</div>
                            <div className="text-xl font-bold text-slate-800 mt-1">
                              {FinancialEngine.formatINR(calculatorResult.totalInterest)}
                            </div>
                          </div>
                        </Col>
                        <Col span={8}>
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="text-xs text-blue-800 font-semibold">TOTAL PAYABLE</div>
                            <div className="text-xl font-bold text-blue-900 mt-1">
                              {FinancialEngine.formatINR(calculatorResult.totalPayable)}
                            </div>
                          </div>
                        </Col>
                      </Row>

                      <div className="font-bold text-xs text-slate-700 uppercase tracking-wider mt-2">
                        Installment Breakdown Schedule
                      </div>
                      <Table
                        size="small"
                        dataSource={calculatorResult.schedule}
                        rowKey="installmentNumber"
                        pagination={{ pageSize: 6 }}
                        columns={[
                          { title: '#', dataIndex: 'installmentNumber', key: 'num' },
                          { title: 'Due Date', dataIndex: 'dueDate', key: 'date' },
                          {
                            title: 'Opening Principal',
                            dataIndex: 'openingPrincipal',
                            key: 'open',
                            render: (v: number) => FinancialEngine.formatINR(v),
                          },
                          {
                            title: 'Principal Due',
                            dataIndex: 'principalDue',
                            key: 'p',
                            render: (v: number) => FinancialEngine.formatINR(v),
                          },
                          {
                            title: 'Interest Due',
                            dataIndex: 'interestDue',
                            key: 'i',
                            render: (v: number) => FinancialEngine.formatINR(v),
                          },
                          {
                            title: 'Total Monthly Due',
                            dataIndex: 'totalDue',
                            key: 'tot',
                            render: (v: number) => (
                              <span className="font-bold text-emerald-700">{FinancialEngine.formatINR(v)}</span>
                            ),
                          },
                          {
                            title: 'Closing Principal',
                            dataIndex: 'closingPrincipal',
                            key: 'close',
                            render: (v: number) => FinancialEngine.formatINR(v),
                          },
                        ]}
                      />
                    </div>
                  )}
                </Card>
              </div>
            ),
          },
        ]}
      />

      {/* NEW LOAN APPLICATION MODAL */}
      <Modal
        title="Submit Loan Application"
        open={appModalVisible}
        onCancel={() => { setAppModalVisible(false); form.resetFields(); }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateApplication}>
          <Form.Item name="customerId" label="Select Registered Member" rules={[{ required: true }]}>
            <Select
              placeholder="Search member by Name or ID"
              options={customers.map((c) => ({
                label: `${c.customerNumber} - ${c.firstName} ${c.lastName} (${c.mobile})`,
                value: c.id,
              }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="requestedAmount" label="Loan Amount (₹)" initialValue={100000} rules={[{ required: true }]}>
                <InputNumber min={10000} max={1000000} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="requestedTenureMonths" label="Tenure (Months)" initialValue={12} rules={[{ required: true }]}>
                <InputNumber min={3} max={60} className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="purpose" label="Loan Purpose" initialValue="Working Capital for Retail Business">
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="declaredIncome" label="Monthly Income (₹)" initialValue={45000}>
                <InputNumber min={5000} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="existingLiabilities" label="Existing EMI Liabilities (₹)" initialValue={0}>
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="guarantorName" label="Guarantor / Co-Applicant Name">
                <Input placeholder="Full name of guarantor" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="guarantorMobile" label="Guarantor Mobile">
                <Input placeholder="10-digit mobile" maxLength={10} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="disbursementBankAc" label="Disbursement Bank A/c No.">
                <Input placeholder="Borrower Bank Account" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="disbursementIfsc" label="Bank IFSC Code">
                <Input placeholder="e.g. HDFC0001234" style={{ textTransform: 'uppercase' }} />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <Button onClick={() => { setAppModalVisible(false); form.resetFields(); }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ background: '#059669', borderColor: '#059669' }}>
              Submit for Credit Review
            </Button>
          </div>
        </Form>
      </Modal>

      {/* MULTI-FACTOR CREDIT ASSESSMENT MODAL (SRS §24) */}
      <Modal
        title={`Credit Assessment Scoring: ${selectedApp?.applicationNumber}`}
        open={assessmentModalVisible}
        onCancel={() => { setAssessmentModalVisible(false); assessmentForm.resetFields(); setSelectedApp(null); }}
        footer={null}
        width={650}
      >
        <Form form={assessmentForm} layout="vertical" onFinish={handlePerformAssessment}>
          <div className="text-xs text-slate-500 mb-3">
            Score each domain from 0 (High Risk) to 100 (Excellent) per SRS §24 standard underwriting matrix.
          </div>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="kycScore" label="KYC & Identity Verification Score" initialValue={85}>
                <InputNumber min={0} max={100} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="incomeScore" label="Income Stability Score" initialValue={75}>
                <InputNumber min={0} max={100} className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="repaymentScore" label="Past Repayment Track Score" initialValue={80}>
                <InputNumber min={0} max={100} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="liabilityScore" label="Debt-to-Income Score" initialValue={70}>
                <InputNumber min={0} max={100} className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="fieldScore" label="Field Verification Score" initialValue={80}>
                <InputNumber min={0} max={100} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="securityScore" label="Guarantor / Security Score" initialValue={75}>
                <InputNumber min={0} max={100} className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="bankingScore" label="Bank Statement Cashflow Score" initialValue={80}>
            <InputNumber min={0} max={100} className="w-full" />
          </Form.Item>

          <Form.Item name="notes" label="Field Verification Notes" initialValue="Physical residence & business shop verified. Positive neighbor feedback.">
            <Input.TextArea rows={2} />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <Button onClick={() => { setAssessmentModalVisible(false); assessmentForm.resetFields(); setSelectedApp(null); }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ background: '#059669', borderColor: '#059669' }}>
              Save Assessment & Forward to BM
            </Button>
          </div>
        </Form>
      </Modal>

      {/* LOAN DETAILS & REPAYMENT SCHEDULE DRAWER */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <EyeOutlined className="text-emerald-600 text-lg" />
            <span className="font-bold text-slate-800 text-base">
              Loan Account Details: {viewLoan?.loanNumber}
            </span>
          </div>
        }
        open={viewLoanDrawerOpen}
        onClose={() => {
          setViewLoanDrawerOpen(false);
          setViewLoan(null);
        }}
        width={600}
      >
        {viewLoan && (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-emerald-700 font-semibold uppercase">Outstanding Balance</div>
                <div className="text-2xl font-bold font-mono text-red-600">
                  {FinancialEngine.formatINR(viewLoan.outstandingPrincipal)}
                </div>
              </div>
              <Tag color={viewLoan.status === 'ACTIVE' ? 'blue' : 'success'} className="px-3 py-1 text-sm font-semibold">
                {viewLoan.status}
              </Tag>
            </div>

            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="Loan Number">
                <span className="font-mono font-bold text-emerald-700">{viewLoan.loanNumber}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Member Name">{viewLoan.customerName || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Member ID">
                <span className="font-mono">{viewLoan.customerNumber || 'N/A'}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Sanctioned Principal">
                <span className="font-bold">{FinancialEngine.formatINR(viewLoan.principal)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Monthly EMI">
                <span className="font-bold text-emerald-700">{FinancialEngine.formatINR(viewLoan.emiAmount)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Total Payable (P + I)">
                {FinancialEngine.formatINR(viewLoan.totalPayable)}
              </Descriptions.Item>
              <Descriptions.Item label="Annual Interest Rate">{viewLoan.annualInterestRate}% p.a. ({viewLoan.interestMethod || 'REDUCING_BALANCE'})</Descriptions.Item>
              <Descriptions.Item label="Tenure">{viewLoan.tenureMonths} Months</Descriptions.Item>
              <Descriptions.Item label="Total Paid So Far">
                <span className="font-bold text-green-700">{FinancialEngine.formatINR(viewLoan.totalPaid || 0)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Overdue Amount">
                <span className="font-bold text-red-500">{FinancialEngine.formatINR(viewLoan.overdueAmount || 0)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Disbursement Date">{viewLoan.disbursementDate || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Final Maturity Due Date">{viewLoan.finalDueDate || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Guarantor Details">
                {viewLoan.guarantorName ? (
                  <span>
                    <strong>{viewLoan.guarantorName}</strong>
                    {viewLoan.guarantorMobile ? ` • +91 ${viewLoan.guarantorMobile}` : ''}
                  </span>
                ) : (
                  <Tag color="default">No Guarantor Recorded</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Loan Purpose">{viewLoan.purpose || 'Business Expansion'}</Descriptions.Item>
              <Descriptions.Item label="Remarks">{viewLoan.remarks || 'Standard Loan Portfolio'}</Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Drawer>

      {/* EDIT LOAN MODAL */}
      <Modal
        title={`Edit Loan Account: ${selectedLoanToEdit?.loanNumber}`}
        open={editLoanModalVisible}
        onCancel={() => {
          setEditLoanModalVisible(false);
          editLoanForm.resetFields();
          setSelectedLoanToEdit(null);
        }}
        footer={null}
        width={550}
      >
        <Form form={editLoanForm} layout="vertical" onFinish={handleUpdateLoan}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="status" label="Loan Status" rules={[{ required: true }]}>
                <Select
                  options={[
                    { label: 'ACTIVE', value: 'ACTIVE' },
                    { label: 'OVERDUE', value: 'OVERDUE' },
                    { label: 'CLOSED', value: 'CLOSED' },
                    { label: 'NPA', value: 'NPA' },
                    { label: 'WRITTEN_OFF', value: 'WRITTEN_OFF' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="recoveryBucket" label="Recovery Bucket (DPD)">
                <Select
                  options={[
                    { label: 'CURRENT (0 DPD)', value: 'CURRENT' },
                    { label: '1-30 DPD', value: '1-30' },
                    { label: '31-60 DPD', value: '31-60' },
                    { label: '61-90 DPD', value: '61-90' },
                    { label: '90+ DPD (NPA)', value: '90+' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="guarantorName" label="Guarantor Name">
                <Input placeholder="Guarantor full name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="guarantorMobile" label="Guarantor Mobile">
                <Input placeholder="10-digit mobile" maxLength={10} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="purpose" label="Loan Purpose">
            <Input placeholder="e.g. Working Capital" />
          </Form.Item>

          <Form.Item name="remarks" label="Internal Notes / Officer Remarks">
            <Input.TextArea rows={2} placeholder="Underwriting notes, follow-up remarks" />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <Button onClick={() => { setEditLoanModalVisible(false); editLoanForm.resetFields(); setSelectedLoanToEdit(null); }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ background: '#059669', borderColor: '#059669' }}>
              Save Loan Changes
            </Button>
          </div>
        </Form>
      </Modal>

      {/* LOAN APPLICATION DETAILS DRAWER */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <EyeOutlined className="text-emerald-600 text-lg" />
            <span className="font-bold text-slate-800 text-base">
              Loan Application Details: {viewApp?.applicationNumber}
            </span>
          </div>
        }
        open={viewAppDrawerOpen}
        onClose={() => {
          setViewAppDrawerOpen(false);
          setViewApp(null);
        }}
        width={580}
      >
        {viewApp && (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-emerald-700 font-semibold uppercase">Requested Sanction</div>
                <div className="text-2xl font-bold font-mono text-emerald-950">
                  {FinancialEngine.formatINR(viewApp.requestedAmount)}
                </div>
              </div>
              <Tag color={viewApp.status === 'READY_FOR_DISBURSEMENT' ? 'success' : viewApp.status === 'MANAGER_REVIEW' ? 'purple' : 'orange'} className="px-3 py-1 text-sm font-semibold">
                {viewApp.status}
              </Tag>
            </div>

            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="Application Number">
                <span className="font-mono font-bold text-emerald-700">{viewApp.applicationNumber}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Applicant Name">{viewApp.customerName || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Applicant Mobile">{viewApp.customerMobile || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Loan Purpose">{viewApp.purpose || 'Business Expansion'}</Descriptions.Item>
              <Descriptions.Item label="Requested Tenure">{viewApp.requestedTenureMonths} Months</Descriptions.Item>
              <Descriptions.Item label="Credit Risk Score">
                {viewApp.internalCreditScore ? (
                  <Tag color={viewApp.internalCreditScore >= 70 ? 'green' : 'orange'}>
                    {viewApp.internalCreditScore}/100 ({viewApp.riskCategory})
                  </Tag>
                ) : 'Pending Assessment'}
              </Descriptions.Item>
              <Descriptions.Item label="Monthly Stated Income">
                {FinancialEngine.formatINR(viewApp.declaredIncome || 0)}
              </Descriptions.Item>
              <Descriptions.Item label="Application Submission Date">
                {(viewApp as any).applicationDate || (viewApp.createdAt ? new Date(viewApp.createdAt).toLocaleDateString('en-IN') : 'N/A')}
              </Descriptions.Item>
              <Descriptions.Item label="Guarantor">
                {viewApp.guarantorName ? (
                  <span>
                    <strong>{viewApp.guarantorName}</strong>
                    {viewApp.guarantorMobile ? ` • +91 ${viewApp.guarantorMobile}` : ''}
                  </span>
                ) : (
                  <Tag color="default">None Stated</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Disbursement Bank">
                {viewApp.disbursementBankAc ? (
                  <span>A/c: <strong>{viewApp.disbursementBankAc}</strong> (IFSC: {viewApp.disbursementIfsc || 'N/A'})</span>
                ) : (
                  <Tag color="default">Cash / Counter</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Drawer>
    </div>
  );
}
