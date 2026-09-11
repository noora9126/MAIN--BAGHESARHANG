import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { adminLogin, adminMe, adminGetMyPermissions, clearToken, getToken, setToken, type AdminInfo } from '@/services/adminApi';
import { queryClient } from '@/lib/queryClient';

interface AuthContextValue {
  admin: AdminInfo | null;
  permissions: string[];
  isInitializing: boolean;
  hasPermission: (permission: string) => boolean;
  login: (username: string, password: string) => Promise<void>;
  setFromLogin: (token: string, admin: AdminInfo) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isInitializing, setIsInitializing] = useState(() => !!getToken());

  useEffect(() => {
    if (!getToken()) {
      setIsInitializing(false);
      return;
    }
    let cancelled = false;
    Promise.all([adminMe(), adminGetMyPermissions()])
      .then(([me, perms]) => {
        if (!cancelled) {
          setAdmin(me);
          setPermissions(perms.permissions || []);
        }
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
    const perms = await adminGetMyPermissions();
    setPermissions(perms.permissions || []);
    queryClient.clear();
  }, []);

  const setFromLogin = useCallback((token: string, adminData: AdminInfo) => {
    setToken(token);
    setAdmin(adminData);
    adminGetMyPermissions().then((perms) => setPermissions(perms.permissions || []));
    queryClient.clear();
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setAdmin(null);
    setPermissions([]);
    queryClient.clear();
  }, []);

  const hasPermission = useCallback(
    (permission: string) => permissions.includes(permission),
    [permissions]
  );

  const value = useMemo(
    () => ({ admin, permissions, isInitializing, hasPermission, login, setFromLogin, logout }),
    [admin, permissions, isInitializing, hasPermission, login, setFromLogin, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth باید داخل AuthProvider استفاده شود');
  return ctx;
}
