import axios from 'axios';
import { API_URL, apiError } from './api';
export { apiError };

export interface CustomerInfo {
  id: number;
  full_name: string;
  mobile: string;
  email: string | null;
  national_code: string | null;
  username: string | null;
  is_active?: number;
  created_at?: string;
  last_login?: string | null;
}

export interface OtpRequestResult {
  success: boolean;
  message: string;
  sessionId: string;
  expiresInSeconds: number;
  devCode?: string;
}

export interface OtpVerifyResult {
  success: boolean;
  message: string;
  resetToken?: string;
  expiresInMinutes?: number;
}

export interface ReservationInfo {
  id: number;
  reservation_number: string;
  room_name: string;
  room_number: string | null;
  check_in: string;
  check_out: string;
  number_of_nights: number;
  number_of_guests: number;
  guest_name: string;
  price_per_night: number;
  total_price: number;
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'CANCELLATION_REQUESTED' | 'REFUND_PENDING';
  payment_status: 'PENDING' | 'SUCCESS' | 'FAILED';
  discount_code: string | null;
  discount_percent: number | null;
  discount_amount: number | null;
  created_at: string;
  paid_at: string | null;
  // Detail-only fields
  guest_email?: string;
  guest_national_id?: string;
  number_of_adults?: number;
  number_of_children?: number;
  child_ages?: string;
  guest_details?: string;
  special_requests?: string;
  admin_notes?: string;
}

export interface CustomerNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  ref_type: string | null;
  ref_id: number | null;
  is_read: number;
  created_at: string;
}

export interface DashboardStats {
  totalReservations: number;
  upcomingReservations: number;
  totalSpent: number;
  completedStays: number;
  unreadNotifications: number;
}

export const CUSTOMER_TOKEN_KEY = 'bsh_customer_token';

export function getCustomerToken(): string | null {
  return localStorage.getItem(CUSTOMER_TOKEN_KEY);
}

export function setCustomerToken(token: string) {
  localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
}

export function clearCustomerToken() {
  localStorage.removeItem(CUSTOMER_TOKEN_KEY);
}

export const customerApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

customerApi.interceptors.request.use((config) => {
  const token = getCustomerToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

customerApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearCustomerToken();
    }
    return Promise.reject(err);
  }
);

// ─────────── احراز هویت ───────────

export interface UnifiedLoginResult {
  success: boolean;
  type: 'admin' | 'customer';
  message: string;
  token: string;
  admin?: {
    id: number;
    username: string;
    name: string;
    email: string;
    role: string;
  };
  customer?: CustomerInfo;
}

export async function unifiedLogin(identifier: string, password: string): Promise<UnifiedLoginResult> {
  const { data } = await customerApi.post('/api/auth/login', { identifier, password });
  return data;
}

export async function customerRegister(payload: {
  fullName: string;
  mobile: string;
  password: string;
  username?: string;
}): Promise<{ success: boolean; message?: string; [key: string]: unknown }> {
  const { data } = await customerApi.post('/api/customer/auth/register', payload);
  return data;
}

export async function customerVerifyRegisterOtp(sessionId: string, code: string): Promise<{
  success: boolean;
  message: string;
  token: string;
  customer: CustomerInfo;
}> {
  const { data } = await customerApi.post('/api/customer/auth/register/verify', { sessionId, code });
  return data;
}

export async function customerResendRegisterCode(mobile: string): Promise<OtpRequestResult> {
  const { data } = await customerApi.post('/api/customer/auth/register/resend', { phone: mobile });
  return data;
}

export interface LoginResult {
  success: boolean;
  message: string;
  token?: string;
  customer?: CustomerInfo;
  needsVerification?: boolean;
  sessionId?: string;
  expiresInSeconds?: number;
  devCode?: string;
}

export async function customerLogin(payload: {
  mobile: string;
  password: string;
}): Promise<LoginResult> {
  const { data } = await customerApi.post('/api/customer/auth/login', payload);
  return data;
}

export async function customerForgotPassword(mobile: string): Promise<OtpRequestResult> {
  const { data } = await customerApi.post('/api/customer/auth/forgot-password', { mobile });
  return data;
}

export async function customerVerifyForgotOtp(sessionId: string, code: string): Promise<OtpVerifyResult> {
  const { data } = await customerApi.post('/api/customer/auth/forgot-password/verify', { sessionId, code });
  return data;
}

export async function customerResetPassword(resetToken: string, password: string): Promise<{ success: boolean; message: string }> {
  const { data } = await customerApi.post(
    '/api/customer/auth/reset-password',
    { password },
    { headers: { Authorization: `Bearer ${resetToken}` } }
  );
  return data;
}

export async function customerLogout(): Promise<{ success: boolean; message: string }> {
  const { data } = await customerApi.post('/api/customer/auth/logout');
  return data;
}

// ─────────── پروفایل ───────────
export async function customerMe(): Promise<CustomerInfo> {
  const { data } = await customerApi.get('/api/customer/me');
  return data.customer;
}

export async function customerUpdateProfile(payload: {
  fullName?: string;
  email?: string | null;
}): Promise<{ success: boolean; message: string; customer: CustomerInfo }> {
  const { data } = await customerApi.put('/api/customer/me', payload);
  return data;
}

export async function customerChangePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  const { data } = await customerApi.post('/api/customer/change-password', { currentPassword, newPassword });
  return data;
}

// ─────────── رزروهای من ───────────
export async function getMyReservations(): Promise<{ success: boolean; reservations: ReservationInfo[] }> {
  const { data } = await customerApi.get('/api/customer/reservations');
  return data;
}

export async function getReservationDetail(id: number): Promise<{ success: boolean; reservation: ReservationInfo }> {
  const { data } = await customerApi.get(`/api/customer/reservations/${id}`);
  return data;
}

export async function cancelReservation(id: number): Promise<{ success: boolean; message: string }> {
  const { data } = await customerApi.post(`/api/customer/reservations/${id}/cancel`);
  return data;
}

// ─────────── لغو رزرو (درخواست بازپرداخت) ───────────
export interface CancellationEligibility {
  eligible: boolean;
  reason: string;
  hoursRemaining: number | null;
  hasActiveRequest: boolean;
  reservation: ReservationInfo;
}

export async function getCancellationEligibility(id: number): Promise<CancellationEligibility> {
  const { data } = await customerApi.get(`/api/customer/reservations/${id}/cancellation-eligibility`);
  return data;
}

export async function cancelReservationWithRefund(
  id: number,
  payload: { refundCardNumber: string; refundCardHolderName: string }
): Promise<{ success: boolean; message: string; refundId?: number }> {
  const { data } = await customerApi.post(`/api/customer/reservations/${id}/cancel`, payload);
  return data;
}

// ─────────── اعلان‌ها ───────────
export async function getNotifications(): Promise<{
  success: boolean;
  notifications: CustomerNotification[];
  unreadCount: number;
}> {
  const { data } = await customerApi.get('/api/customer/notifications');
  return data;
}

export async function markNotificationRead(id: number): Promise<{ success: boolean }> {
  const { data } = await customerApi.post(`/api/customer/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsRead(): Promise<{ success: boolean }> {
  const { data } = await customerApi.post('/api/customer/notifications/read-all');
  return data;
}

// ─────────── آمار داشبورد ───────────
export async function getDashboardStats(): Promise<{ success: boolean; stats: DashboardStats }> {
  const { data } = await customerApi.get('/api/customer/stats');
  return data;
}
