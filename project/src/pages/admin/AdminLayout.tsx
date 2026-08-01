import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, Users, BarChart3, BedDouble, Settings,
  LogOut, Menu, X, Home, Loader2,
} from 'lucide-react';
import { adminMe, clearToken, getToken, type AdminInfo } from '../../services/adminApi';

const NAV = [
  { to: '/admin/dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { to: '/admin/reservations', label: 'رزروها', icon: CalendarDays },
  { to: '/admin/guests', label: 'مهمانان', icon: Users },
  { to: '/admin/analytics', label: 'گزارش‌ها', icon: BarChart3 },
  { to: '/admin/rooms', label: 'اتاق‌ها', icon: BedDouble },
  { to: '/admin/settings', label: 'تنظیمات', icon: Settings },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      navigate('/admin', { replace: true });
      return;
    }
    adminMe()
      .then(setAdmin)
      .catch(() => navigate('/admin', { replace: true }));
  }, [navigate]);

  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-forest-950">
        <Loader2 className="animate-spin text-gold-400" size={40} />
      </div>
    );
  }

  const logout = () => {
    clearToken();
    navigate('/admin');
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <img src="/logo.png" alt="" className="h-11 w-11 rounded-full" />
        <div>
          <p className="text-sm font-black text-white">هتل باغ سرهنگ</p>
          <p className="text-[10px] text-white/50">پنل مدیریت</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gold-500 text-forest-900 shadow-lg shadow-gold-500/20'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t border-white/10 p-3">
        <div className="px-4 py-2">
          <p className="text-sm font-bold text-white">{admin.name || admin.username}</p>
          <p className="text-[10px] text-white/50">{admin.role === 'SUPER_ADMIN' ? 'مدیر ارشد' : 'مدیر'}</p>
        </div>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-300 hover:bg-red-500/10 transition-colors">
          <LogOut size={18} />
          خروج
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-forest-50/60" dir="rtl">
      {/* دسکتاپ */}
      <aside className="fixed right-0 top-0 bottom-0 z-40 hidden w-64 bg-gradient-to-b from-forest-900 to-forest-950 lg:block">
        {sidebar}
      </aside>

      {/* موبایل */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          <aside className="absolute right-0 top-0 bottom-0 w-72 bg-gradient-to-b from-forest-900 to-forest-950">
            <button onClick={() => setMenuOpen(false)} className="absolute left-3 top-4 text-white/70 hover:text-white">
              <X size={22} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:mr-64">
        <header className="sticky top-0 z-30 glass border-b border-forest-100 px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenuOpen(true)} className="lg:hidden text-forest-700">
              <Menu size={22} />
            </button>
            <h1 className="text-lg font-black text-forest-800">پنل مدیریت</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-forest-400">{admin.username}</span>
            <Link to="/" className="flex items-center gap-1.5 rounded-full bg-forest-100 px-4 py-2 text-xs font-bold text-forest-700 hover:bg-forest-200 transition-colors">
              <Home size={14} />
              سایت
            </Link>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
