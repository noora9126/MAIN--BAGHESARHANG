import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CalendarCheck,
  CalendarPlus,
  DollarSign,
  KeyRound,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useCustomerAuth } from '@/features/customerAuth/CustomerAuthProvider';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard } from '@/components/admin/AdminUI';
import { faNum, jalaliString } from '@/utils/dates';
import { getDashboardStats, type DashboardStats } from '@/services/customerApi';

export default function DashboardPage() {
  const { customer } = useCustomerAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const firstWord = useMemo(
    () => (customer?.full_name || '').split(/\s+/)[0] || 'کاربر عزیز',
    [customer?.full_name]
  );

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoadingStats(true);
    try {
      const data = await getDashboardStats();
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }

  if (!customer) return null;

  const cards = [
    {
      icon: <CalendarCheck size={22} />,
      accent: 'forest' as const,
      title: 'کل رزروها',
      value: loadingStats ? '...' : faNum(stats?.totalReservations || 0),
    },
    {
      icon: <CalendarPlus size={22} />,
      accent: 'sky' as const,
      title: 'رزروهای آینده',
      value: loadingStats ? '...' : faNum(stats?.upcomingReservations || 0),
    },
    {
      icon: <DollarSign size={22} />,
      accent: 'gold' as const,
      title: 'مجموع هزینه‌ها',
      value: loadingStats ? '...' : new Intl.NumberFormat('fa-IR').format(stats?.totalSpent || 0) + ' ت',
    },
    {
      icon: <Bell size={22} />,
      accent: 'forest' as const,
      title: 'اعلان‌های خوانده‌نشده',
      value: loadingStats ? '...' : faNum(stats?.unreadNotifications || 0),
    },
  ];

  const quickActions = [
    {
      icon: <CalendarPlus size={20} />,
      title: 'ثبت رزرو جدید',
      desc: 'انتخاب اتاق و رزرو آنلاین',
      to: '/reserve',
      accent: 'from-forest-600 to-forest-500',
    },
    {
      icon: <CalendarCheck size={20} />,
      title: 'رزروهای من',
      desc: 'مشاهده و مدیریت رزروها',
      to: '/account/reservations',
      accent: 'from-sky-500 to-sky-400',
    },
    {
      icon: <UserRound size={20} />,
      title: 'ویرایش پروفایل',
      desc: 'نام، نام خانوادگی و ایمیل',
      to: '/account/profile',
      accent: 'from-gold-500 to-gold-400',
    },
    {
      icon: <KeyRound size={20} />,
      title: 'تغییر رمز عبور',
      desc: 'به‌روزرسانی رمز امنیتی',
      to: '/account/password',
      accent: 'from-forest-500 to-forest-400',
    },
    {
      icon: <Bell size={20} />,
      title: 'اعلان‌ها',
      desc: 'مشاهده اعلان‌های جدید',
      to: '/account/notifications',
      accent: 'from-sky-600 to-sky-500',
    },
  ];

  return (
    <>
      <PageHeader
        title={`خوش آمدید، ${firstWord}`}
        description="خلاصه حساب کاربری شما در هتل باغ سرهنگ"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <StatCard key={c.title} icon={c.icon} title={c.title} value={c.value} accent={c.accent} />
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-forest-50 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-black text-forest-800">دسترسی سریع</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="group flex items-start gap-3 rounded-xl border border-forest-50 bg-forest-50/40 p-4 transition-all hover:-translate-y-0.5 hover:border-gold-200 hover:shadow-md"
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${a.accent} text-white shadow`}
              >
                {a.icon}
              </span>
              <span className="min-w-0">
                <span className="block font-bold text-forest-800">{a.title}</span>
                <span className="mt-0.5 block text-xs text-forest-500">{a.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-forest-50 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-black text-forest-800">اطلاعات حساب</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1.5 text-forest-500">
                <UserRound className="h-3.5 w-3.5" />
                نام
              </dt>
              <dd className="font-bold text-forest-800">{customer.full_name}</dd>
            </div>
            {customer.username && (
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-1.5 text-forest-500">
                  <Mail className="h-3.5 w-3.5" />
                  نام کاربری
                </dt>
                <dd className="font-bold text-forest-800" dir="ltr">{customer.username}</dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1.5 text-forest-500">
                <Phone className="h-3.5 w-3.5" />
                موبایل
              </dt>
              <dd className="font-bold text-forest-800" dir="ltr">{customer.mobile}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1.5 text-forest-500">
                <ShieldCheck className="h-3.5 w-3.5" />
                عضویت
              </dt>
              <dd className="font-bold text-forest-800">
                {customer.created_at ? jalaliString(customer.created_at) : '—'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-gold-100 bg-gold-50/60 p-5">
          <h4 className="font-bold text-forest-800">نکات امنیتی</h4>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-forest-600">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-forest-500" />
              رمز عبور خود را به‌صورت دوره‌ای تغییر دهید
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-forest-500" />
              در صورت فراموشی رمز، از قسمت فراموشی رمز عبور استفاده کنید
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-forest-500" />
              اطلاعات حساب خود را با کسی به اشتراک نگذارید
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
