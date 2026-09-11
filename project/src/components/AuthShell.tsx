import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div dir="rtl">
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-forest-50 via-white to-gold-50 p-4">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-forest-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-gold-200/40 blur-3xl" />

        <div className="relative z-10 w-full max-w-md">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <Link to="/" className="flex flex-col items-center gap-2">
              <img src="/logo.png" alt="هتل باغ سرهنگ" className="h-20 w-20 rounded-full object-cover shadow-2xl ring-4 ring-gold-400/40" />
              <span className="text-lg font-black text-forest-800">هتل باغ سرهنگ</span>
            </Link>
          </div>

          <div className="rounded-2xl border border-forest-100 bg-white/95 p-6 shadow-2xl backdrop-blur sm:p-8">
            <div className="mb-6 text-center">
              <h1 className="text-xl font-black text-forest-800">{title}</h1>
              <p className="mt-1 text-sm text-forest-500">{subtitle}</p>
            </div>
            {children}
            {footer && <div className="mt-6 border-t border-forest-50 pt-4">{footer}</div>}
          </div>

          <Link
            to="/"
            className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs font-medium text-forest-500 transition-colors hover:text-forest-700"
          >
            <Home size={13} />
            بازگشت به سایت هتل
          </Link>
        </div>
      </div>
    </div>
  );
}