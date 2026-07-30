import { Link } from 'react-router-dom';
import { Instagram, Phone, Mail, MapPin, Send } from 'lucide-react';
import { hotelInfo } from '../data/hotel';

const quickLinks = [
  { label: 'اتاق‌ها', path: '/rooms' },
  { label: 'گالری', path: '/gallery' },
  { label: 'مجله', path: '/magazine' },
  { label: 'امکانات', path: '/facilities' },
  { label: 'قوانین', path: '/rules' },
  { label: 'تماس', path: '/contact' },
];

export default function Footer() {
  return (
    <footer className="bg-forest-900 text-forest-100 pt-16 pb-8">
      <div className="container-x px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/logo.png" alt="هتل باغ سرهنگ" className="h-12 w-12 rounded-full" />
              <div>
                <p className="text-lg font-bold text-white">هتل باغ سرهنگ</p>
                <p className="text-sm text-forest-300">بابل، مازندران</p>
              </div>
            </div>
            <p className="text-sm text-forest-300 leading-relaxed">
              اقامتی تمیز، آرام و اقتصادی در دل جنگل‌های سرسبز بابل. تجربه‌ای متفاوت از مهمان‌نوازی ایرانی.
            </p>
            <a
              href={hotelInfo.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-l from-[#E1306C] to-[#F77737] px-4 py-2 text-white text-sm font-medium transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <Instagram size={18} />
              {hotelInfo.instagram}
            </a>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-4 text-base">دسترسی سریع</h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-forest-300 hover:text-gold-300 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold mb-4 text-base">اطلاعات تماس</h4>
            <ul className="space-y-3 text-sm text-forest-300">
              <li className="flex items-start gap-2">
                <MapPin size={18} className="shrink-0 mt-0.5 text-gold-400" />
                <span>{hotelInfo.address}</span>
              </li>
              <li>
                <a href={`tel:${hotelInfo.phone}`} className="flex items-center gap-2 hover:text-gold-300 transition-colors">
                  <Phone size={18} className="shrink-0 text-gold-400" />
                  <span dir="ltr">{hotelInfo.phone}</span>
                </a>
              </li>
              <li>
                <a href={`tel:${hotelInfo.phone2}`} className="flex items-center gap-2 hover:text-gold-300 transition-colors">
                  <Phone size={18} className="shrink-0 text-gold-400" />
                  <span dir="ltr">{hotelInfo.phone2}</span>
                </a>
              </li>
              <li>
                <a href={`mailto:${hotelInfo.email}`} className="flex items-center gap-2 hover:text-gold-300 transition-colors">
                  <Mail size={18} className="shrink-0 text-gold-400" />
                  <span dir="ltr">{hotelInfo.email}</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-white font-bold mb-4 text-base">خبرنامه</h4>
            <p className="text-sm text-forest-300 mb-4">
              برای دریافت آخرین اخبار و تخفیف‌های ویژه، ایمیل خود را ثبت کنید.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
              <input
                type="email"
                placeholder="ایمیل شما"
                className="flex-1 rounded-full bg-forest-800 border border-forest-700 px-4 py-2.5 text-sm text-white placeholder:text-forest-400 focus:outline-none focus:border-gold-400"
              />
              <button
                type="submit"
                className="rounded-full bg-gold-500 p-2.5 text-forest-900 transition-colors hover:bg-gold-400"
                aria-label="ثبت ایمیل"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-forest-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-forest-400">
            © {new Date().getFullYear()} هتل باغ سرهنگ بابل. تمامی حقوق محفوظ است.
          </p>
          <div className="flex items-center gap-4 text-xs text-forest-400">
            <span>ساعت ورود: {hotelInfo.checkIn}</span>
            <span>•</span>
            <span>ساعت خروج: {hotelInfo.checkOut}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
