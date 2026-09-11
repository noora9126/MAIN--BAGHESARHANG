import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, KeyRound, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/admin/PageHeader';
import { customerChangePassword } from '@/services/customerApi';
import { apiError } from '@/services/api';
import { AuthInput } from '@/components/AuthInputs';
import { Button } from '@/components/ui/button';

const PASSWORD_MIN = 8;

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!currentPassword) {
      setError('رمز عبور فعلی را وارد کنید');
      return;
    }
    if (newPassword.length < PASSWORD_MIN || !/[A-Za-zآ-ی]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError(`رمز جدید باید حداقل ${PASSWORD_MIN} کاراکتر و شامل حروف و اعداد باشد`);
      return;
    }
    if (newPassword === currentPassword) {
      setError('رمز جدید نباید با رمز فعلی یکسان باشد');
      return;
    }
    if (newPassword !== confirm) {
      setError('تکرار رمز عبور مطابقت ندارد');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await customerChangePassword(currentPassword, newPassword);
      toast.success('رمز عبور با موفقیت تغییر کرد');
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title="تغییر رمز عبور" description="رمز عبور حساب خود را به‌روزرسانی کنید" />

      <div className="max-w-lg">
        <div className="rounded-2xl border border-forest-50 bg-white p-5 shadow-sm sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <label htmlFor="current" className="block text-sm font-medium text-forest-700">
                رمز عبور فعلی
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
                <AuthInput
                  id="current"
                  type="password"
                  dir="ltr"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={String.fromCharCode(8226).repeat(8)}
                  className="pr-9 text-center"
                  autoComplete="current-password"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="new" className="block text-sm font-medium text-forest-700">
                رمز عبور جدید
              </label>
              <div className="relative">
                <KeyRound className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
                <AuthInput
                  id="new"
                  type={showNew ? 'text' : 'password'}
                  dir="ltr"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={String.fromCharCode(8226).repeat(8)}
                  className="pr-9 pl-10 text-center"
                  autoComplete="new-password"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400 transition-colors hover:text-forest-700"
                  aria-label={showNew ? 'پنهان کردن رمز' : 'نمایش رمز'}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm" className="block text-sm font-medium text-forest-700">
                تکرار رمز عبور جدید
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
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
              رمز جدید باید حداقل ۸ کاراکتر و شامل حروف و اعداد باشد. پس از تغییر، پیامک اطلاع‌رسانی برایتان ارسال می‌شود.
            </p>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <KeyRound className="h-4 w-4" />}
              تغییر رمز عبور
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}