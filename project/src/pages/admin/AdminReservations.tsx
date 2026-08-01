import { useCallback, useEffect, useState } from 'react';
import { Search, Filter, Eye, LogIn, LogOut, XCircle, MessageSquareText, Save, ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import {
  adminReservations, adminReservationDetail, adminUpdateReservation, adminCheckIn,
  adminCheckOut, adminCancel, adminSendReservationSms, adminRooms, apiError, type ReservationRow, type Room,
} from '../../services/adminApi';
import {
  StatusBadge, PaymentBadge, SmsBadge, Modal, Loading, EmptyState, Field,
  inputCls, btnPrimary, btnOutline, btnDanger, btnGold,
} from '../../components/admin/AdminUI';
import { formatToman, formatDateTime, faNum } from '../../utils/dates';

const STATUS_FILTERS = ['', 'PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'];

export default function AdminReservations() {
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // فیلترها
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [roomId, setRoomId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // مودال‌ها
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ReservationRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminReservations({
        status: status || undefined,
        search: search || undefined,
        roomId: roomId ? Number(roomId) : undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        limit: 20,
      });
      setRows(res.reservations);
      setTotal(res.total);
      setPages(res.pages);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }, [status, search, roomId, from, to, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    adminRooms().then(setRooms).catch(() => {});
  }, []);

  const openDetail = async (id: number) => {
    setDetailId(id);
    setDetail(null);
    try {
      const d = await adminReservationDetail(id);
      setDetail(d);
    } catch (e) {
      setError(apiError(e));
    }
  };

  const openEdit = (row: ReservationRow) => {
    setEditNotes(row.admin_notes || '');
    setEditStatus(row.status);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!detailId) return;
    setBusy(true);
    try {
      await adminUpdateReservation(detailId, { status: editStatus, adminNotes: editNotes });
      setEditOpen(false);
      await load();
      await openDetail(detailId);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const doCheckIn = async (id: number) => {
    if (!window.confirm('ثبت ورود مهمان؟')) return;
    setBusy(true);
    try {
      await adminCheckIn(id);
      await load();
      if (detailId === id) await openDetail(id);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const doCheckOut = async (id: number) => {
    if (!window.confirm('ثبت خروج مهمان؟')) return;
    setBusy(true);
    try {
      await adminCheckOut(id);
      await load();
      if (detailId === id) await openDetail(id);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const doCancel = async (id: number) => {
    if (!window.confirm('از کنسل کردن این رزرو مطمئن هستید؟')) return;
    setBusy(true);
    try {
      await adminCancel(id);
      await load();
      if (detailId === id) await openDetail(id);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const doSendSms = async () => {
    if (!detailId || !smsMessage.trim()) return;
    setBusy(true);
    try {
      await adminSendReservationSms(detailId, smsMessage);
      setSmsOpen(false);
      setSmsMessage('');
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black text-forest-800">مدیریت رزروها</h2>
        <span className="text-sm text-forest-400">مجموع: {faNum(total)} رزرو</span>
      </div>

      {/* فیلترها */}
      <div className="rounded-2xl bg-white p-4 shadow-sm border border-forest-50 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-forest-300" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="جستجو: شماره رزرو، نام، ایمیل، تلفن"
              className={`${inputCls} pr-9`}
            />
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={`${inputCls} w-auto`}>
            {STATUS_FILTERS.map((s) => (
              <option key={s || 'all'} value={s}>{s ? ({ PENDING: 'در انتظار', CONFIRMED: 'تأیید شده', CHECKED_IN: 'ورود شده', CHECKED_OUT: 'خروج شده', CANCELLED: 'کنسل شده' } as Record<string, string>)[s] : 'همه وضعیت‌ها'}</option>
            ))}
          </select>
          <select value={roomId} onChange={(e) => { setRoomId(e.target.value); setPage(1); }} className={`${inputCls} w-auto`}>
            <option value="">همه اتاق‌ها</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-forest-500">
          <Filter size={14} />
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={inputCls + ' !w-auto'} />
          <span>تا</span>
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={inputCls + ' !w-auto'} />
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</p>}

      {/* جدول */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-forest-50">
        {loading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="bg-forest-50/70 text-right text-xs text-forest-500">
                  <th className="px-4 py-3 font-bold">شماره رزرو</th>
                  <th className="px-4 py-3 font-bold">اتاق</th>
                  <th className="px-4 py-3 font-bold">مهمان</th>
                  <th className="px-4 py-3 font-bold">ورود ← خروج</th>
                  <th className="px-4 py-3 font-bold">مبلغ</th>
                  <th className="px-4 py-3 font-bold">وضعیت</th>
                  <th className="px-4 py-3 font-bold">پرداخت</th>
                  <th className="px-4 py-3 font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-forest-50 hover:bg-forest-50/40 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => openDetail(r.id)} className="font-black text-forest-700 hover:text-gold-600" dir="ltr">
                        {r.reservation_number}
                      </button>
                      <SmsBadge status={r.sms_status} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-forest-800">{r.room_name}</p>
                      {r.room_number && <p className="text-[10px] text-forest-400">واحد {faNum(r.room_number)}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-forest-800">{r.guest_name}</p>
                      <p className="text-[11px] text-forest-400" dir="ltr">{r.guest_phone || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-forest-600">
                      {faNum(r.number_of_nights)} شب
                      <p className="text-[11px] text-forest-400">{formatDateTime(r.check_in)} ← {formatDateTime(r.check_out)}</p>
                    </td>
                    <td className="px-4 py-3 font-black text-gold-600">{formatToman(r.total_price)}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3"><PaymentBadge status={r.payment_status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openDetail(r.id)} title="مشاهده" className="rounded-lg bg-forest-50 p-2 text-forest-600 hover:bg-forest-100">
                          <Eye size={15} />
                        </button>
                        {r.status === 'CONFIRMED' && (
                          <button onClick={() => doCheckIn(r.id)} title="ثبت ورود" className="rounded-lg bg-green-50 p-2 text-green-600 hover:bg-green-100">
                            <LogIn size={15} />
                          </button>
                        )}
                        {r.status === 'CHECKED_IN' && (
                          <button onClick={() => doCheckOut(r.id)} title="ثبت خروج" className="rounded-lg bg-sky-50 p-2 text-sky-600 hover:bg-sky-100">
                            <LogOut size={15} />
                          </button>
                        )}
                        {!['CANCELLED', 'CHECKED_OUT'].includes(r.status) && (
                          <button onClick={() => doCancel(r.id)} title="کنسل" className="rounded-lg bg-red-50 p-2 text-red-500 hover:bg-red-100">
                            <XCircle size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* صفحه‌بندی */}
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

      {/* ───── مودال جزئیات ───── */}
      <Modal open={detailId !== null} onClose={() => setDetailId(null)} title="جزئیات رزرو" wide>
        {!detail ? (
          <Loading />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="mb-2 flex items-center gap-2"><StatusBadge status={detail.status} /><PaymentBadge status={detail.payment_status} /></p>
                <p className="font-black text-lg text-forest-800" dir="ltr">{detail.reservation_number}</p>
                <p className="text-xs text-forest-400">ثبت: {formatDateTime(detail.created_at)}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {detail.guest_phone && (
                  <a href={`tel:${detail.guest_phone}`} className="inline-flex items-center gap-2 rounded-full bg-forest-50 px-4 py-2 text-sm font-bold text-forest-700 hover:bg-forest-100">
                    <Phone size={15} /> <span dir="ltr">{detail.guest_phone}</span>
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-forest-50/60 p-4 text-sm">
              <div><p className="text-xs text-forest-400">اتاق</p><p className="font-bold text-forest-800">{detail.room_name}</p></div>
              <div><p className="text-xs text-forest-400">مهمانان</p><p className="font-bold text-forest-800">{faNum(detail.number_of_guests)} نفر</p></div>
              <div><p className="text-xs text-forest-400">شب‌ها</p><p className="font-bold text-forest-800">{faNum(detail.number_of_nights)} شب</p></div>
              <div><p className="text-xs text-forest-400">مبلغ هر شب</p><p className="font-bold text-forest-800">{formatToman(detail.price_per_night)}</p></div>
              <div className="col-span-2"><p className="text-xs text-forest-400">ورود ← خروج</p><p className="font-bold text-forest-800">{formatDateTime(detail.check_in)} ← {formatDateTime(detail.check_out)}</p></div>
              <div className="col-span-2"><p className="text-xs text-forest-400">مجموع</p><p className="font-black text-gold-600">{formatToman(detail.total_price)}</p></div>
            </div>

            <div className="space-y-2 text-sm">
              <p className="text-xs font-bold text-forest-400">مهمان</p>
              <p className="font-bold text-forest-800">{detail.guest_name} <span className="font-normal text-forest-400">({detail.guest_email})</span></p>
              {detail.special_requests && (
                <p className="rounded-xl bg-amber-50 px-4 py-3 text-amber-800 text-xs">درخواست ویژه: {detail.special_requests}</p>
              )}
              {detail.admin_notes && (
                <p className="rounded-xl bg-forest-50 px-4 py-3 text-forest-600 text-xs">یادداشت مدیریت: {detail.admin_notes}</p>
              )}
              {detail.checked_in_at && <p className="text-xs text-forest-500">ورود: {formatDateTime(detail.checked_in_at)}</p>}
              {detail.checked_out_at && <p className="text-xs text-forest-500">خروج: {formatDateTime(detail.checked_out_at)}</p>}
              {detail.paid_at && <p className="text-xs text-forest-500">پرداخت: {formatDateTime(detail.paid_at)} {detail.ref_id ? `(کد پیگیری: ${detail.ref_id})` : ''}</p>}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-forest-50 pt-4">
              <button className={btnPrimary} onClick={() => openEdit(detail)}><Save size={15} /> ویرایش</button>
              {detail.status === 'CONFIRMED' && <button className={btnPrimary} onClick={() => doCheckIn(detail.id)}><LogIn size={15} /> ثبت ورود</button>}
              {detail.status === 'CHECKED_IN' && <button className={btnPrimary} onClick={() => doCheckOut(detail.id)}><LogOut size={15} /> ثبت خروج</button>}
              <button className={btnOutline} onClick={() => { setSmsOpen(true); setSmsMessage(`سلام ${detail.guest_name}، هتل باغ سرهنگ`); }}><MessageSquareText size={15} /> پیامک</button>
              {!['CANCELLED', 'CHECKED_OUT'].includes(detail.status) && (
                <button className={btnDanger} onClick={() => doCancel(detail.id)}><XCircle size={15} /> کنسل رزرو</button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ───── مودال ویرایش ───── */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="ویرایش رزرو">
        <div className="space-y-4">
          <Field label="وضعیت">
            <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className={inputCls}>
              {Object.entries({ PENDING: 'در انتظار', CONFIRMED: 'تأیید شده', CHECKED_IN: 'ورود شده', CHECKED_OUT: 'خروج شده', CANCELLED: 'کنسل شده' }).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="یادداشت مدیریت">
            <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={4} className={inputCls} placeholder="مثلاً: مهمان درخواست تخت اضافه داشت..." />
          </Field>
          <div className="flex gap-2">
            <button className={btnPrimary} disabled={busy} onClick={saveEdit}><Save size={15} /> ذخیره</button>
            <button className={btnOutline} onClick={() => setEditOpen(false)}>انصراف</button>
          </div>
        </div>
      </Modal>

      {/* ───── مودال پیامک ───── */}
      <Modal open={smsOpen} onClose={() => setSmsOpen(false)} title="ارسال پیامک">
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
