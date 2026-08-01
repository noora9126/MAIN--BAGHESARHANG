import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Loader2, KeyRound } from 'lucide-react';
import { adminLogin, getToken, setToken, apiError } from '../../services/adminApi';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getToken()) navigate('/admin/dashboard', { replace: true });
  }, [navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('نام کاربری و رمز عبور را وارد کنید');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const { token } = await adminLogin(username.trim(), password);
      setToken(token);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-forest-950 via-forest-900 to-forest-800 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 sm:p-10 shadow-2xl">
          <div className="mb-8 text-center">
            <img src="/logo.png" alt="هتل باغ سرهنگ" className="mx-auto mb-4 h-20 w-20 rounded-full shadow-lg" />
            <h1 className="text-xl font-black text-forest-800">پنل مدیریت هتل باغ سرهنگ</h1>
            <p className="mt-1 text-xs text-forest-400">ورود به پنل مدیریت</p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 text-center">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-forest-600">نام کاربری</span>
              <div className="relative">
                <User size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-forest-300" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  className="w-full rounded-xl border border-forest-200 bg-forest-50/40 py-3 pr-11 pl-4 text-forest-800 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200"
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-forest-600">رمز عبور</span>
              <div className="relative">
                <Lock size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-forest-300" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-forest-200 bg-forest-50/40 py-3 pr-11 pl-4 text-forest-800 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200"
                />
              </div>
            </label>
            <button type="submit" disabled={busy} className="btn-gold w-full">
              {busy ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={18} />}
              ورود به پنل
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-forest-400">
            دسترسی فقط برای مدیران هتل مجاز است.
          </p>
        </div>
      </div>
    </div>
  );
}
