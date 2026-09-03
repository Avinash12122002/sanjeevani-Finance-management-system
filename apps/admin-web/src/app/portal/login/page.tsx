'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined, ArrowLeftOutlined, SafetyCertificateOutlined, MobileOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CustomerPortalLoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (values: any) => {
    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiBase}/portal/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: values.identifier,
          password: values.password,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.data?.accessToken) {
        localStorage.setItem('sfms_customer_token', data.data.accessToken);
        localStorage.setItem('sfms_customer', JSON.stringify(data.data.customer));
        message.success(`Welcome, ${data.data.customer?.fullName || 'Member'}!`);
        router.push('/portal');
      } else {
        message.error(data.message || data.error?.message || 'Login failed. Please check your Customer ID / Mobile number.');
      }
    } catch (err: any) {
      message.error(err.message || 'Unable to reach server. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 items-center justify-center text-white font-black text-3xl shadow-xl shadow-emerald-950/60 mb-3 border border-emerald-400/30">
          S
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide m-0">SANJEEVANI FINANCE</h1>
        <p className="text-emerald-300 text-xs sm:text-sm font-medium mt-1 tracking-wider uppercase">
          Member & Customer Self-Service Portal
        </p>
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-2 sm:p-4">
        <div className="mb-5 text-center">
          <h2 className="text-xl font-bold text-slate-900 m-0">Member Sign In</h2>
          <p className="text-xs text-slate-500 mt-1">
            Access your savings, deposits, loan EMIs, passbook & receipts
          </p>
        </div>

        <Form layout="vertical" onFinish={handleLogin} requiredMark={false} size="large">
          <Form.Item
            name="identifier"
            label={<span className="text-xs font-semibold text-slate-700">Customer ID or Mobile Number</span>}
            rules={[{ required: true, message: 'Enter your Customer ID or Mobile Number' }]}
          >
            <Input
              prefix={<UserOutlined className="text-emerald-600" />}
              placeholder="e.g. SJF-000001 or 9876543210"
              className="rounded-xl text-sm"
              autoFocus
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span className="text-xs font-semibold text-slate-700">Password / PIN</span>}
            rules={[{ required: true, message: 'Enter your account password' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-emerald-600" />}
              placeholder="Enter your password"
              className="rounded-xl text-sm"
            />
          </Form.Item>

          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 mb-5 text-xs text-emerald-800 flex items-start gap-2">
            <SafetyCertificateOutlined className="text-emerald-600 text-base shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">First time signing in?</span> Default password is <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono font-bold text-emerald-900">Pass@123</code> or the last 4 digits of your registered mobile number.
            </div>
          </div>

          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            className="rounded-xl font-bold h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-none shadow-lg shadow-emerald-900/30 text-base"
          >
            Sign In to My Account
          </Button>
        </Form>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
          <Link href="/login" className="text-slate-500 hover:text-emerald-700 flex items-center gap-1 font-medium">
            <ArrowLeftOutlined /> Staff / Admin Login
          </Link>
          <span className="text-slate-400">Toll-Free Support: 1800-SANJEEVANI</span>
        </div>
      </Card>

      <div className="text-slate-400 text-xs mt-6 text-center">
        © 2026 Sanjeevani Finance Management System • Member Data Protected with 256-Bit SSL
      </div>
    </div>
  );
}
