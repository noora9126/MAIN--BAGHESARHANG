import { useEffect, useState } from 'react';
import { Save, Send, KeyRound, MessageSquareText, Wallet, Building2 } from 'lucide-react';
import {
  adminSettings, adminUpdateSettings, adminTestSms, changePassword, apiError,
  type Settings,
} from '../../services/adminApi';
import { Loading, Field, inputCls, btnPrimary, btnGold, btnOutline } from '../../components/admin/AdminUI';

const TABS = [
  { id: 'general', label: 'عمومی', icon: Building2 },
  { id: 'sms', label: 'پیامک (ملی پیامک)', icon: MessageSquareText },
  { id: 'payment', label: 'درگاه (زرین‌پال)', icon: Wallet },
  { id: 'password', label: 'رمز عبور', icon: KeyRound },
];

export default function AdminSettings() {
  const [tab, setTab] = useState('general');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState<Partial<Settings>>({});

  // رمز عبور
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // تست پیامک
  const [testPhone, setTestPhone] = useState('');

  useEffect(() => {
    adminSettings()
      .then((s) => {
        setSettings(s);
        setForm({ ...s });
      })
      .catch((e) => setError(apiError(e)));
  }, []);

  const saveSettings = async () => {
    setBusy(true);
    setMsg('');
    setError('');
    try {
      await adminUpdateSettings(form);
      setMsg('تنظیمات ذخیره شد');
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const doTestSms = async () => {
    if (!/^09\d{9}$/.test(testPhone)) {
      setError('شماره معتبر وارد کنید');
      return;
    }
    setBusy(true);
    setMsg('');
    setError('');
    try {
      const res = await adminTestSms(testPhone);
      setMsg(res.message + (res.simulated ? ' (حالت تستی)' : ''));
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const doChangePassword = async () => {
    if (newPassword.length < 6) {
      setError('رمز جدید حداقل 6 کاراکتر باشد');
      return;
    }
    setBusy(true);
    setMsg('');
    setError('');
    try {
      await changePassword(currentPassword, newPassword);
      setMsg('رمز عبور تغییر کرد');
      setCurrentPassword('');
      setNewPassword('');
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  if (!settings) return <Loading />;

  const set = (key: keyof Settings, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-black text-forest-800">تنظیمات</h2>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setMsg(''); setError(''); }}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-colors ${
              tab === t.id ? 'bg-forest-600 text-white shadow' : 'bg-white text-forest-600 hover:bg-forest-50 border border-forest-100'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</p>}
      {msg && <p className="rounded-xl bg-green-50 p-4 text-sm text-green-700">{msg}</p>}

      <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm border border-forest-50 max-w-2xl">
        {tab === 'general' && (
          <div className="space-y-4">
            <h3 className="font-black text-forest-800 mb-4">اطلاعات هتل</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="تلفن اصلی"><input value={form.hotel_phone || ''} onChange={(e) => set('hotel_phone', e.target.value)} className={inputCls} dir="ltr" /></Field>
              <Field label="تلفن دوم"><input value={form.hotel_phone2 || ''} onChange={(e) => set('hotel_phone2', e.target.value)} className={inputCls} dir="ltr" /></Field>
              <Field label="ایمیل هتل"><input value={form.hotel_email || ''} onChange={(e) => set('hotel_email', e.target.value)} className={inputCls} dir="ltr" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="ساعت ورود"><input value={form.check_in_time || ''} onChange={(e) => set('check_in_time', e.target.value)} className={inputCls} /></Field>
                <Field label="ساعت خروج"><input value={form.check_out_time || ''} onChange={(e) => set('check_out_time', e.target.value)} className={inputCls} /></Field>
              </div>
            </div>
            <button className={btnPrimary} onClick={saveSettings} disabled={busy}><Save size={15} /> ذخیره تنظیمات</button>
          </div>
        )}

        {tab === 'sms' && (
          <div className="space-y-4">
            <h3 className="font-black text-forest-800 mb-4">پیامک ملی پیامک (کنسول)</h3>
            <Field label="API Token کنسول ملی پیامک">
              <input value={form.melipayamak_api_token || ''} onChange={(e) => set('melipayamak_api_token', e.target.value)} className={inputCls} dir="ltr" placeholder="Token کنسول را وارد کنید" />
            </Field>
            <Field label="شماره فرستنده (خط اختصاصی)">
              <input value={form.melipayamak_sender || ''} onChange={(e) => set('melipayamak_sender', e.target.value)} className={inputCls} dir="ltr" placeholder="مثلا 5000..." />
            </Field>
            <button className={btnPrimary} onClick={saveSettings} disabled={busy}><Save size={15} /> ذخیره</button>
            <div className="border-t border-forest-50 pt-4">
              <p className="mb-2 text-sm font-bold text-forest-700">پیامک تست</p>
              <div className="flex flex-wrap gap-2">
                <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="09xxxxxxxxx" className={inputCls + ' flex-1 min-w-[180px]'} dir="ltr" maxLength={11} />
                <button className={btnGold} onClick={doTestSms} disabled={busy}><Send size={15} /> ارسال تست</button>
              </div>
              <p className="mt-2 text-xs text-forest-400">اگر API Token خالی باشد، پیامک‌ها شبیه‌سازی می‌شوند و کد در فرم تأیید نمایش داده می‌شود.</p>
            </div>
          </div>
        )}

        {tab === 'payment' && (
          <div className="space-y-4">
            <h3 className="font-black text-forest-800 mb-4">درگاه زرین‌پال</h3>
            <Field label="Merchant ID">
              <input value={form.zarinpal_merchant_id || ''} onChange={(e) => set('zarinpal_merchant_id', e.target.value)} className={inputCls} dir="ltr" placeholder="از پنل زرین‌پال دریافت کنید" />
            </Field>
            <Field label="حالت">
              <select value={form.zarinpal_sandbox || '1'} onChange={(e) => set('zarinpal_sandbox', e.target.value)} className={inputCls}>
                <option value="1">تست (Sandbox)</option>
                <option value="0">واقعی (تولید)</option>
              </select>
            </Field>
            <button className={btnPrimary} onClick={saveSettings} disabled={busy}><Save size={15} /> ذخیره</button>
            <p className="text-xs text-forest-400">
              اگر Merchant ID خالی باشد، پرداخت به صورت دستی تایید می‌شود (مناسب توسعه).
            </p>
          </div>
        )}

        {tab === 'password' && (
          <div className="space-y-4">
            <h3 className="font-black text-forest-800 mb-4">تغییر رمز عبور</h3>
            <Field label="رمز فعلی">
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputCls} />
            </Field>
            <Field label="رمز جدید (حداقل 6 کاراکتر)">
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} />
            </Field>
            <button className={btnOutline} onClick={doChangePassword} disabled={busy}><KeyRound size={15} /> تغییر رمز عبور</button>
          </div>
        )}
      </div>
    </div>
  );
}
