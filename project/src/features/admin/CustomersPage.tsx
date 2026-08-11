import { useCallback, useEffect, useState } from 'react';
import {
  Users, Search, Phone, Mail, StickyNote, MessageSquareText, Loader2, RefreshCw,
  ChevronRight, ChevronLeft, Sparkles, MoonStar, CalendarDays, BedDouble,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard, StatusBadge, PaymentBadge, Modal, Loading, EmptyState, inputCls, btnPrimary, btnOutline } from '@/components/admin/AdminUI';
import {
  adminGuests, adminGuestDetail, adminUpdateGuestNotes, adminSendGuestSms, adminGuestStats,
  type GuestRow, type ReservationRow,
} from '@/services/adminApi';
import { jalaliFriendly, formatToman, formatDateTime, faNum } from '@/utils/dates';

const SORTS = [
  { value: '-lastReservation', label: 'جدیدترین رزرو' },
  { value: 'lastReservation', label: 'قدیمی‌ترین رزرو' },
  { value: '-totalBookings', label: 'بیشترین رزرو' },
  { value: 'name', label: 'نام' },
];

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('-lastReservation');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<GuestRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalGuests: 0, newThisMonth: 0, repeatGuests: 0 });

  // جزئیات
  const [detailPhone, setDetailPhone] = useState<string | null>(null);
  const [detail, setDetail] = useState<GuestRow | null>(null);
  const [history, setHistory] = useState<ReservationRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [smsText, setSmsText] = useState('');
  const [acting, setActing] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGuests({ search: search || undefined, sort, page, limit: 20 });
      setRows(res.guests);
      setTotal(res.total);
      setTotalPages(res.pages);
    } catch {
      toast.error('دریافت مهمانان ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, [search, sort, page]);

  const loadStats = useCallback(async () => {
    try {
      setStats(await adminGuestStats());
    } catch {
      /* بی‌اهمیت */
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const openDetail = async (phone: string) => {
    setDetailPhone(phone);
    setDetailLoading(true);
    setNotes('');
    setSmsText('');
    try {
      const res = await adminGuestDetail(phone);
      setDetail(res.guest);
      setHistory(res.reservations || []);
      setNotes(res.guest.notes || '');
    } catch {
      toast.error('دریافت پروفایل مهمان ناموفق بود');
    } finally {
      setDetailLoading(false);
    }
  };

  const saveNotes = async () => {
    if (!detail) return;
    setActing(true);
    try {
      await adminUpdateGuestNotes(detail.phone, notes);
      toast.success('یادداشت ذخیره شد');
      setDetail({ ...detail, notes });
      await loadList();
    } catch {
      toast.error('خطا در ذخیره یادداشت');
    } finally {
      setActing(false);
    }
  };

  const doSendSms = async () => {
    if (!detail || !smsText.trim()) return;
    setActing(true);
    try {
      const res = await adminSendGuestSms(detail.phone, smsText.trim());
      toast.success(res.simulated ? 'پیامک ارسال شد (تستی)' : 'پیامک ارسال شد');
      setSmsText('');
    } catch {
      toast.error('ارسال پیامک ناموفق بود');
    } finally {
      setActing(false);
    }
  };

  const totalSpentAll = rows.reduce((s, g) => s + (g.totalSpent || 0), 0);

  return (
    <>
      <PageHeader
        title="مدیریت مهمانان"
        description="پروفایل مهمانان، تاریخچه رزرو، یادداشت‌ها و ارتباط پیامکی — همگام با دیتابیس"
      />

      {/* آمار */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Users size={22} />} title="کل مهمانان" value={faNum(stats.totalGuests)} sub="بر اساس شماره موبایل یکتا" accent="forest" />
        <StatCard icon={<Sparkles size={22} />} title="جدید این ماه" value={faNum(stats.newThisMonth)} accent="gold" />
        <StatCard icon={<MoonStar size={22} />} title="مهمانان تکراری" value={faNum(stats.repeatGuests)} sub="بیش از یک رزرو" accent="sky" />
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-forest-50">
        {/* فیلترها */}
        <div className="grid gap-3 border-b border-forest-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-forest-300" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="جستجو: نام یا شماره موبایل"
              className={`${inputCls} pr-9`}
            />
          </div>
          <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className={inputCls}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <div className="flex items-center gap-2 rounded-xl bg-forest-50/40 px-4 text-xs text-forest-600">
            مجموع خرید: <b className="text-forest-800">{formatToman(totalSpentAll)}</b>
          </div>
          <button onClick={() => { setSearch(''); setSort('-lastReservation'); setPage(1); }} className={btnOutline}>
            <RefreshCw size={15} /> پاک کردن
          </button>
        </div>

        {/* جدول */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-forest-50 bg-forest-50/40 text-xs text-forest-500">
                <th className="px-4 py-3 font-bold">مهمان</th>
                <th className="px-4 py-3 font-bold">تلفن</th>
                <th className="px-4 py-3 font-bold">رزروها</th>
                <th className="px-4 py-3 font-bold">آخرین رزرو</th>
                <th className="px-4 py-3 font-bold">مجموع خرید</th>
                <th className="px-4 py-3 font-bold">یادداشت</th>
                <th className="px-4 py-3 font-bold">پروفایل</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><Loading /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7}><EmptyState text="مهمانی یافت نشد" /></td></tr>
              ) : (
                rows.map((g) => (
                  <tr key={g.phone} className="border-b border-forest-50/60 hover:bg-forest-50/30 cursor-pointer" onClick={() => openDetail(g.phone)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-600 text-sm font-bold text-white">
                          {(g.name || 'م').charAt(0)}
                        </div>
                        <p className="font-bold text-forest-800">{g.name || '—'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-forest-600" dir="ltr">{faNum(g.phone)}</td>
                    <td className="px-4 py-3"><span className="font-black text-forest-700">{faNum(g.totalBookings)}</span> رزرو</td>
                    <td className="px-4 py-3 text-xs text-forest-600">{g.lastReservation ? formatDateTime(g.lastReservation) : '—'}</td>
                    <td className="px-4 py-3 font-black text-forest-800">{formatToman(g.totalSpent || 0)}</td>
                    <td className="px-4 py-3 max-w-40">
                      {g.notes ? <p className="truncate text-xs text-forest-500">{g.notes}</p> : <span className="text-xs text-forest-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-forest-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-forest-700">
                        مشاهده <ChevronLeft size={13} />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* صفحه‌بندی */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 text-sm text-forest-600">
            <span>تعداد کل: {faNum(total)}</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={`rounded-lg border border-forest-200 p-1.5 ${page <= 1 ? 'opacity-40' : 'hover:bg-forest-50'}`}>
                <ChevronRight size={16} />
              </button>
              <span className="font-bold">{faNum(page)} / {faNum(totalPages)}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className={`rounded-lg border border-forest-200 p-1.5 ${page >= totalPages ? 'opacity-40' : 'hover:bg-forest-50'}`}>
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ───── مودال پروفایل مهمان ───── */}
      <Modal open={detailPhone !== null} onClose={() => setDetailPhone(null)} title="پروفایل مهمان" wide>
        {detailLoading || !detail ? (
          <Loading />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-forest-100 p-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-600 text-xl font-black text-white">
                {(detail.name || 'م').charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-black text-forest-800">{detail.name || '—'}</p>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-forest-500">
                  <span className="inline-flex items-center gap-1" dir="ltr"><Phone size={12} />{faNum(detail.phone)}</span>
                  {detail.email && <span className="inline-flex items-center gap-1" dir="ltr"><Mail size={12} />{detail.email}</span>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 text-sm">
                <p className="font-black text-forest-800">{faNum(detail.totalBookings)} رزرو</p>
                <p className="font-black text-gold-600">{formatToman(history.reduce((s, r) => s + (r.payment_status === 'SUCCESS' ? r.total_price : 0), 0))}</p>
                <p className="text-[10px] text-forest-400">مجموع پرداخت‌شده</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* یادداشت + پیامک */}
              <div className="space-y-4">
                <div className="rounded-xl border border-forest-100 p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-black text-forest-700"><StickyNote size={15} className="text-gold-500" /> یادداشت مدیر</h4>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputCls} placeholder="مثلاً: مهمان ترجیح می‌دهد اتاق طبقه اول باشد..." />
                  <button onClick={saveNotes} disabled={acting} className={`${btnOutline} mt-2 w-full`}>
                    {acting ? <Loader2 className="animate-spin" size={15} /> : <StickyNote size={15} />} ذخیره یادداشت
                  </button>
                </div>

                <div className="rounded-xl border border-forest-100 p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-black text-forest-700"><MessageSquareText size={15} className="text-gold-500" /> ارسال پیامک</h4>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input value={smsText} onChange={(e) => setSmsText(e.target.value)} placeholder="متن پیامک..." className={inputCls} />
                    <button onClick={doSendSms} disabled={acting || !smsText.trim()} className={`${btnPrimary} sm:w-36 shrink-0`}>
                      {acting ? <Loader2 className="animate-spin" size={15} /> : <MessageSquareText size={15} />} ارسال
                    </button>
                  </div>
                </div>
              </div>

              {/* تاریخچه رزروها */}
              <div className="rounded-xl border border-forest-100 p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-forest-700"><CalendarDays size={15} className="text-gold-500" /> تاریخچه رزروها ({faNum(history.length)})</h4>
                <div className="max-h-80 space-y-2 overflow-y-auto pl-1">
                  {history.map((r) => (
                    <div key={r.id} className="rounded-lg border border-forest-50 bg-forest-50/30 p-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-black text-forest-700" dir="ltr">{r.reservation_number}</p>
                        <div className="flex items-center gap-1">
                          <StatusBadge status={r.status} />
                          <PaymentBadge status={r.payment_status} />
                        </div>
                      </div>
                      <p className="mt-1.5 flex items-center gap-1 text-forest-500">
                        <BedDouble size={11} /> {r.room_name}
                        <span className="mx-1">•</span>
                        {jalaliFriendly(r.check_in)} ← {jalaliFriendly(r.check_out)}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-forest-400">ثبت: {formatDateTime(r.created_at)}</span>
                        <b className="text-forest-800">{formatToman(r.total_price)}</b>
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && <p className="py-6 text-center text-forest-400">رزروی ثبت نشده است</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}