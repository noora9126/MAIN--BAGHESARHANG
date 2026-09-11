import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, User, Lock, Phone, Loader2, ShieldCheck, AtSign } from 'lucide-react';
import { toast } from 'sonner';
import { AuthShell } from '@/components/AuthShell';
import { AuthInput, authButtonCls } from '@/components/AuthInputs';
import { customerRegister, apiError } from '@/services/customerApi';
import { toEnDigits } from '@/utils/validation';

export default function SignupPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = fullName.trim();
    if (trimmedName.length < 2 || !/[\p{L}]/u.test(trimmedName)) {
      setError('نام را کامل و معتبر وارد کنید');
      return;
    }

    const trimmedUsername = username.trim().toLowerCase();
    if (trimmedUsername) {
      if (!/^[a-z0-9._]{3,30}$/.test(trimmedUsername)) {
        setError('نام کاربری باید ۳ تا ۳۰ کاراکتر و شامل حروف لاتین، اعداد، نقطه یا خط زیر باشد');
        return;
      }
    }

    const phone = toEnDigits(mobile).replace(/[\s-]/g, '');
    if (!/^09\d{9}$/.test(phone)) {
      setError('شماره موبایل معتبر وارد کنید (۱۱ رقم، با ۰۹ شروع شود)')
      return;
    }
    if (password.length < 8 || !/[A-Za-zآ-ی]/.test(password) || !/\d/.test(password)) {
      setError('رمز عبور باید حداقل ۸ کاراکتر و شامل حروف و اعداد باشد')
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const data = await customerRegister({
        fullName: fullName.trim(),
        mobile: phone,
        password,
        username: trimmedUsername || undefined,
      });
      toast.success(data.message || 'کد تأیید ارسال شد');
      navigate('/verify-otp', {
        state: { sessionId: data.sessionId, mobile: phone, purpose: 'register' },
        replace: true,
      });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="ساخت حساب کاربری"
      subtitle="برای رزرو سریع‌تر و مدیریت رزروها ثبت‌نام کنید"
      footer={
        <p className="text-center text-sm text-forest-500">
          حساب دارید؟{' '}
          <Link to="/login" className="font-bold text-forest-600 hover:text-forest-700 transition-colors">
            وارد شوید
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <label htmlFor="fullName" className="block text-sm font-medium text-forest-700">
            نام و نام خانوادگی
          </label>
          <div className="relative">
            <User size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-forest-400" />
            <AuthInput
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="مثلاً محمد احمدی"
              className="pr-10"
              autoComplete="name"
              disabled={submitting}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="username" className="block text-sm font-medium text-forest-700">
            نام کاربری <span className="text-xs text-forest-400">(اختیاری - یکتا)</span>
          </label>
          <div className="relative">
            <AtSign size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-forest-400" />
            <AuthInput
              id="username"
              dir="ltr"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 30))}
              placeholder="مثلاً mohammad_ahmadi"
              className="pr-10 text-center"
              autoComplete="username"
              disabled={submitting}
            />
          </div>
          <p className="text-[11px] text-forest-400">
            حروف لاتین، اعداد، نقطه و خط زیر مجاز است (۳ تا ۳۰ کاراکتر)
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="mobile" className="block text-sm font-medium text-forest-700">
            شماره موبایل
          </label>
          <div className="relative">
            <Phone size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-forest-400" />
            <AuthInput
              id="mobile"
              dir="ltr"
              inputMode="tel"
              value={mobile}
              onChange={(e) => setMobile(toEnDigits(e.target.value).replace(/\D/g, '').slice(0, 11))}
              placeholder="09xxxxxxxxx"
              className="pr-10 text-center"
              autoComplete="tel"
              disabled={submitting}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-forest-700">
            رمز عبور
          </label>
          <div className="relative">
            <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-forest-400" />
            <AuthInput
              id="password"
              type={showPassword ? 'text' : 'password'}
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="حداقل ۸ کاراکتر و شامل حروف و اعداد"
              className="pr-10 pl-10"
              autoComplete="new-password"
              disabled={submitting}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400 transition-colors hover:text-forest-700"
              aria-label={showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'}
            >
              {showPassword ? <span className="text-xs font-bold">پنهان</span> : <span className="text-xs font-bold">نمایش</span>}
            </button>
          </div>
        </div>

        <p className="flex items-center gap-1.5 text-[11px] text-forest-400">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          برای امنیت، یک کد تأیید به موبایل شما پیامک می‌شود.
        </p>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <button type="submit" disabled={submitting} className={authButtonCls}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              در حال ارسال کد...
            </>
          ) : (
            <>
              <UserPlus size={18} />
              ثبت‌نام و دریافت کد
            </>
          )}
        </button>
      </form>

      <p className="mt-2 text-center text-xs text-forest-400">
        <Link to="/" className="hover:text-forest-600 transition-colors">
          بازگشت به سایت
        </Link>
      </p>
    </AuthShell>
  );
}
