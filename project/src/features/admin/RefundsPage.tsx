import { useCallback, useEffect, useState } from 'react';
import {
  Search, ChevronRight, ChevronLeft, RefreshCw, Loader2, CreditCard,
  CheckCircle2, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/admin/PageHeader';
import { Modal, Loading, EmptyState, inputCls, btnPrimary, btnOutline, btnDanger } from '@/components/admin/AdminUI';
import {
  adminRefunds, adminRefundDetail, adminRefundCardDetails,
  adminProcessRefund, adminConfirmRefundPayment, adminRejectRefund,
  type RefundRow,
} from '@/services/adminApi';
import { jalaliFriendly, formatToman, faNum, formatDateTime } from '@/utils/dates';

const REFUND_STATUS_FILTERS = [
  { value: '', label: 'همه وضعیت‌ها' },
  { value: 'PENDING', label: 'در انتظار بررسی' },
  { value: 'APPROVED', label: 'تایید شده' },
  { value: 'PAID', label: 'واریز انجام شد' },
  { value: 'REJECTED', label: 'رد شد' },
  { value: 'CANCELLED', label: 'لغو شد' },
];

const REFUND_STATUS_BADGES: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'در انتظار بررسی', color: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'تایید شده', color: 'bg-blue-100 text-blue-700' },
  PAID: { label: 'واریز انجام شد', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'رد شد', color: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'لغو شد', color: 'bg-gray-100 text-gray-600' },
};

function RefundStatusBadge({ status }: { status: string }) {
  const badge = REFUND_STATUS_BADGES[status];
  if (!badge) return <span className="text-xs text-forest-400">{status}</span>;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badge.color}`}>
      {badge.label}
    </span>
  );
}

export default function RefundsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<RefundRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Detail modal
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<RefundRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [acting, setActing] = useState(false);

  // Card details modal
  const [cardDetailsOpen, setCardDetailsOpen] = useState(false);
  const [cardDetails, setCardDetails] = useState<{ refund_card_number: string | null; refund_card_holder_name: string | null } | null>(null);

  // Reject modal
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Confirm payment modal
  const [confirmPaymentOpen, setConfirmPaymentOpen] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminRefunds({
        status: statusFilter || undefined,
        search: search || undefined,
        page,
        limit: 20,
      });
      setRows(res.refunds);
      setTotal(res.total);
      setTotalPages(res.pages);
    } catch {
      toast.error('دریافت درخواست‌ها ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => { loadList(); }, [loadList]);

  const openDetail = async (id: number) => {
    setDetailId(id);
    setDetailLoading(true);
    try {
      const r = await adminRefundDetail(id);
      setDetail(r);
    } catch {
      toast.error('دریافت جزئیات ناموفق بود');
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async () => {
    if (!detailId) return;
    try {
      const r = await adminRefundDetail(detailId);
      setDetail(r);
    } catch { /* silent refresh */ }
  };

  const handleProcess = async () => {
    if (!detail) return;
    setActing(true);
    try {
      await adminProcessRefund(detail.id);
      toast.success('درخواست تایید شد');
      await refreshDetail();
      await loadList();
    } catch (err: unknown) {
      const msg = err instanceof Error ? (err as { response?: { data?: { message?: string } } }).response?.data?.message || err.message : 'خطا در پردازش';
      toast.error(msg);
    } finally {
      setActing(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!detail) return;
    setActing(true);
    try {
      await adminConfirmRefundPayment(detail.id, transactionRef || undefined);
      toast.success('واریز تایید شد');
      setConfirmPaymentOpen(false);
      setTransactionRef('');
      await refreshDetail();
      await loadList();
    } catch (err: unknown) {
      const msg = err instanceof Error ? (err as { response?: { data?: { message?: string } } }).response?.data?.message || err.message : 'خطا در تایید واریز';
      toast.error(msg);
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!detail || !rejectReason.trim()) {
      toast.error('دلیل رد الزامی است');
      return;
    }
    setActing(true);
    try {
      await adminRejectRefund(detail.id, rejectReason.trim());
      toast.success('درخواست رد شد');
      setRejectOpen(false);
      setRejectReason('');
      await refreshDetail();
      await loadList();
    } catch (err: unknown) {
      const msg = err instanceof Error ? (err as { response?: { data?: { message?: string } } }).response?.data?.message || err.message : 'خطا در رد درخواست';
      toast.error(msg);
    } finally {
      setActing(false);
    }
  };

  const openCardDetails = async (id: number) => {
    try {
      const cd = await adminRefundCardDetails(id);
      setCardDetails(cd);
      setCardDetailsOpen(true);
    } catch {
      toast.error('خطا در دریافت اطلاعات کارت');
    }
  };

  return (
    <>
      <PageHeader
        title="درخواست‌های لغو و بازپرداخت"
        description="مدیریت درخواست‌های لغو رزرو و بازپرداخت وجه"
      />

      <div className="rounded-2xl bg-white shadow-sm border border-forest-50">
        {/* فیلترها */}
        <div className="grid gap-3 border-b border-forest-50 p-4 sm:grid-cols-3">
          <div className="relative">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-forest-300" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="جستجو: شماره رزرو / نام / موبایل"
              className={`${inputCls} pr-9`}
            />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={inputCls}>
            {REFUND_STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }} className={btnOutline}>
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
                <th className="px-4 py-3 font-bold">مبلغ بازپرداخت</th>
                <th className="px-4 py-3 font-bold">کارت مقصد</th>
                <th className="px-4 py-3 font-bold">وضعیت</th>
                <th className="px-4 py-3 font-bold">تاریخ درخواست</th>
                <th className="px-4 py-3 font-bold">جزئیات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9}><Loading /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9}><EmptyState text="درخواستی یافت نشد" /></td></tr>
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
                    <td className="px-4 py-3 font-black text-forest-800">{formatToman(r.amount)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); openCardDetails(r.id); }}
                        className="text-xs text-forest-500 hover:text-forest-700 underline"
                      >
                        {r.refund_card_number_masked || '—'}
                      </button>
                    </td>
                    <td className="px-4 py-3"><RefundStatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-xs text-forest-500">{formatDateTime(r.requested_at)}</td>
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

      {/* ─────────── مودال جزئیات ─────────── */}
      <Modal open={detailId !== null} onClose={() => setDetailId(null)} title="جزئیات درخواست بازپرداخت" wide>
        {detailLoading || !detail ? (
          <Loading />
        ) : (
          <div className="space-y-5">
            {/* هدر */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-lg font-black text-forest-800" dir="ltr">{detail.reservation_number}</p>
                <p className="text-xs text-forest-400">درخواست ثبت شده: {formatDateTime(detail.requested_at)}</p>
              </div>
              <RefundStatusBadge status={detail.status} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* اطلاعات رزرو */}
              <div className="rounded-xl border border-forest-100 p-4">
                <h4 className="mb-3 text-sm font-black text-forest-700">رزرو</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-forest-500">اتاق</span><b className="text-forest-800">{detail.room_name}</b></div>
                  <div className="flex justify-between"><span className="text-forest-500">ورود</span><b className="text-forest-800">{jalaliFriendly(detail.check_in)}</b></div>
                  <div className="flex justify-between"><span className="text-forest-500">خروج</span><b className="text-forest-800">{jalaliFriendly(detail.check_out)}</b></div>
                  <div className="flex justify-between"><span className="text-forest-500">مبلغ رزرو</span><b className="text-forest-800">{formatToman(detail.total_price)}</b></div>
                  <div className="flex justify-between"><span className="text-forest-500">وضعیت پرداخت</span><b className="text-forest-800">{detail.payment_status}</b></div>
                </div>
              </div>

              {/* اطلاعات مهمان */}
              <div className="rounded-xl border border-forest-100 p-4">
                <h4 className="mb-3 text-sm font-black text-forest-700">مهمان</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-forest-500">نام</span><b className="text-forest-800">{detail.guest_name}</b></div>
                  <div className="flex justify-between"><span className="text-forest-500">موبایل</span><b className="text-forest-800" dir="ltr">{detail.guest_phone}</b></div>
                  {detail.guest_email && <div className="flex justify-between"><span className="text-forest-500">ایمیل</span><b className="text-forest-800 text-left" dir="ltr">{detail.guest_email}</b></div>}
                </div>
              </div>

              {/* اطلاعات بازپرداخت */}
              <div className="rounded-xl border border-forest-100 p-4">
                <h4 className="mb-3 text-sm font-black text-forest-700">بازپرداخت</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-forest-500">مبلغ بازپرداخت</span><b className="text-lg font-black text-forest-800">{formatToman(detail.amount)}</b></div>
                  <div className="flex justify-between">
                    <span className="text-forest-500">کارت مقصد</span>
                    <button
                      onClick={() => openCardDetails(detail.id)}
                      className="text-xs text-forest-500 hover:text-forest-700 underline"
                    >
                      مشاهده کامل
                    </button>
                  </div>
                  {detail.processed_at && <div className="flex justify-between"><span className="text-forest-500">تاریخ پردازش</span><b className="text-forest-800">{formatDateTime(detail.processed_at)}</b></div>}
                  {detail.transaction_ref && <div className="flex justify-between"><span className="text-forest-500">شماره پیگیری</span><b className="text-forest-800" dir="ltr">{detail.transaction_ref}</b></div>}
                  {detail.rejection_reason && (
                    <div className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                      <span className="font-bold">دلیل رد:</span> {detail.rejection_reason}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* عملیات */}
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-forest-50 pt-4">
              {detail.status === 'PENDING' && (
                <>
                  <button onClick={handleProcess} disabled={acting} className={btnPrimary}>
                    {acting ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle2 size={15} />} تایید و پردازش
                  </button>
                  <button onClick={() => setRejectOpen(true)} disabled={acting} className={btnDanger}>
                    <XCircle size={15} /> رد درخواست
                  </button>
                </>
              )}
              {detail.status === 'APPROVED' && (
                <button onClick={() => setConfirmPaymentOpen(true)} disabled={acting} className={btnPrimary}>
                  <CreditCard size={15} /> تأیید واریز وجه
                </button>
              )}
              {(detail.status === 'PAID' || detail.status === 'REJECTED' || detail.status === 'CANCELLED') && (
                <p className="text-xs text-forest-400">این درخواست نهایی شده است.</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ─────────── مودال اطلاعات کارت ─────────── */}
      <Modal open={cardDetailsOpen} onClose={() => setCardDetailsOpen(false)} title="اطلاعات کارت بازپرداخت">
        {cardDetails ? (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-forest-500">شماره کارت</span><b className="text-forest-800" dir="ltr">{cardDetails.refund_card_number || '—'}</b></div>
            <div className="flex justify-between"><span className="text-forest-500">نام صاحب کارت</span><b className="text-forest-800">{cardDetails.refund_card_holder_name || '—'}</b></div>
          </div>
        ) : (
          <Loading />
        )}
      </Modal>

      {/* ─────────── مودال رد درخواست ─────────── */}
      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="رد درخواست بازپرداخت">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-forest-600">دلیل رد</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className={inputCls}
              placeholder="مثلاً: اطلاعات کارت مقصد ناقص است."
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setRejectOpen(false); setRejectReason(''); }} className={`${btnOutline} flex-1`} disabled={acting}>
              انصراف
            </button>
            <button onClick={handleReject} className={`${btnDanger} flex-1`} disabled={acting || !rejectReason.trim()}>
              {acting ? <Loader2 className="animate-spin" size={15} /> : <XCircle size={15} />} تأیید رد
            </button>
          </div>
        </div>
      </Modal>

      {/* ─────────── مودال تأیید واریز ─────────── */}
      <Modal open={confirmPaymentOpen} onClose={() => setConfirmPaymentOpen(false)} title="تأیید واریز وجه">
        <div className="space-y-4">
          {detail && (
            <div className="rounded-xl border border-forest-100 bg-forest-50/50 p-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-forest-500">مبلغ بازپرداخت</span>
                  <span className="font-black text-forest-800">{formatToman(detail.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-forest-500">شماره رزرو</span>
                  <span className="font-bold text-forest-800" dir="ltr">{detail.reservation_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-forest-500">اتاق</span>
                  <span className="font-bold text-forest-800">{detail.room_name}</span>
                </div>
              </div>
            </div>
          )}
          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
            آیا مبلغ {detail ? formatToman(detail.amount) : ''} را به کارت مقصد واریز کرده‌اید؟
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-forest-600">شماره پیگیری (اختیاری)</label>
            <input
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="شماره پیگیری انتقال"
              className={inputCls}
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setConfirmPaymentOpen(false); setTransactionRef(''); }} className={`${btnOutline} flex-1`} disabled={acting}>
              انصراف
            </button>
            <button onClick={handleConfirmPayment} className={`${btnPrimary} flex-1`} disabled={acting}>
              {acting ? <Loader2 className="animate-spin" size={15} /> : <CreditCard size={15} />} تأیید واریز و تکمیل لغو
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
