import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useOrganization } from '../contexts/OrganizationContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../hooks/useFixtures.js';
import { Lock, Mail, User, ShieldAlert, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { login, register, isAuthenticated } = useAuth();
  const { activeOrg } = useOrganization();
  const navigate = useNavigate();
  const { data: settings } = useSettings();
 
  const [isRegister, setIsRegister] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('register') === 'true';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-white via-slate-50 to-gray-100 dark:from-gray-950 dark:via-slate-900 dark:to-gray-950">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-900/60 backdrop-blur-md p-8 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl">
        
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
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
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
    </div>
  );
}
