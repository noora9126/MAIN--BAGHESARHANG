import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, Search, ChevronRight, ChevronLeft, CheckCircle2, LogIn, LogOut, XCircle,
  MessageSquareText, Loader2, User, Phone, Mail, Fingerprint, Wallet, StickyNote, BedDouble,
  CalendarRange, RefreshCw, Ban,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusBadge, PaymentBadge, SmsBadge, Modal, Loading, EmptyState, inputCls, btnPrimary, btnOutline, btnDanger } from '@/components/admin/AdminUI';
import {
  adminReservations, adminReservationDetail, adminUpdateReservation, adminCheckIn, adminCheckOut,
  adminCancel, adminSendReservationSms, adminAvailability,
  type ReservationRow, type CalendarRoom, type CalendarBooking,
} from '@/services/adminApi';
import { jalaliFriendly, formatToman, faNum, formatDateTime, utcDate, jalaliMonthStart, jalaliMonthLength, shiftJalaliMonth, jalaliMonthLabel, isoOfUtc } from '@/utils/dates';
import { toFaDigits } from '@/utils/validation';
import JalaliDatePicker from '@/components/JalaliDatePicker';

const STATUS_FILTERS = [
  { value: '', label: 'همه وضعیت‌ها' },
  { value: 'PENDING', label: 'در انتظار پرداخت' },
  { value: 'CONFIRMED', label: 'تأیید شده' },
  { value: 'CHECKED_IN', label: 'ورود شده' },
  { value: 'CHECKED_OUT', label: 'خروج شده' },
  { value: 'CANCELLED', label: 'کنسل شده' },
  { value: 'CANCELLATION_REQUESTED', label: 'درخواست لغو ثبت شده' },
  { value: 'REFUND_PENDING', label: 'در انتظار بازپرداخت' },
];

const pad2 = (n: number) => String(n).padStart(2, '0');
const isoOf = (d: Date) => `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;

function parseGuestDetails(res: ReservationRow): { name: string; nationalId: string }[] {
  if (!res.guest_details) return [];
  try {
    const v = JSON.parse(res.guest_details);
    return Array.isArray(v) ? v.map((g) => ({ name: String(g?.name || ''), nationalId: String(g?.nationalId || '') })) : [];
  } catch {
    return [];
  }
}

function parseChildAges(res: ReservationRow): number[] {
  if (!res.child_ages) return [];
  try {
    const v = JSON.parse(res.child_ages);
    return Array.isArray(v) ? v.map(Number) : [];
  } catch {
    return [];
  }
}

function childGroupLabel(age: number) {
  if (age < 2) return 'زیر ۲ سال (رایگان)';
  if (age <= 12) return '۲ تا ۱۲ سال (نیم‌بها)';
  return 'بالای ۱۲ سال (بها کامل)';
}

export default function ReservationsPage() {
  const [tab, setTab] = useState<'list' | 'calendar'>('list');

  // ───── filters ─────
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // ───── detail modal ─────
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ReservationRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [smsText, setSmsText] = useState('');
  const [acting, setActing] = useState(false);

  // ───── calendar (تقویم کاملاً شمسی) ─────
  const [monthAnchor, setMonthAnchor] = useState<Date>(() => {
    const now = new Date();
    return jalaliMonthStart(utcDate(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate()));
  });
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarRooms, setCalendarRooms] = useState<CalendarRoom[]>([]);
  const [calendarBookings, setCalendarBookings] = useState<CalendarBooking[]>([]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminReservations({
        status: status || undefined,
        search: search || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        limit: 20,
      });
      setRows(res.reservations);
      setTotal(res.total);
      setTotalPages(res.pages);
    } catch {
      toast.error('دریافت رزروها ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, [status, search, from, to, page]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const loadCalendar = useCallback(async () => {
    setCalendarLoading(true);
    try {
      const daysCount = jalaliMonthLength(monthAnchor);
      const fromIso = isoOfUtc(monthAnchor);
      const toIso = isoOfUtc(new Date(monthAnchor.getTime() + daysCount * 86400000));
      const data = await adminAvailability(fromIso, toIso);
      setCalendarRooms(data.rooms);
      setCalendarBookings(data.bookings);
    } catch {
      toast.error('دریافت تقویم اشغال ناموفق بود');
    } finally {
      setCalendarLoading(false);
    }
  }, [monthAnchor]);

  useEffect(() => {
    if (tab === 'calendar') loadCalendar();
  }, [tab, loadCalendar]);

  const openDetail = async (id: number) => {
    setDetailId(id);
    setDetailLoading(true);
    setNotes('');
    setSmsText('');
    try {
      const r = await adminReservationDetail(id);
      setDetail(r);
      setNotes(r.admin_notes || '');
    } catch {
      toast.error('دریافت جزئیات رزرو ناموفق بود');
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async () => {
    if (!detailId) return;
    const r = await adminReservationDetail(detailId);
    setDetail(r);
    setNotes(r.admin_notes || '');
  };

  const saveNotes = async () => {
    if (!detail) return;
    setActing(true);
    try {
      await adminUpdateReservation(detail.id, { adminNotes: notes });
      toast.success('یادداشت ذخیره شد');
      await refreshDetail();
      await loadList();
    } catch {
      toast.error('خطا در ذخیره یادداشت');
    } finally {
      setActing(false);
    }
  };

  const setStatusAnd = async (fn: () => Promise<unknown>, okMsg: string) => {
    setActing(true);
    try {
      await fn();
      toast.success(okMsg);
      await refreshDetail();
      await loadList();
    } catch {
      toast.error('عملیات ناموفق بود');
    } finally {
      setActing(false);
    }
  };

  const doSendSms = async () => {
    if (!detail || !smsText.trim()) return;
    setActing(true);
    try {
      const res = await adminSendReservationSms(detail.id, smsText.trim());
      toast.success(res.simulated ? 'پیامک ارسال شد (تستی)' : 'پیامک ارسال شد');
      setSmsText('');
    } catch {
      toast.error('ارسال پیامک ناموفق بود');
    } finally {
      setActing(false);
    }
  };

  // ───── تقویم اشغال ─────
  const calendarDays = useMemo(() => {
    const daysCount = jalaliMonthLength(monthAnchor);
    return Array.from({ length: daysCount }, (_, i) => {
      const d = new Date(monthAnchor.getTime() + i * 86400000);
      return { day: i + 1, iso: isoOf(d), jalali: String(i + 1) };
    });
  }, [monthAnchor]);

  const bookedDaysByRoom = useMemo(() => {
    const map = new Map<number, Set<string>>();
    for (const b of calendarBookings) {
      const ci = new Date(`${b.check_in}T00:00:00Z`);
      const co = new Date(`${b.check_out}T00:00:00Z`);
      const set = map.get(b.room_id) || new Set<string>();
      const cur = new Date(ci);
      while (cur < co) {
        set.add(isoOf(cur));
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
      map.set(b.room_id, set);
    }
    return map;
  }, [calendarBookings]);

  const bookingRefsByDay = useMemo(() => {
    const map = new Map<number, Map<string, { label: string; status: string }[]>>();
    for (const b of calendarBookings) {
      const ci = new Date(`${b.check_in}T00:00:00Z`);
      const co = new Date(`${b.check_out}T00:00:00Z`);
      const roomMap = map.get(b.room_id) || new Map<string, { label: string; status: string }[]>();
      const cur = new Date(ci);
      while (cur < co) {
        const iso = isoOf(cur);
        const arr = roomMap.get(iso) || [];
        arr.push({ label: `${b.reservation_number} — ${b.guest_name}`, status: b.status });
        roomMap.set(iso, arr);
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
      map.set(b.room_id, roomMap);
    }
    return map;
  }, [calendarBookings]);

  const monthLabel = useMemo(() => jalaliMonthLabel(monthAnchor), [monthAnchor]);

  const shiftMonth = (dir: 1 | -1) => {
    setMonthAnchor((prev) => shiftJalaliMonth(prev, dir));
  };

  return (
    <>
      <PageHeader
        title="مدیریت رزروها"
        description="پیگیری رزروها، مدیریت ورود و خروج مهمانان و مشاهده تقویم اشغال"
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setTab('list')}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${tab === 'list' ? 'bg-forest-600 text-white' : 'bg-white text-forest-600 border border-forest-200 hover:bg-forest-50'}`}
        >
          <CalendarDays size={15} className="inline ml-1.5" />
          لیست رزروها {total > 0 && `(${faNum(total)})`}
        </button>
        <button
          onClick={() => setTab('calendar')}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${tab === 'calendar' ? 'bg-forest-600 text-white' : 'bg-white text-forest-600 border border-forest-200 hover:bg-forest-50'}`}
        >
          <CalendarRange size={15} className="inline ml-1.5" />
          تقویم اشغال
        </button>
      </div>

      {tab === 'list' && (
        <div className="rounded-2xl bg-white shadow-sm border border-forest-50">
          {/* فیلترها */}
          <div className="grid gap-3 border-b border-forest-50 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-forest-300" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="جستجو: نام / موبایل / شماره رزرو"
                className={`${inputCls} pr-9`}
              />
            </div>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={inputCls}>
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <div className={inputCls} title="از تاریخ ورود">
              <JalaliDatePicker value={from} onChange={(iso) => { setFrom(iso); setPage(1); }} placeholder="از تاریخ ورود" />
            </div>
            <div className={inputCls} title="تا تاریخ ورود">
              <JalaliDatePicker value={to} min={from || undefined} onChange={(iso) => { setTo(iso); setPage(1); }} placeholder="تا تاریخ ورود" />
            </div>
            <button onClick={() => { setSearch(''); setStatus(''); setFrom(''); setTo(''); setPage(1); }} className={btnOutline}>
              <RefreshCw size={15} /> پاک کردن
            </button>
          </div>

          {/* جدول */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-forest-50 bg-forest-50/40 text-xs text-forest-500">
                  <th className="px-4 py-3 font-bold">شماره رزرو</th>
                  <th className="px-4 py-3 font-bold">مهمان</th>
                  <th className="px-4 py-3 font-bold">اتاق</th>
                  <th className="px-4 py-3 font-bold">ورود / خروج</th>
                  <th className="px-4 py-3 font-bold">شب‌ها</th>
                  <th className="px-4 py-3 font-bold">مسافران</th>
                  <th className="px-4 py-3 font-bold">مبلغ</th>
                  <th className="px-4 py-3 font-bold">وضعیت</th>
                  <th className="px-4 py-3 font-bold">پرداخت</th>
                  <th className="px-4 py-3 font-bold">جزئیات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10}><Loading /></td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={10}><EmptyState text="رزروی یافت نشد" /></td></tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="border-b border-forest-50/60 hover:bg-forest-50/30 cursor-pointer" onClick={() => openDetail(r.id)}>
                      <td className="px-4 py-3 font-bold text-forest-700"><span dir="ltr">{r.reservation_number}</span></td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-forest-800">{r.guest_name}</p>
                        {r.guest_phone && <p className="text-xs text-forest-400" dir="ltr">{faNum(r.guest_phone)}</p>}
                      </td>
                      <td className="px-4 py-3 text-forest-600">{r.room_name}</td>
                      <td className="px-4 py-3 text-xs text-forest-600">
                        {jalaliFriendly(r.check_in)}<br />← {jalaliFriendly(r.check_out)}
                      </td>
                      <td className="px-4 py-3">{faNum(r.number_of_nights)}</td>
                      <td className="px-4 py-3 text-xs">
                        {faNum(r.number_of_adults ?? r.number_of_guests)} بزرگسال
                        {r.number_of_children ? ` + ${faNum(r.number_of_children)} کودک` : ''}
                      </td>
                      <td className="px-4 py-3 font-black text-forest-800">{formatToman(r.total_price)}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3"><PaymentBadge status={r.payment_status} /></td>
                      <td className="px-4 py-3">
                        <button className="inline-flex items-center gap-1 rounded-lg bg-forest-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-forest-700">
                          نمایش <ChevronLeft size={13} />
                        </button>
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
      )}

      {tab === 'calendar' && (
        <div className="rounded-2xl bg-white shadow-sm border border-forest-50 p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => shiftMonth(-1)} className="rounded-lg border border-forest-200 p-2 text-forest-600 hover:bg-forest-50"><ChevronRight size={18} /></button>
              <h3 className="text-lg font-black text-forest-800">{monthLabel}</h3>
              <button onClick={() => shiftMonth(1)} className="rounded-lg border border-forest-200 p-2 text-forest-600 hover:bg-forest-50"><ChevronLeft size={18} /></button>
            </div>
            <button onClick={loadCalendar} className={btnOutline}><RefreshCw size={15} /> به‌روزرسانی</button>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-4 text-[11px] text-forest-600">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-green-100 border border-green-300 inline-block" /> خالی (همانند تقویم مهمان)</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-500 inline-block" /> در انتظار پرداخت</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-600 inline-block" /> رزرو قطعی / ورود شده</span>
          </div>

          {calendarLoading ? (
            <Loading />
          ) : (
            <>
              {/* خلاصه روزانه */}
              <div className="mb-6 overflow-x-auto">
                <div className="flex gap-1.5 min-w-max">
                  {calendarDays.map((d) => {
                    const bookedCount = calendarRooms.filter((r) => bookedDaysByRoom.get(r.id)?.has(d.iso)).length;
                    const busy = bookedCount >= calendarRooms.length;
                    return (
                      <div key={d.iso} className="flex w-9 flex-col items-center rounded-lg border border-forest-100 py-1.5 text-center">
                        <span className="text-[9px] text-forest-400">{faNum(d.day)}</span>
                        <span className={`mt-1 h-3.5 w-3.5 rounded-full ${busy ? 'bg-red-600' : bookedCount > 0 ? 'bg-amber-500' : 'bg-green-600'}`} />
                        <span className="mt-0.5 text-[9px] font-bold text-forest-500">{faNum(bookedCount)}/{faNum(calendarRooms.length)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ماتریس اتاق × روز */}
              <div className="overflow-x-auto">
                <table className="w-full text-center text-[11px]">
                  <thead>
                    <tr>
                      <th className="sticky right-0 bg-white px-3 py-2 text-right text-forest-600 font-bold min-w-36">اتاق</th>
                      {calendarDays.map((d) => (
                        <th key={d.iso} className="px-1 py-2 text-forest-500 font-bold">{faNum(d.day)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {calendarRooms.map((room) => (
                      <tr key={room.id} className="border-t border-forest-50">
                        <td className="sticky right-0 bg-white px-3 py-1.5 text-right font-bold text-forest-700 min-w-36">{room.name}</td>
                        {calendarDays.map((d) => {
                          const refs = bookingRefsByDay.get(room.id)?.get(d.iso) || [];
                          const isBooked = refs.length > 0;
                          const isPending = refs.length > 0 && refs.some((x) => x.status === 'PENDING') && !refs.some((x) => x.status !== 'PENDING');
                          return (
                            <td key={d.iso} className="p-0.5">
                              <div
                                title={isBooked ? refs.map((x) => x.label).join('\n') : 'خالی'}
                                className={`mx-auto h-6 w-6 rounded ${isPending ? 'bg-amber-500' : isBooked ? 'bg-red-600' : 'bg-green-100 hover:bg-green-200'}`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[11px] text-forest-400">برای مشاهده جزئیات یک روز پر، نشانگر ماوس را روی خانه رزروشده نگه دارید.</p>
            </>
          )}
        </div>
      )}

      {/* ─────────── مودال جزئیات ─────────── */}
      <Modal open={detailId !== null} onClose={() => setDetailId(null)} title="جزئیات رزرو" wide>
        {detailLoading || !detail ? (
          <Loading />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-lg font-black text-forest-800" dir="ltr">{detail.reservation_number}</p>
                <p className="text-xs text-forest-400">ثبت‌شده: {formatDateTime(detail.created_at)}</p>
              </div>
              <div className="flex gap-1.5">
                <StatusBadge status={detail.status} />
                <PaymentBadge status={detail.payment_status} />
                <SmsBadge status={detail.sms_status} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* اتاق و اقامت */}
              <div className="rounded-xl border border-forest-100 p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-forest-700"><BedDouble size={15} className="text-gold-500" /> اقامت</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-forest-500">اتاق</span><b className="text-forest-800">{detail.room_name}{detail.room_number ? ` (${detail.room_number})` : ''}</b></div>
                  <div className="flex justify-between"><span className="text-forest-500">ورود</span><b className="text-forest-800">{jalaliFriendly(detail.check_in)}</b></div>
                  <div className="flex justify-between"><span className="text-forest-500">خروج</span><b className="text-forest-800">{jalaliFriendly(detail.check_out)}</b></div>
                  <div className="flex justify-between"><span className="text-forest-500">تعداد شب</span><b className="text-forest-800">{faNum(detail.number_of_nights)} شب</b></div>
                  <div className="flex justify-between"><span className="text-forest-500">مسافران</span><b className="text-forest-800">{faNum(detail.number_of_adults ?? detail.number_of_guests)} بزرگسال{detail.number_of_children ? ` + ${faNum(detail.number_of_children)} کودک` : ''}</b></div>
                  {parseChildAges(detail).length > 0 && (
                    <div className="flex justify-between gap-2"><span className="text-forest-500">کودکان</span><b className="text-forest-800 text-left">{parseChildAges(detail).map((a, i) => `کودک ${faNum(i + 1)}: ${childGroupLabel(a)}`).join('، ')}</b></div>
                  )}
                </div>
              </div>

              {/* مهمان */}
              <div className="rounded-xl border border-forest-100 p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-forest-700"><User size={15} className="text-gold-500" /> مهمانان (تطبیق مدارک هنگام ورود)</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-1.5"><User size={13} className="text-forest-300" /><b className="text-forest-800">{detail.guest_name}</b></div>
                  {detail.guest_phone && <div className="flex items-center gap-1.5"><Phone size={13} className="text-forest-300" /><span dir="ltr">{faNum(detail.guest_phone)}</span></div>}
                  {detail.guest_email && <div className="flex items-center gap-1.5"><Mail size={13} className="text-forest-300" /><span dir="ltr">{detail.guest_email}</span></div>}
                  {detail.guest_national_id && (
                    <div className="flex items-center gap-1.5"><Fingerprint size={13} className="text-forest-300" /><span dir="ltr">{toFaDigits(detail.guest_national_id)}</span></div>
                  )}
                  <div className="mt-3 border-t border-forest-50 pt-2 space-y-1">
                    {parseGuestDetails(detail).map((g, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-forest-600">{faNum(i + 1)}. {g.name}</span>
                        <span className="text-forest-400" dir="ltr">{toFaDigits(g.nationalId)}</span>
                      </div>
                    ))}
                    {parseGuestDetails(detail).length === 0 && <p className="text-xs text-forest-400">مشخصات تفصیلی ثبت نشده است</p>}
                  </div>
                </div>
              </div>

              {/* مالی */}
              <div className="rounded-xl border border-forest-100 p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-forest-700"><Wallet size={15} className="text-gold-500" /> مالی</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-forest-500">قیمت هر بزرگسال / شب</span><b className="text-forest-800">{formatToman(detail.price_per_night)}</b></div>
                  <div className="flex justify-between"><span className="text-forest-500">مجموع</span><b className="text-gold-600">{formatToman(detail.total_price)}</b></div>
                  <div className="flex justify-between"><span className="text-forest-500">پرداخت</span><b className="text-forest-800">{detail.paid_at ? formatDateTime(detail.paid_at) : '—'}</b></div>
                  {detail.ref_id && <div className="flex justify-between"><span className="text-forest-500">کد پیگیری</span><b className="text-forest-800" dir="ltr">{detail.ref_id}</b></div>}
                  {detail.authority && <div className="flex justify-between gap-2"><span className="text-forest-500">شناسه درگاه</span><b className="text-forest-800 text-left" dir="ltr" style={{ wordBreak: 'break-all' }}>{detail.authority}</b></div>}
                  <div className="flex justify-between"><span className="text-forest-500">ورود ثبت‌شده</span><b className="text-forest-800">{detail.checked_in_at ? formatDateTime(detail.checked_in_at) : '—'}</b></div>
                  <div className="flex justify-between"><span className="text-forest-500">خروج ثبت‌شده</span><b className="text-forest-800">{detail.checked_out_at ? formatDateTime(detail.checked_out_at) : '—'}</b></div>
                </div>
              </div>

              {/* درخواست ویژه */}
              <div className="rounded-xl border border-forest-100 p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-forest-700"><StickyNote size={15} className="text-gold-500" /> درخواست ویژه</h4>
                <p className="text-sm text-forest-600 leading-relaxed">{detail.special_requests || '—'}</p>

                <h4 className="mt-4 mb-2 flex items-center gap-2 text-sm font-black text-forest-700"><MessageSquareText size={15} className="text-gold-500" /> یادداشت مدیر</h4>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} placeholder="مثلاً: اتاق جنب راه‌پله طبق درخواست مهمان..." />
                <button onClick={saveNotes} disabled={acting} className={`${btnOutline} mt-2 w-full`}>
                  {acting ? <Loader2 className="animate-spin" size={15} /> : <StickyNote size={15} />} ذخیره یادداشت
                </button>
              </div>
            </div>

            {/* پیامک */}
            <div className="rounded-xl border border-forest-100 p-4">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-black text-forest-700"><MessageSquareText size={15} className="text-gold-500" /> ارسال پیامک به مهمان</h4>
              <div className="flex flex-col sm:flex-row gap-2">
                <input value={smsText} onChange={(e) => setSmsText(e.target.value)} placeholder="متن پیامک..." className={inputCls} />
                <button onClick={doSendSms} disabled={acting || !detail.guest_phone} className={`${btnPrimary} sm:w-40 shrink-0`}>
                  {acting ? <Loader2 className="animate-spin" size={15} /> : <MessageSquareText size={15} />} ارسال
                </button>
              </div>
              {!detail.guest_phone && <p className="mt-1 text-[11px] text-amber-600">شماره تلفن مهمان ثبت نشده است.</p>}
            </div>

            {/* عملیات وضعیت */}
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-forest-50 pt-4">
              {detail.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => setStatusAnd(() => adminUpdateReservation(detail.id, { status: 'CONFIRMED' }), 'رزرو تأیید شد')}
                    disabled={acting}
                    className={btnPrimary}
                  >
                    <CheckCircle2 size={15} /> تأیید رزرو
                  </button>
                  {detail.payment_status !== 'SUCCESS' && (
                    <button
                      onClick={() => setStatusAnd(() => adminCancel(detail.id), 'رزرو کنسل شد')}
                      disabled={acting}
                      className={btnDanger}
                    >
                      <XCircle size={15} /> کنسل کردن
                    </button>
                  )}
                </>
              )}
              {detail.status === 'CONFIRMED' && (
                <>
                  <button
                    onClick={() => setStatusAnd(() => adminCheckIn(detail.id), 'ورود مهمان ثبت شد')}
                    disabled={acting}
                    className={btnPrimary}
                  >
                    <LogIn size={15} /> ثبت ورود مهمان
                  </button>
                  {detail.payment_status !== 'SUCCESS' && (
                    <button
                      onClick={() => setStatusAnd(() => adminCancel(detail.id), 'رزرو کنسل شد')}
                      disabled={acting}
                      className={btnDanger}
                    >
                      <Ban size={15} /> کنسل کردن رزرو
                    </button>
                  )}
                </>
              )}
              {detail.status === 'CHECKED_IN' && (
                <button
                  onClick={() => setStatusAnd(() => adminCheckOut(detail.id), 'خروج مهمان ثبت شد')}
                  disabled={acting}
                  className={btnPrimary}
                >
                  <LogOut size={15} /> ثبت خروج مهمان
                </button>
              )}
              {(detail.status === 'CHECKED_OUT' || detail.status === 'CANCELLED') && (
                <p className="text-xs text-forest-400">این رزرو به پایان رسیده است.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}