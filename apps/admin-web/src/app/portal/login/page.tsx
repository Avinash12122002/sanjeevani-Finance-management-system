'use client';

import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Alert, Tabs, Tag } from 'antd';
import {
  MobileOutlined,
  LockOutlined,
  ArrowLeftOutlined,
  SafetyCertificateOutlined,
  KeyOutlined,
  CheckCircleFilled,
  ReloadOutlined,
  UserOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type AuthStep =
  | 'ENTER_MOBILE'
  | 'FIRST_TIME_OTP'
  | 'FIRST_TIME_PASSWORD'
  | 'RETURNING_OPTIONS'
  | 'FORGOT_PASSWORD_OTP'
  | 'FORGOT_PASSWORD_NEW';

export default function CustomerPortalLoginPage() {
  const [step, setStep] = useState<AuthStep>('ENTER_MOBILE');
  const [mobile, setMobile] = useState('');
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [returningTab, setReturningTab] = useState<'password' | 'otp'>('password');
  const [otpSentForReturning, setOtpSentForReturning] = useState(false);

  const [formMobile] = Form.useForm();
  const [formOtp] = Form.useForm();
  const [formPassword] = Form.useForm();
  const [formReturningPassword] = Form.useForm();
  const [formReturningOtp] = Form.useForm();
  const [formForgotNewPass] = Form.useForm();

  const router = useRouter();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  // Resend Countdown Timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Helper to save session and redirect
  const handleAuthSuccess = (resData: any) => {
    if (resData.accessToken) {
      localStorage.setItem('sfms_customer_token', resData.accessToken);
      localStorage.setItem('sfms_customer', JSON.stringify(resData.customer));
      message.success(`Welcome, ${resData.customer?.fullName || 'Member'}!`);
      router.push('/portal');
    }
  };

  /**
   * STEP 1: Check mobile number
   */
  const handleCheckMobile = async (values: { mobile: string }) => {
    setLoading(true);
    setDevOtp(null);
    try {
      const cleanMobile = values.mobile.replace(/\D/g, '').slice(-10);
      const res = await fetch(`${apiBase}/portal/check-mobile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: cleanMobile }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        message.error(data.message || 'Mobile number not found in our records.');
        return;
      }

      setMobile(cleanMobile);
      setCustomerInfo(data.data);

      if (!data.data.hasPassword) {
        // First-time customer: automatically trigger OTP dispatch
        await dispatchOtp(cleanMobile, 'FIRST_TIME_OTP');
      } else {
        // Returning customer: offer Password or OTP choices
        setStep('RETURNING_OPTIONS');
      }
    } catch (err: any) {
      message.error(err.message || 'Unable to connect to authentication server');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Helper: Dispatch OTP via backend MSG91 integration
   */
  const dispatchOtp = async (targetMobile: string, nextStep?: AuthStep) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/portal/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: targetMobile }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        message.error(data.message || 'Failed to send OTP.');
        return false;
      }

      message.success(data.message || 'OTP sent successfully!');
      setResendCooldown(30);
      if (data.data?.devOtp) {
        setDevOtp(data.data.devOtp);
      }
      if (nextStep) {
        setStep(nextStep);
      }
      return true;
    } catch (err: any) {
      message.error(err.message || 'Failed to dispatch OTP');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * STEP 2A: First-Time Customer - Verify OTP
   */
  const handleVerifyFirstTimeOtp = async (values: { otp: string }) => {
    const enteredOtp = values.otp.trim();
    setOtp(enteredOtp);
    // Move to create password step
    setStep('FIRST_TIME_PASSWORD');
  };

  /**
   * STEP 2B: First-Time Customer - Save Password & Enter Portal
   */
  const handleSavePasswordAndLogin = async (values: { newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/portal/verify-otp-set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile,
          otp,
          newPassword: values.newPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        message.error(data.message || 'Failed to create password.');
        // If OTP expired, go back to OTP step
        if (data.message?.toLowerCase().includes('otp')) {
          setStep('FIRST_TIME_OTP');
        }
        return;
      }

      handleAuthSuccess(data.data);
    } catch (err: any) {
      message.error(err.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * STEP 3A: Returning Customer - Password Login
   */
  const handleReturningPasswordLogin = async (values: { password: string }) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/portal/login-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile,
          password: values.password,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        message.error(data.message || 'Invalid password. You can also log in using OTP.');
        return;
      }

      handleAuthSuccess(data.data);
    } catch (err: any) {
      message.error(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * STEP 3B: Returning Customer - Request OTP
   */
  const handleRequestReturningOtp = async () => {
    const success = await dispatchOtp(mobile);
    if (success) {
      setOtpSentForReturning(true);
    }
  };

  /**
   * STEP 3C: Returning Customer - OTP Login
   */
  const handleReturningOtpLogin = async (values: { otp: string }) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/portal/login-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile,
          otp: values.otp.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        message.error(data.message || 'Invalid OTP code.');
        return;
      }

      handleAuthSuccess(data.data);
    } catch (err: any) {
      message.error(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset / Forgot Password via OTP
   */
  const handleInitiateForgotPassword = async () => {
    const success = await dispatchOtp(mobile, 'FORGOT_PASSWORD_OTP');
    if (success) {
      message.info('Enter the OTP sent to your phone to set a new password');
    }
  };

  const handleVerifyForgotOtp = async (values: { otp: string }) => {
    setOtp(values.otp.trim());
    setStep('FORGOT_PASSWORD_NEW');
  };

  const handleSaveResetPassword = async (values: { newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/portal/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile,
          otp,
          newPassword: values.newPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        message.error(data.message || 'Failed to reset password.');
        return;
      }

      handleAuthSuccess(data.data);
    } catch (err: any) {
      message.error(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const resetToMobileInput = () => {
    setStep('ENTER_MOBILE');
    setCustomerInfo(null);
    setDevOtp(null);
    setOtpSentForReturning(false);
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

      {/* Main Card */}
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-2 sm:p-4">
        {/* Customer Identity Tag if identified */}
        {customerInfo && step !== 'ENTER_MOBILE' && (
          <div className="mb-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-emerald-900">{customerInfo.customerName}</div>
              <div className="text-[11px] text-emerald-700 font-mono">
                +91 {mobile} • {customerInfo.customerNumber}
              </div>
            </div>
            <Button size="small" type="link" onClick={resetToMobileInput} className="text-xs text-slate-500 hover:text-slate-800 p-0">
              Change
            </Button>
          </div>
        )}

        {/* Development Mode Quick OTP Preview Badge */}
        {devOtp && (
          <div className="mb-4 p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-medium">
              <SafetyCertificateOutlined className="text-amber-600" />
              <span>MSG91 OTP (Preview):</span>
              <span className="font-mono font-bold bg-amber-200 px-1.5 py-0.5 rounded text-amber-950 tracking-wider text-sm">
                {devOtp}
              </span>
            </div>
            <Tag color="orange" className="text-[10px] m-0">Live Simulation</Tag>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 1: ENTER MOBILE NUMBER                                   */}
        {/* ------------------------------------------------------------- */}
        {step === 'ENTER_MOBILE' && (
          <div>
            <div className="mb-5 text-center">
              <h2 className="text-xl font-bold text-slate-900 m-0">Member Sign In</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your 10-digit registered mobile number to access your account
              </p>
            </div>

            <Form form={formMobile} layout="vertical" onFinish={handleCheckMobile} size="large">
              <Form.Item
                name="mobile"
                label={<span className="text-xs font-semibold text-slate-700">Registered Mobile Number</span>}
                rules={[
                  { required: true, message: 'Please enter your 10-digit mobile number' },
                  { pattern: /^[6-9]\d{9}$/, message: 'Please enter a valid 10-digit Indian mobile number' },
                ]}
              >
                <Input
                  prefix={<span className="text-slate-400 font-semibold mr-1">+91</span>}
                  placeholder="e.g. 9876543210"
                  maxLength={10}
                  className="rounded-xl font-semibold tracking-wider text-base"
                  autoFocus
                />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className="rounded-xl font-bold h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-none shadow-lg shadow-emerald-900/30 text-base"
              >
                Continue →
              </Button>
            </Form>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 2A: FIRST-TIME CUSTOMER - ENTER OTP                       */}
        {/* ------------------------------------------------------------- */}
        {step === 'FIRST_TIME_OTP' && (
          <div>
            <div className="mb-4 text-center">
              <Tag color="green" className="mb-2 px-2 py-0.5 font-bold uppercase text-[11px]">
                First Time Login
              </Tag>
              <h2 className="text-xl font-bold text-slate-900 m-0">Verify Your Phone</h2>
              <p className="text-xs text-slate-500 mt-1">
                We sent a 6-digit verification code to <span className="font-semibold text-slate-800">+91 {mobile}</span> via SMS & WhatsApp
              </p>
            </div>

            <Form form={formOtp} layout="vertical" onFinish={handleVerifyFirstTimeOtp} size="large">
              <Form.Item
                name="otp"
                label={<span className="text-xs font-semibold text-slate-700">Enter 6-Digit OTP</span>}
                rules={[
                  { required: true, message: 'Please enter the 6-digit OTP' },
                  { len: 6, message: 'OTP must be 6 digits' },
                ]}
              >
                <Input
                  prefix={<KeyOutlined className="text-emerald-600" />}
                  placeholder="• • • • • •"
                  maxLength={6}
                  className="rounded-xl text-center font-mono text-xl tracking-widest font-bold"
                  autoFocus
                />
              </Form.Item>

              <div className="flex items-center justify-between mb-4 text-xs">
                <span className="text-slate-400">Didn't receive code?</span>
                <Button
                  type="link"
                  size="small"
                  disabled={resendCooldown > 0 || loading}
                  onClick={() => dispatchOtp(mobile)}
                  className="p-0 text-emerald-700 font-semibold"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </Button>
              </div>

              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className="rounded-xl font-bold h-12 bg-gradient-to-r from-emerald-600 to-teal-600 border-none shadow-lg text-base"
              >
                Verify OTP →
              </Button>
            </Form>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 2B: FIRST-TIME CUSTOMER - CREATE PASSWORD                 */}
        {/* ------------------------------------------------------------- */}
        {step === 'FIRST_TIME_PASSWORD' && (
          <div>
            <div className="mb-4 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2 text-xl">
                <CheckOutlined />
              </div>
              <h2 className="text-xl font-bold text-slate-900 m-0">Create Account Password</h2>
              <p className="text-xs text-slate-500 mt-1">
                Set a password to easily sign in next time without waiting for an OTP
              </p>
            </div>

            <Form form={formPassword} layout="vertical" onFinish={handleSavePasswordAndLogin} size="large">
              <Form.Item
                name="newPassword"
                label={<span className="text-xs font-semibold text-slate-700">Create New Password</span>}
                rules={[
                  { required: true, message: 'Enter a password' },
                  { min: 4, message: 'Password must be at least 4 characters' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined className="text-emerald-600" />}
                  placeholder="Enter new password (min 4 characters)"
                  className="rounded-xl"
                  autoFocus
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label={<span className="text-xs font-semibold text-slate-700">Confirm Password</span>}
                rules={[{ required: true, message: 'Confirm your password' }]}
              >
                <Input.Password
                  prefix={<LockOutlined className="text-emerald-600" />}
                  placeholder="Re-enter password"
                  className="rounded-xl"
                />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className="rounded-xl font-bold h-12 bg-gradient-to-r from-emerald-600 to-teal-600 border-none shadow-lg text-base"
              >
                Set Password & Enter Portal 🚀
              </Button>
            </Form>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 3: RETURNING CUSTOMER - PASSWORD OR OTP LOGIN            */}
        {/* ------------------------------------------------------------- */}
        {step === 'RETURNING_OPTIONS' && (
          <div>
            <div className="mb-4 text-center">
              <h2 className="text-xl font-bold text-slate-900 m-0">Welcome Back!</h2>
              <p className="text-xs text-slate-500 mt-1">
                Choose how you want to sign in to your Sanjeevani account
              </p>
            </div>

            <Tabs
              activeKey={returningTab}
              onChange={(k) => setReturningTab(k as 'password' | 'otp')}
              centered
              className="mb-4"
              items={[
                {
                  key: 'password',
                  label: (
                    <span className="font-semibold text-xs px-2 flex items-center gap-1">
                      <LockOutlined /> Login with Password
                    </span>
                  ),
                  children: (
                    <Form form={formReturningPassword} layout="vertical" onFinish={handleReturningPasswordLogin} size="large">
                      <Form.Item
                        name="password"
                        label={<span className="text-xs font-semibold text-slate-700">Your Password / PIN</span>}
                        rules={[{ required: true, message: 'Please enter your password' }]}
                      >
                        <Input.Password
                          prefix={<LockOutlined className="text-emerald-600" />}
                          placeholder="Enter your password"
                          className="rounded-xl"
                          autoFocus
                        />
                      </Form.Item>

                      <div className="flex items-center justify-end mb-4 text-xs">
                        <Button
                          type="link"
                          size="small"
                          onClick={handleInitiateForgotPassword}
                          className="p-0 text-slate-500 hover:text-emerald-700"
                        >
                          Forgot Password? Reset with OTP
                        </Button>
                      </div>

                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        block
                        className="rounded-xl font-bold h-12 bg-gradient-to-r from-emerald-600 to-teal-600 border-none shadow-lg text-base"
                      >
                        Sign In →
                      </Button>
                    </Form>
                  ),
                },
                {
                  key: 'otp',
                  label: (
                    <span className="font-semibold text-xs px-2 flex items-center gap-1">
                      <MobileOutlined /> Login with OTP
                    </span>
                  ),
                  children: (
                    <div className="space-y-4">
                      {!otpSentForReturning ? (
                        <div className="text-center py-2">
                          <p className="text-xs text-slate-600 mb-4">
                            We will send a one-time verification code to <span className="font-bold text-slate-800">+91 {mobile}</span>
                          </p>
                          <Button
                            type="primary"
                            loading={loading}
                            onClick={handleRequestReturningOtp}
                            block
                            className="rounded-xl font-bold h-11 bg-emerald-700 hover:bg-emerald-600 border-none shadow-md"
                          >
                            Send OTP via SMS & WhatsApp
                          </Button>
                        </div>
                      ) : (
                        <Form form={formReturningOtp} layout="vertical" onFinish={handleReturningOtpLogin} size="large">
                          <Form.Item
                            name="otp"
                            label={<span className="text-xs font-semibold text-slate-700">Enter 6-Digit OTP</span>}
                            rules={[
                              { required: true, message: 'Please enter OTP' },
                              { len: 6, message: 'OTP must be 6 digits' },
                            ]}
                          >
                            <Input
                              prefix={<KeyOutlined className="text-emerald-600" />}
                              placeholder="• • • • • •"
                              maxLength={6}
                              className="rounded-xl text-center font-mono text-xl tracking-widest font-bold"
                              autoFocus
                            />
                          </Form.Item>

                          <div className="flex items-center justify-between mb-4 text-xs">
                            <span className="text-slate-400">Didn't receive code?</span>
                            <Button
                              type="link"
                              size="small"
                              disabled={resendCooldown > 0 || loading}
                              onClick={handleRequestReturningOtp}
                              className="p-0 text-emerald-700 font-semibold"
                            >
                              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                            </Button>
                          </div>

                          <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                            className="rounded-xl font-bold h-12 bg-gradient-to-r from-emerald-600 to-teal-600 border-none shadow-lg text-base"
                          >
                            Verify & Enter Portal →
                          </Button>
                        </Form>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 4: FORGOT PASSWORD - ENTER OTP                            */}
        {/* ------------------------------------------------------------- */}
        {step === 'FORGOT_PASSWORD_OTP' && (
          <div>
            <div className="mb-4 text-center">
              <h2 className="text-xl font-bold text-slate-900 m-0">Reset Password</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter the OTP sent to <span className="font-semibold text-slate-800">+91 {mobile}</span>
              </p>
            </div>

            <Form layout="vertical" onFinish={handleVerifyForgotOtp} size="large">
              <Form.Item
                name="otp"
                label={<span className="text-xs font-semibold text-slate-700">Enter 6-Digit OTP</span>}
                rules={[{ required: true, len: 6, message: 'Enter 6-digit OTP' }]}
              >
                <Input
                  prefix={<KeyOutlined className="text-emerald-600" />}
                  placeholder="• • • • • •"
                  maxLength={6}
                  className="rounded-xl text-center font-mono text-xl tracking-widest font-bold"
                  autoFocus
                />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                block
                className="rounded-xl font-bold h-12 bg-emerald-700 border-none shadow-md text-base"
              >
                Verify & Set New Password →
              </Button>
            </Form>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 5: FORGOT PASSWORD - SET NEW PASSWORD                     */}
        {/* ------------------------------------------------------------- */}
        {step === 'FORGOT_PASSWORD_NEW' && (
          <div>
            <div className="mb-4 text-center">
              <h2 className="text-xl font-bold text-slate-900 m-0">Set New Password</h2>
              <p className="text-xs text-slate-500 mt-1">
                Choose a new password for your account
              </p>
            </div>

            <Form form={formForgotNewPass} layout="vertical" onFinish={handleSaveResetPassword} size="large">
              <Form.Item
                name="newPassword"
                label={<span className="text-xs font-semibold text-slate-700">New Password</span>}
                rules={[{ required: true, min: 4, message: 'Min 4 characters' }]}
              >
                <Input.Password placeholder="Enter new password" className="rounded-xl" autoFocus />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label={<span className="text-xs font-semibold text-slate-700">Confirm Password</span>}
                rules={[{ required: true, message: 'Confirm password' }]}
              >
                <Input.Password placeholder="Re-enter new password" className="rounded-xl" />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className="rounded-xl font-bold h-12 bg-emerald-700 border-none shadow-md text-base"
              >
                Update Password & Enter Portal
              </Button>
            </Form>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
          <Link href="/login" className="text-slate-500 hover:text-emerald-700 flex items-center gap-1 font-medium">
            <ArrowLeftOutlined /> Staff / Admin Login
          </Link>
          <span className="text-slate-400">Toll-Free: 1800-SANJEEVANI</span>
        </div>
      </Card>

      <div className="text-slate-400 text-xs mt-6 text-center">
        Powered by MSG91 Secure OTP Gateway • 256-Bit SSL Protection
      </div>
    </div>
  );
}
