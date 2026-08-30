import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useOrganization } from '../contexts/OrganizationContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../hooks/useFixtures.js';
import { authApi } from '../api.js';
import { Lock, Mail, User, ShieldAlert, ArrowLeft, Loader2, Eye, EyeOff, KeyRound, CheckCircle2, RefreshCw } from 'lucide-react';

export default function Login() {
  const { login, register } = useAuth();
  const { activeOrg } = useOrganization();
  const navigate = useNavigate();
  const { data: settings } = useSettings();
 
  const [isRegister, setIsRegister] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('register') === 'true';
  });

  // Auth form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password Modal / Workflow states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState('request'); // 'request' | 'otp' | 'success'
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState('');

  // If a tenant already has users registered, disable public registration.
  useEffect(() => {
    if (settings?.has_users && isRegister) {
      setIsRegister(false);
      setError('Registration is closed for this workspace. Please sign in or contact your administrator.');
    }
  }, [settings, isRegister]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isRegister) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotError('Please enter your email address');
      return;
    }
    setForgotLoading(true);
    setForgotError('');

    try {
      const clientUrl = window.location.origin;
      const res = await authApi.forgotPassword({ email: forgotEmail, clientUrl });
      setForgotSuccessMessage(res.data?.message || 'Password reset instructions have been sent.');
      setForgotStep('otp');
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Failed to process password reset request.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetWithOtp = async (e) => {
    e.preventDefault();
    if (!forgotOtp || forgotOtp.trim().length !== 6) {
      setForgotError('Please enter a valid 6-digit code');
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setForgotError('Password must be at least 6 characters');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match');
      return;
    }

    setForgotLoading(true);
    setForgotError('');

    try {
      await authApi.resetPassword({
        email: forgotEmail,
        otp: forgotOtp.trim(),
        newPassword: forgotNewPassword
      });
      setForgotStep('success');
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Failed to reset password. Please check your code.');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotStep('request');
    setForgotError('');
    setForgotSuccessMessage('');
    setForgotOtp('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-white via-slate-50 to-gray-100 dark:from-gray-950 dark:via-slate-900 dark:to-gray-950">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-900/60 backdrop-blur-md p-8 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl relative">
        
        {/* Back navigation */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        {/* Title */}
        <div className="text-center">
          <div className="inline-flex mb-3 rounded-xl bg-white px-4 py-2 shadow-md border border-gray-150 dark:border-gray-850 max-h-16 overflow-hidden">
            <img src="/assets/fixture-grid-logo.png" alt="FixtureGrid Logo" className="h-10 w-auto object-contain" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {isRegister ? 'Register Official' : 'Official Access'}
          </h2>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            Workspace: <span className="font-semibold text-blue-500">{activeOrg?.name}</span>
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-xl pl-10 pr-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                placeholder="official@sportsday.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-xl pl-10 pr-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Password
              </label>
              {!isRegister && (
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setShowForgotModal(true);
                  }}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-xl pl-10 pr-10 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-650 dark:hover:text-gray-300 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold transition-all shadow-md duration-300 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              isRegister ? 'Register & Enter' : 'Sign In'
            )}
          </button>
        </form>

        {/* Form selector */}
        {!settings?.has_users && (
          <div className="text-center pt-4 border-t border-gray-150 dark:border-gray-800">
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              {isRegister
                ? 'Already have an official account? Sign In'
                : 'Register as first official / admin'}
            </button>
          </div>
        )}

      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {forgotStep === 'success' ? 'Password Reset!' : 'Reset Password'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {forgotStep === 'request' && 'Enter your email to receive recovery instructions'}
                    {forgotStep === 'otp' && 'Enter the 6-digit code sent to your email'}
                    {forgotStep === 'success' && 'Your password has been successfully updated'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeForgotModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {forgotError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {/* Step 1: Request Reset */}
            {forgotStep === 'request' && (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Account Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="official@sportsday.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-xl pl-10 pr-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={closeForgotModal}
                    className="w-1/2 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-1/2 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
                  </button>
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep('otp')}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    Already have a 6-digit code? Enter code
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Enter OTP & New Password */}
            {forgotStep === 'otp' && (
              <form onSubmit={handleResetWithOtp} className="space-y-4">
                {forgotSuccessMessage && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{forgotSuccessMessage}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="123456"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-xl px-4 py-3 text-center text-lg font-mono tracking-widest text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 6 characters"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Repeat new password"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep('request')}
                    className="w-1/3 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-2/3 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set New Password'}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Success State */}
            {forgotStep === 'success' && (
              <div className="text-center py-4 space-y-4">
                <div className="inline-flex p-3 rounded-full bg-green-500/10 text-green-500">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Your password has been reset successfully. You can now log in with your new credentials.
                </p>
                <button
                  type="button"
                  onClick={closeForgotModal}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  Return to Sign In
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
