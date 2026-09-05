import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [isLoading, setIsLoading] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      // Fetch user profile
      authApi.me()
        .then(res => {
          setUser(res.data.user);
          setIsLoading(false);
        })
        .catch(() => {
          // Token expired or invalid
          setToken('');
          setUser(null);
          localStorage.removeItem('token');
          setIsLoading(false);
        });
    } else {
      localStorage.removeItem('token');
      setUser(null);
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await authApi.register({ name, email, password });
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
  };

  const isSuperadmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin' || isSuperadmin;
  const isScorekeeper = user?.role === 'admin' || user?.role === 'scorekeeper' || isSuperadmin;
  const isMediaManager = user?.role === 'admin' || user?.role === 'media_manager' || isSuperadmin;
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      isAdmin,
      isSuperadmin,
      isScorekeeper,
      isMediaManager,
      isAuthenticated,
      login,
      register,
      logout
    }}>
      {!isLoading && children}
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
