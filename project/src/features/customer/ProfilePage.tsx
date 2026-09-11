import { useState, type FormEvent } from 'react';
import { Loader2, Mail, Phone, Save, User } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/admin/PageHeader';
import { useCustomerAuth } from '@/features/customerAuth/CustomerAuthProvider';
import { customerUpdateProfile } from '@/services/customerApi';
import { apiError } from '@/services/api';
import { isValidPersianName, isValidEmail } from '@/utils/validation';
import { AuthInput } from '@/components/AuthInputs';
import { Button } from '@/components/ui/button';

export default function ProfilePage() {
  const { customer, setCustomer } = useCustomerAuth();

  const [fullName, setFullName] = useState(() => customer?.full_name || '');
  const [email, setEmail] = useState(() => customer?.email || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!customer) return null;
  const profile = customer;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (fullName.trim() !== profile.full_name && !isValidPersianName(fullName)) {
      setError('نام و نام خانوادگی را کامل و به فارسی وارد کنید');
      return;
    }
    const emailValue = email.trim();
    if (emailValue && !isValidEmail(emailValue)) {
      setError('ایمیل معتبر وارد کنید');
      return;
    }

    const payload: { fullName?: string; email?: string | null } = {};
    if (fullName.trim() !== profile.full_name) payload.fullName = fullName.trim();
    if (emailValue.toLowerCase() !== (profile.email || '').toLowerCase()) {
      payload.email = emailValue || null;
    }
    if (Object.keys(payload).length === 0) {
      toast.info('موردی برای ویرایش وجود ندارد');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const data = await customerUpdateProfile(payload);
      setCustomer(data.customer);
      toast.success('پروفایل با موفقیت به‌روزرسانی شد');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title="پروفایل" description="اطلاعات حساب کاربری خود را ویرایش کنید" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-forest-50 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-4 font-black text-forest-800">اطلاعات حساب</h3>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <label htmlFor="fullName" className="block text-sm font-medium text-forest-700">
                نام و نام خانوادگی
              </label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
                <AuthInput
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pr-9"
                  autoComplete="name"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-forest-700">
                ایمیل <span className="text-xs text-forest-400">(اختیاری)</span>
              </label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
                <AuthInput
                  id="email"
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@mail.com"
                  className="pr-9 text-center"
                  autoComplete="email"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-forest-700">شماره موبایل</label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
                <AuthInput
                  dir="ltr"
                  value={customer.mobile}
                  readOnly
                  disabled
                  className="bg-forest-50 pr-9 text-center opacity-70"
                />
              </div>
              <p className="text-[11px] text-forest-400">شماره موبایل قابل تغییر نیست.</p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />}
              ذخیره تغییرات
            </Button>
          </form>
        </div>

        <div className="rounded-2xl border border-forest-50 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-black text-forest-800">جزئیات حساب</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-forest-500">نام کامل</dt>
              <dd className="font-bold text-forest-800">{customer.full_name}</dd>
            </div>
            {customer.username && (
              <div className="flex items-center justify-between gap-2">
                <dt className="text-forest-500">نام کاربری</dt>
                <dd className="font-bold text-forest-800" dir="ltr">{customer.username}</dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <dt className="text-forest-500">شماره موبایل</dt>
              <dd className="font-bold text-forest-800" dir="ltr">
                {customer.mobile}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-forest-500">ایمیل</dt>
              <dd className="font-bold text-forest-800" dir="ltr">
                {customer.email || '—'}
              </dd>
            </div>
            {customer.national_code ? (
              <div className="flex items-center justify-between gap-2">
                <dt className="text-forest-500">کد ملی</dt>
                <dd className="font-bold text-forest-800" dir="ltr">
                  {customer.national_code}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </>
  );
}