import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Room, Reservation, GuestDetail } from '../services/api';
import { CUSTOMER_TOKEN_KEY } from '@/services/customerApi';

export interface BookingState {
  step: number;
  room?: Room;
  checkIn?: string;
  checkOut?: string;
  numberOfAdults: number;
  numberOfChildren: number;
  childAges: number[];
  guests: GuestDetail[];
  nights: number;
  guestName: string;
  guestEmail: string;
  nationalId: string;
  specialRequests: string;
  phone: string;
  phoneVerified: boolean;
  reservation?: Reservation;
}

const initial: BookingState = {
  step: 1,
  numberOfAdults: 2,
  numberOfChildren: 0,
  childAges: [],
  guests: [],
  nights: 0,
  guestName: '',
  guestEmail: '',
  nationalId: '',
  specialRequests: '',
  phone: '',
  phoneVerified: false,
};

function getStorageKey(): string {
  const token = localStorage.getItem(CUSTOMER_TOKEN_KEY);
  return token ? `bsh_booking_${token}` : 'bsh_booking_guest';
}

interface BookingContextValue {
  booking: BookingState;
  setBooking: (patch: Partial<BookingState>) => void;
  resetBooking: () => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

function loadFromStorage(storageKey: string): BookingState {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return initial;
    return { ...initial, ...JSON.parse(raw) };
  } catch {
    return initial;
  }
}

export function BookingProvider({ children }: { children: ReactNode }) {
  const [booking, setBookingState] = useState<BookingState>(() => loadFromStorage(getStorageKey()));

  useEffect(() => {
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(booking));
    } catch {
      // ignore
    }
  }, [booking]);

  const setBooking = useCallback((patch: Partial<BookingState>) => {
    setBookingState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetBooking = useCallback(() => {
    setBookingState(initial);
    try {
      localStorage.removeItem(getStorageKey());
    } catch {
      // ignore
    }
  }, []);

  return <BookingContext.Provider value={{ booking, setBooking, resetBooking }}>{children}</BookingContext.Provider>;
}

export function clearBookingForAllUsers(): void {
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith('bsh_booking_') || key === 'bsh_booking') {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }
}

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
}
