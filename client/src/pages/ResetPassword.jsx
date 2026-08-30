import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api.js';
import { Lock, KeyRound, ShieldAlert, CheckCircle2, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Validate the token on mount
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setError('Missing password reset token in link.');
        setIsVerifying(false);
        return;
      }

      try {
        await authApi.verifyResetCode({ token });
        setTokenValid(true);
      } catch (err) {
        setError(err.response?.data?.error || 'Invalid or expired password reset link.');
        setTokenValid(false);
      } finally {
        setIsVerifying(false);
      }
    }

    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await authApi.resetPassword({
        token,
        newPassword
      });
      setIsSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. Please request a new link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-white via-slate-50 to-gray-100 dark:from-gray-950 dark:via-slate-900 dark:to-gray-950">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-900/60 backdrop-blur-md p-8 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl">
        
        {/* Back navigation */}
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </button>

        {/* Title */}
        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-3">
            <KeyRound className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Set New Password
          </h2>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            Create a secure new password for your official account
          </p>
        </div>

        {/* Loading state */}
        {isVerifying ? (
          <div className="text-center py-8 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
            <p className="text-xs text-gray-500 dark:text-gray-400">Verifying reset link security...</p>
          </div>
        ) : isSuccess ? (
          /* Success state */
          <div className="text-center py-6 space-y-5">
            <div className="inline-flex p-3 rounded-full bg-green-500/10 text-green-500">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Password Updated!</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Your password has been changed successfully. You can now log in.
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all shadow-md"
            >
              Sign In to Your Account
            </button>
          </div>
        ) : !tokenValid ? (
          /* Invalid Token State */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>{error || 'This password reset link is invalid or has expired.'}</span>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-gray-900 dark:bg-gray-800 hover:bg-gray-800 text-white rounded-xl font-bold text-sm transition-all"
            >
              Request a New Reset Link
            </button>
          </div>
        ) : (
          /* Reset Password Form */
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-xl pl-10 pr-10 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-xl pl-10 pr-10 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold transition-all shadow-md duration-300 cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save New Password'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
