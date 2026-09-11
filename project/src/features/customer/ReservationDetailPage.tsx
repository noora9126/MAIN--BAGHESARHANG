import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  Clock,
  DollarSign,
  Loader2,
  Mail,
  User,
  XCircle,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import {
  getReservationDetail,
  getCancellationEligibility,
  cancelReservationWithRefund,
  type ReservationInfo,
  type CancellationEligibility,
} from '@/services/customerApi';
import { apiError } from '@/services/api';
import { jalaliString, faNum } from '@/utils/dates';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { inputCls, btnOutline, btnDanger } from '@/components/admin/AdminUI';

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'در انتظار پرداخت', color: 'bg-amber-100 text-amber-700' },
  CONFIRMED: { label: 'تأیید شده', color: 'bg-green-100 text-green-700' },
  CHECKED_IN: { label: 'ورود انجام شده', color: 'bg-blue-100 text-blue-700' },
  CHECKED_OUT: { label: 'خروج انجام شده', color: 'bg-gray-100 text-gray-600' },
  CANCELLED: { label: 'لغو شده', color: 'bg-red-100 text-red-700' },
  CANCELLATION_REQUESTED: { label: 'درخواست لغو ثبت شده', color: 'bg-orange-100 text-orange-700' },
  REFUND_PENDING: { label: 'در انتظار بازپرداخت', color: 'bg-purple-100 text-purple-700' },
};

const paymentLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'پرداخت نشده', color: 'bg-amber-100 text-amber-700' },
  SUCCESS: { label: 'پرداخت شده', color: 'bg-green-100 text-green-700' },
  FAILED: { label: 'پرداخت ناموفق', color: 'bg-red-100 text-red-700' },
};

function formatPrice(price: number) {
  return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
}

export default function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState<ReservationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ───── cancellation state ─────
  const [eligibility, setEligibility] = useState<CancellationEligibility | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [refundCardNumber, setRefundCardNumber] = useState('');
  const [refundCardHolderName, setRefundCardHolderName] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadReservation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadReservation() {
    setLoading(true);
    setError(null);
    try {
      const data = await getReservationDetail(Number(id));
      setReservation(data.reservation);
      // Load eligibility for CONFIRMED/PENDING paid reservations
      if (
        data.reservation.status === 'CONFIRMED' &&
        data.reservation.payment_status === 'SUCCESS'
      ) {
        try {
          const elig = await getCancellationEligibility(Number(id));
          setEligibility(elig);
        } catch {
          setEligibility(null);
        }
      }
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelRequest() {
    if (!reservation) return;
    if (!refundCardNumber || refundCardNumber.replace(/\D/g, '').length !== 16) {
      toast.error('شماره کارت باید ۱۶ رقم باشد');
      return;
    }
    if (!refundCardHolderName.trim()) {
      toast.error('نام صاحب کارت را وارد کنید');
      return;
    }

    setCancelling(true);
    try {
      const result = await cancelReservationWithRefund(reservation.id, {
        refundCardNumber: refundCardNumber.replace(/\D/g, ''),
        refundCardHolderName: refundCardHolderName.trim(),
      });
      toast.success(result.message || 'درخواست لغو رزرو ثبت شد');
      setShowCancelModal(false);
      setRefundCardNumber('');
      setRefundCardHolderName('');
      loadReservation();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setCancelling(false);
    }
  }

  // Check if cancellation is in progress
  const isCancellationInProgress =
    reservation?.status === 'CANCELLATION_REQUESTED' || reservation?.status === 'REFUND_PENDING';

  // Show cancel button only if eligible
  const showCancelButton =
    reservation &&
    reservation.status === 'CONFIRMED' &&
    reservation.payment_status === 'SUCCESS' &&
    eligibility?.eligible &&
    !isCancellationInProgress;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-forest-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {error}
        <Button variant="outline" className="mt-4" onClick={() => navigate('/account/reservations')}>
          بازگشت به لیست رزروها
        </Button>
      </div>
    );
  }

  if (!reservation) return null;

  const status = statusLabels[reservation.status] || statusLabels.PENDING;
  const payment = paymentLabels[reservation.payment_status] || paymentLabels.PENDING;

  let guests: { name: string; nationalId: string }[] = [];
  try {
    guests = reservation.guest_details ? JSON.parse(String(reservation.guest_details)) : [];
  } catch { /* invalid JSON */ }

  return (
    <>
      <PageHeader
        title={`رزرو ${reservation.reservation_number}`}
        description={`جزئیات رزرو اتاق ${reservation.room_name}`}
      />

      <div className="mb-4">
        <Link
          to="/account/reservations"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-forest-600 hover:text-forest-800"
        >
          <ArrowRight className="h-4 w-4" />
          بازگشت به لیست رزروها
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* اطلاعات اصلی */}
        <div className="rounded-2xl border border-forest-50 bg-white p-5 shadow-sm lg:col-span-2 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-forest-800">{reservation.room_name}</h3>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${status.color}`}>
              {status.label}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${payment.color}`}>
              {payment.label}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-bold text-forest-700">تاریخ و زمان</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-forest-400" />
                  <span className="text-forest-500">ورود:</span>
                  <span className="font-bold text-forest-800">{jalaliString(reservation.check_in)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-forest-400" />
                  <span className="text-forest-500">خروج:</span>
                  <span className="font-bold text-forest-800">{jalaliString(reservation.check_out)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-forest-400" />
                  <span className="text-forest-500">مدت اقامت:</span>
                  <span className="font-bold text-forest-800">{faNum(reservation.number_of_nights)} شب</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-forest-400" />
                  <span className="text-forest-500">تعداد مهمان:</span>
                  <span className="font-bold text-forest-800">{faNum(reservation.number_of_guests)} نفر</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-forest-700">اطلاعات تماس</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-forest-400" />
                  <span className="text-forest-500">نام:</span>
                  <span className="font-bold text-forest-800">{reservation.guest_name}</span>
                </div>
                {reservation.guest_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-forest-400" />
                    <span className="text-forest-500">ایمیل:</span>
                    <span className="font-bold text-forest-800" dir="ltr">{reservation.guest_email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* لیست مهمانان */}
          {guests.length > 0 && (
            <div className="mt-5 border-t border-forest-50 pt-5">
              <h4 className="mb-3 font-bold text-forest-700">لیست مهمانان</h4>
              <div className="space-y-2">
                {guests.map((g, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-forest-50/50 px-3 py-2 text-sm">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-forest-200 text-xs font-bold text-forest-700">
                      {i + 1}
                    </span>
                    <span className="font-bold text-forest-800">{g.name}</span>
                    <span className="text-xs text-forest-400" dir="ltr">کد ملی: {g.nationalId}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reservation.special_requests && (
            <div className="mt-5 border-t border-forest-50 pt-5">
              <h4 className="mb-2 font-bold text-forest-700">درخواست‌های ویژه</h4>
              <p className="text-sm leading-6 text-forest-600">{reservation.special_requests}</p>
            </div>
          )}

          {reservation.admin_notes && (
            <div className="mt-5 border-t border-forest-50 pt-5">
              <h4 className="mb-2 font-bold text-forest-700">یادداشت مدیریت</h4>
              <p className="text-sm leading-6 text-forest-600">{reservation.admin_notes}</p>
            </div>
          )}
        </div>

        {/* خلاصه مالی */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-forest-50 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-black text-forest-800">خلاصه مالی</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-forest-500">قیمت هر شب</span>
                <span className="font-bold text-forest-800">{formatPrice(reservation.price_per_night)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-forest-500">تعداد شب‌ها</span>
                <span className="font-bold text-forest-800">{faNum(reservation.number_of_nights)} شب</span>
              </div>
              {reservation.discount_code && (
                <>
                  <div className="flex items-center justify-between text-green-600">
                    <span>کد تخفیف ({reservation.discount_code})</span>
                    <span className="font-bold">{faNum(reservation.discount_percent ?? 0)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-green-600">
                    <span>مبلغ تخفیف</span>
                    <span className="font-bold">-{formatPrice(reservation.discount_amount ?? 0)}</span>
                  </div>
                </>
              )}
              <div className="border-t border-forest-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-forest-800">مبلغ نهایی</span>
                  <span className="text-lg font-black text-forest-800">{formatPrice(reservation.total_price)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* اطلاعات پرداخت */}
          <div className="rounded-2xl border border-forest-50 bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-black text-forest-800">وضعیت پرداخت</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-forest-500">وضعیت</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${payment.color}`}>
                  {payment.label}
                </span>
              </div>
              {reservation.paid_at && (
                <div className="flex items-center justify-between">
                  <span className="text-forest-500">تاریخ پرداخت</span>
                  <span className="font-bold text-forest-800">{jalaliString(reservation.paid_at)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-forest-500">تاریخ ثبت</span>
                <span className="font-bold text-forest-800">{jalaliString(reservation.created_at)}</span>
              </div>
            </div>
          </div>

          {/* وضعیت لغو */}
          {eligibility && reservation.status === 'CONFIRMED' && reservation.payment_status === 'SUCCESS' && (
            <div className="rounded-2xl border border-forest-50 bg-white p-5 shadow-sm">
              <h3 className="mb-3 font-black text-forest-800">وضعیت لغو رزرو</h3>
              {eligibility.eligible ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-bold">امکان لغو رزرو</span>
                  </div>
                  <p className="text-xs text-forest-500">
                    تا زمان ورود بیش از ۷۲ ساعت باقی مانده است.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-bold">امکان لغو وجود ندارد</span>
                  </div>
                  <p className="text-xs text-forest-500">
                    {eligibility.reason}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* وضعیت درخواست لغو */}
          {isCancellationInProgress && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
              <h3 className="mb-3 font-black text-orange-800">درخواست لغو</h3>
              <div className="space-y-2 text-sm">
                {reservation.status === 'CANCELLATION_REQUESTED' && (
                  <div className="flex items-center gap-2 text-orange-700">
                    <Clock className="h-4 w-4" />
                    <span className="font-bold">در انتظار بررسی مدیریت</span>
                  </div>
                )}
                {reservation.status === 'REFUND_PENDING' && (
                  <div className="flex items-center gap-2 text-purple-700">
                    <CreditCard className="h-4 w-4" />
                    <span className="font-bold">در انتظار واریز وجه</span>
                  </div>
                )}
                <p className="text-xs text-orange-600">
                  درخواست لغو شما ثبت شده و در انتظار بررسی است.
                </p>
              </div>
            </div>
          )}

          {/* دکمه‌ها */}
          <div className="space-y-3">
            {reservation.payment_status === 'PENDING' && reservation.status !== 'CANCELLED' && (
              <Link
                to={`/payment/result?reservation=${reservation.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-forest-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-forest-700"
              >
                <DollarSign className="h-4 w-4" />
                پرداخت آنلاین
              </Link>
            )}
            {showCancelButton && (
              <Button
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setShowCancelModal(true)}
              >
                <XCircle className="h-4 w-4" />
                لغو رزرو
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ─────────── مودال تأیید لغو ─────────── */}
      {showCancelModal && reservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" dir="rtl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-forest-800">تأیید لغو رزرو</h3>
                <p className="text-sm text-forest-500">آیا از لغو این رزرو مطمئن هستید؟</p>
              </div>
            </div>

            {/* اطلاعات رزرو */}
            <div className="mb-4 rounded-xl border border-forest-100 bg-forest-50/50 p-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-forest-500">شماره رزرو</span>
                  <span className="font-bold text-forest-800" dir="ltr">{reservation.reservation_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-forest-500">اتاق</span>
                  <span className="font-bold text-forest-800">{reservation.room_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-forest-500">ورود</span>
                  <span className="font-bold text-forest-800">{jalaliString(reservation.check_in)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-forest-500">خروج</span>
                  <span className="font-bold text-forest-800">{jalaliString(reservation.check_out)}</span>
                </div>
                <div className="border-t border-forest-200 pt-2">
                  <div className="flex justify-between">
                    <span className="font-bold text-forest-700">مبلغ پرداختی</span>
                    <span className="font-black text-forest-800">{formatPrice(reservation.total_price)}</span>
                  </div>
                </div>
                <div className="flex justify-between text-green-600">
                  <span className="font-bold">مبلغ بازپرداخت (۱۰۰٪)</span>
                  <span className="font-black">{formatPrice(reservation.total_price)}</span>
                </div>
              </div>
            </div>

            {/* فرم اطلاعات کارت بازپرداخت */}
            <div className="mb-4 space-y-3">
              <h4 className="font-bold text-forest-700">اطلاعات کارت بازپرداخت</h4>
              <div>
                <label className="mb-1 block text-sm font-medium text-forest-600">شماره کارت مقصد</label>
                <div className="relative">
                  <CreditCard className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
                  <input
                    type="text"
                    value={refundCardNumber}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 16);
                      setRefundCardNumber(v);
                    }}
                    placeholder="شماره ۱۶ رقمی کارت"
                    className={`${inputCls} pr-10`}
                    dir="ltr"
                    maxLength={16}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-forest-600">نام صاحب کارت</label>
                <input
                  type="text"
                  value={refundCardHolderName}
                  onChange={(e) => setRefundCardHolderName(e.target.value)}
                  placeholder="نام و نام خانوادگی به فارسی"
                  className={inputCls}
                />
              </div>
            </div>

            {/* دکمه‌ها */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setRefundCardNumber('');
                  setRefundCardHolderName('');
                }}
                className={`${btnOutline} flex-1`}
                disabled={cancelling}
              >
                انصراف
              </button>
              <button
                onClick={handleCancelRequest}
                className={`${btnDanger} flex-1`}
                disabled={cancelling}
              >
                {cancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                ثبت درخواست لغو
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
