import { useEffect, useState } from 'react';
import { Wallet, TrendingUp, BedDouble, Flame } from 'lucide-react';
import {
  adminRevenue, adminOccupancy, adminRoomsPerformance, adminGuestStats, apiError,
} from '../../services/adminApi';
import { Loading, StatCard } from '../../components/admin/AdminUI';
import { LineChart, BarChart, PieChart, Heatmap } from '../../components/admin/Charts';
import { formatToman, faNum, todayStr } from '../../utils/dates';

export default function AdminAnalytics() {
  const [revenueData, setRevenueData] = useState<Awaited<ReturnType<typeof adminRevenue>> | null>(null);
  const [occupancyData, setOccupancyData] = useState<Awaited<ReturnType<typeof adminOccupancy>> | null>(null);
  const [roomsData, setRoomsData] = useState<Awaited<ReturnType<typeof adminRoomsPerformance>> | null>(null);
  const [guestStats, setGuestStats] = useState<Awaited<ReturnType<typeof adminGuestStats>> | null>(null);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = () => {
    setError('');
    Promise.all([
      adminRevenue(from || undefined, to || undefined, 'month'),
      adminOccupancy(from || (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); })(), to || todayStr()),
      adminRoomsPerformance(from || undefined, to || undefined),
      adminGuestStats(),
    ])
      .then(([rev, occ, rooms, gs]) => {
        setRevenueData(rev);
        setOccupancyData(occ);
        setRoomsData(rooms);
        setGuestStats(gs);
      })
      .catch((e) => setError(apiError(e)));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lineData = (revenueData || []).map((d) => ({ label: d.label || d.period, value: Math.round(d.revenue / 1000) }));
  const barData = (occupancyData || []).map((d) => ({ label: d.label, value: d.occupancy }));
  const pieData = (roomsData || []).map((r) => ({ label: r.name, value: r.revenue || 1 }));
  const heatData = (occupancyData || []).map((d) => ({ date: d.date, label: d.label, occupancy: d.occupancy }));

  const totalRevenue = (revenueData || []).reduce((s, d) => s + d.revenue, 0);
  const totalBookings = (revenueData || []).reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black text-forest-800">گزارش‌ها و تحلیل‌ها</h2>
        <div className="flex items-center gap-2 text-xs text-forest-500">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-forest-200 bg-white px-2 py-1.5" />
          <span>تا</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-forest-200 bg-white px-2 py-1.5" />
          <button onClick={load} className="rounded-lg bg-forest-600 px-3 py-1.5 font-bold text-white hover:bg-forest-700">اعمال</button>
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</p>}

      {!revenueData || !occupancyData || !roomsData || !guestStats ? (
        <Loading />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={<Wallet size={22} />} title="درآمد در بازه" value={formatToman(totalRevenue)} accent="gold" />
            <StatCard icon={<TrendingUp size={22} />} title="تعداد رزرو در بازه" value={faNum(totalBookings)} />
            <StatCard icon={<BedDouble size={22} />} title="مهمانان تکراری" value={faNum(guestStats.repeatGuests)} sub={`کل مهمان: ${faNum(guestStats.totalGuests)}`} />
            <StatCard icon={<Flame size={22} />} title="مهمان جدید این ماه" value={faNum(guestStats.newThisMonth)} accent="red" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-forest-50">
              <h3 className="mb-4 font-black text-forest-800">درآمد ماهانه (هزار تومان)</h3>
              {lineData.length ? <LineChart data={lineData} /> : <p className="py-10 text-center text-sm text-forest-400">داده‌ای نیست</p>}
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm border border-forest-50">
              <h3 className="mb-4 font-black text-forest-800">درصد اشغال روزانه</h3>
              {barData.length ? <BarChart data={barData} valueLabel={(v) => `${faNum(v)}٪`} color="#c4882e" /> : <p className="py-10 text-center text-sm text-forest-400">داده‌ای نیست</p>}
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm border border-forest-50">
              <h3 className="mb-4 font-black text-forest-800">سهم درآمد اتاق‌ها</h3>
              <PieChart data={pieData} />
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm border border-forest-50">
              <h3 className="mb-4 font-black text-forest-800">روزهای شلوغ (هیت‌مپ ۳۰ روز اخیر)</h3>
              {heatData.length ? <Heatmap data={heatData} days={30} /> : <p className="py-10 text-center text-sm text-forest-400">داده‌ای نیست</p>}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm border border-forest-50">
            <h3 className="mb-4 font-black text-forest-800">عملکرد اتاق‌ها</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="bg-forest-50/70 text-right text-xs text-forest-500">
                    <th className="px-4 py-3 font-bold">اتاق</th>
                    <th className="px-4 py-3 font-bold">قیمت شبانه</th>
                    <th className="px-4 py-3 font-bold">رزروها</th>
                    <th className="px-4 py-3 font-bold">شب‌های رزروشده</th>
                    <th className="px-4 py-3 font-bold">درآمد</th>
                  </tr>
                </thead>
                <tbody>
                  {roomsData.map((r) => (
                    <tr key={r.id} className="border-t border-forest-50">
                      <td className="px-4 py-3 font-bold text-forest-800">{r.name}</td>
                      <td className="px-4 py-3 text-forest-600">{formatToman(r.pricePerNight)}</td>
                      <td className="px-4 py-3">{faNum(r.bookings)}</td>
                      <td className="px-4 py-3">{faNum(r.roomNights)}</td>
                      <td className="px-4 py-3 font-black text-gold-600">{formatToman(r.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
