import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Phone, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { AuthShell } from '@/components/AuthShell';
import { AuthInput, authButtonCls } from '@/components/AuthInputs';
import { customerForgotPassword } from '@/services/customerApi';
import { apiError } from '@/services/api';
import { toEnDigits } from '@/utils/validation';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [mobile, setMobile] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!/^09\d{9}$/.test(mobile)) {
      setError('شماره موبایل معتبر وارد کنید (۱۱ رقم، با ۰۹ شروع شود)');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const data = await customerForgotPassword(mobile);
      if (!data.success) {
        setError(data.message);
        return;
      }
      toast.success(data.message);
      navigate('/verify-otp', {
        state: { sessionId: data.sessionId, mobile },
        replace: true,
      });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="فراموشی رمز عبور" subtitle="شماره موبایل خود را وارد کنید تا کد تأیید برایتان ارسال شود">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <label htmlFor="mobile" className="block text-sm font-medium text-forest-700">
            شماره موبایل
          </label>
          <div className="relative">
            <Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
            <AuthInput
              id="mobile"
              dir="ltr"
              inputMode="tel"
              value={mobile}
              onChange={(e) => setMobile(toEnDigits(e.target.value).replace(/\D/g, '').slice(0, 11))}
              placeholder="09xxxxxxxxx"
              className="pr-9 text-center"
              autoComplete="tel"
              disabled={submitting}
            />
          </div>
        </div>

        <p className="flex items-center gap-1.5 text-[11px] text-forest-400">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          کد تأیید به این شماره پیامک می‌شود و ۲ دقیقه اعتبار دارد.
        </p>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <button type="submit" disabled={submitting} className={authButtonCls}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              در حال ارسال...
            </>
          ) : (
            'ارسال کد تأیید'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-forest-500">
        رمز عبور خود را به یاد آوردید؟{' '}
        <Link to="/login" className="font-bold text-forest-700 hover:text-forest-900">
          ورود
        </Link>
      </p>
    </AuthShell>
  );
}