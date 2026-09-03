'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Layout,
  Menu,
  Button,
  Badge,
  Avatar,
  Dropdown,
  Tag,
  Typography,
  Divider,
  Spin,
  message,
} from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  BankOutlined,
  DollarCircleOutlined,
  AuditOutlined,
  SafetyCertificateOutlined,
  BookOutlined,
  PieChartOutlined,
  SettingOutlined,
  BellOutlined,
  BranchesOutlined,
  PlusCircleOutlined,
  LockOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { fetchApi } from '@/lib/api-client';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [redAlerts, setRedAlerts] = useState<any[]>([]);
  const [activeNavKey, setActiveNavKey] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id?: string;
    username?: string;
    employeeName?: string;
    roles?: string[];
    branchName?: string;
  } | null>(null);

  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setActiveNavKey(pathname === '/' ? '/' : `/${pathname.split('/')[1]}`);
    setIsNavigating(false);
  }, [pathname]);

  useEffect(() => {
    // Wait until client has mounted so window/localStorage is available
    if (!mounted) return;

    if (pathname === '/login') {
      setIsAuthChecked(true);
      return;
    }

    const token = localStorage.getItem('sfms_access_token') || localStorage.getItem('sjf_auth_token');
    const stored = localStorage.getItem('sfms_user');

    if (!token || !stored) {
      router.replace('/login');
      return;
    }

    try {
      setCurrentUser(JSON.parse(stored));
    } catch (e) {
      // ignore parse errors - treat as unauthenticated
      router.replace('/login');
      return;
    }
    setIsAuthChecked(true);

    fetchApi('/dashboard/red-alerts').then((res) => {
      if (res.success && res.data) {
        setRedAlerts(res.data);
      }
    }).catch(() => {});
  }, [pathname, router, mounted]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sfms_access_token');
      localStorage.removeItem('sfms_user');
      localStorage.removeItem('sjf_auth_token');
    }
    setCurrentUser(null);
    message.success('Signed out successfully');
    router.replace('/login');
  };

  const siderWidth = collapsed ? 80 : 260;

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (!isAuthChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-emerald-950/80 animate-pulse mb-4">
          S
        </div>
        <div className="font-extrabold text-xl tracking-wider text-white mb-1">SANJEEVANI FINANCE</div>
        <div className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-6">Authenticating Session...</div>
        <Spin size="large" />
      </div>
    );
  }

  const userRole = currentUser?.roles?.[0] || 'SUPER_ADMIN';

  const ROLE_ALLOWED_PAGES: Record<string, string[]> = {
    SUPER_ADMIN: ['/', '/customers', '/accounts', '/loans', '/collections', '/cash', '/accounting', '/daily-closing', '/reports', '/settings'],
    BRANCH_MANAGER: ['/', '/customers', '/accounts', '/loans', '/collections', '/cash', '/accounting', '/daily-closing', '/reports'],
    LOAN_OFFICER: ['/', '/customers', '/loans', '/accounts', '/reports'],
    CASHIER: ['/', '/customers', '/collections', '/cash', '/accounts', '/reports'],
    FIELD_COLLECTOR: ['/', '/customers', '/collections', '/reports'],
    AUDITOR: ['/', '/customers', '/accounting', '/daily-closing', '/reports'],
  };

  const allowedPages = ROLE_ALLOWED_PAGES[userRole] || ROLE_ALLOWED_PAGES.SUPER_ADMIN;

  const dashboardLabel =
    userRole === 'FIELD_COLLECTOR'
      ? 'Collector Route & Dues'
      : userRole === 'CASHIER'
      ? 'Cashier Counter Console'
      : userRole === 'LOAN_OFFICER'
      ? 'Loan Underwriting Hub'
      : userRole === 'AUDITOR'
      ? 'Audit & Compliance Desk'
      : 'Executive MIS Dashboard';

  const allMenuItems = [
    {
      key: '/',
      icon: <DashboardOutlined style={{ fontSize: 18 }} />,
      label: <Link href="/" prefetch={true} className="text-inherit no-underline block w-full">{dashboardLabel}</Link>,
    },
    {
      key: '/customers',
      icon: <UserOutlined style={{ fontSize: 18 }} />,
      label: <Link href="/customers" prefetch={true} className="text-inherit no-underline block w-full">Members & KYC (360°)</Link>,
    },
    {
      key: '/accounts',
      icon: <BankOutlined style={{ fontSize: 18 }} />,
      label: <Link href="/accounts" prefetch={true} className="text-inherit no-underline block w-full">Deposits & RD Accounts</Link>,
    },
    {
      key: '/loans',
      icon: <DollarCircleOutlined style={{ fontSize: 18 }} />,
      label: <Link href="/loans" prefetch={true} className="text-inherit no-underline block w-full">Loans & EMI Engine</Link>,
    },
    {
      key: '/collections',
      icon: <SafetyCertificateOutlined style={{ fontSize: 18 }} />,
      label: <Link href="/collections" prefetch={true} className="text-inherit no-underline block w-full">Collections & Receipts</Link>,
    },
    {
      key: '/cash',
      icon: <AuditOutlined style={{ fontSize: 18 }} />,
      label: <Link href="/cash" prefetch={true} className="text-inherit no-underline block w-full">Cashier Drawer Balancing</Link>,
    },
    {
      key: '/accounting',
      icon: <BookOutlined style={{ fontSize: 18 }} />,
      label: <Link href="/accounting" prefetch={true} className="text-inherit no-underline block w-full">Double-Entry Accounting</Link>,
    },
    {
      key: '/daily-closing',
      icon: <LockOutlined style={{ fontSize: 18 }} />,
      label: <Link href="/daily-closing" prefetch={true} className="text-inherit no-underline block w-full">Daily Closing & Date Lock</Link>,
    },
    {
      key: '/reports',
      icon: <PieChartOutlined style={{ fontSize: 18 }} />,
      label: <Link href="/reports" prefetch={true} className="text-inherit no-underline block w-full">MIS & Financial Reports</Link>,
    },
    {
      key: '/settings',
      icon: <SettingOutlined style={{ fontSize: 18 }} />,
      label: <Link href="/settings" prefetch={true} className="text-inherit no-underline block w-full">Settings & Master Data</Link>,
    },
  ];

  const menuItems = allMenuItems.filter((item) => allowedPages.includes(item.key));

  const alertMenu = {
    items: [
      {
        key: 'header',
        label: (
          <div className="py-1">
            <Text strong className="text-red-600">
              Red Alert Surveillance Feed ({redAlerts.length})
            </Text>
          </div>
        ),
      },
      ...redAlerts.map((a, i) => ({
        key: `alert-${i}`,
        label: (
          <div className="max-w-xs py-1">
            <Tag color={a.severity === 'CRITICAL' ? 'error' : 'warning'}>{a.alertType}</Tag>
            <div className="font-semibold text-xs mt-1 text-slate-800">{a.title}</div>
            <div className="text-xs text-slate-500">{a.description}</div>
          </div>
        ),
      })),
    ],
  };

  const displayName = currentUser?.employeeName || currentUser?.username || 'Staff User';
  const displayRole = currentUser?.roles?.[0] || 'SUPER_ADMIN';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const userProfileMenu = {
    items: [
      {
        key: 'profile',
        label: (
          <div className="py-1">
            <div className="font-bold text-slate-900">{displayName}</div>
            <div className="text-xs text-slate-500">
              {currentUser?.branchName || 'Head Office - Main Branch'}
            </div>
            <Tag color="green" className="mt-1 font-mono text-[10px]">
              {displayRole}
            </Tag>
          </div>
        ),
      },
      { type: 'divider' as const },
      {
        key: 'settings',
        label: 'Security & 2FA Settings',
        onClick: () => router.push('/settings'),
      },
      {
        key: 'logout',
        danger: true,
        icon: <LogoutOutlined />,
        label: 'Sign Out Session',
        onClick: handleLogout,
      },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* 1. FIXED PINNED SIDEBAR */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        width={260}
        collapsedWidth={80}
        theme="dark"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          height: '100vh',
          zIndex: 1000,
          background: '#0f172a',
          borderRight: '1px solid #1e293b',
          overflowY: 'auto',
          overflowX: 'hidden',
          transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
        }}
      >
        {/* Brand Header */}
        <div className="p-4 flex items-center gap-3 border-b border-slate-800 sticky top-0 bg-[#0f172a] z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-950/50 shrink-0">
            S
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="text-white font-bold text-base tracking-wide leading-tight truncate">
                SANJEEVANI
              </div>
              <div className="text-emerald-400 text-xs font-semibold tracking-wider">
                FINANCE OPS
              </div>
            </div>
          )}
        </div>

        {/* Branch Quick Indicator */}
        {!collapsed && (
          <div className="mx-3 my-3 p-2.5 rounded-lg bg-slate-800/90 border border-slate-700/60 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
              <BranchesOutlined />
              <span>ACTIVE BRANCH</span>
            </div>
            <div className="text-xs font-bold text-slate-100 mt-1 truncate">
              {currentUser?.branchName || 'Head Office - Main Branch (SJF-BR001)'}
            </div>
          </div>
        )}

        {/* Nav Items */}
        <div className="pb-16">
          <Menu
            theme="dark"
            selectedKeys={[activeNavKey || (pathname === '/' ? '/' : `/${pathname.split('/')[1]}`)]}
            mode="inline"
            items={menuItems}
            onClick={({ key }) => {
              if (key !== pathname) {
                setActiveNavKey(key);
                setIsNavigating(true);
              }
            }}
            style={{
              background: 'transparent',
              borderRight: 0,
              marginTop: 4,
              fontSize: '13px',
              fontWeight: 500,
            }}
          />
        </div>
      </Sider>

      {/* Top Instant Navigation Loader */}
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 z-[9999] animate-pulse" />
      )}

      {/* 2. MAIN LAYOUT */}
      <Layout
        style={{
          marginLeft: siderWidth,
          minHeight: '100vh',
          background: '#f8fafc',
          transition: 'margin-left 0.2s cubic-bezier(0.2, 0, 0, 1)',
        }}
      >
        {/* STICKY TOP HEADER */}
        <Header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 990,
            background: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(12px)',
            padding: '0 28px',
            borderBottom: '1px solid #e2e8f0',
            height: 68,
            lineHeight: 'normal',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
          }}
        >
          <div className="h-full flex items-center justify-between">
            {/* Left Header Badges */}
            <div className="flex items-center gap-3">
              <div
                style={{
                  background: '#ecfdf5',
                  color: '#065f46',
                  border: '1px solid #a7f3d0',
                  fontWeight: 700,
                  fontSize: '12px',
                  borderRadius: '20px',
                  padding: '5px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  lineHeight: '1.2',
                }}
              >
                <span style={{ color: '#059669', fontSize: '10px' }}>●</span>
                <span>BUSINESS DATE: {mounted ? new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TODAY'}</span>
              </div>

              <div
                style={{
                  background: '#eff6ff',
                  color: '#1e40af',
                  border: '1px solid #bfdbfe',
                  fontWeight: 600,
                  fontSize: '11px',
                  borderRadius: '20px',
                  padding: '5px 12px',
                  lineHeight: '1.2',
                }}
                className="hidden sm:inline-flex items-center"
              >
                DOUBLE-ENTRY VERIFIED
              </div>
            </div>

            {/* Right Header Actions */}
            <div className="flex items-center gap-3">
              {/* Record Payment Button */}
              <Button
                type="primary"
                icon={<PlusCircleOutlined />}
                onClick={() => router.push('/collections')}
                style={{
                  background: '#059669',
                  borderColor: '#059669',
                  fontWeight: 600,
                  fontSize: '13px',
                  height: 38,
                  borderRadius: 8,
                  boxShadow: '0 2px 4px 0 rgba(5, 150, 105, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                Record Payment
              </Button>

              {/* Notification Bell */}
              <Dropdown menu={alertMenu} placement="bottomRight" trigger={['click']}>
                <Badge count={redAlerts.length} offset={[-2, 4]}>
                  <Button
                    shape="circle"
                    icon={<BellOutlined style={{ fontSize: 17, color: '#334155' }} />}
                    style={{
                      border: '1px solid #cbd5e1',
                      width: 38,
                      height: 38,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  />
                </Badge>
              </Dropdown>

              <Divider type="vertical" style={{ height: 28, borderColor: '#cbd5e1' }} />

              {/* User Profile Dropdown */}
              <Dropdown menu={userProfileMenu} placement="bottomRight" trigger={['click']}>
                <div
                  className="flex items-center gap-2.5 cursor-pointer hover:bg-slate-100/80 transition px-2 py-1 rounded-xl border border-transparent hover:border-slate-200"
                  style={{ lineHeight: 'normal' }}
                >
                  <Avatar
                    style={{
                      backgroundColor: '#0f172a',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: 13,
                      border: '2px solid #cbd5e1',
                      flexShrink: 0,
                    }}
                    size={36}
                  >
                    {initials}
                  </Avatar>
                  <div className="hidden md:flex flex-col text-left justify-center max-w-[130px]">
                    <span className="text-xs font-bold text-slate-900 leading-tight truncate">
                      {displayName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5 truncate">
                      {displayRole}
                    </span>
                  </div>
                </div>
              </Dropdown>

              {/* Direct Logout Button */}
              <Button
                type="text"
                danger
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                title="Sign Out"
                style={{
                  height: 38,
                  padding: '0 8px',
                  borderRadius: 8,
                }}
              />
            </div>
          </div>
        </Header>

        {/* 3. MAIN CONTENT CONTAINER */}
        <Content
          style={{
            padding: '24px 28px 48px',
            minHeight: 'calc(100vh - 68px)',
            maxWidth: 1600,
            width: '100%',
            margin: '0 auto',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
