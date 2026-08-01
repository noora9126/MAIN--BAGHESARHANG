import type { ReactNode } from 'react';
import { X, Loader2 } from 'lucide-react';
import { faNum } from '../../utils/dates';

// ─────────── نشان وضعیت ───────────
const STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'در انتظار', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  CONFIRMED: { label: 'تأیید شده', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  CHECKED_IN: { label: 'ورود شده', cls: 'bg-green-50 text-green-700 border-green-200' },
  CHECKED_OUT: { label: 'خروج شده', cls: 'bg-forest-50 text-forest-700 border-forest-200' },
  CANCELLED: { label: 'کنسل شده', cls: 'bg-red-50 text-red-700 border-red-200' },
};

const PAYMENT_META: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'در انتظار پرداخت', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  SUCCESS: { label: 'پرداخت شده', cls: 'bg-green-50 text-green-700 border-green-200' },
  FAILED: { label: 'ناموفق', cls: 'bg-red-50 text-red-700 border-red-200' },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || { label: status, cls: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

export function PaymentBadge({ status }: { status: string }) {
  const meta = PAYMENT_META[status] || { label: status, cls: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

export function SmsBadge({ status }: { status: string }) {
  const meta: Record<string, { label: string; cls: string }> = {
    PENDING: { label: 'پیامک: در انتظار', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
    SENT: { label: 'پیامک: ارسال شد', cls: 'bg-green-50 text-green-600 border-green-200' },
    FAILED: { label: 'پیامک: ناموفق', cls: 'bg-red-50 text-red-500 border-red-200' },
  };
  const m = meta[status] || { label: status, cls: 'bg-gray-100 text-gray-500 border-gray-200' };
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${m.cls}`}>{m.label}</span>;
}

// ─────────── کارت آمار ───────────
export function StatCard({
  icon,
  title,
  value,
  sub,
  accent = 'forest',
}: {
  icon: ReactNode;
  title: string;
  value: string;
  sub?: string;
  accent?: 'forest' | 'gold' | 'sky' | 'red';
}) {
  const accents = {
    forest: 'bg-forest-100 text-forest-600',
    gold: 'bg-gold-100 text-gold-600',
    sky: 'bg-sky-100 text-sky-600',
    red: 'bg-red-100 text-red-500',
  };
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm border border-forest-50">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accents[accent]}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-forest-400">{title}</p>
          <p className="text-lg font-black text-forest-800 truncate">{value}</p>
          {sub && <p className="text-[10px] text-forest-400">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

// ─────────── مودال ───────────
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative z-10 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl`}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-forest-50 bg-white/95 px-5 py-4 backdrop-blur">
          <h3 className="font-black text-forest-800">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-forest-400 hover:bg-forest-50 hover:text-forest-700">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─────────── بارگذاری / خالی ───────────
export function Loading() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="animate-spin text-forest-500" size={32} />
    </div>
  );
}

export function EmptyState({ text = 'موردی یافت نشد' }: { text?: string }) {
  return <p className="py-12 text-center text-sm text-forest-400">{text}</p>;
}

// ─────────── فرم فیلد ───────────
export function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-forest-600">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  'w-full rounded-xl border border-forest-200 bg-forest-50/40 px-4 py-2.5 text-sm text-forest-800 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200';
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-forest-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-forest-700 disabled:opacity-50';
export const btnGold =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-gold-500 to-gold-400 px-4 py-2.5 text-sm font-bold text-forest-900 shadow-sm transition-colors hover:brightness-95 disabled:opacity-50';
export const btnOutline =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-forest-300 px-4 py-2.5 text-sm font-bold text-forest-700 transition-colors hover:bg-forest-50 disabled:opacity-50';
export const btnDanger =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50';

export function fa(v: number | string | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return faNum(v);
}
