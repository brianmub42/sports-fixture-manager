import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMobileAuth } from '../contexts/MobileAuthContext.jsx';
import { useMobileTheme } from '../contexts/MobileThemeContext.jsx';

export default function MobileIndex() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useMobileAuth();
  const { colors } = useMobileTheme();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin' || user.role === 'scorekeeper' || user.role === 'superadmin') {
        navigate('/app/scorekeeper/fixtures', { replace: true });
      } else {
        navigate('/app/viewer', { replace: true });
      }
    } else {
      navigate('/app/login', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div
      className="flex-1 flex items-center justify-center min-h-[60vh]"
      style={{ backgroundColor: colors.background }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <span className="text-xs font-bold text-slate-400">Loading FixtureGrid Mobile...</span>
      </div>
    </div>
  );
}
