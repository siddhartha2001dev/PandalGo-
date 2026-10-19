import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, clearAuthTokens, getStoredRefreshToken, restoreAuthSession, saveAuthTokens } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      await restoreAuthSession();
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.user);
      }
    } catch (err) {
      // Only clear a session when the server explicitly rejects it. Keep the
      // current user during temporary network/server failures.
      if (err.response?.status === 401) {
        clearAuthTokens();
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    if (res.data.success) {
      saveAuthTokens(res.data);
      setUser(res.data.user);
      return res.data;
    }
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    if (res.data.success) {
      saveAuthTokens(res.data);
      setUser(res.data.user);
      return res.data;
    }
  };

  const logout = async () => {
    const refreshToken = getStoredRefreshToken();
    try {
      // Keep credentials enabled so the server also clears legacy fallback
      // cookies; the server revokes the explicit tab token above any cookie.
      await api.post('/auth/logout', { refreshToken });
    } finally {
      clearAuthTokens();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin: user?.role === 'admin',
        login,
        register,
        logout,
        checkAuth,
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
