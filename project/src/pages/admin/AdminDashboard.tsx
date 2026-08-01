import { useEffect, useState } from 'react';
import {
  CalendarDays, Wallet, TrendingUp, BedDouble, Hourglass, CalendarCheck, LogIn,
} from 'lucide-react';
import { adminDashboard, apiError } from '../../services/adminApi';
import { StatCard, Loading, btnPrimary } from '../../components/admin/AdminUI';
import { LineChart } from '../../components/admin/Charts';
import { formatToman, faNum } from '../../utils/dates';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [data, setData] = useState<Awaited<ReturnType<typeof adminDashboard>> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminDashboard()
      .then(setData)
      .catch((e) => setError(apiError(e)));
  }, []);

  if (error) {
    return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</p>;
  }
  if (!data) return <Loading />;

  const trendData = (data.trend || []).map((t) => ({ label: t.month, value: Math.round(t.revenue / 1000) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black text-forest-800">داشبورد</h2>
        <Link to="/admin/reservations" className={btnPrimary}>مشاهده رزروها</Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<CalendarDays size={22} />} title="رزروهای این ماه" value={faNum(data.monthlyReservations)} sub={`کل: ${faNum(data.totalReservations)} رزرو`} accent="forest" />
        <StatCard icon={<Wallet size={22} />} title="درآمد این ماه" value={formatToman(data.monthlyRevenue)} sub={`کل: ${formatToman(data.totalRevenue)}`} accent="gold" />
        <StatCard icon={<TrendingUp size={22} />} title="درصد اشغال ماه" value={`${faNum(data.occupancy)}٪`} sub="مبنای ۴ اتاق" accent="sky" />
        <StatCard icon={<Hourglass size={22} />} title="در انتظار پرداخت" value={faNum(data.pendingPayments)} accent="red" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<CalendarCheck size={22} />} title="رزروهای امروز" value={faNum(data.todayReservations)} />
        <StatCard icon={<LogIn size={22} />} title="ورود امروز" value={faNum(data.todayCheckIns)} />
        <StatCard icon={<BedDouble size={22} />} title="میانگین اقامت" value={`${faNum(data.averageNights)} شب`} />
        <StatCard icon={<Wallet size={22} />} title="درآمد کل" value={formatToman(data.totalRevenue)} accent="gold" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-forest-50">
          <h3 className="mb-4 font-black text-forest-800">روند درآمد (۶ ماه اخیر — هزار تومان)</h3>
          <LineChart data={trendData} />
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm border border-forest-50">
          <h3 className="mb-4 font-black text-forest-800">اتاق‌های برتر</h3>
          <div className="space-y-3">
            {data.topRooms.length === 0 && <p className="text-sm text-forest-400">هنوز رزروی ثبت نشده است</p>}
            {data.topRooms.map((room, i) => (
              <div key={room.id} className="flex items-center gap-3 rounded-xl bg-forest-50/60 px-4 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-600 text-xs font-black text-white">
                  {faNum(i + 1)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-forest-800 truncate">{room.name}</p>
                  <p className="text-[11px] text-forest-400">{faNum(room.bookings)} رزرو</p>
                </div>
                <p className="text-sm font-black text-gold-600">{formatToman(room.revenue)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
