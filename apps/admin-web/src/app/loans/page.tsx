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
} from 'antd';
import {
  DollarCircleOutlined,
  CalculatorOutlined,
  FileProtectOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { fetchApi } from '@/lib/api-client';
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

  const handleCreateApplication = async (values: any) => {
    const res = await fetchApi('/loan-applications', {
      method: 'POST',
      body: JSON.stringify(values),
    });

    if (res.success) {
      message.success(`Loan Application Submitted: ${res.data.applicationNumber}`);
      setAppModalVisible(false);
      form.resetFields();
      loadLoanData();
    } else {
      message.error(res.error || 'Failed to submit application');
    }
  };

  const handlePerformAssessment = async (values: any) => {
    if (!selectedApp) return;
    const res = await fetchApi(`/loan-applications/${selectedApp.id}/credit-assessment`, {
      method: 'POST',
      body: JSON.stringify(values),
    });

    if (res.success) {
      message.success(`Credit assessment completed: Score ${res.data.totalScore}/100 (${res.data.riskCategory} Risk)`);
      setAssessmentModalVisible(false);
      assessmentForm.resetFields();
      loadLoanData();
    } else {
      message.error(res.error || 'Failed to complete credit assessment');
    }
  };

  const handleApproveLoan = async (appId: string) => {
    const res = await fetchApi(`/loan-applications/${appId}/approve`, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    if (res.success) {
      message.success('Loan sanctioned and marked READY_FOR_DISBURSEMENT.');
      loadLoanData();
    } else {
      message.error(res.error || 'Loan approval failed');
    }
  };

  const handleDisburseLoan = async (appId: string) => {
    const res = await fetchApi(`/loan-applications/${appId}/disburse`, {
      method: 'POST',
      body: JSON.stringify({ paymentMode: 'BANK_TRANSFER' }),
    });

    if (res.success) {
      message.success(`Loan Disbursed! Activated Loan ID: ${res.data.loan.loanNumber}`);
      loadLoanData();
    } else {
      message.error(res.error || 'Disbursement failed');
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
            label: `Active Loan Book (${loans.length})`,
            children: (
              <Card className="glass-card">
                <Table columns={loanColumns} dataSource={loans} rowKey="id" loading={loading} scroll={{ x: 900 }} />
              </Card>
            ),
          },
          {
            key: 'applications',
            label: `Applications & Approvals Queue (${applications.length})`,
            children: (
              <Card className="glass-card">
                <Table columns={appColumns} dataSource={applications} rowKey="id" loading={loading} scroll={{ x: 900 }} />
              </Card>
            ),
          },
          {
            key: 'calculator',
            label: 'Interactive Precision EMI Calculator (§26)',
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
        onCancel={() => setAppModalVisible(false)}
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

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <Button onClick={() => setAppModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ background: '#059669', borderColor: '#059669' }}>
              Submit for Credit Review
            </Button>
          </div>
        </Form>
      </Modal>

      {/* MULTI-FACTOR CREDIT ASSESSMENT MODAL (SRS §24) */}
      <Modal
        title={`Credit Assessment Scoring: ${selectedApp?.applicationNumber}`}
        open={assessmentModalVisible}
        onCancel={() => setAssessmentModalVisible(false)}
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
            <Button onClick={() => setAssessmentModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ background: '#059669', borderColor: '#059669' }}>
              Save Assessment & Forward to BM
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
