import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../lib/api';

const AuthContext = createContext(null);
const USER_CACHE_KEY = 'mindcare.user';

function getCachedUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_CACHE_KEY) || 'null');
  } catch {
    return null;
  }
}

function setCachedUser(user) {
  if (!user) {
    localStorage.removeItem(USER_CACHE_KEY);
    return;
  }
  localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
}

function getUserFromToken(token) {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(normalized));
    if (!json?.sub || !json?.role) return null;
    return {
      id: json.sub,
      role: json.role,
      name: json.name || '',
      email: json.email || '',
      patientId: json.patientId || null,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const tokenAtBoot = getToken();
  const cachedUser = tokenAtBoot ? getCachedUser() : null;
  const tokenUser = tokenAtBoot ? getUserFromToken(tokenAtBoot) : null;
  const bootUser = cachedUser || tokenUser || null;
  const [user, setUser] = useState(bootUser);
  const [loading, setLoading] = useState(Boolean(tokenAtBoot && !bootUser));

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setCachedUser(null);
      setLoading(false);
      return;
    }
    api('/auth/me')
      .then((u) => {
        setUser(u);
        setCachedUser(u);
      })
      .catch(() => {
        setToken(null);
        setCachedUser(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    async login(payload) {
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
      setToken(data.token);
      setUser(data.user);
      setCachedUser(data.user);
      return data.user;
    },
    async setup(payload) {
      const data = await api('/auth/setup', { method: 'POST', body: JSON.stringify(payload) });
      setToken(data.token);
      setUser(data.user);
      setCachedUser(data.user);
      return data.user;
    },
    async setupPortalPassword(payload) {
      const data = await api('/auth/portal-password', { method: 'POST', body: JSON.stringify(payload) });
      setToken(data.token);
      setUser(data.user);
      setCachedUser(data.user);
      return data.user;
    },
    logout() {
      setToken(null);
      setCachedUser(null);
      setUser(null);
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
