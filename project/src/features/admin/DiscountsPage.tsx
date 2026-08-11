import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import JalaliDatePicker from '@/components/JalaliDatePicker';
import {
  btnDanger,
  btnGold,
  btnOutline,
  btnPrimary,
  EmptyState,
  fa,
  Field,
  inputCls,
  Loading,
  Modal,
} from '@/components/admin/AdminUI';
import {
  adminCreateDiscount,
  adminDeleteDiscount,
  adminDiscounts,
  adminToggleDiscount,
  adminUpdateDiscount,
  type DiscountRow,
} from '@/services/adminApi';
import { apiError } from '@/services/api';
import { toast } from 'sonner';
import { faNum, jalaliString } from '@/utils/dates';

interface DiscountForm {
  code: string;
  discountPercent: string;
  reason: string;
  description: string;
  validFrom: string;
  validUntil: string;
  usageLimit: string;
}

const EMPTY_FORM: DiscountForm = {
  code: '',
  discountPercent: '',
  reason: '',
  description: '',
  validFrom: '',
  validUntil: '',
  usageLimit: '',
};

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<DiscountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DiscountRow | null>(null);
  const [form, setForm] = useState<DiscountForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setDiscounts(await adminDiscounts());
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(d: DiscountRow) {
    setEditing(d);
    setForm({
      code: d.code,
      discountPercent: String(d.discount_percent),
      reason: d.reason || '',
      description: d.description || '',
      validFrom: d.valid_from || '',
      validUntil: d.valid_until || '',
      usageLimit: d.usage_limit ? String(d.usage_limit) : '',
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const percent = Number(form.discountPercent);
    if (!form.code.trim()) {
      toast.error('کد تخفیف الزامی است');
      return;
    }
    if (isNaN(percent) || percent < 1 || percent > 100) {
      toast.error('درصد تخفیف باید بین ۱ تا ۱۰۰ باشد');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        discountPercent: percent,
        reason: form.reason.trim(),
        description: form.description.trim(),
        validFrom: form.validFrom || null,
        validUntil: form.validUntil || null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      };
      if (editing) {
        await adminUpdateDiscount(editing.id, body);
        toast.success('کد تخفیف ویرایش شد');
      } else {
        await adminCreateDiscount({ ...body, code: form.code.trim().toUpperCase() });
        toast.success('کد تخفیف ایجاد شد');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(d: DiscountRow) {
    setBusyId(d.id);
    try {
      await adminToggleDiscount(d.id);
      load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(d: DiscountRow) {
    if (!window.confirm(`کد تخفیف «${d.code}» حذف شود؟`)) return;
    setBusyId(d.id);
    try {
      await adminDeleteDiscount(d.id);
      toast.success('کد تخفیف حذف شد');
      load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusyId(null);
    }
  }

  const activeCount = discounts.filter((d) => d.is_active).length;

  return (
    <>
      <PageHeader
        title="تخفیف‌ها"
        description="کدهای تخفیف واقعی — هنگام ثبت رزرو روی مبلغ نهایی اعمال می‌شوند"
        actions={
          <button className={btnGold} onClick={openCreate}>
            <Plus className="h-4 w-4" />
            کد تخفیف جدید
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-forest-50 px-3 py-1 font-bold text-forest-700">
          {faNum(activeCount)} کد فعال
        </span>
        <span className="rounded-full bg-amber-50 px-3 py-1 font-bold text-amber-700">
          {faNum(discounts.length - activeCount)} کد غیرفعال
        </span>
      </div>

      {loading ? (
        <Loading />
      ) : discounts.length === 0 ? (
        <div className="rounded-2xl border border-forest-50 bg-white p-6 shadow-sm">
          <EmptyState text="هنوز کد تخفیفی ساخته نشده است — اولین کد را بسازید" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-forest-50 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-forest-50 bg-forest-50/50 text-right text-xs text-forest-500">
                  <th className="px-4 py-3 font-bold">کد</th>
                  <th className="px-4 py-3 font-bold">درصد</th>
                  <th className="px-4 py-3 font-bold">دلیل</th>
                  <th className="px-4 py-3 font-bold">اعتبار (شمسی)</th>
                  <th className="px-4 py-3 font-bold">استفاده</th>
                  <th className="px-4 py-3 font-bold">وضعیت</th>
                  <th className="px-4 py-3 font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {discounts.map((d) => (
                  <tr key={d.id} className="border-b border-forest-50/60 last:border-0 hover:bg-forest-50/30">
                    <td className="px-4 py-3">
                      <span className="rounded-lg border border-forest-200 bg-forest-50 px-2 py-1 font-black tracking-wider text-forest-700">
                        {d.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-black text-gold-600" dir="ltr">
                      {fa(d.discount_percent)}٪
                    </td>
                    <td className="max-w-[14rem] px-4 py-3">
                      <p className="truncate text-forest-700">{d.reason || d.description || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-forest-500">
                      {d.valid_from && d.valid_until
                        ? `${jalaliString(d.valid_from)} تا ${jalaliString(d.valid_until)}`
                        : d.valid_from
                          ? `از ${jalaliString(d.valid_from)}`
                          : d.valid_until
                            ? `تا ${jalaliString(d.valid_until)}`
                            : 'بدون محدودیت'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-forest-700">
                        {fa(d.used_count)}
                        {d.usage_limit ? ` / ${fa(d.usage_limit)}` : ''}
                      </span>
                      {typeof d.reservation_count === 'number' && d.reservation_count > 0 ? (
                        <span className="block text-[10px] text-forest-400">در {fa(d.reservation_count)} رزرو</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(d)}
                        disabled={busyId === d.id}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors disabled:opacity-50 ${
                          d.is_active
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {busyId === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : d.is_active ? 'فعال' : 'غیرفعال'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button className={btnOutline + ' !px-2.5 !py-1.5 !text-xs'} onClick={() => openEdit(d)}>
                          ویرایش
                        </button>
                        <button
                          className={btnDanger + ' !px-2.5 !py-1.5 !text-xs'}
                          onClick={() => handleDelete(d)}
                          disabled={busyId === d.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'ویرایش کد تخفیف' : 'کد تخفیف جدید'} wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="کد تخفیف">
              <input
                className={inputCls + ' font-black tracking-wider'}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                disabled={Boolean(editing)}
                placeholder="مثلاً NOWRUZ1404"
              />
            </Field>
            <Field label="درصد تخفیف (۱ تا ۱۰۰)">
              <input
                className={inputCls}
                type="number"
                min={1}
                max={100}
                value={form.discountPercent}
                onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                placeholder="مثلاً 15"
                required
              />
            </Field>
            <Field label="دلیل تخفیف (نمایش در رزرو)">
              <input
                className={inputCls}
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="مثلاً تخفیف نوروز"
              />
            </Field>
            <Field label="توضیحات">
              <input
                className={inputCls}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="توضیح داخلی"
              />
            </Field>
            <Field label="سقف استفاده (خالی = بدون محدودیت)">
              <input
                className={inputCls}
                type="number"
                min={1}
                value={form.usageLimit}
                onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                placeholder="مثلاً 50"
              />
            </Field>
            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
              <Field label="شروع اعتبار (شمسی)">
                <JalaliDatePicker
                  value={form.validFrom}
                  onChange={(iso) => setForm({ ...form, validFrom: iso })}
                />
              </Field>
              <Field label="پایان اعتبار (شمسی)">
                <JalaliDatePicker
                  value={form.validUntil}
                  min={form.validFrom || undefined}
                  onChange={(iso) => setForm({ ...form, validUntil: iso })}
                />
              </Field>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-forest-50 pt-4">
            <p className="text-[11px] text-forest-400">
              تخفیف به صورت درصدی از کل مبلغ رزرو محاسبه می‌شود. کد را هرجا می‌خواهید منتشر کنید — همه کسانی که کد را داشته باشند می‌توانند استفاده کنند.
            </p>
            <div className="flex gap-2">
              <button type="button" className={btnOutline} onClick={() => setModalOpen(false)}>
                انصراف
              </button>
              <button type="submit" className={btnPrimary} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {editing ? 'ذخیره تغییرات' : 'ایجاد کد'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
