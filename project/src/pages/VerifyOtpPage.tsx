import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { AuthShell } from '@/components/AuthShell';
import { AuthInput, authButtonCls } from '@/components/AuthInputs';
import {
  customerForgotPassword,
  customerVerifyForgotOtp,
  customerVerifyRegisterOtp,
  customerResendRegisterCode,
  setCustomerToken,
} from '@/services/customerApi';
import { useCustomerAuth } from '@/features/customerAuth/CustomerAuthProvider';
import { apiError } from '@/services/api';
import { toFaDigits } from '@/utils/validation';

const RESET_TOKEN_KEY = 'bsh_reset_token';
export const RESEND_SECONDS = 60;

export function setResetToken(token: string) {
  sessionStorage.setItem(RESET_TOKEN_KEY, token);
}

export function getResetToken(): string | null {
  return sessionStorage.getItem(RESET_TOKEN_KEY);
}

export function clearResetToken() {
  sessionStorage.removeItem(RESET_TOKEN_KEY);
}

type VerifyState = { sessionId?: string; mobile?: string; purpose?: 'register' | 'reset' };

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as VerifyState | null) || {};
  const { setCustomer } = useCustomerAuth();

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [resending, setResending] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isRegister = state.purpose === 'register';

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!state.sessionId) return;
    setTimer(RESEND_SECONDS);
    const interval = setInterval(() => {
      setTimer((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [state.sessionId]);

  if (!state.sessionId) {
    return <Navigate to={isRegister ? '/signup' : '/forgot-password'} replace />;
  }
  const sessionId = state.sessionId;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('کد تأیید باید ۶ رقم باشد');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (isRegister) {
        const data = await customerVerifyRegisterOtp(sessionId, code);
        if (!data.success || !data.token) {
          setError(data.message);
          return;
        }
        setCustomerToken(data.token);
        setCustomer(data.customer);
        toast.success('حساب شما با موفقیت ساخته شد؛ خوش آمدید');
        navigate('/account', { replace: true });
        return;
      }

      const data = await customerVerifyForgotOtp(sessionId, code);
      if (!data.success || !data.resetToken) {
        setError(data.message);
        return;
      }
      setResetToken(data.resetToken);
      navigate('/reset-password', { state: { mobile: state.mobile }, replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError(null);
    try {
      const data = isRegister
        ? await customerResendRegisterCode(state.mobile || '')
        : await customerForgotPassword(state.mobile || '');
      toast.success(data.message);
      navigate('/verify-otp', { state: { sessionId: data.sessionId, mobile: state.mobile, purpose: state.purpose }, replace: true });
      setTimer(RESEND_SECONDS);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setResending(false);
    }
  }

  const canResend = timer <= 0 && !resending;

  return (
    <AuthShell title="تأیید کد پیامکشده" subtitle={`کد ۶ رقمی ارسالشده به ${toFaDigits(state.mobile || '')} را وارد کنید`}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <label htmlFor="code" className="block text-sm font-medium text-forest-700">
            کد تأیید
          </label>
          <AuthInput
            ref={inputRef}
            id="code"
            dir="ltr"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="••••••"
            className="text-center text-lg font-bold tracking-[0.5em]"
            disabled={submitting || resending}
          />
        </div>

        <p className="flex items-center gap-1.5 text-[11px] text-forest-400">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          کد فقط یک‌بار قابل استفاده است و ۲ دقیقه اعتبار دارد.
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
            'تأیید کد'
          )}
        </button>
      </form>

      {canResend ? (
        <p className="mt-6 text-center text-sm text-forest-500">
          کد را دریافت نکردید؟{' '}
          <button
            onClick={handleResend}
            disabled={resending}
            className="inline-flex items-center gap-1 font-bold text-forest-700 transition-colors hover:text-forest-900 disabled:opacity-50"
          >
            {resending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            ارسال مجدد
          </button>
        </p>
      ) : (
        <p className="mt-6 text-center text-xs text-forest-400">
          ارسال مجدد تا {toFaDigits(timer)} ثانیه دیگر ممکن است
        </p>
      )}

      <p className="mt-2 text-center text-sm text-forest-500">
        <Link to={isRegister ? '/signup' : '/forgot-password'} className="font-bold text-forest-700 hover:text-forest-900">
          {isRegister ? 'تغییر اطلاعات ثبت‌نام' : 'تغییر شماره موبایل'}
        </Link>
      </p>
    </AuthShell>
  );
}