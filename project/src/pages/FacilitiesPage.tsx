import { Link } from 'react-router-dom';
import { Home, Car, Utensils, Coffee, Clock, Shirt, Sunrise, Wind, Bath, Trees, Tent, PhoneCall, type LucideIcon } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import { facilities } from '../data/hotel';

const iconMap: Record<string, LucideIcon> = {
  Car, Utensils, Home, Coffee, Clock, Shirt, Sunrise, Wind, Bath, Trees, Tent, PhoneCall,
};

export default function FacilitiesPage() {
  return (
    <div className="pt-20">
      {/* Header */}
      <section className="relative py-16 sm:py-20 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/hotel/eghamat-11.jpg"
            alt="امکانات هتل باغ سرهنگ"
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
            <span className="text-white">امکانات</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white text-shadow-lg">
            امکانات هتل
          </h1>
        </div>
      </section>

      {/* Facilities Grid */}
      <section className="section-padding">
        <div className="container-x">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {facilities.map((facility, i) => {
              const Icon = iconMap[facility.icon] || Home;
              return (
                <ScrollReveal key={i} delay={i * 80}>
                  <div className="group h-full rounded-2xl bg-white p-6 shadow-lg shadow-forest-900/5 transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
                    <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-100 text-forest-600 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                      <Icon size={28} />
                    </div>
                    <h3 className="text-lg font-bold text-forest-800 mb-2">{facility.name}</h3>
                    <p className="text-sm text-forest-500 leading-relaxed">{facility.desc}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
