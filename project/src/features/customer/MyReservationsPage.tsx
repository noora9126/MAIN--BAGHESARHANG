import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, DollarSign, Eye, Loader2, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { getMyReservations, cancelReservation, type ReservationInfo } from '@/services/customerApi';
import { apiError } from '@/services/api';
import { jalaliString, faNum } from '@/utils/dates';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'در انتظار پرداخت', color: 'bg-amber-100 text-amber-700' },
  CONFIRMED: { label: 'تأیید شده', color: 'bg-green-100 text-green-700' },
  CHECKED_IN: { label: 'ورود انجام شده', color: 'bg-blue-100 text-blue-700' },
  CHECKED_OUT: { label: 'خروج انجام شده', color: 'bg-gray-100 text-gray-600' },
  CANCELLED: { label: 'لغو شده', color: 'bg-red-100 text-red-700' },
};

const paymentLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'پرداخت نشده', color: 'bg-amber-100 text-amber-700' },
  SUCCESS: { label: 'پرداخت شده', color: 'bg-green-100 text-green-700' },
  FAILED: { label: 'پرداخت ناموفق', color: 'bg-red-100 text-red-700' },
};

function formatPrice(price: number) {
  return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
}

export default function MyReservationsPage() {
  const [reservations, setReservations] = useState<ReservationInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  useEffect(() => {
    loadReservations();
  }, []);

  async function loadReservations() {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyReservations();
      setReservations(data.reservations);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id: number) {
    if (!confirm('آیا از لغو این رزرو اطمینان دارید؟')) return;
    setCancellingId(id);
    try {
      await cancelReservation(id);
      toast.success('رزرو با موفقیت لغو شد');
      loadReservations();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setCancellingId(null);
    }
  }

  const canCancel = (r: ReservationInfo) => {
    if (r.payment_status === 'SUCCESS') return false;
    return r.status === 'PENDING' || r.status === 'CONFIRMED';
  };

  return (
    <>
      <PageHeader title="رزروهای من" description="لیست تمام رزروهای شما در هتل باغ سرهنگ" />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-forest-600" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          {error}
          <Button variant="outline" className="mt-4" onClick={loadReservations}>
            تلاش مجدد
          </Button>
        </div>
      ) : reservations.length === 0 ? (
        <div className="rounded-2xl border border-forest-50 bg-white p-10 text-center shadow-sm">
          <Calendar className="mx-auto mb-4 h-12 w-12 text-forest-300" />
          <h3 className="mb-2 font-bold text-forest-800">هنوز رزروی ثبت نکرده‌اید</h3>
          <p className="mb-4 text-sm text-forest-500">اولین رزرو خود را همین الان انجام دهید</p>
          <Link
            to="/reserve"
            className="inline-flex items-center gap-2 rounded-xl bg-forest-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-forest-700"
          >
            <Calendar className="h-4 w-4" />
            رزرو جدید
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reservations.map((r) => {
            const status = statusLabels[r.status] || statusLabels.PENDING;
            const payment = paymentLabels[r.payment_status] || paymentLabels.PENDING;
            return (
              <div
                key={r.id}
                className="rounded-2xl border border-forest-50 bg-white p-5 shadow-sm transition-all hover:shadow-md sm:p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-forest-800">{r.room_name}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${status.color}`}>
                        {status.label}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${payment.color}`}>
                        {payment.label}
                      </span>
                    </div>

                    <div className="grid gap-3 text-sm text-forest-600 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-forest-400">شماره رزرو:</span>
                        <span className="font-mono font-bold" dir="ltr">{r.reservation_number}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-forest-400" />
                        <span>ورود: {jalaliString(r.check_in)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-forest-400" />
                        <span>خروج: {jalaliString(r.check_out)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-forest-400" />
                        <span>{faNum(r.number_of_nights)} شب</span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5 text-forest-400" />
                        <span className="font-bold text-forest-800">{formatPrice(r.total_price)}</span>
                      </div>
                      {r.discount_code && (
                        <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-bold text-green-700">
                          کد تخفیف: {r.discount_code} ({faNum(r.discount_percent ?? 0)}%)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Link
                      to={`/account/reservations/${r.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-forest-200 px-3 py-2 text-xs font-bold text-forest-700 transition-colors hover:bg-forest-50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      جزئیات
                    </Link>
                    {canCancel(r) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => r.id && handleCancel(r.id)}
                        disabled={cancellingId === r.id}
                      >
                        {cancellingId === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        لغو
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
