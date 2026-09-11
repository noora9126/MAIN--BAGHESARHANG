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
  number_of_adults?: number;
  number_of_children?: number;
  child_ages?: string | null;
  guest_details?: string | null;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_national_id?: string | null;
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
  discount_code?: string | null;
  discount_percent?: number | null;
  discount_amount?: number | null;
  discount_reason?: string | null;
}

export interface CalendarRoom {
  id: number;
  name: string;
  image: string | null;
  price_per_night: number;
  capacity: number;
  extra_capacity: number;
}

export interface CalendarBooking {
  id: number;
  reservation_number: string;
  room_id: number;
  check_in: string;
  check_out: string;
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'CANCELLATION_REQUESTED' | 'REFUND_PENDING';
  guest_name: string;
  number_of_adults: number;
  number_of_children: number;
  payment_status: string;
}

export async function adminAvailability(from: string, to: string): Promise<{ rooms: CalendarRoom[]; bookings: CalendarBooking[] }> {
  const { data } = await adminApi.get('/api/admin/availability', { params: { from, to } });
  return data;
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
        if (!isAdminRoot) window.location.href = '/login';
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
  hotel_name: string;
  hotel_phone: string;
  hotel_phone2: string;
  hotel_email: string;
  hotel_address: string;
  hotel_about: string;
  check_in_time: string;
  check_out_time: string;
  kavenegar_api_key: string;
  kavenegar_sender: string;
  melipayamak_api_token: string;
  melipayamak_sender: string;
  zarinpal_merchant_id: string;
}

export async function adminSettings(): Promise<Settings> {
  const { data } = await adminApi.get('/api/admin/settings');
  return data.settings;
}

export async function adminUpdateSettings(body: Partial<Settings>) {
  const { data } = await adminApi.put('/api/admin/settings', body);
  return data;
}

export async function adminRooms(): Promise<Room[]> {
  const { data } = await adminApi.get('/api/admin/rooms');
  return data.rooms;
}

export async function adminCreateRoom(body: Partial<Room>): Promise<Room> {
  const { data } = await adminApi.post('/api/admin/rooms', body);
  return data.room;
}

export async function adminUpdateRoom(id: number, body: Record<string, unknown>) {
  const { data } = await adminApi.put(`/api/admin/rooms/${id}`, body);
  return data;
}

// ─────────── اعلان‌ها ───────────
export interface AdminNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  ref_type: string | null;
  ref_id: number | null;
  is_read: number;
  created_at: string;
}

export async function adminNotifications(limit = 50): Promise<{ notifications: AdminNotification[]; unreadCount: number }> {
  const { data } = await adminApi.get('/api/admin/notifications', { params: { limit } });
  return data;
}

export async function adminMarkNotificationRead(id: number): Promise<{ unreadCount: number }> {
  const { data } = await adminApi.post(`/api/admin/notifications/${id}/read`);
  return data;
}

export async function adminMarkAllNotificationsRead(): Promise<{ unreadCount: number }> {
  const { data } = await adminApi.post('/api/admin/notifications/read-all');
  return data;
}

// ─────────── تخفیف‌ها ───────────
export interface DiscountRow {
  id: number;
  code: string;
  discount_percent: number;
  description: string | null;
  reason: string | null;
  customer_phones: string | null;
  valid_from: string | null;
  valid_until: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: number;
  created_at: string;
  reservation_count?: number;
}

export async function adminDiscounts(): Promise<DiscountRow[]> {
  const { data } = await adminApi.get('/api/admin/discounts');
  return data.discounts;
}

export async function adminCreateDiscount(body: Record<string, unknown>): Promise<DiscountRow> {
  const { data } = await adminApi.post('/api/admin/discounts', body);
  return data.discount;
}

export async function adminUpdateDiscount(id: number, body: Record<string, unknown>): Promise<DiscountRow> {
  const { data } = await adminApi.put(`/api/admin/discounts/${id}`, body);
  return data.discount;
}

export async function adminToggleDiscount(id: number): Promise<{ isActive: boolean }> {
  const { data } = await adminApi.post(`/api/admin/discounts/${id}/toggle`);
  return data;
}

export async function adminDeleteDiscount(id: number) {
  const { data } = await adminApi.delete(`/api/admin/discounts/${id}`);
  return data;
}

// ─────────── نظرات ───────────
export interface ReviewRow {
  id: number;
  source: string;
  source_url: string | null;
  author: string | null;
  rating: number | null;
  rating_label: string | null;
  title: string | null;
  content: string | null;
  stay_date: string | null;
  room_type: string | null;
  status: 'ACTIVE' | 'HIDDEN';
  created_at: string;
}

export async function adminReviews(): Promise<{ reviews: ReviewRow[]; stats: { total: number; active: number; avgRating: number } }> {
  const { data } = await adminApi.get('/api/admin/reviews');
  return data;
}

export async function adminSyncReviews(): Promise<{ result: Record<string, unknown>; message: string }> {
  const { data } = await adminApi.post('/api/admin/reviews/sync');
  return data;
}

export async function adminToggleReview(id: number): Promise<{ status: string }> {
  const { data } = await adminApi.post(`/api/admin/reviews/${id}/toggle`);
  return data;
}

export async function adminDeleteReview(id: number) {
  const { data } = await adminApi.delete(`/api/admin/reviews/${id}`);
  return data;
}

export { apiError };

// ─────────── مدیریت کاربران (فقط SUPER_ADMIN) ───────────
export interface AdminUser {
  id: number;
  username: string;
  name: string | null;
  email: string | null;
  role: string;
  is_active?: number;
  last_login?: string | null;
  created_at: string;
}

export interface RoleInfo {
  name: string;
  label: string;
  permissions: string[];
}

export async function adminListUsers(): Promise<AdminUser[]> {
  const { data } = await adminApi.get('/api/admin/users');
  return data.users;
}

export async function adminGetUser(id: number): Promise<AdminUser> {
  const { data } = await adminApi.get(`/api/admin/users/${id}`);
  return data.user;
}

export async function adminCreateUser(body: { username: string; password: string; name?: string; email?: string; role: string }): Promise<AdminUser> {
  const { data } = await adminApi.post('/api/admin/users', body);
  return data.user;
}

export async function adminUpdateUser(id: number, body: { name?: string; email?: string; role?: string; password?: string }): Promise<AdminUser> {
  const { data } = await adminApi.put(`/api/admin/users/${id}`, body);
  return data.user;
}

export async function adminDisableUser(id: number): Promise<void> {
  await adminApi.post(`/api/admin/users/${id}/disable`);
}

export async function adminEnableUser(id: number): Promise<void> {
  await adminApi.post(`/api/admin/users/${id}/enable`);
}

export async function adminDeleteUser(id: number): Promise<void> {
  await adminApi.delete(`/api/admin/users/${id}`);
}

export async function adminGetRoles(): Promise<RoleInfo[]> {
  const { data } = await adminApi.get('/api/admin/roles');
  return data.roles;
}

export async function adminGetMyPermissions(): Promise<{ role: string; permissions: string[] }> {
  const { data } = await adminApi.get('/api/admin/permissions');
  return data;
}

// ─────────── درخواست‌های لغو و بازپرداخت ───────────
export interface RefundRow {
  id: number;
  reservation_id: number;
  requested_by: number | null;
  processed_by: number | null;
  amount: number;
  refund_card_number: string | null;
  refund_card_number_masked: string | null;
  refund_card_holder_name: string | null;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CANCELLED';
  status_label: string;
  requested_at: string;
  processed_at: string | null;
  admin_note: string | null;
  rejection_reason: string | null;
  transaction_ref: string | null;
  created_at: string;
  updated_at: string;
  reservation_number: string;
  room_name: string;
  room_number: string | null;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  total_price: number;
  payment_status: string;
}

export async function adminRefunds(params: { status?: string; search?: string; page?: number; limit?: number } = {}): Promise<{
  refunds: RefundRow[];
  total: number;
  page: number;
  pages: number;
}> {
  const { data } = await adminApi.get('/api/admin/refunds', { params });
  return data;
}

export async function adminRefundDetail(id: number): Promise<RefundRow> {
  const { data } = await adminApi.get(`/api/admin/refunds/${id}`);
  return data.refund;
}

export async function adminRefundCardDetails(id: number): Promise<{ refund_card_number: string | null; refund_card_holder_name: string | null }> {
  const { data } = await adminApi.get(`/api/admin/refunds/${id}/card-details`);
  return data.cardDetails;
}

export async function adminProcessRefund(id: number) {
  const { data } = await adminApi.post(`/api/admin/refunds/${id}/process`);
  return data;
}

export async function adminConfirmRefundPayment(id: number, transactionRef?: string) {
  const { data } = await adminApi.post(`/api/admin/refunds/${id}/confirm-payment`, { transactionRef });
  return data;
}

export async function adminRejectRefund(id: number, reason: string) {
  const { data } = await adminApi.post(`/api/admin/refunds/${id}/reject`, { reason });
  return data;
}
