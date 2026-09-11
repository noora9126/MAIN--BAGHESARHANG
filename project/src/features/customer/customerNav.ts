import { Bell, CalendarCheck, KeyRound, LayoutDashboard, User, type LucideIcon } from 'lucide-react';

export interface CustomerNavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export const customerNavItems: CustomerNavItem[] = [
  { path: '/account/dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { path: '/account/reservations', label: 'رزروهای من', icon: CalendarCheck },
  { path: '/account/notifications', label: 'اعلان‌ها', icon: Bell },
  { path: '/account/profile', label: 'پروفایل', icon: User },
  { path: '/account/password', label: 'تغییر رمز عبور', icon: KeyRound },
];
