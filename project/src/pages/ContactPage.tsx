import { Link } from 'react-router-dom';
import { Home, Phone, Mail, MapPin, Clock, Instagram } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import { hotelInfo } from '../data/hotel';

export default function ContactPage() {
  return (
    <div className="pt-20">
      {/* Header */}
      <section className="relative py-16 sm:py-20 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/hotel/site13.jpg"
            alt="تماس با هتل باغ سرهنگ"
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
            <span className="text-white">تماس</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white text-shadow-lg">
            تماس با ما
          </h1>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-x">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-forest-800 mb-3">اطلاعات تماس</h2>
                <p className="text-forest-600 leading-relaxed">
                  برای رزرو، پرسش و هرگونه هماهنگی مستقیماً با شماره‌های زیر تماس بگیرید.
                </p>
              </div>

              <div className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-forest-100 text-forest-600">
                  <Phone size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-forest-800 mb-1">تلفن تماس</p>
                  <a href={`tel:${hotelInfo.phone}`} className="block text-forest-600 hover:text-forest-700 transition-colors" dir="ltr">{hotelInfo.phone}</a>
                  <a href={`tel:${hotelInfo.phone2}`} className="block text-forest-600 hover:text-forest-700 transition-colors" dir="ltr">{hotelInfo.phone2}</a>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-forest-100 text-forest-600">
                  <Mail size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-forest-800 mb-1">ایمیل</p>
                  <a href={`mailto:${hotelInfo.email}`} className="text-forest-600 hover:text-forest-700 transition-colors" dir="ltr">{hotelInfo.email}</a>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-forest-100 text-forest-600">
                  <MapPin size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-forest-800 mb-1">آدرس</p>
                  <p className="text-sm text-forest-600 leading-relaxed">{hotelInfo.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-forest-100 text-forest-600">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-forest-800 mb-1">ساعات کاری</p>
                  <p className="text-sm text-forest-600">پذیرش ۲۴ ساعته در تمام ایام سال</p>
                  <p className="text-xs text-forest-400 mt-1">ورود: ۱۴:۰۰ • خروج: ۱۲:۰۰</p>
                </div>
              </div>

              <a
                href={hotelInfo.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 rounded-2xl bg-gradient-to-l from-[#E1306C] to-[#F77737] p-5 text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <Instagram size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold">اینستاگرام</p>
                  <p className="text-sm text-white/90" dir="ltr">{hotelInfo.instagram}</p>
                </div>
              </a>
            </div>
          </ScrollReveal>

          {/* Map */}
          <ScrollReveal className="mt-8">
            <div className="overflow-hidden rounded-2xl shadow-lg">
              <iframe
                src={hotelInfo.mapEmbed}
                width="100%"
                height="400"
                style={{ border: 0 }}
                loading="lazy"
                title="نقشه هتل باغ سرهنگ بابل"
              />
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
