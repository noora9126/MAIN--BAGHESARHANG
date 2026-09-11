import {
  BedDouble,
  CalendarDays,
  LayoutDashboard,
  Percent,
  Settings,
  ShieldCheck,
  Star,
  Users,
  Wallet,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';

export interface AdminNavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
}

export const adminNavItems: AdminNavItem[] = [
  { path: '/admin/dashboard', label: 'داشبورد', icon: LayoutDashboard, permission: 'dashboard.view' },
  { path: '/admin/reservations', label: 'رزروها', icon: CalendarDays, permission: 'reservations.view' },
  { path: '/admin/refunds', label: 'لغو و بازپرداخت', icon: RotateCcw, permission: 'refunds.view' },
  { path: '/admin/rooms', label: 'اتاق\u200cها', icon: BedDouble, permission: 'rooms.view' },
  { path: '/admin/customers', label: 'مهمانان', icon: Users, permission: 'customers.view' },
  { path: '/admin/finance', label: 'مالی', icon: Wallet, permission: 'payments.view' },
  { path: '/admin/reviews', label: 'نظرات', icon: Star, permission: 'reviews.view' },
  { path: '/admin/discounts', label: 'تخفیف\u200cها', icon: Percent, permission: 'discounts.view' },
  { path: '/admin/users', label: 'کاربران', icon: ShieldCheck, permission: 'admins.view' },
  { path: '/admin/settings', label: 'تنظیمات', icon: Settings, permission: 'settings.view' },
];

export function filterNavByPermissions(items: AdminNavItem[], permissions: string[]): AdminNavItem[] {
  return items.filter((item) => !item.permission || permissions.includes(item.permission));
}
