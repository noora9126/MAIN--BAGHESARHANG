import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { adminLogin, adminMe, clearToken, getToken, setToken, type AdminInfo } from '@/services/adminApi';
import { queryClient } from '@/lib/queryClient';

interface AuthContextValue {
  admin: AdminInfo | null;
  isInitializing: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [isInitializing, setIsInitializing] = useState(() => !!getToken());

  useEffect(() => {
    if (!getToken()) {
      setIsInitializing(false);
      return;
    }
    let cancelled = false;
    adminMe()
      .then((me) => {
        if (!cancelled) setAdmin(me);
      })
      .catch((err) => {
        console.error('AuthProvider: Failed to fetch admin:', err.message);
        clearToken();
      })
      .finally(() => {
        if (!cancelled) setIsInitializing(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { token, admin: loggedIn } = await adminLogin(username, password);
    setToken(token);
    setAdmin(loggedIn);
    queryClient.clear();
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setAdmin(null);
    queryClient.clear();
  }, []);

  const value = useMemo(
    () => ({ admin, isInitializing, login, logout }),
    [admin, isInitializing, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth باید داخل AuthProvider استفاده شود');
  return ctx;
}
