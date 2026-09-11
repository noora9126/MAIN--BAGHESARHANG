import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { AuthShell } from '@/components/AuthShell';
import { AuthInput, authButtonCls } from '@/components/AuthInputs';
import { clearResetToken, getResetToken } from './VerifyOtpPage';
import { customerResetPassword } from '@/services/customerApi';
import { apiError } from '@/services/api';
import { toFaDigits } from '@/utils/validation';

const PASSWORD_MIN = 8;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as { mobile?: string } | null) || {};

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetToken = getResetToken();

  if (!resetToken) {
    return <Navigate to="/forgot-password" replace />;
  }
  const token = resetToken;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < PASSWORD_MIN || !/[A-Za-zآ-ی]/.test(password) || !/\d/.test(password)) {
      setError(`رمز عبور باید حداقل ${PASSWORD_MIN} کاراکتر و شامل حروف و اعداد باشد`);
      return;
    }
    if (password !== confirm) {
      setError('تکرار رمز عبور مطابقت ندارد');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await customerResetPassword(token, password);
      clearResetToken();
      toast.success('رمز عبور با موفقیت بازنشانی شد؛ اکنون وارد شوید');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="تعیین رمز عبور جدید" subtitle="یک رمز عبور جدید برای حساب خود انتخاب کنید">
      <div className="mb-4 rounded-xl border border-forest-100 bg-forest-50/50 px-4 py-3 text-xs text-forest-500">
        {state.mobile ? (
          <>
            بازنشانی رمز عبور برای شماره <span dir="ltr">{toFaDigits(state.mobile)}</span>
          </>
        ) : (
          'بازنشانی رمز عبور'
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-forest-700">
            رمز عبور جدید
          </label>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
            <AuthInput
              id="password"
              type={showPassword ? 'text' : 'password'}
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={String.fromCharCode(8226).repeat(8)}
              className="pr-9 pl-10 text-center"
              autoComplete="new-password"
              disabled={submitting}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400 transition-colors hover:text-forest-700"
              aria-label={showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="confirm" className="block text-sm font-medium text-forest-700">
            تکرار رمز عبور جدید
          </label>
          <div className="relative">
            <KeyRound className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
            <AuthInput
              id="confirm"
              type="password"
              dir="ltr"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={String.fromCharCode(8226).repeat(8)}
              className="pr-9 text-center"
              autoComplete="new-password"
              disabled={submitting}
            />
          </div>
        </div>

        <p className="flex items-center gap-1.5 text-[11px] text-forest-400">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          رمز باید حداقل ۸ کاراکتر و شامل حروف و اعداد باشد.
        </p>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <button type="submit" disabled={submitting} className={authButtonCls}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              در حال ذخیره...
            </>
          ) : (
            'بازنشانی رمز عبور'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-forest-500">
        به یاد آوردید؟{' '}
        <Link to="/login" className="font-bold text-forest-700 hover:text-forest-900">
          ورود
        </Link>
      </p>
    </AuthShell>
  );
}