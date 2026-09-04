'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Tabs,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Descriptions,
  Spin,
  Empty,
  Badge,
  Alert,
  Tooltip,
  Progress,
} from 'antd';
import {
  UserOutlined,
  WalletOutlined,
  BankOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  SafetyCertificateFilled,
  LogoutOutlined,
  CalendarOutlined,
  CustomerServiceOutlined,
  PrinterOutlined,
  LockOutlined,
  CheckCircleOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  AlertOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  KeyOutlined,
  ReloadOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CopyOutlined,
  CheckOutlined,
  SecurityScanOutlined,
  ThunderboltOutlined,
  PhoneOutlined,
  CreditCardOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  QrcodeOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { FinancialEngine } from '@/shared/financial-engine';
import { fetchApi, postApi } from '@/lib/api-client';

export default function CustomerPortalPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [complaintModal, setComplaintModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [receiptModal, setReceiptModal] = useState(false);
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [changePassOtpSent, setChangePassOtpSent] = useState(false);
  const [changePassCooldown, setChangePassCooldown] = useState(0);
  const [changePassDevOtp, setChangePassDevOtp] = useState<string | null>(null);
  const [changePassLoading, setChangePassLoading] = useState(false);
  const [hideBalances, setHideBalances] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [sessionTime, setSessionTime] = useState(900); // 15 min security session countdown
  const [searchTxn, setSearchTxn] = useState('');
  const [filterTxnType, setFilterTxnType] = useState('ALL');

  const [complaintForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const router = useRouter();

  useEffect(() => {
    loadCustomerData();
  }, []);

  // 15-Minute Bank Session Auto-Countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // OTP Resend Cooldown
  useEffect(() => {
    if (changePassCooldown <= 0) return;
    const timer = setInterval(() => {
      setChangePassCooldown((p) => p - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [changePassCooldown]);

  const loadCustomerData = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('sfms_customer_token') : null;
    if (!token) {
      router.replace('/portal/login');
      return;
    }

    try {
      const res = await fetchApi('/portal/me');
      if (res.success && res.data) {
        setData(res.data);
      } else {
        message.error(res.message || 'Session expired. Please sign in again.');
        localStorage.removeItem('sfms_customer_token');
        router.replace('/portal/login');
      }
    } catch (err: any) {
      message.error('Unable to fetch account details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sfms_customer_token');
    localStorage.removeItem('sfms_customer');
    message.success('Secure session terminated. Signed out successfully.');
    router.replace('/portal/login');
  };

  const formatSessionTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const copyToClipboard = (text: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedAccount(id);
      message.success('Account number copied to clipboard');
      setTimeout(() => setCopiedAccount(null), 2000);
    }
  };

  const maskAmount = (amount: number) => {
    if (hideBalances) return '••••••••';
    return FinancialEngine.formatINR(amount || 0);
  };

  const handleFileComplaint = async (values: any) => {
    setSubmittingComplaint(true);
    try {
      const res = await postApi('/portal/complaint', values);
      if (res.success) {
        message.success(res.message || 'Support ticket created successfully!');
        setComplaintModal(false);
        complaintForm.resetFields();
        loadCustomerData();
      } else {
        message.error(res.message || 'Failed to submit complaint.');
      }
    } catch (err: any) {
      message.error(err.message || 'Network error');
    } finally {
      setSubmittingComplaint(false);
    }
  };

  const handleSendChangePassOtp = async () => {
    setChangePassLoading(true);
    try {
      const res = await postApi('/portal/send-change-password-otp');
      if (res.success) {
        message.success(res.message || 'OTP sent via SMS successfully!');
        setChangePassOtpSent(true);
        setChangePassCooldown(30);
        if (res.data?.devOtp) {
          setChangePassDevOtp(res.data.devOtp);
        }
      } else {
        message.error(res.message || 'Failed to send OTP.');
      }
    } catch (err: any) {
      message.error(err.message || 'Network error');
    } finally {
      setChangePassLoading(false);
    }
  };

  const handleVerifyAndChangePassword = async (values: any) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('Passwords do not match. Please re-enter.');
      return;
    }

    setChangePassLoading(true);
    try {
      const res = await postApi('/portal/verify-change-password', {
        otp: values.otp,
        newPassword: values.newPassword,
      });
      if (res.success) {
        message.success(res.message || 'PIN updated successfully!');
        setPasswordModal(false);
        passwordForm.resetFields();
        setChangePassOtpSent(false);
        setChangePassDevOtp(null);
      } else {
        message.error(res.message || 'Failed to update PIN.');
      }
    } catch (err: any) {
      message.error(err.message || 'Network error');
    } finally {
      setChangePassLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#071328] flex flex-col items-center justify-center text-white p-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-3xl shadow-2xl shadow-emerald-500/20 mb-6 animate-pulse">
          S
        </div>
        <Spin size="large" />
        <h3 className="mt-4 text-emerald-400 font-bold tracking-wide text-base">Securing Sanjeevani NetBanking Session...</h3>
        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
          <SafetyCertificateFilled className="text-emerald-500" /> 256-Bit SSL Encrypted Connection
        </p>
      </div>
    );
  }

  if (!data) return null;

  const customer = data?.customer || {};
  const summary = data?.summary || { totalSavings: 0, totalRdDeposited: 0, totalFdPrincipal: 0, totalLoanOutstanding: 0, nextEmiAmount: 0, nextDueDate: '' };
  const accounts = {
    savings: data?.accounts?.savings || [],
    rd: data?.accounts?.rd || [],
    fd: data?.accounts?.fd || [],
    rdInstallments: data?.accounts?.rdInstallments || [],
  };
  const loans = data?.loans || [];
  const passbook = data?.passbook || [];
  const receipts = data?.receipts || [];
  const complaints = data?.complaints || [];
  const nominees = data?.nominees || [];

  const totalAssets = (summary.totalSavings || 0) + (summary.totalRdDeposited || 0) + (summary.totalFdPrincipal || 0);

  // Filter passbook
  const filteredPassbook = passbook.filter((tx: any) => {
    const matchesSearch =
      !searchTxn ||
      (tx.transactionNumber && tx.transactionNumber.toLowerCase().includes(searchTxn.toLowerCase())) ||
      (tx.remarks && tx.remarks.toLowerCase().includes(searchTxn.toLowerCase())) ||
      (tx.paymentMode && tx.paymentMode.toLowerCase().includes(searchTxn.toLowerCase()));

    if (filterTxnType === 'ALL') return matchesSearch;
    const isCredit = tx.transactionType?.includes('DEPOSIT') || tx.transactionType?.includes('RECOVERY') || tx.transactionType?.includes('REPAYMENT');
    if (filterTxnType === 'CREDIT') return matchesSearch && isCredit;
    if (filterTxnType === 'DEBIT') return matchesSearch && !isCredit;
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-slate-900 pb-20 font-sans selection:bg-emerald-500 selection:text-white">
      {/* 1. TOP BANKING SECURITY BANNER */}
      <div className="bg-[#0b192e] text-slate-300 text-[11px] py-1.5 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block"></span>
              Secure NetBanking
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 hidden sm:inline flex items-center gap-1">
              <SafetyCertificateOutlined className="text-emerald-400" /> 256-Bit SSL End-to-End Encryption
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span className="hidden md:inline">
              Session Auto-Lock: <strong className="text-amber-400 font-mono">{formatSessionTime(sessionTime)}</strong>
            </span>
            <span className="text-slate-600 hidden md:inline">|</span>
            <span>CID: <strong className="text-white font-mono">{customer.customerNumber}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. INSTITUTIONAL BANKING HEADER */}
      <header className="bg-gradient-to-r from-[#0a1b32] via-[#0f2747] to-[#0a1e36] text-white sticky top-0 z-40 shadow-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg shadow-emerald-500/20 ring-2 ring-white/10">
              S
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base sm:text-lg tracking-wider text-white">SANJEEVANI</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase tracking-wider">
                  NetBanking
                </span>
              </div>
              <div className="text-[11px] text-slate-300 font-medium hidden sm:block">
                Finance Management System • Member Portal
              </div>
            </div>
          </div>

          {/* Member Profile pill & Logout controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Balance Mask / Reveal Toggle */}
            <Tooltip title={hideBalances ? 'Show Balances' : 'Hide Balances (Privacy Mode)'}>
              <Button
                type="text"
                size="middle"
                icon={hideBalances ? <EyeInvisibleOutlined className="text-amber-400 text-base" /> : <EyeOutlined className="text-emerald-400 text-base" />}
                onClick={() => setHideBalances(!hideBalances)}
                className="bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 flex items-center justify-center"
              >
                <span className="text-xs font-semibold hidden md:inline ml-1">
                  {hideBalances ? 'Hidden' : 'Visible'}
                </span>
              </Button>
            </Tooltip>

            {/* Change PIN Button */}
            <Tooltip title="Update Security PIN">
              <Button
                type="text"
                size="middle"
                icon={<LockOutlined className="text-slate-300" />}
                onClick={() => setPasswordModal(true)}
                className="bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 hidden sm:flex items-center"
              >
                <span className="text-xs font-semibold ml-1">Security PIN</span>
              </Button>
            </Tooltip>

            {/* Support / Grievance */}
            <Button
              type="text"
              size="middle"
              icon={<CustomerServiceOutlined className="text-teal-300" />}
              onClick={() => setComplaintModal(true)}
              className="bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 hidden md:flex items-center"
            >
              <span className="text-xs font-semibold ml-1">Helpdesk</span>
            </Button>

            {/* PROMINENT LOGOUT BUTTON */}
            <Button
              type="primary"
              danger
              icon={<LogoutOutlined />}
              onClick={() => setLogoutModal(true)}
              className="rounded-xl font-bold text-xs sm:text-sm h-9 px-4 shadow-lg shadow-rose-950/40 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 border-none flex items-center gap-1.5"
            >
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* 3. MAIN DASHBOARD BODY */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-5 space-y-6">
        {/* CUSTOMER WELCOME & QUICK BANKING BAR */}
        <div className="bg-gradient-to-br from-[#0c2340] via-[#103058] to-[#0c2442] rounded-3xl p-5 sm:p-7 text-white shadow-xl shadow-slate-950/5 relative overflow-hidden border border-slate-700/50">
          {/* Subtle decorative background watermark */}
          <div className="absolute right-[-40px] top-[-40px] opacity-5 pointer-events-none select-none text-[180px] font-black leading-none">
            ₹
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            {/* Left: Customer Info */}
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black text-2xl sm:text-3xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20 ring-4 ring-white/10">
                {customer.firstName ? customer.firstName[0].toUpperCase() : 'M'}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-white m-0 tracking-tight">
                    Namaste, {customer.fullName}
                  </h1>
                  <Tag color="success" className="rounded-full px-2.5 py-0.5 text-xs font-bold border-none bg-emerald-500/20 text-emerald-300 flex items-center gap-1">
                    <CheckCircleFilled className="text-emerald-400" /> Verified Member
                  </Tag>
                </div>
                <div className="text-xs sm:text-sm text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 font-medium">
                  <span>📱 +91 {customer.mobile}</span>
                  <span className="text-slate-500">•</span>
                  <span>📍 {customer.city || customer.branchName || 'Main Branch'}</span>
                  <span className="text-slate-500">•</span>
                  <span className="font-mono text-emerald-400">{customer.customerNumber}</span>
                </div>
              </div>
            </div>

            {/* Right: Net Worth Card Display */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/10 flex items-center justify-between sm:justify-end gap-6 shrink-0 min-w-[280px]">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <WalletOutlined className="text-emerald-400" /> Total Portfolio Value
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
                  {maskAmount(totalAssets)}
                </div>
                <div className="text-[11px] text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
                  <span>Savings + RD + Fixed Deposits</span>
                </div>
              </div>

              <div className="text-right border-l border-white/10 pl-4">
                <div className="text-[10px] uppercase font-bold text-slate-400">KYC Status</div>
                <div className="text-xs font-extrabold text-emerald-300 mt-1 flex items-center justify-end gap-1">
                  <SafetyCertificateFilled /> {customer.kycStatus || 'VERIFIED'}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Member since {customer.joiningDate || '2026'}</div>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              type="text"
              onClick={() => setActiveTab('overview')}
              className={`rounded-xl text-xs font-bold px-3.5 py-1.5 transition-all ${
                activeTab === 'overview' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              📄 Passbook Statement
            </Button>
            <Button
              type="text"
              onClick={() => setActiveTab('rd')}
              className={`rounded-xl text-xs font-bold px-3.5 py-1.5 transition-all ${
                activeTab === 'rd' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              💰 RD Deposits ({accounts.rd.length})
            </Button>
            <Button
              type="text"
              onClick={() => setActiveTab('fd')}
              className={`rounded-xl text-xs font-bold px-3.5 py-1.5 transition-all ${
                activeTab === 'fd' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              🏦 Term Deposits ({accounts.fd.length})
            </Button>
            <Button
              type="text"
              onClick={() => setActiveTab('loans')}
              className={`rounded-xl text-xs font-bold px-3.5 py-1.5 transition-all ${
                activeTab === 'loans' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              💳 My Loans ({loans.length})
            </Button>
            <Button
              type="text"
              onClick={() => setActiveTab('receipts')}
              className={`rounded-xl text-xs font-bold px-3.5 py-1.5 transition-all ${
                activeTab === 'receipts' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              🧾 Digital Receipts ({receipts.length})
            </Button>
            <Button
              type="text"
              onClick={() => setActiveTab('support')}
              className={`rounded-xl text-xs font-bold px-3.5 py-1.5 transition-all ${
                activeTab === 'support' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              🎧 Helpdesk ({complaints.length})
            </Button>
            <Button
              type="text"
              onClick={() => setActiveTab('profile')}
              className={`rounded-xl text-xs font-bold px-3.5 py-1.5 transition-all ${
                activeTab === 'profile' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              👤 Profile & Security
            </Button>
          </div>
        </div>

        {/* LOAN EMI DUE ALERT BANNER (If customer has upcoming loan installment) */}
        {summary.nextEmiAmount > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300/80 rounded-2xl p-4 sm:p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center text-xl shrink-0">
                <ClockCircleOutlined />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Upcoming Loan EMI: {maskAmount(summary.nextEmiAmount)}
                  </span>
                  <Tag color="volcano" className="font-bold text-[10px] uppercase">
                    Payment Scheduled
                  </Tag>
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Due on or before <strong className="text-slate-900">{summary.nextDueDate || 'Upcoming cycle'}</strong>. Pay via your authorized field agent or at your nearest Sanjeevani branch.
                </div>
              </div>
            </div>

            <Button
              type="primary"
              onClick={() => setActiveTab('loans')}
              className="bg-amber-600 hover:bg-amber-500 rounded-xl font-bold text-xs h-9 px-4 shrink-0 border-none"
            >
              View Loan Schedule →
            </Button>
          </div>
        )}

        {/* 4 PRIMARY BANK PORTFOLIO METRIC CARDS */}
        <Row gutter={[16, 16]}>
          {/* 1. Savings */}
          <Col xs={24} sm={12} lg={6}>
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all hover:border-emerald-300 group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Savings Account</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-base group-hover:scale-110 transition-transform">
                  <WalletOutlined />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                {maskAmount(summary.totalSavings)}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{accounts.savings.length} Active Account</span>
                <span className="text-emerald-700 font-semibold cursor-pointer hover:underline" onClick={() => setActiveTab('overview')}>
                  Passbook →
                </span>
              </div>
            </div>
          </Col>

          {/* 2. Recurring Deposits */}
          <Col xs={24} sm={12} lg={6}>
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all hover:border-teal-300 group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recurring Deposits</span>
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center text-base group-hover:scale-110 transition-transform">
                  <CalendarOutlined />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                {maskAmount(summary.totalRdDeposited)}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{accounts.rd.length} Active RD Plan(s)</span>
                <span className="text-teal-700 font-semibold cursor-pointer hover:underline" onClick={() => setActiveTab('rd')}>
                  Details →
                </span>
              </div>
            </div>
          </Col>

          {/* 3. Fixed Deposits */}
          <Col xs={24} sm={12} lg={6}>
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all hover:border-indigo-300 group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fixed Deposits</span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-base group-hover:scale-110 transition-transform">
                  <BankOutlined />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                {maskAmount(summary.totalFdPrincipal)}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{accounts.fd.length} Certificate(s)</span>
                <span className="text-indigo-700 font-semibold cursor-pointer hover:underline" onClick={() => setActiveTab('fd')}>
                  View FD →
                </span>
              </div>
            </div>
          </Col>

          {/* 4. Active Loans */}
          <Col xs={24} sm={12} lg={6}>
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all hover:border-amber-300 group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loan Outstanding</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-base group-hover:scale-110 transition-transform">
                  <CreditCardOutlined />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                {maskAmount(summary.totalLoanOutstanding)}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{loans.length} Active Loan(s)</span>
                <span className="text-amber-700 font-semibold cursor-pointer hover:underline" onClick={() => setActiveTab('loans')}>
                  Repayments →
                </span>
              </div>
            </div>
          </Col>
        </Row>

        {/* 5. MAIN BANKING TABS PANEL */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 overflow-hidden">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            size="large"
            className="custom-banking-tabs"
            items={[
              /* TAB 1: PASSBOOK & TRANSACTION STATEMENT */
              {
                key: 'overview',
                label: (
                  <span className="flex items-center gap-1.5 font-bold text-sm">
                    <FileTextOutlined /> Passbook & Statement
                  </span>
                ),
                children: (
                  <div className="space-y-4 pt-2">
                    {/* Search & Filter Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-2 flex-1 max-w-md">
                        <Input
                          placeholder="Search transactions, reference #, mode..."
                          value={searchTxn}
                          onChange={(e) => setSearchTxn(e.target.value)}
                          allowClear
                          className="rounded-xl"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={filterTxnType}
                          onChange={setFilterTxnType}
                          className="w-36 rounded-xl"
                        >
                          <Select.Option value="ALL">All Activity</Select.Option>
                          <Select.Option value="CREDIT">+ Credits Only</Select.Option>
                          <Select.Option value="DEBIT">- Debits Only</Select.Option>
                        </Select>
                        <Button
                          icon={<PrinterOutlined />}
                          onClick={() => window.print()}
                          className="rounded-xl text-xs font-semibold"
                        >
                          Print
                        </Button>
                      </div>
                    </div>

                    {/* Passbook Table */}
                    <Table
                      dataSource={filteredPassbook}
                      rowKey="id"
                      size="middle"
                      pagination={{ pageSize: 8, showSizeChanger: false }}
                      className="banking-passbook-table"
                      columns={[
                        {
                          title: 'Date & Time',
                          dataIndex: 'transactionDate',
                          key: 'dt',
                          width: 150,
                          render: (d: any, r: any) => (
                            <div>
                              <div className="font-bold text-slate-900 text-xs sm:text-sm">
                                {d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                              </div>
                              <div className="text-slate-400 font-mono text-[11px]">{r.transactionNumber}</div>
                            </div>
                          ),
                        },
                        {
                          title: 'Transaction Particulars',
                          dataIndex: 'remarks',
                          key: 'rem',
                          render: (t: any, r: any) => (
                            <div>
                              <div className="font-bold text-slate-800 text-xs sm:text-sm">
                                {r.transactionType ? r.transactionType.replace(/_/g, ' ') : 'Account Activity'}
                              </div>
                              <div className="text-slate-500 text-[11px] mt-0.5">
                                Mode: <strong className="text-slate-700">{r.paymentMode || 'Cash'}</strong> {t ? `• ${t}` : ''}
                              </div>
                            </div>
                          ),
                        },
                        {
                          title: 'Type',
                          dataIndex: 'transactionType',
                          key: 'tp',
                          width: 100,
                          render: (t) => {
                            const isCredit = t?.includes('DEPOSIT') || t?.includes('RECOVERY') || t?.includes('REPAYMENT');
                            return (
                              <Tag
                                color={isCredit ? 'green' : 'volcano'}
                                className="font-extrabold text-xs px-2.5 py-0.5 rounded-full border-none"
                              >
                                {isCredit ? '+ CREDIT' : '- DEBIT'}
                              </Tag>
                            );
                          },
                        },
                        {
                          title: 'Amount',
                          dataIndex: 'amount',
                          key: 'amt',
                          align: 'right',
                          width: 140,
                          render: (a, r) => {
                            const isCredit = r.transactionType?.includes('DEPOSIT') || r.transactionType?.includes('RECOVERY') || r.transactionType?.includes('REPAYMENT');
                            return (
                              <div className={`font-black text-sm sm:text-base ${isCredit ? 'text-emerald-700' : 'text-slate-800'}`}>
                                {isCredit ? '+' : '-'}{maskAmount(a || 0)}
                              </div>
                            );
                          },
                        },
                      ]}
                    />
                  </div>
                ),
              },

              /* TAB 2: RECURRING DEPOSITS */
              {
                key: 'rd',
                label: (
                  <span className="flex items-center gap-1.5 font-bold text-sm">
                    <CalendarOutlined /> Recurring Deposits ({accounts.rd.length})
                  </span>
                ),
                children: (
                  <div className="space-y-4 pt-2">
                    {accounts.rd.length === 0 ? (
                      <Empty description="No active Recurring Deposit accounts registered." />
                    ) : (
                      accounts.rd.map((rd: any) => (
                        <div key={rd.id} className="bg-gradient-to-br from-slate-50 to-slate-100/60 rounded-2xl border border-slate-200 p-5 shadow-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-emerald-800 text-lg">{rd.accountNumber}</span>
                                <Tooltip title="Copy Account Number">
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={copiedAccount === rd.id ? <CheckOutlined className="text-emerald-600" /> : <CopyOutlined className="text-slate-400" />}
                                    onClick={() => copyToClipboard(rd.accountNumber, rd.id)}
                                  />
                                </Tooltip>
                                <Tag color="success" className="font-bold text-[10px] uppercase">
                                  {rd.status || 'ACTIVE'}
                                </Tag>
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                Sanjeevani Monthly Sanchay RD Scheme • Authorized Member Deposit
                              </div>
                            </div>

                            <div className="text-left sm:text-right">
                              <div className="text-xs text-slate-400 font-medium">Accumulated RD Balance</div>
                              <div className="text-2xl font-black text-emerald-700 mt-0.5">
                                {maskAmount(rd.currentBalance || 0)}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
                            <div className="bg-white p-3 rounded-xl border border-slate-100">
                              <div className="text-slate-400">Monthly Contribution</div>
                              <div className="font-bold text-slate-900 text-sm mt-0.5">
                                {maskAmount(rd.monthlyDeposit || 1000)}
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-100">
                              <div className="text-slate-400">Annual Return Rate</div>
                              <div className="font-black text-indigo-700 text-sm mt-0.5">
                                {rd.interestRate || 8.5}% p.a.
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-100">
                              <div className="text-slate-400">Account Opened On</div>
                              <div className="font-bold text-slate-800 text-sm mt-0.5">
                                {rd.openingDate || 'Active'}
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-100">
                              <div className="text-slate-400">Installments Paid</div>
                              <div className="font-bold text-emerald-700 text-sm mt-0.5">
                                Regular Cycle
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ),
              },

              /* TAB 3: FIXED DEPOSITS */
              {
                key: 'fd',
                label: (
                  <span className="flex items-center gap-1.5 font-bold text-sm">
                    <BankOutlined /> Fixed Deposits ({accounts.fd.length})
                  </span>
                ),
                children: (
                  <div className="space-y-4 pt-2">
                    {accounts.fd.length === 0 ? (
                      <Empty description="No active Fixed Deposit certificates registered." />
                    ) : (
                      accounts.fd.map((fd: any) => (
                        <div key={fd.id} className="bg-gradient-to-br from-indigo-50/40 via-white to-indigo-50/20 rounded-2xl border border-indigo-200/80 p-5 shadow-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-indigo-900 text-lg">{fd.accountNumber}</span>
                                <Tooltip title="Copy Certificate #">
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={copiedAccount === fd.id ? <CheckOutlined className="text-emerald-600" /> : <CopyOutlined className="text-slate-400" />}
                                    onClick={() => copyToClipboard(fd.accountNumber, fd.id)}
                                  />
                                </Tooltip>
                                <Tag color="blue" className="font-bold text-[10px] uppercase">
                                  TERM DEPOSIT CERTIFICATE
                                </Tag>
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                Guaranteed Return Term Deposit Certificate
                              </div>
                            </div>

                            <div className="text-left sm:text-right">
                              <div className="text-xs text-slate-400 font-medium">Principal Deposited</div>
                              <div className="text-2xl font-black text-indigo-900 mt-0.5">
                                {maskAmount(fd.principalAmount || 0)}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
                            <div className="bg-white p-3 rounded-xl border border-indigo-50">
                              <div className="text-slate-400">Guaranteed Return Rate</div>
                              <div className="font-black text-indigo-700 text-sm mt-0.5">
                                {fd.interestRate || 9.0}% p.a.
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-indigo-50">
                              <div className="text-slate-400">Tenure Duration</div>
                              <div className="font-bold text-slate-900 text-sm mt-0.5">
                                {fd.tenureMonths || 12} Months
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-indigo-50">
                              <div className="text-slate-400">Maturity Date</div>
                              <div className="font-bold text-emerald-800 text-sm mt-0.5">
                                {fd.maturityDate || '-'}
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-indigo-50">
                              <div className="text-slate-400">Maturity Value at Payout</div>
                              <div className="font-black text-emerald-700 text-sm mt-0.5">
                                {maskAmount(fd.maturityAmount || 0)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ),
              },

              /* TAB 4: LOANS & REPAYMENT TIMELINE */
              {
                key: 'loans',
                label: (
                  <span className="flex items-center gap-1.5 font-bold text-sm">
                    <CreditCardOutlined /> My Loans ({loans.length})
                  </span>
                ),
                children: (
                  <div className="space-y-4 pt-2">
                    {loans.length === 0 ? (
                      <Empty description="No active loan facilities registered under your customer ID." />
                    ) : (
                      loans.map((loan: any) => {
                        const paidPct = loan.principal && loan.principal > 0
                          ? Math.round(((loan.principal - (loan.outstandingPrincipal || 0)) / loan.principal) * 100)
                          : 0;

                        return (
                          <div key={loan.id} className="bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-2xl border border-slate-200 p-5 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-amber-800 text-lg">{loan.loanNumber}</span>
                                  <Tag color={loan.daysPastDue > 0 ? 'volcano' : 'green'} className="font-bold text-[10px]">
                                    {loan.daysPastDue > 0 ? `${loan.daysPastDue} DPD OVERDUE` : 'REGULAR / GREEN'}
                                  </Tag>
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                  Sanctioned Credit Facility • Monthly Amortization
                                </div>
                              </div>

                              <div className="text-left sm:text-right">
                                <div className="text-xs text-slate-400 font-medium">Outstanding Principal</div>
                                <div className="text-2xl font-black text-amber-700 mt-0.5">
                                  {maskAmount(loan.outstandingPrincipal || 0)}
                                </div>
                              </div>
                            </div>

                            {/* Loan Repayment Progress Bar */}
                            <div className="mt-4">
                              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                                <span>Principal Repayment Progress</span>
                                <span className="font-bold text-slate-800">{paidPct}% Repaid</span>
                              </div>
                              <Progress
                                percent={paidPct}
                                strokeColor="#059669"
                                trailColor="#e2e8f0"
                                showInfo={false}
                              />
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
                              <div className="bg-white p-3 rounded-xl border border-slate-100">
                                <div className="text-slate-400">Sanctioned Principal</div>
                                <div className="font-bold text-slate-900 text-sm mt-0.5">
                                  {maskAmount(loan.principal || 0)}
                                </div>
                              </div>
                              <div className="bg-white p-3 rounded-xl border border-slate-100">
                                <div className="text-slate-400">Monthly EMI Due</div>
                                <div className="font-bold text-slate-900 text-sm mt-0.5">
                                  {maskAmount(loan.emiAmount || 0)}
                                </div>
                              </div>
                              <div className="bg-white p-3 rounded-xl border border-slate-100">
                                <div className="text-slate-400">Annual Interest Rate</div>
                                <div className="font-bold text-slate-800 text-sm mt-0.5">
                                  {loan.annualInterestRate || 12}% p.a.
                                </div>
                              </div>
                              <div className="bg-white p-3 rounded-xl border border-slate-100">
                                <div className="text-slate-400">Disbursal Date</div>
                                <div className="font-bold text-slate-800 text-sm mt-0.5">
                                  {loan.disbursementDate || 'Active'}
                                </div>
                              </div>
                            </div>

                            {/* Installments Breakdown */}
                            {loan.installments && loan.installments.length > 0 && (
                              <div className="mt-5 pt-4 border-t border-slate-200">
                                <div className="text-xs font-bold text-slate-700 mb-2">EMI Installments & Status</div>
                                <Table
                                  dataSource={loan.installments}
                                  rowKey="id"
                                  size="small"
                                  pagination={{ pageSize: 5, showSizeChanger: false }}
                                  columns={[
                                    { title: '#', dataIndex: 'installmentNumber', key: 'num', width: 50 },
                                    { title: 'Due Date', dataIndex: 'dueDate', key: 'dd' },
                                    {
                                      title: 'EMI Due',
                                      dataIndex: 'totalDue',
                                      key: 'td',
                                      render: (v) => maskAmount(v || 0),
                                    },
                                    {
                                      title: 'Status',
                                      dataIndex: 'status',
                                      key: 'st',
                                      render: (st) => (
                                        <Tag color={st === 'PAID' ? 'green' : st === 'OVERDUE' ? 'red' : 'orange'}>
                                          {st}
                                        </Tag>
                                      ),
                                    },
                                  ]}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                ),
              },

              /* TAB 5: DIGITAL PAYMENT RECEIPTS */
              {
                key: 'receipts',
                label: (
                  <span className="flex items-center gap-1.5 font-bold text-sm">
                    <PrinterOutlined /> Official Receipts ({receipts.length})
                  </span>
                ),
                children: (
                  <div className="space-y-4 pt-2">
                    <Table
                      dataSource={receipts}
                      rowKey="id"
                      size="middle"
                      pagination={{ pageSize: 8, showSizeChanger: false }}
                      columns={[
                        {
                          title: 'Receipt Number',
                          dataIndex: 'receiptNumber',
                          key: 'rn',
                          render: (n) => <span className="font-mono font-bold text-emerald-800 text-xs sm:text-sm">{n}</span>,
                        },
                        {
                          title: 'Date of Payment',
                          dataIndex: 'generatedAt',
                          key: 'dt',
                          render: (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '-'),
                        },
                        { title: 'Payment Channel', dataIndex: 'paymentMode', key: 'pm' },
                        {
                          title: 'Amount Paid',
                          dataIndex: 'amount',
                          key: 'amt',
                          render: (a) => <span className="font-black text-slate-900">{maskAmount(a || 0)}</span>,
                        },
                        {
                          title: 'Digital Verification',
                          key: 'act',
                          align: 'right',
                          render: (_, r) => (
                            <Button
                              size="small"
                              icon={<PrinterOutlined />}
                              onClick={() => {
                                setSelectedReceipt(r);
                                setReceiptModal(true);
                              }}
                              className="rounded-lg text-xs font-semibold"
                            >
                              View Receipt
                            </Button>
                          ),
                        },
                      ]}
                    />
                  </div>
                ),
              },

              /* TAB 6: SUPPORT & GRIEVANCES */
              {
                key: 'support',
                label: (
                  <span className="flex items-center gap-1.5 font-bold text-sm">
                    <CustomerServiceOutlined /> Helpdesk ({complaints.length})
                  </span>
                ),
                children: (
                  <div className="space-y-4 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div>
                        <h4 className="font-bold text-slate-900 m-0 text-sm">Member Grievance & Helpdesk Services</h4>
                        <p className="text-xs text-slate-500 m-0 mt-0.5">Submit your query or report any transaction concern directly to management.</p>
                      </div>
                      <Button
                        type="primary"
                        icon={<CustomerServiceOutlined />}
                        onClick={() => setComplaintModal(true)}
                        className="bg-emerald-700 hover:bg-emerald-600 rounded-xl font-bold text-xs h-9 px-4 shrink-0"
                      >
                        + Create Support Ticket
                      </Button>
                    </div>

                    <Table
                      dataSource={complaints}
                      rowKey="id"
                      size="middle"
                      pagination={{ pageSize: 5, showSizeChanger: false }}
                      columns={[
                        {
                          title: 'Ticket #',
                          dataIndex: 'complaintNumber',
                          key: 'num',
                          render: (n) => <span className="font-mono font-bold text-emerald-800">{n}</span>,
                        },
                        { title: 'Category', dataIndex: 'category', key: 'cat' },
                        { title: 'Description', dataIndex: 'description', key: 'desc', ellipsis: true },
                        {
                          title: 'Resolution Status',
                          dataIndex: 'status',
                          key: 'st',
                          render: (s) => (
                            <Tag color={s === 'CLOSED' || s === 'RESOLVED' ? 'green' : 'orange'} className="font-bold">
                              {s}
                            </Tag>
                          ),
                        },
                      ]}
                    />
                  </div>
                ),
              },

              /* TAB 7: PROFILE & SECURITY SETTINGS */
              {
                key: 'profile',
                label: (
                  <span className="flex items-center gap-1.5 font-bold text-sm">
                    <UserOutlined /> Profile & Security
                  </span>
                ),
                children: (
                  <div className="space-y-6 pt-2">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-slate-900 m-0 text-sm">Registered Account Details</h4>
                        <Button size="small" icon={<LockOutlined />} onClick={() => setPasswordModal(true)} className="rounded-lg">
                          Change Security PIN
                        </Button>
                      </div>

                      <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small" className="bg-white rounded-xl overflow-hidden">
                        <Descriptions.Item label="Customer ID">
                          <span className="font-mono font-bold text-emerald-800">{customer.customerNumber}</span>
                        </Descriptions.Item>
                        <Descriptions.Item label="Full Legal Name">{customer.fullName}</Descriptions.Item>
                        <Descriptions.Item label="Registered Phone">+91 {customer.mobile}</Descriptions.Item>
                        <Descriptions.Item label="Home Branch">{customer.city || customer.branchName || 'Main Branch'}</Descriptions.Item>
                        <Descriptions.Item label="Address">{customer.address || '-'}</Descriptions.Item>
                        <Descriptions.Item label="KYC Document Status">
                          <Tag color="success" className="font-bold">
                            {customer.kycStatus || 'VERIFIED'}
                          </Tag>
                        </Descriptions.Item>
                      </Descriptions>
                    </div>

                    {/* Registered Nominee Section */}
                    {nominees && nominees.length > 0 && (
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                        <h4 className="font-bold text-slate-900 m-0 text-sm mb-3">Registered Nominee Information</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {nominees.map((n: any) => (
                            <div key={n.id} className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                              <div><span className="text-slate-400">Nominee Name:</span> <strong className="text-slate-900">{n.name}</strong></div>
                              <div><span className="text-slate-400">Relationship:</span> {n.relationship}</div>
                              <div><span className="text-slate-400">Entitled Share:</span> <strong className="text-emerald-700">{n.percentage}%</strong></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>
      </main>

      {/* 4. MODALS */}

      {/* LOGOUT CONFIRMATION MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-rose-700">
            <LogoutOutlined />
            <span>Terminate NetBanking Session?</span>
          </div>
        }
        open={logoutModal}
        onCancel={() => setLogoutModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setLogoutModal(false)} className="rounded-xl">
            Stay Signed In
          </Button>,
          <Button
            key="logout"
            type="primary"
            danger
            onClick={handleLogout}
            className="rounded-xl font-bold bg-rose-600"
          >
            Confirm Logout
          </Button>,
        ]}
      >
        <p className="text-xs text-slate-600 mt-2">
          Are you sure you want to end your secure session for customer <strong className="text-slate-900">{customer.fullName}</strong> ({customer.customerNumber})?
        </p>
      </Modal>

      {/* CREATE COMPLAINT MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800">
            <CustomerServiceOutlined className="text-emerald-700" />
            <span>File Grievance / Service Request</span>
          </div>
        }
        open={complaintModal}
        onCancel={() => setComplaintModal(false)}
        footer={null}
      >
        <Form form={complaintForm} layout="vertical" onFinish={handleFileComplaint} className="mt-4">
          <Form.Item
            name="category"
            label="Grievance Category"
            initialValue="ACCOUNT_SERVICES"
            rules={[{ required: true }]}
          >
            <Select className="rounded-xl">
              <Select.Option value="ACCOUNT_SERVICES">Passbook / Account Issue</Select.Option>
              <Select.Option value="COLLECTION_RECEIPT">Receipt or Payment Mismatch</Select.Option>
              <Select.Option value="LOAN_SERVICES">Loan Application or EMI Discrepancy</Select.Option>
              <Select.Option value="MATURITY_PAYOUT">Maturity Claim Delay</Select.Option>
              <Select.Option value="STAFF_BEHAVIOR">Staff Conduct</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Complaint Details"
            rules={[{ required: true, message: 'Please explain your concern' }]}
          >
            <Input.TextArea rows={4} placeholder="Describe the issue in detail..." className="rounded-xl" />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            loading={submittingComplaint}
            block
            className="bg-emerald-700 hover:bg-emerald-600 rounded-xl h-10 font-bold"
          >
            Submit Grievance Ticket
          </Button>
        </Form>
      </Modal>

      {/* UPDATE SECURITY PIN MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800">
            <LockOutlined className="text-emerald-700" />
            <span>Update NetBanking PIN (SMS OTP Verified)</span>
          </div>
        }
        open={passwordModal}
        onCancel={() => {
          setPasswordModal(false);
          setChangePassOtpSent(false);
          setChangePassDevOtp(null);
          passwordForm.resetFields();
        }}
        footer={null}
      >
        {!changePassOtpSent ? (
          <div className="py-4 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-2xl">
              <SafetyCertificateOutlined />
            </div>
            <div>
              <div className="font-bold text-slate-800 text-base">SMS OTP Verification Required</div>
              <p className="text-xs text-slate-500 mt-1">
                For bank-grade security, an OTP will be dispatched to your registered mobile number <span className="font-semibold text-slate-800">+91 ******{customer?.mobile?.slice(-4) || '****'}</span> before updating your PIN.
              </p>
            </div>
            <Button
              type="primary"
              loading={changePassLoading}
              onClick={handleSendChangePassOtp}
              block
              className="bg-emerald-700 hover:bg-emerald-600 rounded-xl h-11 font-bold text-sm"
            >
              Send Verification OTP via SMS
            </Button>
          </div>
        ) : (
          <Form form={passwordForm} layout="vertical" onFinish={handleVerifyAndChangePassword} className="mt-2">
            {changePassDevOtp && (
              <div className="mb-3 p-2 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                <span>OTP Preview: <strong className="font-mono">{changePassDevOtp}</strong></span>
                <Tag color="orange" className="text-[10px] m-0">Dev Preview</Tag>
              </div>
            )}

            <Form.Item
              name="otp"
              label={<span className="text-xs font-semibold text-slate-700">Verification Code (SMS OTP)</span>}
              rules={[{ required: true, min: 4, max: 6, message: 'Enter valid OTP (4 to 6 digits)' }]}
            >
              <Input
                prefix={<KeyOutlined className="text-emerald-600" />}
                placeholder="• • • •"
                maxLength={6}
                className="rounded-xl font-mono text-center text-lg tracking-widest font-bold"
                autoFocus
              />
            </Form.Item>

            <Form.Item
              name="newPassword"
              label={<span className="text-xs font-semibold text-slate-700">New Security PIN / Password</span>}
              rules={[{ required: true, min: 4, message: 'Must be at least 4 digits' }]}
            >
              <Input.Password prefix={<LockOutlined className="text-emerald-600" />} placeholder="Enter new PIN" className="rounded-xl" />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label={<span className="text-xs font-semibold text-slate-700">Confirm Security PIN</span>}
              rules={[{ required: true, message: 'Confirm your new PIN' }]}
            >
              <Input.Password prefix={<CheckCircleOutlined className="text-emerald-600" />} placeholder="Re-enter new PIN" className="rounded-xl" />
            </Form.Item>

            <div className="flex items-center justify-between mb-4 text-xs">
              <span className="text-slate-400">Didn't receive code?</span>
              <Button
                type="link"
                size="small"
                disabled={changePassCooldown > 0 || changePassLoading}
                onClick={handleSendChangePassOtp}
                className="p-0 text-emerald-700 font-semibold"
              >
                {changePassCooldown > 0 ? `Resend in ${changePassCooldown}s` : 'Resend SMS OTP'}
              </Button>
            </div>

            <Button
              type="primary"
              htmlType="submit"
              loading={changePassLoading}
              block
              className="bg-emerald-700 hover:bg-emerald-600 rounded-xl h-11 font-bold text-sm"
            >
              Verify OTP & Save PIN
            </Button>
          </Form>
        )}
      </Modal>

      {/* OFFICIAL DIGITAL RECEIPT PRINTABLE MODAL */}
      <Modal
        open={receiptModal}
        onCancel={() => setReceiptModal(false)}
        footer={[
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => window.print()} className="rounded-xl bg-emerald-700">
            Print Official Receipt
          </Button>,
          <Button key="close" onClick={() => setReceiptModal(false)} className="rounded-xl">
            Close
          </Button>,
        ]}
      >
        {selectedReceipt && (
          <div className="p-5 border-2 border-slate-200 rounded-2xl text-center space-y-3 bg-slate-50">
            <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-xl mx-auto shadow-md">
              S
            </div>
            <div className="font-extrabold text-slate-900 tracking-wider text-base">SANJEEVANI FINANCE</div>
            <div className="text-xs text-slate-500 font-medium">Official Digital NetBanking Receipt</div>
            <div className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 py-1 px-3 rounded-full inline-block">
              {selectedReceipt.receiptNumber}
            </div>
            <div className="text-3xl font-black text-slate-900 py-1">
              {FinancialEngine.formatINR(selectedReceipt.amount || 0)}
            </div>
            <div className="text-xs text-slate-600 text-left space-y-1.5 pt-3 border-t border-slate-200 bg-white p-3 rounded-xl">
              <div><span className="text-slate-400">Customer Name:</span> <strong className="text-slate-800">{customer.fullName}</strong></div>
              <div><span className="text-slate-400">Customer ID:</span> <strong className="text-slate-800 font-mono">{customer.customerNumber}</strong></div>
              <div><span className="text-slate-400">Timestamp:</span> {new Date(selectedReceipt.generatedAt).toLocaleString('en-IN')}</div>
              <div><span className="text-slate-400">Payment Channel:</span> {selectedReceipt.paymentMode || 'Cash'}</div>
              <div><span className="text-slate-400">Security Clearance:</span> <Tag color="green" className="font-bold">VERIFIED</Tag></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
