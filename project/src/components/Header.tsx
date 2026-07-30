import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Phone, Instagram, Calendar } from 'lucide-react';
import { hotelInfo } from '../data/hotel';

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
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

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
                href={`tel:${hotelInfo.phone}`}
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
