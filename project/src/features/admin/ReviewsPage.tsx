import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Loader2, RefreshCw, Star, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import {
  btnDanger,
  btnGold,
  btnOutline,
  EmptyState,
  fa,
  Loading,
  Modal,
  StatCard,
} from '@/components/admin/AdminUI';
import {
  adminDeleteReview,
  adminReviews,
  adminSyncReviews,
  adminToggleReview,
  type ReviewRow,
} from '@/services/adminApi';
import { apiError } from '@/services/api';
import { toast } from 'sonner';
import { faNum } from '@/utils/dates';

const SOURCE_LABEL: Record<string, string> = {
  iranhotelonline: 'ایران هتل آنلاین',
  eghamat24: 'اقامت ۲۴',
  jabama: 'جاباما',
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, avgRating: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ReviewRow | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await adminReviews();
      setReviews(data.reviews);
      setStats(data.stats);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSync() {
    setSyncing(true);
    try {
      const data = await adminSyncReviews();
      const src = (data.result?.source as Record<string, { ok: boolean; count: number; error?: string }>) || {};
      const lines = Object.entries(src)
        .map(([k, v]) => `${SOURCE_LABEL[k] || k}: ${v.ok ? faNum(v.count) + ' نظر' : v.error || 'خطا'}`)
        .join(' — ');
      toast.success(`همگام‌سازی انجام شد: ${lines}`);
      load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSyncing(false);
    }
  }

  async function handleToggle(r: ReviewRow) {
    setBusyId(r.id);
    try {
      await adminToggleReview(r.id);
      load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(r: ReviewRow) {
    if (!window.confirm('این نظر حذف شود؟')) return;
    setBusyId(r.id);
    try {
      await adminDeleteReview(r.id);
      toast.success('نظر حذف شد');
      load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="نظرات مهمانان"
        description="نظرات واقعی از سایت‌های رزرو هتل — با یک کلیک همگام‌سازی می‌شوند"
        actions={
          <button className={btnGold} onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {syncing ? 'در حال همگام‌سازی...' : 'همگام‌سازی نظرات'}
          </button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Star className="h-6 w-6" />}
          title="میانگین امتیاز"
          value={fa(stats.avgRating) + ' از ۵'}
          accent="gold"
        />
        <StatCard icon={<Star className="h-6 w-6" />} title="نظرات نمایش‌داده‌شده" value={faNum(stats.active)} />
        <StatCard icon={<Star className="h-6 w-6" />} title="کل نظرات" value={faNum(stats.total)} />
      </div>

      {loading ? (
        <Loading />
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-forest-50 bg-white p-6 shadow-sm">
          <EmptyState text="هنوز نظری وجود ندارد — دکمه «همگام‌سازی نظرات» را بزنید" />
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className={`rounded-2xl border bg-white p-4 shadow-sm transition-opacity ${
                r.status === 'HIDDEN' ? 'border-gray-100 opacity-55' : 'border-forest-50'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-50 text-lg font-black text-gold-600">
                    {(r.author || 'م').trim().charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-forest-800">{r.author || 'مهمان ناشناس'}</p>
                      <span className="rounded-full bg-forest-50 px-2 py-0.5 text-[10px] font-bold text-forest-600">
                        {SOURCE_LABEL[r.source] || r.source}
                      </span>
                      {r.status === 'HIDDEN' ? (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                          مخفی
                        </span>
                      ) : null}
                    </div>
                    {r.stay_date ? <p className="mt-0.5 text-[11px] text-forest-400">تاریخ اقامت: {fa(r.stay_date)}</p> : null}
                    <div className="mt-1.5 flex items-center gap-1.5" dir="ltr">
                      <span className="text-sm font-black text-gold-600">{fa(r.rating)}</span>
                      <span className="flex" dir="ltr">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i <= Math.round(Number(r.rating) || 0)
                                ? 'fill-gold-400 text-gold-400'
                                : 'text-gray-200'
                            }`}
                          />
                        ))}
                      </span>
                      {r.rating_label ? <span className="text-xs text-forest-500">{r.rating_label}</span> : null}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className={btnOutline + ' !px-2.5 !py-1.5 !text-xs'} onClick={() => setDetail(r)}>
                    مشاهده
                  </button>
                  <button
                    className={btnOutline + ' !px-2.5 !py-1.5 !text-xs'}
                    onClick={() => handleToggle(r)}
                    disabled={busyId === r.id}
                  >
                    {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : r.status === 'ACTIVE' ? 'مخفی کن' : 'نمایش'}
                  </button>
                  <button
                    className={btnDanger + ' !px-2.5 !py-1.5 !text-xs'}
                    onClick={() => handleDelete(r)}
                    disabled={busyId === r.id}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {r.title ? <p className="mt-3 font-bold text-forest-800">{r.title}</p> : null}
              {r.content ? <p className="mt-1 text-sm leading-6 text-forest-600">{r.content}</p> : null}
            </div>
          ))}
        </div>
      )}

      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title="متن کامل نظر">
        {detail ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-50 font-black text-gold-600">
                {(detail.author || 'م').trim().charAt(0)}
              </div>
              <div>
                <p className="font-black text-forest-800">{detail.author || 'مهمان ناشناس'}</p>
                <p className="text-xs text-forest-400">
                  {SOURCE_LABEL[detail.source] || detail.source}
                  {detail.stay_date ? ` — تاریخ اقامت: ${fa(detail.stay_date)}` : ''}
                </p>
              </div>
            </div>
            {detail.rating ? (
              <p className="text-sm text-forest-600">
                امتیاز: <span className="font-black text-gold-600">{fa(detail.rating)}</span> از ۵
                {detail.rating_label ? ` (${detail.rating_label})` : ''}
              </p>
            ) : null}
            {detail.title ? <p className="font-bold text-forest-800">{detail.title}</p> : null}
            {detail.content ? (
              <p className="whitespace-pre-line text-sm leading-7 text-forest-600">{detail.content}</p>
            ) : null}
            {detail.source_url ? (
              <a
                href={detail.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-forest-600 underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                مشاهده در منبع
              </a>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
