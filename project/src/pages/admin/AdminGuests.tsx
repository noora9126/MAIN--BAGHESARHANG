import { useCallback, useEffect, useState } from 'react';
import { Search, Eye, MessageSquareText, Save, ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import {
  adminGuests, adminGuestDetail, adminUpdateGuestNotes, adminSendGuestSms, apiError,
  type GuestRow, type ReservationRow,
} from '../../services/adminApi';
import { Modal, Loading, EmptyState, Field, inputCls, btnPrimary, btnGold, StatusBadge, PaymentBadge } from '../../components/admin/AdminUI';
import { formatToman, formatDateTime, faNum } from '../../utils/dates';

export default function AdminGuests() {
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [detailPhone, setDetailPhone] = useState<string | null>(null);
  const [guest, setGuest] = useState<GuestRow | null>(null);
  const [history, setHistory] = useState<ReservationRow[]>([]);
  const [notes, setNotes] = useState('');
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGuests({ search: search || undefined, page, limit: 20 });
      setGuests(res.guests);
      setTotal(res.total);
      setPages(res.pages);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openGuest = async (phone: string) => {
    setDetailPhone(phone);
    setGuest(null);
    setHistory([]);
    try {
      const res = await adminGuestDetail(phone);
      setGuest(res.guest);
      setHistory(res.reservations);
      setNotes(res.guest.notes || '');
    } catch (e) {
      setError(apiError(e));
    }
  };

  const saveNotes = async () => {
    if (!detailPhone) return;
    setBusy(true);
    try {
      await adminUpdateGuestNotes(detailPhone, notes);
      await openGuest(detailPhone);
      await load();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const doSendSms = async () => {
    if (!detailPhone || !smsMessage.trim()) return;
    setBusy(true);
    try {
      await adminSendGuestSms(detailPhone, smsMessage);
      setSmsOpen(false);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black text-forest-800">مدیریت مهمانان</h2>
        <span className="text-sm text-forest-400">مجموع: {faNum(total)} مهمان</span>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm border border-forest-50">
        <div className="relative max-w-md">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-forest-300" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="جستجو: نام یا شماره تلفن"
            className={`${inputCls} pr-9`}
          />
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-forest-50">
        {loading ? (
          <Loading />
        ) : guests.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-forest-50/70 text-right text-xs text-forest-500">
                  <th className="px-4 py-3 font-bold">نام</th>
                  <th className="px-4 py-3 font-bold">تلفن</th>
                  <th className="px-4 py-3 font-bold">تعداد رزرو</th>
                  <th className="px-4 py-3 font-bold">آخرین رزرو</th>
                  <th className="px-4 py-3 font-bold">مجموع خرید</th>
                  <th className="px-4 py-3 font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {guests.map((g) => (
                  <tr key={g.phone} className="border-t border-forest-50 hover:bg-forest-50/40 transition-colors">
                    <td className="px-4 py-3 font-bold text-forest-800">{g.name}</td>
                    <td className="px-4 py-3 text-forest-600" dir="ltr">{g.phone}</td>
                    <td className="px-4 py-3">{faNum(g.totalBookings)}</td>
                    <td className="px-4 py-3 text-xs text-forest-500">{formatDateTime(g.lastReservation)}</td>
                    <td className="px-4 py-3 font-black text-gold-600">{formatToman(g.totalSpent)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openGuest(g.phone)} className="inline-flex items-center gap-1.5 rounded-lg bg-forest-50 px-3 py-1.5 text-xs font-bold text-forest-600 hover:bg-forest-100">
                        <Eye size={14} /> تاریخچه
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg bg-white p-2 text-forest-600 shadow-sm disabled:opacity-40">
            <ChevronRight size={18} />
          </button>
          <span className="text-sm text-forest-600">صفحه {faNum(page)} از {faNum(pages)}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="rounded-lg bg-white p-2 text-forest-600 shadow-sm disabled:opacity-40">
            <ChevronLeft size={18} />
          </button>
        </div>
      )}

      {/* ───── مودال جزئیات مهمان ───── */}
      <Modal open={detailPhone !== null} onClose={() => setDetailPhone(null)} title="تاریخچه مهمان" wide>
        {!guest ? (
          <Loading />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-forest-50/60 p-4">
              <div>
                <p className="font-black text-forest-800">{guest.name}</p>
                <p className="text-xs text-forest-500 flex items-center gap-1.5 mt-1">
                  <Phone size={12} /> <span dir="ltr">{guest.phone}</span>
                </p>
              </div>
              <div className="text-left">
                <p className="text-xs text-forest-400">{faNum(guest.totalBookings)} رزرو</p>
                <p className="font-black text-gold-600">{formatToman(guest.totalSpent)}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-black text-forest-800">یادداشت مدیریت</p>
              <Field label="">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputCls} placeholder="یادداشت درباره این مهمان..." />
              </Field>
              <button className={btnPrimary + ' mt-2'} disabled={busy} onClick={saveNotes}>
                <Save size={15} /> ذخیره یادداشت
              </button>
            </div>

            <div>
              <p className="mb-2 text-sm font-black text-forest-800">رزروهای مهمان</p>
              <div className="space-y-2">
                {history.length === 0 && <EmptyState />}
                {history.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-forest-50 bg-white px-4 py-3">
                    <div>
                      <p className="font-black text-forest-700" dir="ltr">{r.reservation_number}</p>
                      <p className="text-xs text-forest-400">{r.room_name} — {faNum(r.number_of_nights)} شب — {formatDateTime(r.check_in)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-gold-600 text-sm">{formatToman(r.total_price)}</span>
                      <StatusBadge status={r.status} />
                      <PaymentBadge status={r.payment_status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 border-t border-forest-50 pt-4">
              <button className={btnGold} onClick={() => { setSmsMessage(`سلام ${guest.name}، هتل باغ سرهنگ`); setSmsOpen(true); }}>
                <MessageSquareText size={15} /> ارسال پیامک
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ───── مودال پیامک ───── */}
      <Modal open={smsOpen} onClose={() => setSmsOpen(false)} title="ارسال پیامک به مهمان">
        <div className="space-y-4">
          <Field label="متن پیامک">
            <textarea value={smsMessage} onChange={(e) => setSmsMessage(e.target.value)} rows={5} className={inputCls} />
          </Field>
          <button className={btnGold} disabled={busy || !smsMessage.trim()} onClick={doSendSms}>
            <MessageSquareText size={15} /> ارسال پیامک
          </button>
        </div>
      </Modal>
    </div>
  );
}
