import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Room, Reservation, GuestDetail } from '../services/api';

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

const STORAGE_KEY = 'bsh_booking';

interface BookingContextValue {
  booking: BookingState;
  setBooking: (patch: Partial<BookingState>) => void;
  resetBooking: () => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

function load(): BookingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initial;
    return { ...initial, ...JSON.parse(raw) };
  } catch {
    return initial;
  }
}

export function BookingProvider({ children }: { children: ReactNode }) {
  const [booking, setBookingState] = useState<BookingState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(booking));
    } catch {
      // ignore
    }
  }, [booking]);

  const setBooking = (patch: Partial<BookingState>) => {
    setBookingState((prev) => ({ ...prev, ...patch }));
  };

  const resetBooking = () => {
    setBookingState(initial);
  };

  return <BookingContext.Provider value={{ booking, setBooking, resetBooking }}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
}
