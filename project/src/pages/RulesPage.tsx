import { Link } from 'react-router-dom';
import { Home, LogIn, LogOut, XCircle, Baby, Ban, PawPrint, FileCheck, Users, type LucideIcon } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import { rules } from '../data/hotel';
import SEO from '../components/SEO';

const iconMap: Record<string, LucideIcon> = {
  LogIn, LogOut, XCircle, Baby, Ban, PawPrint, FileCheck, Users,
};

export default function RulesPage() {
  return (
    <div className="pt-20">
      <SEO
        title="قوانین هتل باغ سرهنگ بابل"
        description="قوانین اقامت در هتل باغ سرهنگ بابل: ساعت ورود ۱۴:۰۰، خروج ۱۲:۰۰، کنسلی تا ۷۲ ساعت قبل بدون جریمه، کودک زیر ۲ سال رایگان."
        canonical="/rules"
        ogImage="/images/hotel/site7.jpg"
      />
      {/* Header */}
      <section className="relative py-16 sm:py-20 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/hotel/site7.jpg"
            alt="قوانین هتل باغ سرهنگ"
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
            <span className="text-white">قوانین</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white text-shadow-lg">
            قوانین هتل
          </h1>
        </div>
      </section>

      {/* Rules Grid */}
      <section className="section-padding">
        <div className="container-x">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {rules.map((rule, i) => {
              const Icon = iconMap[rule.icon] || Home;
              return (
                <ScrollReveal key={i} delay={i * 80}>
                  <div className="h-full rounded-2xl bg-white p-6 shadow-lg shadow-forest-900/5 transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-forest-100 text-forest-600">
                      <Icon size={24} />
                    </div>
                    <h3 className="text-sm font-bold text-forest-800 mb-1">{rule.title}</h3>
                    <p className="text-sm text-forest-500">{rule.value}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>

          {/* Additional Info */}
          <ScrollReveal className="mt-12">
            <div className="rounded-2xl bg-forest-50 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-forest-800 mb-4">توضیحات تکمیلی</h2>
              <ul className="space-y-3 text-sm text-forest-600 leading-relaxed">
                <li>• اقامت رایگان و نیم‌بها تنها برای یک کودک محاسبه می‌شود.</li>
                <li>• ارائه کارت شناسایی ملی برای تمامی مسافران الزامی است.</li>
                <li>• کنسلی تا ۷۲ ساعت قبل از ورود بدون جریمه است. کنسلی با زمان کمتر ممکن است شامل جریمه شود.</li>
                <li>• سیگار کشیدن در فضای عمومی هتل ممنوع است.</li>
                <li>• ورود حیوانات خانگی به هتل مجاز نیست.</li>
                <li>• برای رزرو گروهی و سازمانی با مدیریت هتل تماس بگیرید.</li>
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
