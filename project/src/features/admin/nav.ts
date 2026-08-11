import {
  BedDouble,
  CalendarDays,
  LayoutDashboard,
  Percent,
  Settings,
  Star,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface AdminNavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export const adminNavItems: AdminNavItem[] = [
  { path: '/admin/dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { path: '/admin/reservations', label: 'رزروها', icon: CalendarDays },
  { path: '/admin/rooms', label: 'اتاق‌ها', icon: BedDouble },
  { path: '/admin/customers', label: 'مهمانان', icon: Users },
  { path: '/admin/finance', label: 'مالی', icon: Wallet },
  { path: '/admin/reviews', label: 'نظرات', icon: Star },
  { path: '/admin/discounts', label: 'تخفیف‌ها', icon: Percent },
  { path: '/admin/settings', label: 'تنظیمات', icon: Settings },
];
