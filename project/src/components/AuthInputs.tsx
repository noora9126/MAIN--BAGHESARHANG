import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const authInputCls =
  'w-full rounded-xl border border-forest-200 bg-forest-50/40 px-4 py-3 text-sm text-forest-800 outline-none transition-colors placeholder:text-forest-300 focus:border-gold-400 focus:bg-white focus:ring-2 focus:ring-gold-200';

export const authButtonCls =
  'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-forest-700 to-forest-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-50';

export const AuthInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function AuthInput(
  { className, ...props },
  ref
) {
  return <input ref={ref} className={cn(authInputCls, className)} {...props} />;
});