'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Row,
  Col,
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
  Tooltip,
  Progress,
  Drawer,
  Menu,
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
  CheckCircleFilled,
  ClockCircleOutlined,
  KeyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CopyOutlined,
  CheckOutlined,
  CreditCardOutlined,
  ArrowRightOutlined,
  MenuOutlined,
  DashboardOutlined,
  DollarCircleOutlined,
  AuditOutlined,
  SettingOutlined,
  BranchesOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { FinancialEngine } from '@/shared/financial-engine';
import { fetchApi, postApi } from '@/lib/api-client';

export default function CustomerPortalPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'rd' | 'fd' | 'loans' | 'receipts' | 'support' | 'profile'>('overview');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
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
  const INACTIVITY_TIMEOUT = 300; // 5 minutes inactivity timeout
  const [sessionTime, setSessionTime] = useState(INACTIVITY_TIMEOUT);
  const [searchTxn, setSearchTxn] = useState('');
  const [filterTxnType, setFilterTxnType] = useState('ALL');

  const [complaintForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const router = useRouter();

  const handleLogout = useCallback((reason?: string | React.MouseEvent) => {
    localStorage.removeItem('sfms_customer_token');
    localStorage.removeItem('sfms_customer');
    if (typeof reason === 'string' && reason) {
      message.warning(reason);
    } else {
      message.success('Secure session ended. Signed out successfully.');
    }
    router.replace('/portal/login');
  }, [router]);

  const loadCustomerData = useCallback(async () => {
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
  }, [router]);

  useEffect(() => {
    loadCustomerData();
  }, [loadCustomerData]);

  // 5-Minute Inactivity Auto-Timeout with Mouse & Keyboard Activity Detection
  useEffect(() => {
    let lastActivityTime = Date.now();

    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle resetting state to at most once per second
      if (now - lastActivityTime >= 1000) {
        lastActivityTime = now;
        setSessionTime(INACTIVITY_TIMEOUT);
      }
    };

    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'wheel',
    ];

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    const timer = setInterval(() => {
      setSessionTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleLogout('NetBanking session timed out due to 5 minutes of inactivity for your protection.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
    };
  }, [handleLogout]);

  // OTP Resend Cooldown for Change PIN
  useEffect(() => {
    if (changePassCooldown <= 0) return;
    const timer = setInterval(() => {
      setChangePassCooldown((p) => p - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [changePassCooldown]);

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
        message.success(res.message || 'Security PIN updated successfully!');
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

  // Filter passbook transactions
  const filteredPassbook = passbook.filter((tx: any) => {
    const matchesSearch =
      !searchTxn ||
      (tx.transactionNumber && tx.transactionNumber.toLowerCase().includes(searchTxn.toLowerCase())) ||
      (tx.remarks && tx.remarks.toLowerCase().includes(searchTxn.toLowerCase())) ||
      (tx.paymentMode && tx.paymentMode.toLowerCase().includes(searchTxn.toLowerCase()));

    if (filterTxnType === 'ALL') return matchesSearch;
    const isCredit = tx.transactionType?.includes('DEPOSIT') || tx.transactionType?.includes('RECOVERY') || tx.transactionType?.includes('REPAYMENT');
    if (filterTxnType === 'CREDIT') return matchesSearch && isCredit;
    return matchesSearch;
  });

  type BankingTabKey = 'overview' | 'rd' | 'fd' | 'loans' | 'receipts' | 'support' | 'profile';

  interface BankingTabItem {
    key: BankingTabKey;
    icon: React.ReactNode;
    label: string;
    badge?: number;
  }

  const portalMenuItems: BankingTabItem[] = [
    { key: 'overview', icon: <DashboardOutlined style={{ fontSize: 18 }} />, label: 'Passbook & Statement', badge: passbook.length },
    { key: 'rd', icon: <BankOutlined style={{ fontSize: 18 }} />, label: 'Deposits & RD Accounts', badge: accounts.rd.length },
    { key: 'fd', icon: <SafetyCertificateOutlined style={{ fontSize: 18 }} />, label: 'Fixed Term Deposits (FD)', badge: accounts.fd.length },
    { key: 'loans', icon: <DollarCircleOutlined style={{ fontSize: 18 }} />, label: 'Loans & EMI Engine', badge: loans.length },
    { key: 'receipts', icon: <AuditOutlined style={{ fontSize: 18 }} />, label: 'Collections & Receipts', badge: receipts.length },
    { key: 'support', icon: <CustomerServiceOutlined style={{ fontSize: 18 }} />, label: 'Customer Helpdesk', badge: complaints.length },
    { key: 'profile', icon: <UserOutlined style={{ fontSize: 18 }} />, label: 'My Account & Details', badge: undefined },
  ];

  const currentTabInfo = portalMenuItems.find((t) => t.key === activeTab) || portalMenuItems[0];

  const renderSidebar = (isMobile = false) => (
    <div className="flex flex-col h-full bg-[#0f172a] text-slate-300">
      {/* Brand Header */}
      <div className="p-4 flex items-center gap-3 border-b border-slate-800 sticky top-0 bg-[#0f172a] z-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-950/50 shrink-0">
          S
        </div>
        <div className="overflow-hidden">
          <div className="text-white font-bold text-base tracking-wide leading-tight truncate">
            SANJEEVANI
          </div>
          <div className="text-emerald-400 text-xs font-semibold tracking-wider uppercase">
            MEMBER PORTAL
          </div>
        </div>
      </div>

      {/* Active Branch Indicator (Clean & Compact) */}
      <div className="mx-3 my-2.5 p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 shadow-sm shrink-0">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
          <BranchesOutlined />
          <span>ACTIVE BRANCH</span>
        </div>
        <div className="text-xs font-bold text-slate-100 mt-0.5 truncate">
          {customer.branchName || 'Head Office - Main Branch'}
        </div>
      </div>

      {/* Nav Menu Items */}
      <div className="flex-1 overflow-y-auto px-1 py-1.5">
        <Menu
          theme="dark"
          selectedKeys={[activeTab]}
          mode="inline"
          items={portalMenuItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: (
              <div className="flex items-center justify-between w-full pr-1">
                <span className="truncate">{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 ? (
                  <span
                    className={`ml-2 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/30 inline-flex items-center justify-center font-bold leading-none shrink-0 shadow-sm ${
                      item.badge < 10
                        ? 'w-5 h-5 min-w-[20px] max-h-5 text-[11px]'
                        : 'min-w-[20px] h-5 px-1.5 text-[10px]'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </div>
            ),
          }))}
          onClick={({ key }) => {
            setActiveTab(key as BankingTabKey);
            if (isMobile) setMobileDrawerOpen(false);
          }}
          style={{
            background: 'transparent',
            borderRight: 0,
            fontSize: '13px',
            fontWeight: 500,
          }}
        />
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-800 bg-[#0b1424] space-y-2 shrink-0">
        <div className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700/50 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[11px]">Auto-Lock (5 min idle)</span>
            <span className={`font-mono font-bold text-[11px] ${sessionTime < 60 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
              {formatSessionTime(sessionTime)}
            </span>
          </div>
          <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div
              className={`h-full transition-all duration-1000 ${sessionTime < 60 ? 'bg-rose-500' : 'bg-emerald-400'}`}
              style={{ width: `${Math.min(100, (sessionTime / INACTIVITY_TIMEOUT) * 100)}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
            <SafetyCertificateFilled className="text-emerald-400" />
            <span>Resets on mouse & key activity</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setLogoutModal(true)}
          className="w-full py-2 px-3 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 hover:text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <LogoutOutlined />
          <span>Logout Session</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0F4F8] text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
      {/* 1. FIXED FULL-HEIGHT DESKTOP SIDEBAR */}
      <aside className="hidden lg:block fixed left-0 top-0 bottom-0 w-[260px] h-screen z-50 bg-[#0f172a] border-r border-slate-800 shadow-2xl overflow-y-auto">
        {renderSidebar(false)}
      </aside>

      {/* 2. MOBILE SLIDE-OVER DRAWER */}
      <Drawer
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        placement="left"
        width={260}
        styles={{
          header: { display: 'none' },
          body: { padding: 0, background: '#0f172a' },
        }}
      >
        {renderSidebar(true)}
      </Drawer>

      {/* 3. MAIN APP LAYOUT (OFFSET BY 260px ON DESKTOP) */}
      <div className="lg:ml-[260px] min-h-screen flex flex-col transition-all">
        {/* TOP INSTITUTIONAL BANKING HEADER */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 shadow-sm flex items-center justify-between">
          {/* Left: Mobile hamburger & Active Section Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center border border-slate-300 cursor-pointer transition-all"
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <MenuOutlined className="text-base text-emerald-700" />
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Sanjeevani NetBanking</span>
                <span>•</span>
                <span className="text-emerald-700 font-extrabold">{currentTabInfo.label}</span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 m-0 tracking-tight leading-none mt-0.5">
                {currentTabInfo.label}
              </h1>
            </div>
          </div>

          {/* Right: Inactivity Timer, Balance Privacy, Security PIN, Helpdesk & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live 5-Minute Inactivity Auto-Lock Badge */}
            <div
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                sessionTime < 60
                  ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              }`}
              title="NetBanking session automatically locks after 5 minutes of inactivity for your protection. Resets on mouse movement or typing."
            >
              <ClockCircleOutlined className={sessionTime < 60 ? 'text-rose-600 font-bold' : 'text-emerald-600'} />
              <span className="hidden sm:inline font-medium text-slate-600">Idle Lock:</span>
              <span className="font-mono font-extrabold">{formatSessionTime(sessionTime)}</span>
            </div>

            {/* Balance Mask/Reveal Toggle Button */}
            <button
              type="button"
              onClick={() => setHideBalances(!hideBalances)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl px-3 py-2 border border-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
              title={hideBalances ? 'Show Balances' : 'Hide Balances (Privacy Mode)'}
            >
              {hideBalances ? <EyeInvisibleOutlined className="text-amber-600 text-sm" /> : <EyeOutlined className="text-emerald-600 text-sm" />}
              <span className="hidden sm:inline font-semibold">
                {hideBalances ? 'Show Balances' : 'Hide Balances'}
              </span>
            </button>

            {/* Change Security PIN Button */}
            <button
              type="button"
              onClick={() => setPasswordModal(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl px-3 py-2 border border-slate-300 hidden sm:flex items-center gap-1.5 transition-all cursor-pointer"
              title="Update Security PIN"
            >
              <LockOutlined className="text-emerald-700 text-sm" />
              <span className="font-semibold">Security PIN</span>
            </button>

            {/* Helpdesk Button */}
            <button
              type="button"
              onClick={() => setComplaintModal(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl px-3 py-2 border border-slate-300 hidden md:flex items-center gap-1.5 transition-all cursor-pointer"
              title="Customer Grievance & Helpdesk"
            >
              <CustomerServiceOutlined className="text-teal-700 text-sm" />
              <span className="font-semibold">Helpdesk</span>
            </button>

            {/* Red Logout Button */}
            <button
              type="button"
              onClick={() => setLogoutModal(true)}
              className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs sm:text-sm rounded-xl px-3.5 py-2 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <LogoutOutlined className="text-white text-base" />
              <span className="text-white tracking-wide">Logout</span>
            </button>
          </div>
        </header>

        {/* 4. MAIN DASHBOARD CONTENT */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-5 space-y-5">
          {/* CUSTOMER GREETING & NET-WORTH HERO CARD */}
          <div className="bg-gradient-to-br from-[#0c2340] via-[#103058] to-[#0c2442] rounded-3xl p-5 sm:p-7 text-white shadow-xl shadow-slate-950/10 relative overflow-hidden border border-slate-700/60">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              {/* Left: Member Identity & Details */}
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black text-2xl sm:text-3xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20 ring-4 ring-white/10">
                  {customer.firstName ? customer.firstName[0].toUpperCase() : 'M'}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-white m-0 tracking-tight">
                      Namaste, {customer.fullName}
                    </h2>
                    <span className="bg-emerald-500 text-slate-950 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <CheckCircleFilled /> Verified Member
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-slate-200 flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 font-medium">
                    <span className="text-emerald-300 font-bold">📱 +91 {customer.mobile}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-white font-semibold">📍 {customer.city || customer.branchName || 'Main Branch'}</span>
                    <span className="text-slate-400">•</span>
                    <span className="bg-emerald-950/70 border border-emerald-400/40 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded">
                      CID: {customer.customerNumber}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Net Worth Portfolio Box */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 flex items-center justify-between sm:justify-end gap-6 shrink-0 min-w-[300px]">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                    <WalletOutlined className="text-emerald-400" /> Total Portfolio Value
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
                    {maskAmount(totalAssets)}
                  </div>
                  <div className="text-xs text-emerald-300 font-semibold mt-1 flex items-center gap-1">
                    <span>Savings + RD + Fixed Deposits</span>
                  </div>
                </div>

                <div className="text-right border-l border-white/15 pl-5">
                  <div className="text-[11px] uppercase font-bold text-slate-300">KYC Status</div>
                  <div className="text-sm font-black text-emerald-400 mt-1 flex items-center justify-end gap-1">
                    <SafetyCertificateFilled /> {customer.kycStatus || 'VERIFIED'}
                  </div>
                  <div className="text-xs text-slate-300 mt-1">Member since {customer.joiningDate || '2026'}</div>
                </div>
              </div>
            </div>
          </div>

        {/* UPCOMING LOAN EMI ALERT BANNER */}
        {summary.nextEmiAmount > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center text-2xl shrink-0">
                <ClockCircleOutlined />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Upcoming Loan EMI Due: {maskAmount(summary.nextEmiAmount)}
                  </span>
                  <Tag color="volcano" className="font-extrabold text-[10px] uppercase">
                    Payment Scheduled
                  </Tag>
                </div>
                <div className="text-xs text-slate-700 font-medium mt-0.5">
                  Due on or before <strong className="text-slate-950">{summary.nextDueDate || 'Upcoming cycle'}</strong>. Pay via your authorized field agent or at your nearest Sanjeevani branch.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('loans')}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs h-9 px-4 shrink-0 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <span>View Loan Schedule</span>
              <ArrowRightOutlined />
            </button>
          </div>
        )}

        {/* 4 PRIMARY BANK PORTFOLIO SUMMARY METRIC CARDS */}
        <Row gutter={[16, 16]}>
          {/* 1. Savings */}
          <Col xs={24} sm={12} lg={6}>
            <div
              onClick={() => setActiveTab('overview')}
              className="bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-emerald-500 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Savings Account</span>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                  <WalletOutlined />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                {maskAmount(summary.totalSavings)}
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-semibold">
                <span>{accounts.savings.length} Active Account</span>
                <span className="text-emerald-700 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  Passbook <ArrowRightOutlined className="text-[10px]" />
                </span>
              </div>
            </div>
          </Col>

          {/* 2. Recurring Deposits */}
          <Col xs={24} sm={12} lg={6}>
            <div
              onClick={() => setActiveTab('rd')}
              className="bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-teal-500 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Recurring Deposits</span>
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                  <CalendarOutlined />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                {maskAmount(summary.totalRdDeposited)}
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-semibold">
                <span>{accounts.rd.length} Active RD Plan(s)</span>
                <span className="text-teal-700 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  Details <ArrowRightOutlined className="text-[10px]" />
                </span>
              </div>
            </div>
          </Col>

          {/* 3. Fixed Deposits */}
          <Col xs={24} sm={12} lg={6}>
            <div
              onClick={() => setActiveTab('fd')}
              className="bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-indigo-500 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Fixed Deposits</span>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                  <BankOutlined />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                {maskAmount(summary.totalFdPrincipal)}
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-semibold">
                <span>{accounts.fd.length} Certificate(s)</span>
                <span className="text-indigo-700 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  View FD <ArrowRightOutlined className="text-[10px]" />
                </span>
              </div>
            </div>
          </Col>

          {/* 4. Active Loans */}
          <Col xs={24} sm={12} lg={6}>
            <div
              onClick={() => setActiveTab('loans')}
              className="bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-amber-500 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Loan Outstanding</span>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                  <CreditCardOutlined />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                {maskAmount(summary.totalLoanOutstanding)}
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-semibold">
                <span>{loans.length} Active Loan(s)</span>
                <span className="text-amber-700 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  Repayments <ArrowRightOutlined className="text-[10px]" />
                </span>
              </div>
            </div>
          </Col>
        </Row>

        {/* 5. TABBED CONTENT CONTAINER - CLEAN & CLEAR */}
        <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm p-4 sm:p-6 overflow-hidden">
          {/* TAB 1: PASSBOOK & STATEMENT */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 m-0 flex items-center gap-2">
                    <FileTextOutlined className="text-emerald-700" />
                    <span>Digital Passbook & Transaction Ledger</span>
                  </h3>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">Real-time ledger entries credited or debited to your member account.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search particulars, reference #, mode..."
                    value={searchTxn}
                    onChange={(e) => setSearchTxn(e.target.value)}
                    allowClear
                    className="rounded-xl w-60 text-xs"
                  />
                  <Select
                    value={filterTxnType}
                    onChange={setFilterTxnType}
                    className="w-32 rounded-xl text-xs"
                  >
                    <Select.Option value="ALL">All Entries</Select.Option>
                    <Select.Option value="CREDIT">+ Credits</Select.Option>
                    <Select.Option value="DEBIT">- Debits</Select.Option>
                  </Select>
                  <Button
                    icon={<PrinterOutlined />}
                    onClick={() => window.print()}
                    className="rounded-xl text-xs font-bold"
                  >
                    Print
                  </Button>
                </div>
              </div>

              <Table
                dataSource={filteredPassbook}
                rowKey="id"
                size="middle"
                pagination={{ pageSize: 8, showSizeChanger: false }}
                columns={[
                  {
                    title: 'Date & Time',
                    dataIndex: 'transactionDate',
                    key: 'dt',
                    width: 160,
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
                    title: 'Particulars & Remarks',
                    dataIndex: 'remarks',
                    key: 'rem',
                    render: (t: any, r: any) => (
                      <div>
                        <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                          {r.transactionType ? r.transactionType.replace(/_/g, ' ') : 'Account Activity'}
                        </div>
                        <div className="text-slate-600 text-xs mt-0.5">
                          Mode: <strong className="text-slate-800 font-semibold">{r.paymentMode || 'Cash'}</strong> {t ? `• ${t}` : ''}
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: 'Type',
                    dataIndex: 'transactionType',
                    key: 'tp',
                    width: 110,
                    render: (t) => {
                      const isCredit = t?.includes('DEPOSIT') || t?.includes('RECOVERY') || t?.includes('REPAYMENT');
                      return (
                        <Tag
                          color={isCredit ? 'green' : 'volcano'}
                          className="font-black text-xs px-2.5 py-0.5 rounded-full border-none"
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
                    width: 150,
                    render: (a, r) => {
                      const isCredit = r.transactionType?.includes('DEPOSIT') || r.transactionType?.includes('RECOVERY') || r.transactionType?.includes('REPAYMENT');
                      return (
                        <div className={`font-black text-sm sm:text-base ${isCredit ? 'text-emerald-700' : 'text-slate-900'}`}>
                          {isCredit ? '+' : '-'}{maskAmount(a || 0)}
                        </div>
                      );
                    },
                  },
                ]}
              />
            </div>
          )}

          {/* TAB 2: RECURRING DEPOSITS */}
          {activeTab === 'rd' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 m-0">Recurring Deposit (RD) Portfolios</h3>
                <Tag color="green" className="font-bold text-xs">{accounts.rd.length} Active Accounts</Tag>
              </div>

              {accounts.rd.length === 0 ? (
                <Empty description="No active Recurring Deposit accounts registered." />
              ) : (
                accounts.rd.map((rd: any) => (
                  <div key={rd.id} className="bg-gradient-to-br from-slate-50 to-slate-100/70 rounded-2xl border-2 border-slate-200 p-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-emerald-800 text-lg">{rd.accountNumber}</span>
                          <Tooltip title="Copy Account Number">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(rd.accountNumber, rd.id)}
                              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                              {copiedAccount === rd.id ? <CheckOutlined className="text-emerald-600" /> : <CopyOutlined />}
                            </button>
                          </Tooltip>
                          <Tag color="success" className="font-bold text-[10px] uppercase">
                            {rd.status || 'ACTIVE'}
                          </Tag>
                        </div>
                        <div className="text-xs text-slate-600 font-medium mt-1">
                          Sanjeevani Monthly Sanchay RD Scheme • Authorized Member Deposit
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Accumulated RD Balance</div>
                        <div className="text-2xl font-black text-emerald-700 mt-0.5">
                          {maskAmount(rd.currentBalance || 0)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                        <div className="text-slate-500 font-medium">Monthly Installment</div>
                        <div className="font-black text-slate-900 text-sm mt-0.5">
                          {maskAmount(rd.monthlyDeposit || 1000)}
                        </div>
                      </div>
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                        <div className="text-slate-500 font-medium">Annual Return Rate</div>
                        <div className="font-black text-indigo-700 text-sm mt-0.5">
                          {rd.interestRate || 8.5}% p.a.
                        </div>
                      </div>
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                        <div className="text-slate-500 font-medium">Account Opened On</div>
                        <div className="font-bold text-slate-900 text-sm mt-0.5">
                          {rd.openingDate || 'Active'}
                        </div>
                      </div>
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                        <div className="text-slate-500 font-medium">Account Status</div>
                        <div className="font-bold text-emerald-700 text-sm mt-0.5 flex items-center gap-1">
                          <CheckCircleFilled /> Regular Cycle
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: FIXED DEPOSITS */}
          {activeTab === 'fd' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 m-0">Term / Fixed Deposit Certificates</h3>
                <Tag color="blue" className="font-bold text-xs">{accounts.fd.length} Certificates</Tag>
              </div>

              {accounts.fd.length === 0 ? (
                <Empty description="No active Fixed Deposit certificates registered." />
              ) : (
                accounts.fd.map((fd: any) => (
                  <div key={fd.id} className="bg-gradient-to-br from-indigo-50/50 via-white to-indigo-50/20 rounded-2xl border-2 border-indigo-200 p-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-indigo-900 text-lg">{fd.accountNumber}</span>
                          <Tooltip title="Copy Certificate #">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(fd.accountNumber, fd.id)}
                              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                              {copiedAccount === fd.id ? <CheckOutlined className="text-emerald-600" /> : <CopyOutlined />}
                            </button>
                          </Tooltip>
                          <Tag color="blue" className="font-black text-[10px] uppercase">
                            TERM DEPOSIT CERTIFICATE
                          </Tag>
                        </div>
                        <div className="text-xs text-slate-600 font-medium mt-1">
                          Guaranteed Return Term Deposit Certificate
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Principal Certificate Value</div>
                        <div className="text-2xl font-black text-indigo-900 mt-0.5">
                          {maskAmount(fd.principalAmount || 0)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
                      <div className="bg-white p-3.5 rounded-xl border border-indigo-100">
                        <div className="text-slate-500 font-medium">Guaranteed Return Rate</div>
                        <div className="font-black text-indigo-700 text-sm mt-0.5">
                          {fd.interestRate || 9.0}% p.a.
                        </div>
                      </div>
                      <div className="bg-white p-3.5 rounded-xl border border-indigo-100">
                        <div className="text-slate-500 font-medium">Tenure Duration</div>
                        <div className="font-black text-slate-900 text-sm mt-0.5">
                          {fd.tenureMonths || 12} Months
                        </div>
                      </div>
                      <div className="bg-white p-3.5 rounded-xl border border-indigo-100">
                        <div className="text-slate-500 font-medium">Maturity Date</div>
                        <div className="font-black text-emerald-800 text-sm mt-0.5">
                          {fd.maturityDate || '-'}
                        </div>
                      </div>
                      <div className="bg-white p-3.5 rounded-xl border border-indigo-100">
                        <div className="text-slate-500 font-medium">Maturity Value at Payout</div>
                        <div className="font-black text-emerald-700 text-sm mt-0.5">
                          {maskAmount(fd.maturityAmount || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: LOANS */}
          {activeTab === 'loans' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 m-0">My Loan Facilities & EMI Timeline</h3>
                <Tag color="orange" className="font-bold text-xs">{loans.length} Active Loans</Tag>
              </div>

              {loans.length === 0 ? (
                <Empty description="No active loan facilities registered under your customer ID." />
              ) : (
                loans.map((loan: any) => {
                  const paidPct = loan.principal && loan.principal > 0
                    ? Math.round(((loan.principal - (loan.outstandingPrincipal || 0)) / loan.principal) * 100)
                    : 0;

                  return (
                    <div key={loan.id} className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border-2 border-slate-200 p-5 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-amber-800 text-lg">{loan.loanNumber}</span>
                            <Tag color={loan.daysPastDue > 0 ? 'volcano' : 'green'} className="font-bold text-[10px]">
                              {loan.daysPastDue > 0 ? `${loan.daysPastDue} DPD OVERDUE` : 'REGULAR / GREEN'}
                            </Tag>
                          </div>
                          <div className="text-xs text-slate-600 font-medium mt-1">
                            Sanctioned Credit Facility • Monthly Amortization
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Outstanding Principal</div>
                          <div className="text-2xl font-black text-amber-700 mt-0.5">
                            {maskAmount(loan.outstandingPrincipal || 0)}
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-slate-600 font-semibold mb-1.5">
                          <span>Principal Repayment Progress</span>
                          <span className="font-extrabold text-slate-900">{paidPct}% Repaid</span>
                        </div>
                        <Progress
                          percent={paidPct}
                          strokeColor="#059669"
                          trailColor="#e2e8f0"
                          showInfo={false}
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                          <div className="text-slate-500 font-medium">Sanctioned Principal</div>
                          <div className="font-black text-slate-900 text-sm mt-0.5">
                            {maskAmount(loan.principal || 0)}
                          </div>
                        </div>
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                          <div className="text-slate-500 font-medium">Monthly EMI Due</div>
                          <div className="font-black text-slate-900 text-sm mt-0.5">
                            {maskAmount(loan.emiAmount || 0)}
                          </div>
                        </div>
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                          <div className="text-slate-500 font-medium">Annual Interest Rate</div>
                          <div className="font-black text-slate-800 text-sm mt-0.5">
                            {loan.annualInterestRate || 12}% p.a.
                          </div>
                        </div>
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                          <div className="text-slate-500 font-medium">Disbursal Date</div>
                          <div className="font-bold text-slate-800 text-sm mt-0.5">
                            {loan.disbursementDate || 'Active'}
                          </div>
                        </div>
                      </div>

                      {/* Installments Table */}
                      {loan.installments && loan.installments.length > 0 && (
                        <div className="mt-5 pt-4 border-t border-slate-200">
                          <div className="text-xs font-extrabold text-slate-800 mb-2">EMI Installment Schedule</div>
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
                                  <Tag color={st === 'PAID' ? 'green' : st === 'OVERDUE' ? 'red' : 'orange'} className="font-bold">
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
          )}

          {/* TAB 5: OFFICIAL RECEIPTS */}
          {activeTab === 'receipts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 m-0">Official Digital NetBanking Receipts</h3>
                <Tag color="green" className="font-bold text-xs">{receipts.length} Verified Receipts</Tag>
              </div>

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
                    render: (n) => <span className="font-mono font-black text-emerald-800 text-xs sm:text-sm">{n}</span>,
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
                    render: (a) => <span className="font-black text-slate-900 text-sm sm:text-base">{maskAmount(a || 0)}</span>,
                  },
                  {
                    title: 'Digital Copy',
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
                        className="rounded-lg text-xs font-bold"
                      >
                        View Receipt
                      </Button>
                    ),
                  },
                ]}
              />
            </div>
          )}

          {/* TAB 6: SUPPORT & HELPDESK */}
          {activeTab === 'support' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <h4 className="font-extrabold text-slate-900 m-0 text-base">Customer Support & Grievance Tickets</h4>
                  <p className="text-xs text-slate-600 m-0 mt-0.5">Submit your queries or report account discrepancies directly to branch managers.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setComplaintModal(true)}
                  className="bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-xs h-9 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <CustomerServiceOutlined />
                  <span>+ File Support Ticket</span>
                </button>
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
                    title: 'Status',
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
          )}

          {/* TAB 7: COMPLETE USER ACCOUNT & DATABASE DOSSIER */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Hero Member Profile Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#0f172a] text-white p-6 rounded-2xl border border-slate-700 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-400 text-2xl font-black text-white flex items-center justify-center ring-4 ring-emerald-500/20 shadow-lg">
                      {customer.firstName?.[0] || 'M'}
                      {customer.lastName?.[0] || ''}
                    </div>
                    <span
                      className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full ring-2 ring-slate-900 flex items-center justify-center text-[10px] text-white font-bold"
                      title="KYC Verified"
                    >
                      ✓
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-black text-white m-0 tracking-wide">
                        {customer.fullName || `${customer.firstName || 'Member'} ${customer.lastName || ''}`}
                      </h3>
                      <Tag color="success" className="font-extrabold text-[10px] m-0 px-2 py-0.5 rounded-full border-none">
                        {customer.kycStatus === 'VERIFIED' ? 'KYC VERIFIED' : customer.kycStatus || 'ACTIVE'}
                      </Tag>
                      <Tag color="blue" className="font-extrabold text-[10px] m-0 px-2 py-0.5 rounded-full border-none">
                        {customer.status || 'ACTIVE MEMBER'}
                      </Tag>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs font-mono text-slate-400">
                        Customer ID: <strong className="text-emerald-400">{customer.customerNumber}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(customer.customerNumber || '', 'profile_cif')}
                        className="text-slate-400 hover:text-emerald-400 text-xs cursor-pointer flex items-center gap-1 transition-colors"
                        title="Copy Customer ID"
                      >
                        {copiedAccount === 'profile_cif' ? <CheckOutlined className="text-emerald-400" /> : <CopyOutlined />}
                        <span>{copiedAccount === 'profile_cif' ? 'Copied' : 'Copy'}</span>
                      </button>
                      <span className="text-slate-600">•</span>
                      <span className="text-xs text-slate-300">
                        Member Since: <strong>{customer.joiningDate || '2026-01-01'}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-stretch md:self-auto flex-wrap">
                  <button
                    type="button"
                    onClick={() => setPasswordModal(true)}
                    className="flex-1 md:flex-initial bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <KeyOutlined />
                    <span>Change PIN</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 md:flex-initial bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-xs px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <PrinterOutlined />
                    <span>Print Dossier</span>
                  </button>
                </div>
              </div>

              {/* Grid of All User Information from Database */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Personal & Identity Records */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-2.5">
                    <UserOutlined className="text-emerald-600 text-base" />
                    <span>Personal & Demographic Information</span>
                  </div>
                  <Descriptions bordered column={1} size="small" className="bg-slate-50/50 rounded-xl overflow-hidden">
                    <Descriptions.Item label="Full Legal Name">
                      <strong className="text-slate-900">{customer.fullName}</strong>
                    </Descriptions.Item>
                    <Descriptions.Item label="Customer / CIF Number">
                      <span className="font-mono font-bold text-emerald-800">{customer.customerNumber}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="Database Record UUID">
                      <span className="font-mono text-xs text-slate-500">{customer.id}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="Father's / Husband's Name">
                      <span className="text-slate-700 font-medium">{customer.fatherOrSpouseName || 'Not Specified'}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="Date of Birth">
                      <span className="font-mono text-slate-700">{customer.dateOfBirth || '1990-01-01'}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="Gender">
                      <span className="font-semibold text-slate-800">{customer.gender || 'MALE'}</span>
                    </Descriptions.Item>
                  </Descriptions>
                </div>

                {/* 2. Contact & Residential Coordinates */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-2.5">
                    <PhoneOutlined className="text-teal-600 text-base" />
                    <span>Contact & Residential Coordinates</span>
                  </div>
                  <Descriptions bordered column={1} size="small" className="bg-slate-50/50 rounded-xl overflow-hidden">
                    <Descriptions.Item label="Registered Mobile">
                      <span className="font-mono font-bold text-slate-900">+91 {customer.mobile}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="Alternate Mobile">
                      <span className="font-mono text-slate-600">{customer.alternateMobile ? `+91 ${customer.alternateMobile}` : 'None Registered'}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="Registered Email ID">
                      <span className="text-slate-700">{customer.email || 'None Registered'}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="Residential Address Line 1">
                      <span className="text-slate-800">{customer.address || 'Address not specified'}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="Residential Address Line 2">
                      <span className="text-slate-600">{customer.addressLine2 || '-'}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="City & State">
                      <span className="font-semibold text-slate-800">{customer.city || 'Agra'}, {customer.state || 'Uttar Pradesh'}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="Postal PIN Code">
                      <span className="font-mono font-bold text-slate-800">{customer.postalCode || '282001'}</span>
                    </Descriptions.Item>
                  </Descriptions>
                </div>

                {/* 3. Official Government KYC & Compliance Records */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-2.5">
                    <SafetyCertificateOutlined className="text-blue-600 text-base" />
                    <span>Government KYC & Identification Records</span>
                  </div>
                  <Descriptions bordered column={1} size="small" className="bg-slate-50/50 rounded-xl overflow-hidden">
                    <Descriptions.Item label="Aadhaar Card Number">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{customer.aadhaar || '•••• •••• 1234'}</span>
                        <Tag color="green" className="text-[10px] font-bold">VERIFIED</Tag>
                      </div>
                    </Descriptions.Item>
                    <Descriptions.Item label="PAN Card Number">
                      <span className="font-mono font-bold text-slate-900">{customer.pan || 'ABCDE1234F'}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="KYC Document Status">
                      <Tag color="success" className="font-black text-xs px-2.5 py-0.5 rounded-md">
                        {customer.kycStatus || 'VERIFIED'}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="NetBanking Clearance Level">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Tier-3 Full NetBanking Clearance
                      </span>
                    </Descriptions.Item>
                  </Descriptions>
                </div>

                {/* 4. Branch Membership & System Registration */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-2.5">
                    <BranchesOutlined className="text-purple-600 text-base" />
                    <span>Branch Membership & System Details</span>
                  </div>
                  <Descriptions bordered column={1} size="small" className="bg-slate-50/50 rounded-xl overflow-hidden">
                    <Descriptions.Item label="Assigned Home Branch">
                      <strong className="text-slate-900">{customer.branchName || 'Head Office - Main Branch'}</strong>
                    </Descriptions.Item>
                    <Descriptions.Item label="Branch Code">
                      <span className="font-mono font-bold text-purple-800">{customer.branchCode || 'SJF-BR001'}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="Branch System ID">
                      <span className="font-mono text-xs text-slate-500">{customer.branchId || 'BR-001'}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="Membership Enrolment Date">
                      <span className="font-mono text-slate-800 font-semibold">{customer.joiningDate || '2026-01-01'}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="Database Registration Date">
                      <span className="font-mono text-xs text-slate-600">
                        {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-IN') : '2026-01-01'}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="Membership Account Status">
                      <Tag color="cyan" className="font-bold text-xs">
                        {customer.status || 'ACTIVE'}
                      </Tag>
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              </div>

              {/* 5. Linked Financial Portfolio Summary from Database */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <WalletOutlined className="text-emerald-600 text-base" />
                    <span>Live Linked Financial Portfolio in Database</span>
                  </div>
                  <Tag color="purple" className="font-mono text-xs">
                    {summary.activeAccountsCount || accounts.savings.length + accounts.rd.length + accounts.fd.length} Accounts • {summary.activeLoansCount || loans.length} Loans
                  </Tag>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[11px] text-slate-500 font-medium">Total Assets</div>
                    <div className="text-base font-black text-emerald-700 font-mono mt-0.5">{maskAmount(totalAssets)}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[11px] text-slate-500 font-medium">Savings Balance</div>
                    <div className="text-base font-bold text-slate-800 font-mono mt-0.5">{maskAmount(summary.totalSavings || 0)}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[11px] text-slate-500 font-medium">RD Deposits</div>
                    <div className="text-base font-bold text-slate-800 font-mono mt-0.5">{maskAmount(summary.totalRdDeposited || 0)}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[11px] text-slate-500 font-medium">FD Principal</div>
                    <div className="text-base font-bold text-slate-800 font-mono mt-0.5">{maskAmount(summary.totalFdPrincipal || 0)}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[11px] text-slate-500 font-medium">Loan Debt Outstanding</div>
                    <div className="text-base font-bold text-rose-700 font-mono mt-0.5">{maskAmount(summary.totalLoanOutstanding || 0)}</div>
                  </div>
                </div>
              </div>

              {/* 6. Registered Nominees Information */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <AuditOutlined className="text-amber-600 text-base" />
                    <span>Registered Nominee Records in Database</span>
                  </div>
                  <Tag color="amber" className="text-xs font-semibold">
                    {nominees.length} Nominee(s) Registered
                  </Tag>
                </div>
                {nominees && nominees.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {nominees.map((n: any) => (
                      <div key={n.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">{n.name}</span>
                          <Tag color="green" className="font-bold">{n.percentage}% Share</Tag>
                        </div>
                        <div className="text-slate-600">Relationship: <strong className="text-slate-800">{n.relationship}</strong></div>
                        {n.dateOfBirth && <div className="text-slate-600">Date of Birth: <span className="font-mono">{n.dateOfBirth}</span></div>}
                        {n.mobile && <div className="text-slate-600">Contact Number: <span className="font-mono">+91 {n.mobile}</span></div>}
                        {n.address && <div className="text-slate-600">Address: <span>{n.address}</span></div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No linked nominee records registered yet. Visit your home branch to add nominees.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>

      {/* 5. MODALS */}

      {/* LOGOUT CONFIRMATION MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-rose-700 text-base font-bold">
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
            className="rounded-xl font-bold bg-rose-600 hover:bg-rose-500"
          >
            Confirm Logout
          </Button>,
        ]}
      >
        <p className="text-xs text-slate-600 mt-2">
          Are you sure you want to end your secure NetBanking session for <strong className="text-slate-900">{customer.fullName}</strong> ({customer.customerNumber})?
        </p>
      </Modal>

      {/* FILE COMPLAINT MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-900 font-bold">
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
          <div className="flex items-center gap-2 text-slate-900 font-bold">
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
              <SafetyCertificateFilled />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-base">SMS OTP Verification Required</div>
              <p className="text-xs text-slate-600 mt-1">
                For bank-grade security, an OTP will be dispatched to your registered mobile number <span className="font-semibold text-slate-900">+91 ******{customer?.mobile?.slice(-4) || '****'}</span> before updating your PIN.
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
              <div className="mb-3 p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                <span>OTP Preview: <strong className="font-mono text-sm">{changePassDevOtp}</strong></span>
                <Tag color="orange" className="text-[10px] m-0">Dev Preview</Tag>
              </div>
            )}

            <Form.Item
              name="otp"
              label={<span className="text-xs font-bold text-slate-700">Verification Code (SMS OTP)</span>}
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
              label={<span className="text-xs font-bold text-slate-700">New Security PIN</span>}
              rules={[{ required: true, min: 4, message: 'Must be at least 4 digits' }]}
            >
              <Input.Password prefix={<LockOutlined className="text-emerald-600" />} placeholder="Enter new PIN" className="rounded-xl" />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label={<span className="text-xs font-bold text-slate-700">Confirm Security PIN</span>}
              rules={[{ required: true, message: 'Confirm your new PIN' }]}
            >
              <Input.Password prefix={<CheckOutlined className="text-emerald-600" />} placeholder="Re-enter new PIN" className="rounded-xl" />
            </Form.Item>

            <div className="flex items-center justify-between mb-4 text-xs">
              <span className="text-slate-500">Didn&apos;t receive code?</span>
              <Button
                type="link"
                size="small"
                disabled={changePassCooldown > 0 || changePassLoading}
                onClick={handleSendChangePassOtp}
                className="p-0 text-emerald-700 font-bold"
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
        title={
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <FileTextOutlined className="text-emerald-700" />
            <span>Official NetBanking Receipt Voucher</span>
          </div>
        }
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
              <div><span className="text-slate-400">Timestamp:</span> {selectedReceipt.generatedAt ? new Date(selectedReceipt.generatedAt).toLocaleString('en-IN') : 'Just now'}</div>
              <div><span className="text-slate-400">Payment Channel:</span> {selectedReceipt.paymentMode || 'Cash'}</div>
              <div><span className="text-slate-400">Security Clearance:</span> <Tag color="green" className="font-bold">VERIFIED</Tag></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
