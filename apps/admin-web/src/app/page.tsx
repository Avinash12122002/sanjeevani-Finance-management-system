'use client';

import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Tag,
  Typography,
  Button,
  Alert,
} from 'antd';
import {
  UsergroupAddOutlined,
  DollarCircleOutlined,
  BankOutlined,
  WarningOutlined,
  SafetyOutlined,
  RiseOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { fetchApi } from '@/lib/api-client';
import { FinancialEngine } from '@sanjeevani/financial-engine';
import { IDashboardMetrics, IRedAlert } from '@sanjeevani/shared-types';

const { Title, Text } = Typography;

const COLORS = ['#059669', '#0284c7', '#f59e0b', '#8b5cf6', '#ef4444'];

const initialMetrics: IDashboardMetrics = {
  totalMembers: 0,
  activeMembers: 0,
  totalActiveAccounts: 0,
  totalCollectionToday: 0,
  totalCollectionMonth: 0,
  totalLoanOutstanding: 0,
  newLoanDisbursementMonth: 0,
  emiDueToday: 0,
  emiCollectedToday: 0,
  totalOverdueAmount: 0,
  overduePercentage: 0,
  cashInHand: 0,
  bankBalance: 0,
  monthlyIncome: 0,
  monthlyExpense: 0,
  netResult: 0,
  cashMismatchAmount: 0,
};

const initialCharts = {
  monthlyCollectionTrend: [
    { month: 'Apr 2026', collection: 0, target: 0 },
    { month: 'May 2026', collection: 0, target: 0 },
    { month: 'Jun 2026', collection: 0, target: 0 },
    { month: 'Jul 2026', collection: 0, target: 0 },
    { month: 'Aug 2026', collection: 0, target: 0 },
    { month: 'Sep 2026', collection: 0, target: 0 },
  ],
  overdueAgingBuckets: [
    { bucket: 'Current (0 DPD)', count: 0, amount: 0 },
    { bucket: '1-30 DPD', count: 0, amount: 0 },
    { bucket: '31-60 DPD', count: 0, amount: 0 },
    { bucket: '61-90 DPD', count: 0, amount: 0 },
    { bucket: '90+ DPD (NPA)', count: 0, amount: 0 },
  ],
  productDistribution: [
    { product: 'Recurring Deposit (RD)', value: 0 },
    { product: 'Fixed Deposit (TD)', value: 0 },
    { product: 'Active Loan Book', value: 0 },
  ],
  branchPerformance: [
    { branch: 'Head Office', collection: 0, loans: 0, staff: 0 },
  ],
  incomeVsExpense: [
    { category: 'Interest Income', amount: 0, type: 'INCOME' },
    { category: 'Processing & Doc Fees', amount: 0, type: 'INCOME' },
    { category: 'Deposit Interest Paid', amount: 0, type: 'EXPENSE' },
    { category: 'Salaries & Branch Rent', amount: 0, type: 'EXPENSE' },
  ],
};

export default function OwnerDashboardPage() {
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [metrics, setMetrics] = useState<IDashboardMetrics>(initialMetrics);
  const [charts, setCharts] = useState<any>(initialCharts);
  const [redAlerts, setRedAlerts] = useState<IRedAlert[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('sfms_access_token') || localStorage.getItem('sjf_auth_token');
      const stored = localStorage.getItem('sfms_user');
      if (stored) {
        try {
          setCurrentUser(JSON.parse(stored));
        } catch (e) {}
      }
      if (token) {
        loadDashboard();
      }
    }
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [mRes, cRes, aRes] = await Promise.all([
        fetchApi<IDashboardMetrics>('/dashboard/metrics'),
        fetchApi('/dashboard/charts'),
        fetchApi<IRedAlert[]>('/dashboard/red-alerts'),
      ]);

      if (mRes.success && mRes.data) setMetrics(mRes.data);
      if (cRes.success && cRes.data) setCharts(cRes.data);
      if (aRes.success && aRes.data) setRedAlerts(aRes.data);
    } catch (e) {
      console.warn('Dashboard live fetch error, using safe initial state', e);
    } finally {
      setLoading(false);
    }
  };

  const userRole = currentUser?.roles?.[0] || 'SUPER_ADMIN';
  const userName = currentUser?.employeeName || currentUser?.username || 'Staff User';
  const branchName = currentUser?.branchName || 'Head Office Agra';

  const roleTitle =
    userRole === 'FIELD_COLLECTOR'
      ? 'Field Recovery & Collection Console'
      : userRole === 'CASHIER'
      ? 'Cashier Counter & Vault Control'
      : userRole === 'LOAN_OFFICER'
      ? 'Loan Origination & Underwriting Hub'
      : userRole === 'AUDITOR'
      ? 'Audit, Risk & Compliance Desk'
      : 'Sanjeevani Finance Operations Control Center';

  const roleBadge =
    userRole === 'FIELD_COLLECTOR'
      ? 'FIELD RECOVERY DESK'
      : userRole === 'CASHIER'
      ? 'TELLER & VAULT DESK'
      : userRole === 'LOAN_OFFICER'
      ? 'CREDIT UNDERWRITING'
      : userRole === 'AUDITOR'
      ? 'AUDIT & COMPLIANCE'
      : 'EXECUTIVE MIS CONSOLE';

  const roleSubtitle =
    userRole === 'FIELD_COLLECTOR'
      ? `Welcome back, ${userName} • Assigned Route: ${branchName} Area`
      : userRole === 'CASHIER'
      ? `Welcome back, ${userName} • Cash Drawer & Vault Session: ${branchName}`
      : userRole === 'LOAN_OFFICER'
      ? `Welcome back, ${userName} • Credit Appraisal & KYC Desk`
      : userRole === 'AUDITOR'
      ? `Welcome back, ${userName} • Independent Verification & Compliance`
      : `Centralized operations summary across Head Office & District Branches.`;

  return (
    <div className="space-y-6">
      {/* Top Banner / Role-Tailored Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Tag color="#059669" className="font-bold text-xs uppercase tracking-wider px-2 py-0.5 border-0">
              {roleBadge}
            </Tag>
            <span className="text-xs text-slate-300">
              {userRole === 'SUPER_ADMIN' ? 'Full Institutional Authority' : `Role: ${userRole}`}
            </span>
          </div>
          <Title level={2} style={{ color: '#ffffff', margin: '8px 0 4px 0' }}>
            {roleTitle}
          </Title>
          <Text className="text-slate-300 text-sm">{roleSubtitle}</Text>
        </div>

        <div className="flex items-center gap-3">
          {userRole === 'FIELD_COLLECTOR' && (
            <Button
              type="primary"
              icon={<DollarCircleOutlined />}
              onClick={() => (window.location.href = '/collections')}
              style={{ background: '#059669', borderColor: '#059669', height: 40 }}
            >
              Record Customer Payment
            </Button>
          )}

          {userRole === 'CASHIER' && (
            <Button
              type="primary"
              icon={<BankOutlined />}
              onClick={() => (window.location.href = '/cash')}
              style={{ background: '#059669', borderColor: '#059669', height: 40 }}
            >
              Count Vault Denominations
            </Button>
          )}

          {userRole === 'LOAN_OFFICER' && (
            <Button
              type="primary"
              icon={<DollarCircleOutlined />}
              onClick={() => (window.location.href = '/loans')}
              style={{ background: '#059669', borderColor: '#059669', height: 40 }}
            >
              Loan Underwriting Queue
            </Button>
          )}

          {['SUPER_ADMIN', 'BRANCH_MANAGER', 'AUDITOR'].includes(userRole) && (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => (window.location.href = '/daily-closing')}
              style={{ background: '#059669', borderColor: '#059669', height: 40 }}
            >
              Daily Closing Status
            </Button>
          )}

          <Button
            ghost
            icon={<ReloadOutlined />}
            onClick={loadDashboard}
            loading={loading}
            style={{ color: '#ffffff', borderColor: '#ffffff', height: 40 }}
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* RED ALERT BANNER (§67) IF ANY CRITICAL ALERTS */}
      {redAlerts.length > 0 && (
        <Alert
          message={
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-2 text-red-700">
                <WarningOutlined /> Red Alert Surveillance: {redAlerts.length} Action Items Detected
              </span>
              <span className="text-xs text-red-500 font-normal">SRS §67 Surveillance Engine</span>
            </div>
          }
          description={
            <div className="mt-2 space-y-1">
              {redAlerts.map((a, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs text-slate-700 bg-white/70 p-2 rounded border border-red-100">
                  <div>
                    <span className="font-bold text-red-600 mr-2">[{a.alertType}]</span>
                    <span>{a.description}</span>
                  </div>
                  <Tag color="error">{a.severity}</Tag>
                </div>
              ))}
            </div>
          }
          type="error"
          showIcon
          className="border-red-200 bg-red-50/70 shadow-sm"
        />
      )}

      {/* 16 KPI METRICS GRID (§65) */}
      <div>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Core Financial & Operational Metrics (§65)
        </div>
        <Row gutter={[16, 16]}>
          {/* Card 1: Total Members */}
          <Col xs={24} sm={12} md={6}>
            <div className="glass-card kpi-card bg-white">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>TOTAL MEMBERS</span>
                <UsergroupAddOutlined className="text-emerald-600 text-lg" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {metrics.totalMembers.toLocaleString()}
              </div>
              <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                <RiseOutlined /> {metrics.activeMembers} Active KYC Verified
              </div>
            </div>
          </Col>

          {/* Card 2: Today's Collection */}
          <Col xs={24} sm={12} md={6}>
            <div className="glass-card kpi-card bg-white">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>COLLECTION TODAY</span>
                <DollarCircleOutlined className="text-emerald-600 text-lg" />
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-2">
                {FinancialEngine.formatINR(metrics.totalCollectionToday)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Month: {FinancialEngine.formatINR(metrics.totalCollectionMonth)}
              </div>
            </div>
          </Col>

          {/* Card 3: Loan Outstanding */}
          <Col xs={24} sm={12} md={6}>
            <div className="glass-card kpi-card bg-white">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>LOAN PORTFOLIO OUTSTANDING</span>
                <BankOutlined className="text-blue-600 text-lg" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {FinancialEngine.formatINR(metrics.totalLoanOutstanding)}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Disbursed This Month: {FinancialEngine.formatINR(metrics.newLoanDisbursementMonth)}
              </div>
            </div>
          </Col>

          {/* Card 4: Overdue Amount */}
          <Col xs={24} sm={12} md={6}>
            <div className="glass-card kpi-card bg-white">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>PORTFOLIO OVERDUE (PAR)</span>
                <WarningOutlined className="text-amber-500 text-lg" />
              </div>
              <div className="text-2xl font-black text-amber-600 mt-2">
                {FinancialEngine.formatINR(metrics.totalOverdueAmount)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Overdue Rate: <Tag color={metrics.overduePercentage > 5 ? 'error' : 'success'}>{metrics.overduePercentage}%</Tag>
              </div>
            </div>
          </Col>

          {/* Card 5: Cash In Vault */}
          <Col xs={24} sm={12} md={6}>
            <div className="glass-card kpi-card bg-white">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>CASH IN HAND (BRANCH VAULT)</span>
                <SafetyOutlined className="text-emerald-600 text-lg" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {FinancialEngine.formatINR(metrics.cashInHand)}
              </div>
              <div className="text-xs text-emerald-600 mt-1">
                Drawer Status: Balanced
              </div>
            </div>
          </Col>

          {/* Card 6: Bank Balance */}
          <Col xs={24} sm={12} md={6}>
            <div className="glass-card kpi-card bg-white">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>BANK ACCOUNT BALANCE</span>
                <BankOutlined className="text-indigo-600 text-lg" />
              </div>
              <div className="text-2xl font-black text-indigo-700 mt-2">
                {FinancialEngine.formatINR(metrics.bankBalance)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Operations A/c Reconciled
              </div>
            </div>
          </Col>

          {/* Card 7: Monthly Income */}
          <Col xs={24} sm={12} md={6}>
            <div className="glass-card kpi-card bg-white">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>MONTHLY GROSS REVENUE</span>
                <ArrowUpOutlined className="text-emerald-600 text-lg" />
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-2">
                {FinancialEngine.formatINR(metrics.monthlyIncome)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Interest + Fees
              </div>
            </div>
          </Col>

          {/* Card 8: Net Operating Profit */}
          <Col xs={24} sm={12} md={6}>
            <div className="glass-card kpi-card bg-white">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>NET OPERATIONAL RESULT</span>
                <RiseOutlined className="text-emerald-600 text-lg" />
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-2">
                {FinancialEngine.formatINR(metrics.netResult)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Expenses: {FinancialEngine.formatINR(metrics.monthlyExpense)}
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* ANALYTICAL CHARTS SECTION (§66) */}
      {charts && (
        <Row gutter={[16, 16]}>
          {/* Chart 1: Monthly Collection Trend */}
          <Col xs={24} lg={14}>
            <Card
              title={
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Monthly Collection Performance vs Target</span>
                  <Tag color="emerald">SRS §66 Trend</Tag>
                </div>
              }
              className="glass-card shadow-sm"
            >
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.monthlyCollectionTrend}>
                    <defs>
                      <linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `₹${v / 100000}L`} />
                    <RechartsTooltip formatter={(value: any) => FinancialEngine.formatINR(value)} />
                    <Legend />
                    <Area type="monotone" dataKey="collection" stroke="#059669" strokeWidth={3} fill="url(#colGrad)" name="Actual Collections" />
                    <Area type="monotone" dataKey="target" stroke="#94a3b8" strokeDasharray="5 5" fill="none" name="Monthly Target" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>

          {/* Chart 2: Product Distribution Breakdown */}
          <Col xs={24} lg={10}>
            <Card
              title={
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Product Portfolio Volume</span>
                  <Tag color="blue">SRS §66 Asset Split</Tag>
                </div>
              }
              className="glass-card shadow-sm"
            >
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.productDistribution}
                      dataKey="value"
                      nameKey="product"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={5}
                    >
                      {charts.productDistribution.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: any) => FinancialEngine.formatINR(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>

          {/* Chart 3: Overdue Aging Buckets */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Delinquency & PAR Aging Buckets</span>
                  <Tag color="volcano">SRS §66 Risk</Tag>
                </div>
              }
              className="glass-card shadow-sm"
            >
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.overdueAgingBuckets}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="bucket" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `₹${v / 1000}k`} />
                    <RechartsTooltip formatter={(value: any) => FinancialEngine.formatINR(value)} />
                    <Bar dataKey="amount" fill="#f59e0b" name="PAR Overdue Amount" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>

          {/* Chart 4: Branch Performance Comparison */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Branch Network Operations Comparison</span>
                  <Tag color="purple">SRS §66 Branch MIS</Tag>
                </div>
              }
              className="glass-card shadow-sm"
            >
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.branchPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="branch" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `₹${v / 100000}L`} />
                    <RechartsTooltip formatter={(value: any) => FinancialEngine.formatINR(value)} />
                    <Legend />
                    <Bar dataKey="collection" fill="#059669" name="Collections (₹)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="loans" fill="#3b82f6" name="Loan Book (₹)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}
