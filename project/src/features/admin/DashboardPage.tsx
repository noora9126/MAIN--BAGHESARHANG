import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, CalendarDays, BedDouble, TrendingUp, PieChart as PieIcon, AlertTriangle,
  Users, Sparkles, MoonStar, RefreshCw, Phone, Loader2, ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard, Loading, EmptyState, btnOutline } from '@/components/admin/AdminUI';
import { LineChart, BarChart, PieChart, Heatmap } from '@/components/admin/Charts';
import { StatusBadge, PaymentBadge } from '@/components/admin/AdminUI';
import {
  adminDashboard, adminRevenue, adminOccupancy, adminRoomsPerformance, adminGuestStats,
  adminReservations, type ReservationRow,
} from '@/services/adminApi';
import { jalaliString, faNum, formatToman, todayStr } from '@/utils/dates';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [overview, setOverview] = useState<Awaited<ReturnType<typeof adminDashboard>> | null>(null);
  const [revenue, setRevenue] = useState<Awaited<ReturnType<typeof adminRevenue>>>([]);
  const [occupancy, setOccupancy] = useState<Awaited<ReturnType<typeof adminOccupancy>>>([]);
  const [roomPerf, setRoomPerf] = useState<Awaited<ReturnType<typeof adminRoomsPerformance>>>([]);
  const [guestStats, setGuestStats] = useState<{ totalGuests: number; newThisMonth: number; repeatGuests: number }>({ totalGuests: 0, newThisMonth: 0, repeatGuests: 0 });
  const [recent, setRecent] = useState<ReservationRow[]>([]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const results = await Promise.allSettled([
        adminDashboard(),
        adminRevenue(undefined, undefined, 'month'),
        adminOccupancy(todayStr(), todayStr()),
        adminRoomsPerformance(),
        adminGuestStats(),
        adminReservations({ page: 1, limit: 7 }),
      ]);

      const [dashRes, revRes, occRes, roomsRes, guestsRes, resRes] = results;

      if (dashRes.status === 'fulfilled') setOverview(dashRes.value);
      if (revRes.status === 'fulfilled') setRevenue(revRes.value);
      if (occRes.status === 'fulfilled') setOccupancy(occRes.value);
      if (roomsRes.status === 'fulfilled') setRoomPerf(roomsRes.value);
      if (guestsRes.status === 'fulfilled') setGuestStats(guestsRes.value);
      if (resRes.status === 'fulfilled') setRecent(resRes.value.reservations || []);

      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0 && failed.length === results.length) {
        toast.error('دریافت داده‌های داشبورد ناموفق بود');
      } else if (failed.length > 0) {
        toast.warning('برخی داده‌ها بارگزاری نشدند');
      }
    } catch {
      toast.error('دریافت داده‌های داشبورد ناموفق بود');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  // اعداد برای کارت‌ها
  const cards = useMemo(() => {
    if (!overview) return [];
    return [
      {
        icon: <Wallet size={22} />, accent: 'gold' as const,
        title: 'درآمد کل (پرداخت‌شده)', value: formatToman(overview.totalRevenue),
        sub: `${faNum(overview.totalReservations)} رزرو در کل`,
      },
      {
        icon: <TrendingUp size={22} />, accent: 'forest' as const,
        title: 'درآمد ماه جاری', value: formatToman(overview.monthlyRevenue),
        sub: `${faNum(overview.monthlyReservations)} رزرو این ماه`,
      },
      {
        icon: <BedDouble size={22} />, accent: 'sky' as const,
        title: 'اشغال ماه جاری', value: `${faNum(overview.occupancy)}٪`,
        sub: `میانگین ${faNum(overview.averageNights)} شب اقامت`,
      },
      {
        icon: <CalendarDays size={22} />, accent: 'forest' as const,
        title: 'رزروهای امروز', value: faNum(overview.todayReservations),
        sub: `ورود امروز: ${faNum(overview.todayCheckIns)} نفر`,
      },
      {
        icon: <AlertTriangle size={22} />, accent: 'red' as const,
        title: 'پرداخت‌های در انتظار', value: faNum(overview.pendingPayments),
        sub: 'نیازمند پیگیری',
      },
    ];
  }, [overview]);

  const occupancyRange30 = useMemo(() => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 29);
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const out: { date: string; label: string; occupancy: number }[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      out.push({ date: iso(cur), label: jalaliString(cur), occupancy: 0 });
      cur.setDate(cur.getDate() + 1);
    }
    const map = new Map(occupancy.map((o) => [o.date, o.occupancy]));
    return out.map((d) => ({ ...d, occupancy: map.get(d.date) || 0 }));
  }, [occupancy]);

  const revenueChart = useMemo(() => revenue.map((r) => ({ label: r.label, value: r.revenue })), [revenue]);

  const roomNightsChart = useMemo(() => roomPerf.slice(0, 8).map((r) => ({ label: r.name, value: r.roomNights })), [roomPerf]);

  const statusDist = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of recent) map.set(r.status, (map.get(r.status) || 0) + 1);
    const labels: Record<string, string> = {
      PENDING: 'در انتظار', CONFIRMED: 'تأیید شده', CHECKED_IN: 'ورود شده', CHECKED_OUT: 'خروج شده', CANCELLED: 'کنسل شده',
    };
    return [...map.entries()].map(([k, v]) => ({ label: labels[k] || k, value: v }));
  }, [recent]);

  if (loading) return <Loading />;

  return (
    <>
      <PageHeader
        title="داشبورد"
        description={`نمای کلی عملکرد هتل — امروز ${jalaliString(new Date())}`}
        actions={
          <button onClick={handleRefresh} className={btnOutline} disabled={refreshing}>
            {refreshing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            به‌روزرسانی
          </button>
        }
      />

      {/* کارت‌های آمار */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <StatCard key={c.title} icon={c.icon} title={c.title} value={c.value} sub={c.sub} accent={c.accent} />
        ))}
      </div>

      {/* آمار مهمانان */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Users size={22} />} title="کل مهمانان" value={faNum(guestStats.totalGuests)} sub="بر اساس شماره موبایل یکتا" accent="forest" />
        <StatCard icon={<Sparkles size={22} />} title="مهمانان جدید این ماه" value={faNum(guestStats.newThisMonth)} accent="gold" />
        <StatCard icon={<MoonStar size={22} />} title="مهمانان تکراری" value={faNum(guestStats.repeatGuests)} sub="بیش از یک رزرو" accent="sky" />
      </div>

      {/* نمودار درآمد + اشغال */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-forest-50">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-black text-forest-800"><TrendingUp size={17} className="text-forest-500" /> روند درآمد (۶ ماه اخیر)</h3>
            <span className="text-[11px] text-forest-400">فقط پرداخت‌های موفق</span>
          </div>
          {revenueChart.length > 0 ? (
            <LineChart data={revenueChart} valueLabel={(v) => `${faNum(Math.round(v / 1000000))}م`} />
          ) : (
            <EmptyState text="داده‌ای برای نمودار درآمد وجود ندارد" />
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm border border-forest-50">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-black text-forest-800"><PieIcon size={17} className="text-forest-500" /> وضعیت رزروهای اخیر</h3>
            <span className="text-[11px] text-forest-400">{faNum(recent.length)} رزرو آخر</span>
          </div>
          {statusDist.length > 0 ? (
            <PieChart data={statusDist} size={170} />
          ) : (
            <EmptyState text="رزروی ثبت نشده است" />
          )}
        </div>
      </div>

      {/* هیتمپ اشغال ۳۰ روز آینده */}
      <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm border border-forest-50">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-black text-forest-800"><CalendarDays size={17} className="text-forest-500" /> پیش‌بینی اشغال — ۳۰ روز آینده</h3>
          <span className="text-[11px] text-forest-400">بر اساس رزروهای قطعی و در انتظار</span>
        </div>
        {occupancyRange30.some((d) => d.occupancy > 0) ? (
          <Heatmap data={occupancyRange30} days={30} />
        ) : (
          <EmptyState text="برای روزهای آینده رزروی ثبت نشده است" />
        )}
      </div>

      {/* عملکرد اتاق‌ها + رزروهای اخیر */}
      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-forest-50 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-black text-forest-800"><BedDouble size={17} className="text-forest-500" /> عملکرد اتاق‌ها</h3>
            <span className="text-[11px] text-forest-400">شب‌های رزروشده</span>
          </div>
          {roomNightsChart.length > 0 ? (
            <BarChart data={roomNightsChart} />
          ) : (
            <EmptyState text="اتاق فعالی وجود ندارد" />
          )}
        </div>

        <div className="rounded-2xl bg-white shadow-sm border border-forest-50 xl:col-span-3">
          <div className="flex items-center justify-between border-b border-forest-50 px-5 py-4">
            <h3 className="flex items-center gap-2 font-black text-forest-800"><CalendarDays size={17} className="text-forest-500" /> رزروهای اخیر</h3>
            <span className="text-[11px] text-forest-400">۷ رزرو آخر</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-forest-50 bg-forest-50/40 text-xs text-forest-500">
                  <th className="px-4 py-2.5 font-bold">رزرو</th>
                  <th className="px-4 py-2.5 font-bold">مهمان</th>
                  <th className="px-4 py-2.5 font-bold">اتاق</th>
                  <th className="px-4 py-2.5 font-bold">مبلغ</th>
                  <th className="px-4 py-2.5 font-bold">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-b border-forest-50/60 hover:bg-forest-50/30">
                    <td className="px-4 py-2.5 font-bold text-forest-700" dir="ltr">{r.reservation_number}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-bold text-forest-800">{r.guest_name}</p>
                      {r.guest_phone && <p className="flex items-center gap-1 text-[10px] text-forest-400" dir="ltr"><Phone size={9} />{faNum(r.guest_phone)}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-forest-600">{r.room_name}</td>
                    <td className="px-4 py-2.5 font-black text-forest-800">{formatToman(r.total_price)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={r.status} />
                        <PaymentBadge status={r.payment_status} />
                      </div>
                    </td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr><td colSpan={5}><EmptyState text="رزروی ثبت نشده است" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-forest-50 px-5 py-3 text-left">
            <Link to="/admin/reservations" className="inline-flex items-center gap-1 text-xs font-bold text-forest-600 hover:text-forest-800">
              مشاهده همه رزروها <ArrowLeft size={13} />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}