'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clearSession, getStoredUser, getToken, login as apiLogin, logout as apiLogout } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setUser(getStoredUser());
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function login(email, password) {
    const session = await apiLogin(email, password);
    setUser(session.user);
    return session;
  }

  async function logout() {
    await apiLogout();
    setUser(null);
  }

  function clear() {
    clearSession();
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      ready,
      isAuthenticated: Boolean(getToken()),
      login,
      logout,
      clear,
    }),
    [user, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth trebuie folosit în AuthProvider.');
  return value;
}
