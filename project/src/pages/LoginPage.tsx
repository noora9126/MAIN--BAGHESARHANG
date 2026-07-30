import { Link, useNavigate } from 'react-router-dom';
import { Home, LogIn, User, Lock } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';

export default function LoginPage() {
  const navigate = useNavigate();
  return (
    <div className="pt-20 min-h-screen flex items-center justify-center section-padding">
      <div className="container-x max-w-md">
        <ScrollReveal>
          <div className="rounded-2xl bg-white p-8 shadow-xl">
            <nav className="flex items-center gap-2 text-sm text-forest-500 mb-6">
              <Link to="/" className="flex items-center gap-1 hover:text-forest-700 transition-colors">
                <Home size={14} />
                خانه
              </Link>
              <span>/</span>
              <span className="text-forest-700 font-medium">ورود</span>
            </nav>

            <h1 className="text-2xl font-black text-forest-800 mb-2">ورود به حساب</h1>
            <p className="text-sm text-forest-500 mb-6">برای رزرو و مدیریت حساب خود وارد شوید</p>

            <form onSubmit={(e) => { e.preventDefault(); navigate('/'); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-forest-700 mb-1.5">ایمیل یا شماره موبایل</label>
                <div className="relative">
                  <User size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-forest-400" />
                  <input
                    type="text"
                    required
                    dir="ltr"
                    className="w-full rounded-xl border border-forest-100 bg-forest-50/50 pr-10 pl-4 py-3 text-sm text-forest-800 focus:outline-none focus:border-forest-400 focus:bg-white transition-colors"
                    placeholder="example@mail.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-forest-700 mb-1.5">رمز عبور</label>
                <div className="relative">
                  <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-forest-400" />
                  <input
                    type="password"
                    required
                    className="w-full rounded-xl border border-forest-100 bg-forest-50/50 pr-10 pl-4 py-3 text-sm text-forest-800 focus:outline-none focus:border-forest-400 focus:bg-white transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full">
                <LogIn size={18} />
                ورود
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-forest-500">
              حساب ندارید؟{' '}
              <Link to="/signup" className="font-bold text-forest-600 hover:text-forest-700 transition-colors">
                ثبت‌نام کنید
              </Link>
            </p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
