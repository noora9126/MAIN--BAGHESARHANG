import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Loader2, Save } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import {
  btnPrimary,
  Field,
  inputCls,
  Loading,
} from '@/components/admin/AdminUI';
import {
  adminSettings,
  adminUpdateSettings,
  type Settings,
} from '@/services/adminApi';
import { apiError } from '@/services/api';
import { toast } from 'sonner';

type SettingsForm = Record<string, string>;

const GROUPS: { key: string; title: string; description: string; fields: { key: keyof Settings; label: string; placeholder?: string; dir?: string }[] }[] = [
  {
    key: 'hotel',
    title: 'اطلاعات هتل',
    description: 'این اطلاعات در سامانه و پیامک‌ها نمایش داده می‌شود',
    fields: [
      { key: 'hotel_name', label: 'نام هتل' },
      { key: 'hotel_phone', label: 'تلفن اصلی', placeholder: '0911...', dir: 'ltr' },
      { key: 'hotel_phone2', label: 'تلفن دوم', placeholder: '0939...', dir: 'ltr' },
      { key: 'hotel_email', label: 'ایمیل', dir: 'ltr' },
      { key: 'hotel_address', label: 'آدرس هتل' },
      { key: 'hotel_about', label: 'درباره هتل (توضیح کوتاه)' },
    ],
  },
  {
    key: 'times',
    title: 'زمان‌ها',
    description: 'ساعت ورود و خروج رسمی هتل',
    fields: [
      { key: 'check_in_time', label: 'ساعت ورود', placeholder: '14:00', dir: 'ltr' },
      { key: 'check_out_time', label: 'ساعت خروج', placeholder: '12:00', dir: 'ltr' },
    ],
  },
  {
    key: 'sms',
    title: 'سامانه پیامک',
    description: 'اتصال سامانه کاوه‌نگار یا ملی‌پیامک برای ارسال کد و پیامک‌های رزرو',
    fields: [
      { key: 'kavenegar_api_key', label: 'کلید API کاوه‌نگار', dir: 'ltr' },
      { key: 'kavenegar_sender', label: 'شماره فرستنده کاوه‌نگار', dir: 'ltr' },
      { key: 'melipayamak_api_token', label: 'توکن API ملی‌پیامک', dir: 'ltr' },
      { key: 'melipayamak_sender', label: 'شماره فرستنده ملی‌پیامک', dir: 'ltr' },
    ],
  },
  {
    key: 'payment',
    title: 'درگاه پرداخت',
    description: 'کلید مرچنت زرین‌پال — تا وقتی تنظیم نشود، پرداخت به صورت دستی تایید می‌شود',
    fields: [
      { key: 'zarinpal_merchant_id', label: 'مرچنت زرین‌پال', dir: 'ltr' },
    ],
  },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await adminSettings();
      setSettings({ ...data });
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !settings) return <Loading />;

  function set(key: string, value: string) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await adminUpdateSettings(settings as Partial<Settings>);
      toast.success('تنظیمات ذخیره شد');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave}>
      <PageHeader
        title="تنظیمات"
        description="اطلاعات هتل، پیامک و درگاه پرداخت"
        actions={
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            ذخیره تنظیمات
          </button>
        }
      />

      <div className="space-y-5">
        {GROUPS.map((group) => (
          <section key={group.key} className="rounded-2xl border border-forest-50 bg-white p-5 shadow-sm">
            <h2 className="font-black text-forest-800">{group.title}</h2>
            <p className="mb-4 mt-0.5 text-xs text-forest-400">{group.description}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {group.fields.map((f) => (
                <Field key={f.key} label={f.label}>
                  <input
                    className={inputCls}
                    value={settings[f.key] ?? ''}
                    onChange={(e) => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    dir={f.dir}
                  />
                </Field>
              ))}
            </div>
          </section>
        ))}
      </div>
    </form>
  );
}
