import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMobileAuth } from '../contexts/MobileAuthContext.jsx';
import { useMobileTheme, MobileThemeToggle } from '../contexts/MobileThemeContext.jsx';
import axios from 'axios';
import { Eye, EyeOff, Lock, Mail, Trophy, ArrowRight, ShieldCheck, KeyRound, Sparkles } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/+$/, '');

export default function MobileLogin() {
  const navigate = useNavigate();
  const { login } = useMobileAuth();
  const { colors, isDark } = useMobileTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Forgot Password Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState('request'); // 'request' | 'otp' | 'success'
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const role = await login(email, password);
      if (role === 'admin' || role === 'scorekeeper' || role === 'superadmin') {
        navigate('/app/scorekeeper/fixtures', { replace: true });
      } else {
        navigate('/app/viewer', { replace: true });
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error || err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!forgotEmail || !forgotEmail.trim()) {
      setForgotError('Please enter your account email.');
      return;
    }
    setForgotError('');
    setForgotLoading(true);
    try {
      await axios.post(`${API_BASE}/auth/forgot-password`, {
        email: forgotEmail.trim().toLowerCase()
      });
      setForgotStep('otp');
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Failed to send recovery code.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!forgotOtp || forgotOtp.trim().length !== 6) {
      setForgotError('Please enter the 6-digit verification code.');
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setForgotError('Password must be at least 6 characters.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    setForgotError('');
    setForgotLoading(true);
    try {
      await axios.post(`${API_BASE}/auth/reset-password`, {
        email: forgotEmail.trim().toLowerCase(),
        otp: forgotOtp.trim(),
        newPassword: forgotNewPassword
      });
      setForgotStep('success');
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Failed to reset password. Check your code.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div
      className="flex-1 flex flex-col p-6 min-h-screen"
      style={{ backgroundColor: colors.background, color: colors.text }}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-md shadow-blue-500/20">
            FG
          </div>
          <div>
            <h2 className="text-sm font-black tracking-tight leading-none">FixtureGrid</h2>
            <span className="text-[10px] font-bold text-slate-400">Mobile Edition</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            LIVE
          </span>
          <MobileThemeToggle compact={true} />
        </div>
      </div>

      {/* Hero Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight" style={{ color: colors.text }}>
          Welcome back
        </h1>
        <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
          Sign in to access your scorekeeper console or continue as a tournament spectator.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
          {errorMessage}
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-bold mb-1.5" style={{ color: colors.textSecondary }}>
            Official Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Mail size={16} />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="scorekeeper@school.org"
              required
              className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              style={{
                backgroundColor: colors.inputBg,
                borderColor: colors.inputBorder,
                color: colors.text
              }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold" style={{ color: colors.textSecondary }}>
              Password
            </label>
            <button
              type="button"
              onClick={() => {
                setForgotEmail(email);
                setModalVisible(true);
              }}
              className="text-xs font-semibold text-blue-500 hover:text-blue-400 cursor-pointer"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock size={16} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              style={{
                backgroundColor: colors.inputBg,
                borderColor: colors.inputBorder,
                color: colors.text
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-2"
        >
          {loading ? (
            <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <>
              <span>Sign In as Scorekeeper</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" style={{ borderColor: colors.border }} />
        </div>
        <span
          className="relative px-3 text-xs font-bold uppercase tracking-widest"
          style={{ backgroundColor: colors.background, color: colors.textMuted }}
        >
          OR
        </span>
      </div>

      {/* Spectator / Viewer Mode Action */}
      <button
        type="button"
        onClick={() => navigate('/app/viewer')}
        className="w-full py-3 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.01]"
        style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderColor: isDark ? '#334155' : '#cbd5e1',
          color: colors.text
        }}
      >
        <Trophy size={16} className="text-amber-500" />
        <span className="text-sm font-bold">Continue as Spectator</span>
        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">
          No Login
        </span>
      </button>

      {/* Quick Demo Fillers for testing */}
      <div className="mt-auto pt-6 text-center">
        <p className="text-[11px] text-slate-500">
          FixtureGrid Mobile Web PWA · Supports offline score entry & sync
        </p>
      </div>

      {/* Forgot Password Modal */}
      {modalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div
            className="w-full max-w-sm rounded-2xl p-6 shadow-2xl border"
            style={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              borderColor: isDark ? '#334155' : '#e2e8f0',
              color: colors.text
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <KeyRound size={18} />
                </div>
                <h3 className="text-base font-black">Reset Password</h3>
              </div>
              <button
                onClick={() => setModalVisible(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {forgotError && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
                {forgotError}
              </div>
            )}

            {forgotStep === 'request' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">
                  Enter your registered account email. We'll send a 6-digit verification code.
                </p>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="scorekeeper@school.org"
                  className="w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.text
                  }}
                />
                <button
                  type="button"
                  disabled={forgotLoading}
                  onClick={handleRequestOtp}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                >
                  {forgotLoading ? 'Sending...' : 'Send Recovery Code'}
                </button>
              </div>
            )}

            {forgotStep === 'otp' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  Enter the 6-digit code sent to your email, and choose your new password.
                </p>
                <input
                  type="text"
                  maxLength={6}
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value)}
                  placeholder="6-Digit OTP"
                  className="w-full text-center tracking-widest text-lg font-mono font-bold px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.text
                  }}
                />
                <input
                  type="password"
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  placeholder="New Password (min 6 chars)"
                  className="w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.text
                  }}
                />
                <input
                  type="password"
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  placeholder="Confirm New Password"
                  className="w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.text
                  }}
                />
                <button
                  type="button"
                  disabled={forgotLoading}
                  onClick={handleResetPassword}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                >
                  {forgotLoading ? 'Resetting...' : 'Update Password'}
                </button>
              </div>
            )}

            {forgotStep === 'success' && (
              <div className="text-center py-4 space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                  <ShieldCheck size={24} />
                </div>
                <h4 className="text-sm font-bold">Password Reset Complete!</h4>
                <p className="text-xs text-slate-400">
                  You can now log in with your updated credentials.
                </p>
                <button
                  type="button"
                  onClick={() => setModalVisible(false)}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                >
                  Return to Login
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
