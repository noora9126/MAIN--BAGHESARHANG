import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  clearCustomerToken,
  customerLogin,
  customerMe,
  customerLogout,
  getCustomerToken,
  setCustomerToken,
  type CustomerInfo,
} from '@/services/customerApi';
import { queryClient } from '@/lib/queryClient';
import { clearBookingForAllUsers } from '@/context/BookingContext';

interface CustomerAuthContextValue {
  customer: CustomerInfo | null;
  isInitializing: boolean;
  login: (identifier: string, password: string) => Promise<CustomerInfo>;
  setFromLogin: (token: string, customer: CustomerInfo) => void;
  logout: () => void;
  setCustomer: (customer: CustomerInfo | null) => void;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [isInitializing, setIsInitializing] = useState(() => !!getCustomerToken());
  const prevCustomerIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!getCustomerToken()) {
      setIsInitializing(false);
      return;
    }
    let cancelled = false;
    customerMe()
      .then((me) => {
        if (!cancelled) {
          prevCustomerIdRef.current = me.id;
          setCustomer(me);
        }
      })
      .catch((err) => {
        console.error('CustomerAuthProvider: Failed to fetch customer:', err.message);
        clearCustomerToken();
        clearBookingForAllUsers();
      })
      .finally(() => {
        if (!cancelled) setIsInitializing(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const data = await customerLogin({ mobile: identifier, password });
    if (!data.token || !data.customer) {
      throw new Error(data.message || 'ورود ناموفق بود');
    }
    if (prevCustomerIdRef.current && prevCustomerIdRef.current !== data.customer.id) {
      clearBookingForAllUsers();
    }
    prevCustomerIdRef.current = data.customer.id;
    setCustomerToken(data.token);
    setCustomer(data.customer);
    queryClient.clear();
    return data.customer;
  }, []);

  const setFromLogin = useCallback((token: string, customerData: CustomerInfo) => {
    if (prevCustomerIdRef.current && prevCustomerIdRef.current !== customerData.id) {
      clearBookingForAllUsers();
    }
    prevCustomerIdRef.current = customerData.id;
    setCustomerToken(token);
    setCustomer(customerData);
    queryClient.clear();
  }, []);

  const logout = useCallback(() => {
    customerLogout().catch(() => undefined);
    clearCustomerToken();
    clearBookingForAllUsers();
    prevCustomerIdRef.current = null;
    setCustomer(null);
    queryClient.clear();
  }, []);

  const value = useMemo(
    () => ({ customer, isInitializing, login, setFromLogin, logout, setCustomer }),
    [customer, isInitializing, login, setFromLogin, logout]
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuth باید داخل CustomerAuthProvider استفاده شود');
  return ctx;
}