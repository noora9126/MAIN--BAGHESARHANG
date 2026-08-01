import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Home, MessageSquareText, Hash } from 'lucide-react';
import { verifyPayment, getReservation, apiError, type Reservation } from '../services/api';
import { jalaliFriendly, formatToman, faNum, formatDateTime } from '../utils/dates';

export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const reservationId = Number(params.get('reservationId'));
  const authority = params.get('authority') || '';
  const status = params.get('status') || '';

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [reservation, setReservation] = useState<Reservation | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!reservationId) {
        setMessage('پارامترهای پرداخت نامعتبر است');
        setLoading(false);
        return;
      }
      try {
        const res = await verifyPayment({ authority, status, reservationId });
        if (!cancelled) {
          setSuccess(res.success);
          setMessage(res.message);
        }
        try {
          const r = await getReservation(reservationId);
          if (!cancelled) setReservation(r);
        } catch {
          // در حالت تستی اطلاعات رزرو ممکن است پاک شده باشد
        }
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
  }, [reservationId, authority, status]);

  return (
    <div className="pt-20 min-h-[70vh] flex items-center justify-center section-padding">
      <div className="container-x max-w-lg">
        <div className="rounded-2xl bg-white p-8 sm:p-10 shadow-xl text-center">
          {loading ? (
            <div className="py-10">
              <Loader2 className="mx-auto animate-spin text-forest-500" size={48} />
              <p className="mt-4 text-forest-600">در حال بررسی پرداخت...</p>
            </div>
          ) : success ? (
            <>
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-forest-100">
                <CheckCircle2 className="text-forest-600" size={44} />
              </div>
              <h1 className="text-2xl font-black text-forest-800 mb-2">رزرو موفق!</h1>
              <p className="mb-6 text-sm text-forest-500 leading-relaxed">{message}</p>

              <div className="rounded-xl bg-forest-50/70 p-5 text-right space-y-3 text-sm">
                {reservation && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-forest-500 flex items-center gap-1"><Hash size={14} /> شماره رزرو</span>
                      <b dir="ltr" className="text-gold-600">{reservation.reservation_number}</b>
                    </div>
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
                    <div className="flex items-center justify-between">
                      <span className="text-forest-500">مبلغ پرداختی</span>
                      <b className="text-gold-600">{formatToman(reservation.total_price)}</b>
                    </div>
                    {reservation.paid_at && (
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
          ) : (
            <>
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                <XCircle className="text-red-500" size={44} />
              </div>
              <h1 className="text-2xl font-black text-forest-800 mb-2">پرداخت ناموفق</h1>
              <p className="mb-6 text-sm text-forest-500 leading-relaxed">{message}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                {reservation?.id ? (
                  <Link to={`/payment/result?status=OK&authority=retry&reservationId=${reservation.id}`} className="btn-gold flex-1">
                    تلاش مجدد
                  </Link>
                ) : (
                  <Link to="/reserve" className="btn-gold flex-1">رزرو دوباره</Link>
                )}
                <Link to="/" className="btn-outline flex-1">صفحه اصلی</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
