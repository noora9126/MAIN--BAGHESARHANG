import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Star, ChevronDown } from 'lucide-react';
import { hotelInfo } from '../../data/hotel';

export default function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="/images/hotel/eghamat-14.jpg"
          alt="هتل باغ سرهنگ بابل در دل جنگل"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-forest-950/80 via-forest-900/70 to-forest-950/85" />
      </div>

      {/* Floating decorative elements */}
      <div className="absolute top-1/4 right-10 hidden lg:block animate-float">
        <div className="glass-dark rounded-2xl p-4 w-48">
          <div className="flex items-center gap-2 mb-2">
            <Star className="text-gold-400 fill-gold-400" size={20} />
            <span className="text-white font-bold">امتیاز مهمانان</span>
          </div>
          <p className="text-2xl font-bold text-gold-400">۸.۳ از ۱۰</p>
          <p className="text-xs text-white/70 mt-1">بر اساس ۲۹ نظر واقعی</p>
        </div>
      </div>

      <div className="absolute bottom-1/4 left-10 hidden lg:block animate-float" style={{ animationDelay: '2s' }}>
        <div className="glass-dark rounded-2xl p-4 w-48">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="text-gold-400" size={20} />
            <span className="text-white font-bold">موقعیت</span>
          </div>
          <p className="text-sm text-white/90">ابتدای جنگل بزچفت</p>
          <p className="text-xs text-white/70 mt-1">دسترسی به جاذبه‌های بابل</p>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
        <div className="animate-fade-in-down">
          <span className="inline-block rounded-full glass-dark px-5 py-2 text-sm text-gold-300 font-medium mb-6">
            هتل اقتصادی در دل طبیعت بابل
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white text-shadow-lg leading-tight animate-fade-in-up">
          هتل باغ سرهنگ
          <span className="block text-gradient-gold mt-2">اقامتی تمیز و آرام در دل جنگل</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-white/90 leading-relaxed max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          تجربه‌ای متفاوت از اقامت در قلب جنگل‌های سرسبز بابل. تمیزی، رفتار خوب و موقعیت مکانی عالی،
          همه در یک هتل اقتصادی.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <button
            onClick={() => navigate('/reserve')}
            className="btn-gold w-full sm:w-auto"
          >
            <Calendar size={20} />
            شروع رزرو
          </button>
          <button
            onClick={() => navigate('/rooms')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/40 px-7 py-3 text-white font-medium backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/60"
          >
            مشاهده اتاق‌ها
          </button>
        </div>

        <p className="mt-6 text-sm text-white/70 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <span dir="ltr">{hotelInfo.phone}</span> • رزرو مستقیم و بدون واسطه
        </p>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-fade-in" style={{ animationDelay: '1s' }}>
        <ChevronDown className="text-white/60 animate-bounce" size={28} />
      </div>
    </section>
  );
}
