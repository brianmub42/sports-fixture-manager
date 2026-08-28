import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';
import { registerForPushNotificationsAsync } from '../services/notifications';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  orgSlug: string | null;
  login: (email: string, password_hash: string) => Promise<string>; // returns role
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [orgSlug, setOrgSlug] = useState<string | null>(null);

  useEffect(() => {
    async function restoreSession() {
      try {
        const token = await authService.getSessionToken();
        const storedUser = await authService.getSessionUser();
        const storedOrgSlug = await authService.getActiveOrgSlug();

        if (token && storedUser) {
          setUser(storedUser);
          setOrgSlug(storedOrgSlug);
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error('Failed to restore auth session:', err);
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotificationsAsync();
    }
  }, [isAuthenticated]);

  const login = async (email: string, password_hash: string): Promise<string> => {
    try {
      const data = await authService.login({ email, password_hash });
      
      // Determine org slug (fall back to email workspace code or generic if missing)
      const userOrgSlug = data.user?.organization_slug || data.organization?.slug || 'demo-tournament';

      await authService.saveSession(data.token, data.user, userOrgSlug);
      
      setUser(data.user);
      setOrgSlug(userOrgSlug);
      setIsAuthenticated(true);
      return data.user?.role || 'viewer';
    } catch (err: any) {
      console.error('Login action error:', err);
      throw new Error(err.response?.data?.error || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await authService.clearSession();
      setUser(null);
      setOrgSlug(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        orgSlug,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
