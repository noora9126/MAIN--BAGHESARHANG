import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, User, Lock, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { AuthShell } from '@/components/AuthShell';
import { AuthInput, authButtonCls } from '@/components/AuthInputs';
import { unifiedLogin, apiError } from '@/services/customerApi';
import { toEnDigits } from '@/utils/validation';
import { useCustomerAuth } from '@/features/customerAuth/CustomerAuthProvider';
import { useAuth } from '@/features/auth/AuthProvider';

type LocState = { from?: string };

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocState | null) || {};
  const { setFromLogin: setCustomerFromLogin } = useCustomerAuth();
  const { setFromLogin: setAdminFromLogin } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = identifier.trim();
    if (!trimmed) {
      setError('نام کاربری یا شماره موبایل را وارد کنید');
      return;
    }

    const phone = toEnDigits(trimmed).replace(/[\s-]/g, '');
    const isPhone = /^09\d{9}$/.test(phone);

    if (!isPhone && !trimmed) {
      setError('نام کاربری یا شماره موبایل را وارد کنید');
      return;
    }

    if (!password) {
      setError('رمز عبور را وارد کنید');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const data = await unifiedLogin(isPhone ? phone : trimmed, password);

      if (!data.token) {
        setError(data.message || 'ورود ناموفق بود');
        return;
      }

      if (data.type === 'admin' && data.admin) {
        setAdminFromLogin(data.token, data.admin);
        toast.success('خوش آمدید');
        navigate('/admin/dashboard', { replace: true });
      } else if (data.type === 'customer' && data.customer) {
        setCustomerFromLogin(data.token, data.customer);
        toast.success('با موفقیت وارد شدید');
        navigate(state.from && state.from !== '/login' ? state.from : '/account', { replace: true });
      } else {
        setError(data.message || 'ورود ناموفق بود');
      }
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="ورود به حساب"
      subtitle="برای رزرو و مدیریت حساب خود وارد شوید"
      footer={
        <p className="text-center text-sm text-forest-500">
          حساب ندارید؟{' '}
          <Link to="/signup" className="font-bold text-forest-600 hover:text-forest-700 transition-colors">
            ثبت‌نام کنید
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <label htmlFor="identifier" className="block text-sm font-medium text-forest-700">
            نام کاربری یا شماره موبایل
          </label>
          <div className="relative">
            <User size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-forest-400" />
            <AuthInput
              id="identifier"
              dir="ltr"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="نام کاربری یا 09xxxxxxxxx"
              className="pr-10 text-center"
              autoComplete="username"
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
              placeholder="رمز عبور خود را وارد کنید"
              className="pr-10 pl-10"
              autoComplete="current-password"
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

        <p className="text-left">
          <Link to="/forgot-password" className="text-xs font-medium text-forest-500 hover:text-forest-700 transition-colors">
            رمز عبور را فراموش کرده‌اید؟
          </Link>
        </p>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <button type="submit" disabled={submitting} className={authButtonCls}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              در حال بررسی...
            </>
          ) : (
            <>
              <LogIn size={18} />
              ورود
            </>
          )}
        </button>
      </form>

      <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-forest-400">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        ورود امن با نام کاربری و رمز عبور شما
      </p>

      <p className="mt-2 text-center text-xs text-forest-400">
        <Link to="/" className="hover:text-forest-600 transition-colors">
          بازگشت به سایت
        </Link>
      </p>
    </AuthShell>
  );
}
