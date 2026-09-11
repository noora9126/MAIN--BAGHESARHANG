import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Phone, Instagram, Calendar, LogOut, User, LayoutDashboard } from 'lucide-react';
import { hotelInfo } from '../data/hotel';
import { useCustomerAuth } from '@/features/customerAuth/CustomerAuthProvider';

const navLinks = [
  { label: 'خانه', path: '/' },
  { label: 'اتاق‌ها', path: '/rooms' },
  { label: 'گالری', path: '/gallery' },
  { label: 'امکانات', path: '/facilities' },
  { label: 'مجله', path: '/magazine' },
  { label: 'درباره ما', path: '/about' },
  { label: 'قوانین', path: '/rules' },
  { label: 'تماس', path: '/contact' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { customer, logout } = useCustomerAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/');
  }, [logout, navigate]);

  const isHome = location.pathname === '/';
  const showSolid = scrolled || !isHome;

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${
        showSolid
          ? 'glass shadow-lg shadow-forest-900/5 py-2'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="container-x px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src="/logo.png" alt="هتل باغ سرهنگ" className="h-10 w-10 rounded-full" />
            <div className="hidden sm:block">
              <p className={`text-sm font-bold leading-tight ${showSolid ? 'text-forest-800' : 'text-white'}`}>
                هتل باغ سرهنگ
              </p>
              <p className={`text-xs leading-tight ${showSolid ? 'text-forest-500' : 'text-white/70'}`}>
                بابل
              </p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  location.pathname === link.path
                    ? showSolid
                      ? 'bg-forest-100 text-forest-700'
                      : 'bg-white/20 text-white'
                    : showSolid
                      ? 'text-forest-600 hover:bg-forest-50'
                      : 'text-white/90 hover:bg-white/10'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            {customer ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all duration-300 ${
                    showSolid ? 'bg-forest-50 hover:bg-forest-100 text-forest-700' : 'bg-white/15 hover:bg-white/25 text-white'
                  }`}
                >
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    showSolid ? 'bg-forest-600 text-white' : 'bg-white/30 text-white'
                  }`}>
                    {(customer.full_name || 'م').charAt(0)}
                  </div>
                  <span className="hidden xl:inline">{customer.full_name}</span>
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <div className="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-forest-100 bg-white shadow-xl shadow-forest-900/10">
                      <div className="border-b border-forest-50 px-4 py-3">
                        <p className="text-sm font-bold text-forest-800">{customer.full_name}</p>
                        <p className="text-xs text-forest-400" dir="ltr">{customer.mobile}</p>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={() => { navigate('/account'); setProfileOpen(false); }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-forest-700 hover:bg-forest-50 transition-colors"
                        >
                          <LayoutDashboard size={16} />
                          پنل کاربری
                        </button>
                        <button
                          onClick={() => { navigate('/account/reservations'); setProfileOpen(false); }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-forest-700 hover:bg-forest-50 transition-colors"
                        >
                          <Calendar size={16} />
                          رزروهای من
                        </button>
                        <button
                          onClick={() => { navigate('/account/profile'); setProfileOpen(false); }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-forest-700 hover:bg-forest-50 transition-colors"
                        >
                          <User size={16} />
                          پروفایل
                        </button>
                      </div>
                      <div className="border-t border-forest-50 py-1">
                        <button
                          onClick={() => { handleLogout(); setProfileOpen(false); }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut size={16} />
                          خروج از حساب
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="rounded-full border border-forest-200 bg-white/60 px-4 py-2 text-sm font-medium text-forest-700 transition-all duration-300 hover:bg-white"
                >
                  ورود
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="rounded-full bg-forest-700 px-4 py-2 text-sm font-medium text-white shadow-md transition-all duration-300 hover:bg-forest-800"
                >
                  عضویت
                </button>
              </>
            )}
            <a
              href={hotelInfo.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-l from-[#E1306C] to-[#F77737] px-4 py-2 text-white text-sm font-medium shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
              title={`اینستاگرام ${hotelInfo.instagram}`}
            >
              <Instagram size={16} />
              <span>اینستاگرام</span>
            </a>
            <button
              onClick={() => navigate('/reserve')}
              className="btn-gold text-sm"
            >
              <Calendar size={16} />
              رزرو
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`lg:hidden p-2 rounded-lg transition-colors ${showSolid ? 'text-forest-700' : 'text-white'}`}
            aria-label="منو"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-500 ${
            menuOpen ? 'max-h-[600px] opacity-100 mt-4' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="glass rounded-2xl p-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? 'bg-forest-100 text-forest-700'
                    : 'text-forest-600 hover:bg-forest-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 space-y-2 border-t border-forest-100">
              {customer ? (
                <>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-forest-600 text-sm font-bold text-white">
                      {(customer.full_name || 'م').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-forest-800 truncate">{customer.full_name}</p>
                      <p className="text-xs text-forest-400" dir="ltr">{customer.mobile}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/account')}
                    className="flex w-full items-center gap-3 px-4 py-3 rounded-xl bg-forest-50 text-forest-700 text-sm font-medium"
                  >
                    <LayoutDashboard size={18} />
                    پنل کاربری
                  </button>
                  <button
                    onClick={() => navigate('/account/reservations')}
                    className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-forest-600 hover:bg-forest-50 text-sm font-medium"
                  >
                    <Calendar size={18} />
                    رزروهای من
                  </button>
                  <button
                    onClick={() => { handleLogout(); setMenuOpen(false); }}
                    className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 text-sm font-medium"
                  >
                    <LogOut size={18} />
                    خروج از حساب
                  </button>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => navigate('/login')}
                      className="rounded-xl border border-forest-200 bg-white px-3 py-3 text-sm font-medium text-forest-700"
                    >
                      ورود
                    </button>
                    <button
                      onClick={() => navigate('/signup')}
                      className="rounded-xl bg-forest-700 px-3 py-3 text-sm font-medium text-white"
                    >
                      عضویت
                    </button>
                  </div>
                </>
              )}
              <a
                href={hotelInfo.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-l from-[#E1306C] to-[#F77737] text-white text-sm font-medium"
              >
                <Instagram size={18} />
                اینستاگرام {hotelInfo.instagram}
              </a>
              <button
                onClick={() => navigate('/reserve')}
                className="w-full btn-gold text-sm"
              >
                <Calendar size={16} />
                رزرو اتاق
              </button>
              <a
                href={hotelInfo.phoneLink}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-forest-50 text-forest-700 text-sm font-medium"
              >
                <Phone size={16} />
                {hotelInfo.phone}
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
