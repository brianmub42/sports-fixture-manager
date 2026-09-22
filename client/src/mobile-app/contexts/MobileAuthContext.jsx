import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/+$/, '');

const MobileAuthContext = createContext();

export function MobileAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('mobile_token') || localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem('mobile_user') || localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });
  const [activeOrgSlug, setActiveOrgSlug] = useState(() => {
    return localStorage.getItem('mobile_org_slug') || localStorage.getItem('organization_slug') || 'demo-tournament';
  });
  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticated = !!token && !!user;

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, {
        email: email.trim().toLowerCase(),
        password
      });

      const { token: receivedToken, user: receivedUser } = res.data;
      const orgSlug = receivedUser?.organization_slug || 'demo-tournament';

      localStorage.setItem('mobile_token', receivedToken);
      localStorage.setItem('mobile_user', JSON.stringify(receivedUser));
      localStorage.setItem('mobile_org_slug', orgSlug);

      setToken(receivedToken);
      setUser(receivedUser);
      setActiveOrgSlug(orgSlug);

      return receivedUser?.role || 'scorekeeper';
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('mobile_token');
    localStorage.removeItem('mobile_user');
    setToken(null);
    setUser(null);
  };

  return (
    <MobileAuthContext.Provider
      value={{
        token,
        user,
        activeOrgSlug,
        setActiveOrgSlug,
        isAuthenticated,
        isLoading,
        login,
        logout
      }}
    >
      {children}
    </MobileAuthContext.Provider>
  );
}

export function useMobileAuth() {
  const context = useContext(MobileAuthContext);
  if (!context) {
    throw new Error('useMobileAuth must be used within a MobileAuthProvider');
  }
  return context;
}
