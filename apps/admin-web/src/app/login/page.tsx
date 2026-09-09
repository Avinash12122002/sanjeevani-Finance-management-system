'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Form, Input, Button, Alert, message } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  ArrowRightOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import { postApi } from '@/lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [otpForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 2FA State (§39)
  const [require2fa, setRequire2fa] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [maskedMobile, setMaskedMobile] = useState<string>('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleLogin = async (values: any) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await postApi('/auth/login', {
        username: values.username,
        password: values.password,
      });

      if (res.success && res.data) {
        if (res.data.require2fa) {
          setRequire2fa(true);
          setChallengeId(res.data.challengeId);
          setMaskedMobile(res.data.mobile || 'registered mobile');
          setDevOtp(res.data.devOtp || null);
          setResendCooldown(30);
          message.info('Please enter the 2FA verification code sent to your phone.');
          return;
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('sfms_access_token', res.data.accessToken);
          localStorage.setItem('sfms_user', JSON.stringify(res.data.user));
        }
        message.success(`Welcome back, ${res.data.user.employeeName || res.data.user.username}!`);
        router.push('/');
      } else {
        setErrorMsg(res.message || 'Invalid login credentials or unregistered user.');
      }
    } catch {
      setErrorMsg('Failed to connect to authentication server. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2Fa = async (values: { otp: string }) => {
    if (!challengeId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await postApi('/auth/verify-2fa', {
        challengeId,
        otp: values.otp,
      });

      if (res.success && res.data) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('sfms_access_token', res.data.accessToken);
          localStorage.setItem('sfms_user', JSON.stringify(res.data.user));
        }
        message.success(`2FA Verified! Welcome back, ${res.data.user.employeeName || res.data.user.username}!`);
        router.push('/');
      } else {
        setErrorMsg(res.message || 'Invalid 2FA code entered. Please try again.');
      }
    } catch {
      setErrorMsg('Failed to verify 2FA. Please check your code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!challengeId || resendCooldown > 0) return;
    setLoading(true);
    try {
      const res = await postApi('/auth/resend-2fa-otp', { challengeId });
      if (res.success) {
        message.success('New OTP sent to your registered mobile.');
        if (res.data?.devOtp) setDevOtp(res.data.devOtp);
        setResendCooldown(30);
      } else {
        message.error(res.message || 'Failed to resend OTP.');
      }
    } catch {
      message.error('Error contacting authentication server.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 z-10 items-stretch">
        {/* Left Col: Brand & System Overview (Equal Height) */}
        <div className="flex flex-col justify-between p-6 md:p-8 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl h-full">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-emerald-950/60">
                S
              </div>
              <div>
                <div className="font-extrabold text-xl tracking-wide text-white" style={{ color: '#ffffff' }}>SANJEEVANI</div>
                <div className="text-emerald-400 text-xs font-semibold tracking-wider" style={{ color: '#34d399' }}>FINANCE OPERATIONS v1.0</div>
                <div className="text-[11px] text-slate-300 font-medium mt-1">Your Money. Your Future. Our Responsibility.</div>
                <div className="text-[10px] text-emerald-400">भरोसे के साथ, बेहतर कल की ओर</div>
              </div>
            </div>

            <h1 className="text-xl md:text-2xl font-bold leading-snug mb-4" style={{ color: '#ffffff', margin: 0, paddingBottom: 12 }}>
              Enterprise Financial Operations & Core Banking Portal
            </h1>
            
            <p className="text-sm leading-relaxed mb-6 font-normal" style={{ color: '#e2e8f0' }}>
              Official operating console for Members, KYC 360°, Precision Reducing Balance Loans, Recurring Deposits, Vault Balancing & Double-Entry Ledgers.
            </p>

            <div className="space-y-3.5">
              <div className="flex items-center gap-3 text-xs md:text-sm font-medium" style={{ color: '#f1f5f9' }}>
                <CheckCircleFilled style={{ color: '#34d399', fontSize: 16 }} />
                <span>Argon2id + RS256 Asymmetric JWT Authentication</span>
              </div>
              <div className="flex items-center gap-3 text-xs md:text-sm font-medium" style={{ color: '#f1f5f9' }}>
                <CheckCircleFilled style={{ color: '#34d399', fontSize: 16 }} />
                <span>Maker-Checker Hierarchy & Branch-Scoped Isolation</span>
              </div>
              <div className="flex items-center gap-3 text-xs md:text-sm font-medium" style={{ color: '#f1f5f9' }}>
                <CheckCircleFilled style={{ color: '#34d399', fontSize: 16 }} />
                <span>Decimal.js Precision Financial Math & Double-Entry</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800 text-xs" style={{ color: '#94a3b8' }}>
            © {new Date().getFullYear()} Sanjeevani Finance Management System • Banking Grade Security
          </div>
        </div>

        {/* Right Col: Production Login Form (Equal Height) */}
        <div className="flex flex-col justify-between p-6 md:p-8 bg-white rounded-2xl border border-slate-200 shadow-2xl h-full">
          <div>
            {!require2fa ? (
              <>
                <div className="mb-6 text-center">
                  <h2 className="text-2xl font-black text-slate-900 m-0">Staff Sign In</h2>
                  <p className="text-slate-500 text-xs mt-1">Enter your assigned staff username, email, or registered mobile number</p>
                </div>

                {errorMsg && (
                  <Alert
                    message={errorMsg}
                    type="error"
                    showIcon
                    className="mb-4 text-xs"
                    closable
                    onClose={() => setErrorMsg(null)}
                  />
                )}

                <Form form={form} layout="vertical" onFinish={handleLogin}>
                  <Form.Item
                    label={<span className="text-xs font-bold text-slate-700">Username, Email, or Mobile</span>}
                    name="username"
                    rules={[{ required: true, message: 'Please enter your username, email, or mobile number' }]}
                  >
                    <Input
                      prefix={<UserOutlined className="text-slate-400" />}
                      placeholder="Enter username or mobile"
                      size="large"
                      className="rounded-lg text-sm"
                    />
                  </Form.Item>

                  <Form.Item
                    label={<span className="text-xs font-bold text-slate-700">Password</span>}
                    name="password"
                    rules={[{ required: true, message: 'Please enter your password' }]}
                  >
                    <Input.Password
                      prefix={<LockOutlined className="text-slate-400" />}
                      placeholder="Enter password"
                      size="large"
                      className="rounded-lg text-sm"
                    />
                  </Form.Item>

                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    block
                    loading={loading}
                    icon={<ArrowRightOutlined />}
                    style={{
                      background: '#059669',
                      borderColor: '#059669',
                      fontWeight: 700,
                      borderRadius: 8,
                      height: 46,
                      marginTop: 8,
                    }}
                  >
                    Authenticate & Launch Console
                  </Button>
                </Form>
              </>
            ) : (
              <>
                <div className="mb-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 text-xl font-bold">
                    <LockOutlined />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 m-0">Two-Factor Authentication</h2>
                  <p className="text-slate-500 text-xs mt-1">
                    Enter the 6-digit security code dispatched to your mobile (<strong>{maskedMobile}</strong>).
                  </p>
                </div>

                {devOtp && (
                  <Alert
                    message={
                      <span>
                        <strong>Dev Simulation OTP:</strong> <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded text-emerald-950 font-bold">{devOtp}</code>
                      </span>
                    }
                    type="info"
                    showIcon
                    className="mb-4 text-xs"
                  />
                )}

                {errorMsg && (
                  <Alert
                    message={errorMsg}
                    type="error"
                    showIcon
                    className="mb-4 text-xs"
                    closable
                    onClose={() => setErrorMsg(null)}
                  />
                )}

                <Form form={otpForm} layout="vertical" onFinish={handleVerify2Fa}>
                  <Form.Item
                    label={<span className="text-xs font-bold text-slate-700">6-Digit One-Time Password (OTP)</span>}
                    name="otp"
                    rules={[
                      { required: true, message: 'Please enter the 6-digit OTP' },
                      { pattern: /^[0-9]{6}$/, message: 'OTP must be exactly 6 numeric digits' },
                    ]}
                  >
                    <Input
                      placeholder="e.g. 123456"
                      maxLength={6}
                      size="large"
                      className="rounded-lg text-center font-mono text-xl font-bold tracking-widest"
                      autoFocus
                    />
                  </Form.Item>

                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    block
                    loading={loading}
                    icon={<ArrowRightOutlined />}
                    style={{
                      background: '#059669',
                      borderColor: '#059669',
                      fontWeight: 700,
                      borderRadius: 8,
                      height: 46,
                      marginTop: 8,
                    }}
                  >
                    Verify & Launch Console
                  </Button>

                  <div className="flex items-center justify-between mt-4 text-xs">
                    <Button
                      type="link"
                      className="p-0 text-slate-500"
                      onClick={() => {
                        setRequire2fa(false);
                        setChallengeId(null);
                        setErrorMsg(null);
                      }}
                    >
                      ← Back to Login
                    </Button>
                    <Button
                      type="link"
                      className="p-0 text-emerald-600 font-semibold"
                      disabled={resendCooldown > 0 || loading}
                      onClick={handleResendOtp}
                    >
                      {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                    </Button>
                  </div>
                </Form>
              </>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col items-center gap-3">
            <Link
              href="/portal/login"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <UserOutlined /> Are you a Member / Customer? Open Customer Portal →
            </Link>
            <div className="text-center text-xs text-slate-400">
              Protected by End-to-End Enterprise Encryption
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
