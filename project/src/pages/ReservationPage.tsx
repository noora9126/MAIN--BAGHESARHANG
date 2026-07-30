import { Link } from 'react-router-dom';
import { Home, Phone, Clock, MessageCircle } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import { hotelInfo } from '../data/hotel';

export default function ReservationPage() {
  return (
    <div className="pt-20">
      {/* Header */}
      <section className="relative py-16 sm:py-20 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/hotel/eghamat-14.jpg"
            alt="رزرو هتل باغ سرهنگ"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-forest-950/70 to-forest-900/60" />
        </div>
        <div className="relative z-10 container-x px-4 text-center">
          <nav className="flex items-center justify-center gap-2 text-sm text-white/70 mb-4">
            <Link to="/" className="flex items-center gap-1 hover:text-white transition-colors">
              <Home size={14} />
              خانه
            </Link>
            <span>/</span>
            <span className="text-white">رزرو</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white text-shadow-lg">
            رزرو اتاق
          </h1>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-x max-w-3xl">
          <ScrollReveal>
            <div className="rounded-2xl bg-white p-8 sm:p-12 shadow-xl text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gold-100">
                <Phone size={40} className="text-gold-600" />
              </div>

              <h2 className="text-2xl font-black text-forest-800 mb-3">
                رزرو فقط از طریق تماس تلفنی
              </h2>

              <p className="text-forest-600 leading-relaxed mb-8 max-w-xl mx-auto">
                برای رزرو اتاق در هتل باغ سرهنگ بابل، لطفاً مستقیماً با شماره تلفن هتل تماس بگیرید.
                همکاران ما در پذیرش، آماده پاسخگویی و ثبت رزرو شما هستند. در حال حاضر رزرو آنلاین فعال نیست.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <a href={`tel:${hotelInfo.phone}`} className="btn-gold w-full sm:w-auto">
                  <Phone size={20} />
                  <span dir="ltr">{hotelInfo.phone}</span>
                </a>
                <a href={`tel:${hotelInfo.phone2}`} className="btn-outline w-full sm:w-auto">
                  <Phone size={20} />
                  <span dir="ltr">{hotelInfo.phone2}</span>
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="flex items-center gap-3 rounded-xl bg-forest-50 p-4 text-right">
                  <Clock size={20} className="text-forest-500 shrink-0" />
                  <div>
                    <p className="text-xs text-forest-400">ساعت کاری پذیرش</p>
                    <p className="text-sm font-bold text-forest-700">۲۴ ساعته</p>
                  </div>
                </div>
                <a
                  href={hotelInfo.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl bg-forest-50 p-4 text-right transition-colors hover:bg-forest-100"
                >
                  <MessageCircle size={20} className="text-forest-500 shrink-0" />
                  <div>
                    <p className="text-xs text-forest-400">اینستاگرام</p>
                    <p className="text-sm font-bold text-forest-700">{hotelInfo.instagram}</p>
                  </div>
                </a>
              </div>

              <p className="mt-8 text-xs text-forest-400">
                برای رزروهای گروهی و سازمانی نیز از همین شماره‌ها تماس بگیرید.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
