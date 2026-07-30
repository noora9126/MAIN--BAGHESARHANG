import { useNavigate } from 'react-router-dom';
import { Calendar, Phone } from 'lucide-react';
import ScrollReveal from '../ScrollReveal';
import { hotelInfo } from '../../data/hotel';

export default function FinalCta() {
  const navigate = useNavigate();

  return (
    <section className="relative section-padding overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="/images/hotel/site12.jpg"
          alt="طبیعت بابل"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-forest-950/80 to-forest-900/70" />
      </div>

      <div className="relative z-10 container-x">
        <ScrollReveal className="text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-4 text-shadow-lg">
            اقامتی پایدار در دل طبیعت بابل
          </h2>
          <p className="text-white/80 max-w-2xl mx-auto leading-relaxed mb-8">
            تمیزی، موقعیت عالی، رفتار خوب و قیمت مناسب. همین حالا اتاق خود را رزرو کنید
            و تجربه‌ای متفاوت از سفر به بابل داشته باشید.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/reserve')} className="btn-gold w-full sm:w-auto">
              <Calendar size={20} />
              شروع رزرو
            </button>
            <a
              href={`tel:${hotelInfo.phone}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/40 px-7 py-3 text-white font-medium backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/60"
            >
              <Phone size={20} />
              تماس مستقیم
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
