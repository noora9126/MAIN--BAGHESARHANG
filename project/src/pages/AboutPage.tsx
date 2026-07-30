import { Link } from 'react-router-dom';
import { Home, Sparkles, MapPin, HeartHandshake, Wallet, TreePine, CheckCircle } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import { whyChooseUs } from '../data/hotel';

const iconMap = { Sparkles, MapPin, HeartHandshake, Wallet };

export default function AboutPage() {
  return (
    <div className="pt-20">
      {/* Header */}
      <section className="relative py-16 sm:py-20 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/hotel/site12.jpg"
            alt="درباره هتل باغ سرهنگ"
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
            <span className="text-white">درباره ما</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white text-shadow-lg">
            درباره هتل باغ سرهنگ
          </h1>
        </div>
      </section>

      {/* Story */}
      <section className="section-padding">
        <div className="container-x">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <ScrollReveal>
              <div>
                <span className="inline-block rounded-full bg-forest-100 px-4 py-1.5 text-sm font-medium text-forest-600 mb-3">
                  داستان ما
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-forest-800 mb-6">
                  تجربه‌ای بی‌نظیر از تاریخ و طبیعت
                </h2>
                <div className="space-y-4 text-forest-600 leading-relaxed">
                  <p>
                    هتل باغ سرهنگ بابل در سال ۱۳۹۵ در دل فضایی جنگلی و خوش آب و هوا افتتاح شد.
                    این هتل سه طبقه با ۹ باب اتاق، در تمامی ایام سال از گردشگران بابل پذیرایی می‌کند.
                  </p>
                  <p>
                    هدف ما فراهم‌سازی اقامتی دلپذیر و آرامش‌بخش برای مسافران است. رویکرد هتل
                    در ارائه خدمات بهتر در سه مبحث اقامت، امکانات و وعده‌های غذایی در اولویت قرار گرفته است.
                  </p>
                  <p>
                    در مسائل مربوط به اقامت، سعی شده است تا نظافت اتاق‌ها و اماکن هتل در بالاترین سطح
                    قرار گیرد. خوشبختانه در سال‌های اخیر این رویکرد همواره موفق واقع شده و در سایت‌های
                    رزرواسیون، این مورد بالاترین سطح رضایتمندی مسافران را به خود اختصاص داده است.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div className="relative">
                <img
                  src="/images/hotel/site2.jpg"
                  alt="هتل باغ سرهنگ بابل"
                  loading="lazy"
                  className="w-full rounded-2xl shadow-xl"
                />
                <div className="absolute -bottom-6 -right-6 hidden sm:block rounded-2xl bg-forest-600 p-6 text-white shadow-xl">
                  <TreePine size={32} className="mb-2 text-gold-400" />
                  <p className="text-3xl font-black">۹</p>
                  <p className="text-sm text-forest-100">اتاق فعال</p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-padding bg-forest-50">
        <div className="container-x">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-forest-800 mb-4">ارزش‌های ما</h2>
            <p className="text-forest-500 max-w-2xl mx-auto">
              چهار اصل پایه‌ای که تجربه اقامت در هتل باغ سرهنگ را متفاوت می‌کند
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyChooseUs.map((item, i) => {
              const Icon = iconMap[item.icon as keyof typeof iconMap];
              const isGold = item.color === 'gold';
              return (
                <ScrollReveal key={i} delay={i * 150}>
                  <div className="h-full rounded-2xl bg-white p-6 shadow-lg shadow-forest-900/5">
                    <div
                      className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${
                        isGold ? 'bg-gold-100 text-gold-600' : 'bg-forest-100 text-forest-600'
                      }`}
                    >
                      <Icon size={28} />
                    </div>
                    <h3 className="text-lg font-bold text-forest-800 mb-2">{item.title}</h3>
                    <p className="text-sm text-forest-500 leading-relaxed">{item.text}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="section-padding">
        <div className="container-x">
          <ScrollReveal>
            <div className="rounded-3xl bg-gradient-to-l from-forest-700 to-forest-600 p-8 sm:p-12 text-white">
              <h2 className="text-2xl sm:text-3xl font-black mb-4">مأموریت ما</h2>
              <p className="text-forest-100 leading-relaxed max-w-3xl">
                در بحث امکانات، پیوسته تلاش مدیریت هتل بر افزودن خدمات جدید به قابلیت‌های فعلی است.
                از جمله این خدمات می‌توان به استفاده از به‌روزترین تجهیزات لاندری و افزایش تعداد اقلام
                و تجهیزات شخصی جهت اقامت روزانه مسافر اشاره نمود. در بحث وعده‌های غذایی نیز، حفظ کیفیت
                در طول این سال‌ها اولویت ما بوده است.
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  'نظافت اتاق‌ها در بالاترین سطح',
                  'پرسنل مجرب و خوش‌برخورد',
                  'دسترسی کم‌نظیر به جاذبه‌های گردشگری',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-forest-100">
                    <CheckCircle size={20} className="text-gold-400 shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
