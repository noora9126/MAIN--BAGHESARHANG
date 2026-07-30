import { Sparkles, MapPin, HeartHandshake, Wallet, CheckCircle } from 'lucide-react';
import ScrollReveal from '../ScrollReveal';
import { whyChooseUs } from '../../data/hotel';

const iconMap = { Sparkles, MapPin, HeartHandshake, Wallet };

export default function WhyChooseUs() {
  return (
    <section className="section-padding">
      <div className="container-x">
        <ScrollReveal className="text-center mb-12">
          <span className="inline-block rounded-full bg-forest-100 px-4 py-1.5 text-sm font-medium text-forest-600 mb-3">
            چرا هتل باغ سرهنگ؟
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-forest-800 mb-4">
            چهار اصل ما برای اقامتی پایدار
          </h2>
          <p className="text-forest-500 max-w-2xl mx-auto leading-relaxed">
            ما به چهار اصل پایه‌ای متعهدیم که تجربه اقامت شما را متفاوت می‌کند
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {whyChooseUs.map((item, i) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap];
            const isGold = item.color === 'gold';
            return (
              <ScrollReveal key={i} delay={i * 150}>
                <div className="group h-full rounded-2xl bg-white p-6 shadow-lg shadow-forest-900/5 transition-all duration-500 hover:shadow-xl hover:-translate-y-1.5">
                  <div
                    className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${
                      isGold ? 'bg-gold-100 text-gold-600' : 'bg-forest-100 text-forest-600'
                    }`}
                  >
                    <Icon size={28} />
                  </div>
                  <h3 className="text-lg font-bold text-forest-800 mb-2">{item.title}</h3>
                  <p className="text-sm text-forest-500 leading-relaxed mb-4">{item.text}</p>
                  <ul className="space-y-1.5">
                    {item.points.map((point, j) => (
                      <li key={j} className="flex items-center gap-2 text-xs text-forest-600">
                        <CheckCircle size={14} className={isGold ? 'text-gold-500' : 'text-forest-500'} />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
