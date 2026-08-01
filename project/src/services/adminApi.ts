import axios from 'axios';
import { API_URL, apiError } from './api';
import type { Room } from './api';
export type { Room } from './api';

export interface AdminInfo {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  last_login?: string;
}

export interface ReservationRow extends Record<string, unknown> {
  id: number;
  reservation_number: string;
  room_id: number;
  room_number?: string;
  room_name: string;
  check_in: string;
  check_out: string;
  number_of_nights: number;
  number_of_guests: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  special_requests?: string;
  total_price: number;
  price_per_night: number;
  status: string;
  payment_status: string;
  sms_status: string;
  authority?: string;
  ref_id?: string;
  admin_notes?: string;
  created_at: string;
  paid_at?: string | null;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  room_image?: string;
}

export interface GuestRow {
  phone: string;
  name: string;
  email: string;
  totalBookings: number;
  lastReservation: string;
  totalSpent: number;
  notes: string;
}

export const TOKEN_KEY = 'bsh_admin_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export const adminApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

adminApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearToken();
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
        // Only redirect if we're already in admin area
        const isAdminRoot = window.location.pathname === '/admin' || window.location.pathname === '/admin/';
        if (!isAdminRoot) window.location.href = '/admin/login';
      }
    }
    return Promise.reject(err);
  }
);

// ─────────── احراز هویت ───────────
export async function adminLogin(username: string, password: string): Promise<{ token: string; admin: AdminInfo }> {
  const { data } = await adminApi.post('/api/admin/login', { username, password });
  return data;
}

export async function adminMe(): Promise<AdminInfo> {
  const { data } = await adminApi.get('/api/admin/me');
  return data.admin;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const { data } = await adminApi.post('/api/admin/change-password', { currentPassword, newPassword });
  return data;
}

// ─────────── رزروها ───────────
export interface ListParams {
  status?: string;
  search?: string;
  roomId?: number;
  from?: string;
  to?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export async function adminReservations(params: ListParams = {}): Promise<{
  reservations: ReservationRow[];
  total: number;
  page: number;
  pages: number;
}> {
  const { data } = await adminApi.get('/api/admin/reservations', { params });
  return data;
}

export async function adminReservationDetail(id: number): Promise<ReservationRow> {
  const { data } = await adminApi.get(`/api/admin/reservations/${id}`);
  return data.reservation;
}

export async function adminUpdateReservation(id: number, body: { status?: string; adminNotes?: string; numberOfGuests?: number }) {
  const { data } = await adminApi.put(`/api/admin/reservations/${id}`, body);
  return data;
}

export async function adminCheckIn(id: number) {
  const { data } = await adminApi.post(`/api/admin/reservations/${id}/check-in`);
  return data;
}

export async function adminCheckOut(id: number) {
  const { data } = await adminApi.post(`/api/admin/reservations/${id}/check-out`);
  return data;
}

export async function adminCancel(id: number) {
  const { data } = await adminApi.post(`/api/admin/reservations/${id}/cancel`);
  return data;
}

export async function adminSendReservationSms(id: number, message: string) {
  const { data } = await adminApi.post(`/api/admin/reservations/${id}/send-sms`, { message });
  return data;
}

// ─────────── مهمانان ───────────
export async function adminGuests(params: ListParams = {}): Promise<{ guests: GuestRow[]; total: number; page: number; pages: number }> {
  const { data } = await adminApi.get('/api/admin/guests', { params });
  return data;
}

export async function adminGuestDetail(phone: string): Promise<{ guest: GuestRow; reservations: ReservationRow[] }> {
  const { data } = await adminApi.get(`/api/admin/guests/${phone}`);
  return data;
}

export async function adminUpdateGuestNotes(phone: string, notes: string) {
  const { data } = await adminApi.put(`/api/admin/guests/${phone}/notes`, { notes });
  return data;
}

export async function adminSendGuestSms(phone: string, message: string) {
  const { data } = await adminApi.post(`/api/admin/guests/${phone}/send-sms`, { message });
  return data;
}

// ─────────── تحلیل‌ها ───────────
export async function adminDashboard(): Promise<{
  totalReservations: number;
  monthlyReservations: number;
  totalRevenue: number;
  monthlyRevenue: number;
  occupancy: number;
  pendingPayments: number;
  todayReservations: number;
  todayCheckIns: number;
  averageNights: number;
  trend: { month: string; revenue: number; count: number }[];
  topRooms: { id: number; name: string; image: string; bookings: number; revenue: number }[];
}> {
  const { data } = await adminApi.get('/api/admin/analytics/dashboard');
  return data.data;
}

export async function adminRevenue(from?: string, to?: string, groupBy = 'month'): Promise<{ period: string; label: string; revenue: number; count: number }[]> {
  const { data } = await adminApi.get('/api/admin/analytics/revenue', { params: { from, to, groupBy } });
  return data.data;
}

export async function adminOccupancy(from: string, to: string): Promise<{ date: string; label: string; occupancy: number; booked: number; available: number }[]> {
  const { data } = await adminApi.get('/api/admin/analytics/occupancy', { params: { from, to } });
  return data.data;
}

export async function adminRoomsPerformance(from?: string, to?: string): Promise<{ id: number; name: string; image: string; pricePerNight: number; capacity: number; bookings: number; revenue: number; roomNights: number }[]> {
  const { data } = await adminApi.get('/api/admin/analytics/rooms', { params: { from, to } });
  return data.rooms;
}

export async function adminGuestStats(): Promise<{ totalGuests: number; newThisMonth: number; repeatGuests: number }> {
  const { data } = await adminApi.get('/api/admin/analytics/guests');
  return data.data;
}

// ─────────── تنظیمات و اتاق‌ها ───────────
export interface Settings {
  hotel_phone: string;
  hotel_phone2: string;
  hotel_email: string;
  check_in_time: string;
  check_out_time: string;
  kavenegar_api_key: string;
  kavenegar_sender: string;
  melipayamak_api_token: string;
  melipayamak_sender: string;
  zarinpal_merchant_id: string;
  zarinpal_sandbox: string;
}

export async function adminSettings(): Promise<Settings> {
  const { data } = await adminApi.get('/api/admin/settings');
  return data.settings;
}

export async function adminUpdateSettings(body: Partial<Settings>) {
  const { data } = await adminApi.put('/api/admin/settings', body);
  return data;
}

export async function adminTestSms(phone: string) {
  const { data } = await adminApi.post('/api/admin/settings/test-sms', { phone });
  return data;
}

export async function adminRooms(): Promise<Room[]> {
  const { data } = await adminApi.get('/api/admin/rooms');
  return data.rooms;
}

export async function adminUpdateRoom(id: number, body: Record<string, unknown>) {
  const { data } = await adminApi.put(`/api/admin/rooms/${id}`, body);
  return data;
}

export { apiError };
