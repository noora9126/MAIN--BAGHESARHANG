import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export interface Room {
  id: number;
  roomNumber?: string;
  name: string;
  slug?: string;
  type?: string;
  capacity: number;
  extraCapacity?: number;
  pricePerNight: number;
  area?: string;
  rating?: number;
  popular?: boolean;
  description?: string;
  amenities?: string[];
  images?: string[];
  image?: string;
  status?: string;
}

export interface Reservation {
  id: number;
  reservation_number: string;
  room_id: number;
  room_name: string;
  room_number?: string;
  check_in: string;
  check_out: string;
  number_of_nights: number;
  number_of_guests: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  special_requests?: string;
  price_per_night: number;
  total_price: number;
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
  payment_status: 'PENDING' | 'SUCCESS' | 'FAILED';
  sms_status: 'PENDING' | 'SENT' | 'FAILED';
  authority?: string;
  ref_id?: string;
  admin_notes?: string;
  created_at: string;
  paid_at?: string;
  checked_in_at?: string;
  checked_out_at?: string;
  room_image?: string;
}

// ─────────── اتاق‌ها ───────────
export async function getRooms(): Promise<Room[]> {
  const { data } = await api.get('/api/rooms');
  return data.rooms || [];
}

export async function getRoom(id: number): Promise<Room> {
  const { data } = await api.get(`/api/rooms/${id}`);
  return data.room;
}

// ─────────── رزرو ───────────
export async function createReservation(payload: {
  roomId: number;
  checkIn: string;
  checkOut: string;
  numberOfGuests: number;
  guestName: string;
  guestEmail: string;
  specialRequests?: string;
}): Promise<{ reservation: Reservation }> {
  const { data } = await api.post('/api/reservations', payload);
  return data;
}

export async function getReservation(id: number | string): Promise<Reservation> {
  const { data } = await api.get(`/api/reservations/${id}`);
  return data.reservation;
}

// ─────────── تایید شماره ───────────
export async function requestOtp(phone: string): Promise<{
  sessionId: string;
  attempts: number;
  maxAttempts: number;
  devCode?: string;
  message: string;
}> {
  const { data } = await api.post('/api/reservations/verify-phone', { phone });
  return data;
}

export async function verifyOtp(sessionId: string, code: string): Promise<{
  success: boolean;
  verified: boolean;
  phone: string;
  attemptsLeft?: number;
  message: string;
}> {
  const { data } = await api.post('/api/reservations/verify-code', { sessionId, code });
  return data;
}

export async function attachPhone(reservationId: number, phone: string) {
  const { data } = await api.post('/api/reservations/attach-phone', { reservationId, phone });
  return data;
}

// ─────────── پرداخت ───────────
export async function requestPayment(reservationId: number): Promise<{
  success: boolean;
  mode?: 'gateway' | 'manual';
  paymentURL?: string;
  authority?: string;
  amount?: number;
  message: string;
}> {
  const { data } = await api.post('/api/payments/request', { reservationId });
  return data;
}

export async function verifyPayment(query: {
  authority: string;
  status?: string;
  reservationId: number;
}): Promise<{
  success: boolean;
  message: string;
  reservationNumber?: string;
  refId?: string;
}> {
  const { data } = await api.get('/api/payments/verify', { params: query });
  return data;
}

export async function manualConfirmPayment(reservationId: number) {
  const { data } = await api.post('/api/payments/manual-confirm', { reservationId });
  return data;
}

export function apiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { message?: string })?.message;
    if (msg) return msg;
    if (err.code === 'ECONNABORTED' || !err.response) return 'خطا در اتصال به سرور';
    return `خطا (${err.response?.status || ''})`;
  }
  return 'خطای ناشناخته';
}
