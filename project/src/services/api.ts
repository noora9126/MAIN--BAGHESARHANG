import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bsh_customer_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
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
  number_of_adults?: number;
  number_of_children?: number;
  child_ages?: string | null;
  guest_details?: string | null;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_national_id?: string | null;
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
  discount_code?: string | null;
  discount_percent?: number | null;
  discount_amount?: number | null;
  discount_reason?: string | null;
}

export interface GuestDetail {
  name: string;
  nationalId: string;
}

export interface PricingBreakdown {
  adultPrice: number;
  childRates: number[];
  adultTotal: number;
  childTotal: number;
  totalPrice: number;
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

export async function getRoomBySlug(slug: string): Promise<Room> {
  const { data } = await api.get(`/api/rooms/slug/${slug}`);
  return data.room;
}

// ─────────── در دسترس بودن تاریخ‌ها (برای قرمز شدن روزهای رزروشده) ───────────
export async function getRoomAvailability(
  roomId: number,
  from: string,
  to: string
): Promise<{ date: string; status: 'CONFIRMED' | 'PENDING' }[]> {
  const { data } = await api.get(`/api/rooms/${roomId}/availability`, { params: { from, to } });
  return data.dates || [];
}

// ─────────── رزرو ───────────
export async function createReservation(payload: {
  roomId: number;
  checkIn: string;
  checkOut: string;
  numberOfAdults: number;
  numberOfChildren: number;
  childAges: number[];
  guests: GuestDetail[];
  guestName: string;
  guestEmail: string;
  nationalId: string;
  specialRequests?: string;
  discountCode?: string;
}): Promise<{ reservation: Reservation; pricing?: PricingBreakdown }> {
  const { data } = await api.post('/api/reservations', payload);
  return data;
}

// ─────────── اعتبارسنجی کد تخفیف ───────────
export async function validateDiscountCode(payload: {
  code: string;
  roomId: number;
  checkIn: string;
  checkOut: string;
  numberOfAdults: number;
  numberOfChildren: number;
  childAges?: number[];
  phone?: string;
}): Promise<{
  success: boolean;
  discount: { code: string; percent: number; amount: number; reason?: string | null };
  message?: string;
}> {
  const { data } = await api.post('/api/reservations/discount/validate', payload);
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

// ─────────── پرداخت کارت‌به‌کارت (واریزا) ───────────
export async function createVarizaPayment(reservationId: number): Promise<{
  success: boolean;
  payUrl?: string;
  slug?: string;
  amount?: number;
  expiresAt?: string | null;
  reused?: boolean;
  reservationNumber?: string;
  message?: string;
}> {
  const { data } = await api.post('/api/payments/variza/create', { reservationId });
  return data;
}

export type VarizaPaymentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled';

export async function getVarizaPaymentStatus(reservationId: number): Promise<{
  success: boolean;
  found: boolean;
  orderPaid: boolean;
  paymentStatus: VarizaPaymentStatus | null;
  amount?: number | null;
  expiresAt?: string | null;
  paidAt?: string | null;
  reservationNumber?: string | null;
}> {
  const { data } = await api.get('/api/payments/variza/status', { params: { reservationId } });
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
