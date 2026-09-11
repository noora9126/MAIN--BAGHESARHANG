import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2, XCircle, Loader2, Home, MessageSquareText, Hash,
  Clock3, RefreshCw, Hourglass,
} from 'lucide-react';
import {
  verifyPayment, getReservation, createVarizaPayment, getVarizaPaymentStatus,
  apiError, type Reservation,
} from '../services/api';
import { jalaliFriendly, formatToman, faNum, formatDateTime } from '../utils/dates';

type PayPhase = 'checking' | 'paid' | 'pending' | 'failed' | 'expired';

// Poll وضعیت واقعی پرداخت واریزا پس از برگشت مشتری (Webhook ممکن است چند لحظه‌ای برسد)
const POLL_INTERVAL_MS = 4000;
const POLL_MAX_ATTEMPTS = 15;

export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const reservationId = Number(params.get('reservationId'));
  const authority = params.get('authority') || '';
  const status = params.get('status') || '';
  const isVariza = params.get('provider') === 'variza';

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [reservation, setReservation] = useState<Reservation | null>(null);

  // ── واریزا ──
  const [phase, setPhase] = useState<PayPhase>('checking');
  const [paidAmount, setPaidAmount] = useState<number | null>(null);

  const loadReservation = async (rid: number) => {
    try {
      const r = await getReservation(rid);
      setReservation(r);
    } catch {
      // در حالت تستی اطلاعات رزرو ممکن است پاک شده باشد
    }
  };

  // ─────────── مسیر زرین‌پال (legacy) ───────────
  useEffect(() => {
    if (isVariza || !reservationId) {
      if (!isVariza && !reservationId) {
        setMessage('پارامترهای پرداخت نامعتبر است');
        setLoading(false);
      }
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await verifyPayment({ authority, status, reservationId });
        if (!cancelled) {
          setSuccess(res.success);
          setMessage(res.message);
        }
        loadReservation(reservationId);
      } catch (err) {
        if (!cancelled) {
          setSuccess(false);
          setMessage(apiError(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isVariza, reservationId, authority, status]);

  // ─────────── مسیر واریزا: Polling وضعیت واقعی از Backend ───────────
  // Frontend هرگز با برگشتِ مشتری به‌تنهایی سفارش را Paid نمی‌کند؛
  // فقط وضعیت سرور (که از Webhook امضاشده به‌روز شده) نمایش داده می‌شود.
  useEffect(() => {
    if (!isVariza) return;
    if (!reservationId) {
      setPhase('failed');
      setMessage('پارامترهای پرداخت نامعتبر است');
      setLoading(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const finish = (p: PayPhase, msg?: string) => {
      if (cancelled) return;
      setPhase(p);
      if (msg) setMessage(msg);
      setLoading(false);
      if (p === 'paid') loadReservation(reservationId);
    };

    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const s = await getVarizaPaymentStatus(reservationId);
        if (cancelled) return;
        if (s.orderPaid || s.paymentStatus === 'paid') {
          if (typeof s.amount === 'number') setPaidAmount(s.amount);
          finish('paid', 'پرداخت کارت‌به‌کارت شما با موفقیت تأیید شد.');
          return;
        }
        if (s.paymentStatus === 'expired') {
          finish('expired', 'مهلت لینک پرداخت به پایان رسیده است.');
          return;
        }
        if (s.paymentStatus === 'cancelled') {
          finish('failed', 'پرداخت لغو شد.');
          return;
        }
        if (s.paymentStatus === 'failed') {
          finish('failed', 'پرداخت تأیید نشد. در صورت کسر مبلغ، تا ۷۲ ساعت به حساب شما بازمی‌گردد.');
          return;
        }
        // هنوز pending است
        if (attempts >= POLL_MAX_ATTEMPTS) {
          finish(
            'pending',
            'پرداخت شما در حال بررسی است. تأیید نهایی ممکن است چند دقیقه طول بکشد.',
          );
          return;
        }
        timer = setTimeout(tick, POLL_INTERVAL_MS);
      } catch {
        if (cancelled) return;
        if (attempts >= POLL_MAX_ATTEMPTS) {
          finish('pending', 'وضعیت پرداخت در حال بررسی است. لطفاً کمی بعد دوباره بررسی کنید.');
          return;
        }
        timer = setTimeout(tick, POLL_INTERVAL_MS);
      }
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isVariza, reservationId]);

  // ─────────── تلاش مجدد (ساخت دوباره لینک واریزا) ───────────
  const [retrying, setRetrying] = useState(false);
  const retryHandled = useRef(false);
  const retryVariza = async () => {
    if (retryHandled.current) return;
    retryHandled.current = true;
    setRetrying(true);
    try {
      const res = await createVarizaPayment(reservationId);
      if (res.success && res.payUrl) {
        window.location.href = res.payUrl;
        return;
      }
      setMessage(res.message || 'ایجاد لینک پرداخت ناموفق بود');
      setRetrying(false);
      retryHandled.current = false;
    } catch (err) {
      setMessage(apiError(err));
      setRetrying(false);
      retryHandled.current = false;
    }
  };

  const showLoading =
    loading || (isVariza && phase === 'checking');
  const showSuccess = isVariza ? phase === 'paid' : success;
  const showPending = isVariza && phase === 'pending';
  const showExpired = isVariza && phase === 'expired';
  const showFailed = !showSuccess && !showPending && !showExpired && !showLoading;

  return (
    <div className="pt-20 min-h-[70vh] flex items-center justify-center section-padding">
      <div className="container-x max-w-lg">
        <div className="rounded-2xl bg-white p-8 sm:p-10 shadow-xl text-center">
          {showLoading ? (
            <div className="py-10">
              <Loader2 className="mx-auto animate-spin text-forest-500" size={48} />
              <p className="mt-4 text-forest-600">در حال بررسی پرداخت...</p>
            </div>
          ) : showSuccess ? (
            <>
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-forest-100">
                <CheckCircle2 className="text-forest-600" size={44} />
              </div>
              <h1 className="text-2xl font-black text-forest-800 mb-2">رزرو موفق!</h1>
              <p className="mb-6 text-sm text-forest-500 leading-relaxed">{message}</p>

              <div className="rounded-xl bg-forest-50/70 p-5 text-right space-y-3 text-sm">
                {(reservation || isVariza) && (
                  <>
                    {reservation ? (
                      <div className="flex items-center justify-between">
                        <span className="text-forest-500 flex items-center gap-1"><Hash size={14} /> شماره رزرو</span>
                        <b dir="ltr" className="text-gold-600">{reservation.reservation_number}</b>
                      </div>
                    ) : null}
                    {reservation && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-forest-500">اتاق</span>
                          <b className="text-forest-800">{reservation.room_name}</b>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-forest-500">ورود / خروج</span>
                          <b className="text-forest-800">{jalaliFriendly(reservation.check_in)} ← {jalaliFriendly(reservation.check_out)}</b>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-forest-500">تعداد شب</span>
                          <b className="text-forest-800">{faNum(reservation.number_of_nights)} شب</b>
                        </div>
                      </>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-forest-500">مبلغ پرداختی</span>
                      <b className="text-gold-600">{formatToman(reservation?.total_price || paidAmount || 0)}</b>
                    </div>
                    {reservation?.paid_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-forest-500">زمان پرداخت</span>
                        <b className="text-forest-800">{formatDateTime(reservation.paid_at)}</b>
                      </div>
                    )}
                  </>
                )}
                <div className="flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-xs text-forest-600">
                  <MessageSquareText size={14} className="text-gold-500" />
                  پیامک تأیید با شماره رزرو برای شما ارسال شد
                </div>
              </div>

              <Link to="/" className="btn-gold w-full mt-6">
                <Home size={18} />
                بازگشت به صفحه اول
              </Link>
            </>
          ) : showPending ? (
            <>
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
                <Hourglass className="text-amber-500" size={40} />
              </div>
              <h1 className="text-2xl font-black text-forest-800 mb-2">در حال بررسی پرداخت...</h1>
              <p className="mb-6 text-sm text-forest-500 leading-relaxed">{message}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => window.location.reload()} className="btn-gold flex-1">
                  <RefreshCw size={16} />
                  بررسی مجدد
                </button>
                <Link to="/" className="btn-outline flex-1">صفحه اصلی</Link>
              </div>
            </>
          ) : showExpired ? (
            <>
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
                <Clock3 className="text-amber-500" size={40} />
              </div>
              <h1 className="text-2xl font-black text-forest-800 mb-2">پرداخت منقضی شد</h1>
              <p className="mb-6 text-sm text-forest-500 leading-relaxed">{message}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={retryVariza} disabled={retrying} className="btn-gold flex-1">
                  {retrying ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                  دریافت لینک جدید
                </button>
                <Link to="/" className="btn-outline flex-1">صفحه اصلی</Link>
              </div>
            </>
          ) : showFailed ? (
            <>
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                <XCircle className="text-red-500" size={44} />
              </div>
              <h1 className="text-2xl font-black text-forest-800 mb-2">پرداخت ناموفق</h1>
              <p className="mb-6 text-sm text-forest-500 leading-relaxed">{message}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                {isVariza ? (
                  <button onClick={retryVariza} disabled={retrying} className="btn-gold flex-1">
                    {retrying ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                    تلاش مجدد
                  </button>
                ) : reservation?.id ? (
                  <Link to={`/payment/result?status=OK&authority=retry&reservationId=${reservation.id}`} className="btn-gold flex-1">
                    تلاش مجدد
                  </Link>
                ) : (
                  <Link to="/reserve" className="btn-gold flex-1">رزرو دوباره</Link>
                )}
                <Link to="/" className="btn-outline flex-1">صفحه اصلی</Link>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
