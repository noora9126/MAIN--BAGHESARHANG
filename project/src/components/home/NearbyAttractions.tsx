import { useState } from 'react';
import { MapPin, Clock, Navigation } from 'lucide-react';
import ScrollReveal from '../ScrollReveal';
import AttractionPopup from '../AttractionPopup';
import { attractions } from '../../data/attractions';

export default function NearbyAttractions() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <section className="section-padding">
      <div className="container-x">
        <ScrollReveal className="text-center mb-12">
          <span className="inline-block rounded-full bg-forest-100 px-4 py-1.5 text-sm font-medium text-forest-600 mb-3">
            جاذبه‌های اطراف
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-forest-800 mb-4">
            نزدیک‌ترین مقصد به جاذبه‌های بابل
          </h2>
          <p className="text-forest-500 max-w-2xl mx-auto leading-relaxed">
            هتل باغ سرهنگ در بهترین موقعیت بابل برای دسترسی به جنگل‌ها، آبشارها و جاذبه‌های گردشگری قرار دارد
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {attractions.map((attr, i) => (
            <ScrollReveal key={attr.id} delay={i * 100}>
              <button
                onClick={() => setSelected(i)}
                className="group relative block w-full overflow-hidden rounded-2xl text-right shadow-lg shadow-forest-900/5 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1"
              >
                <div className="relative h-56 sm:h-64 overflow-hidden">
                  <img
                    src={attr.image}
                    alt={attr.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-forest-950/80 via-forest-900/30 to-transparent" />
                </div>
                <div className="absolute bottom-0 right-0 left-0 p-5">
                  <span className="inline-block rounded-full bg-gold-500/90 px-3 py-1 text-xs font-bold text-forest-900 mb-2">
                    {attr.category}
                  </span>
                  <h3 className="text-lg font-bold text-white text-shadow-md mb-2">{attr.name}</h3>
                  <div className="flex flex-wrap gap-3">
                    <span className="flex items-center gap-1 text-xs text-white/80">
                      <MapPin size={14} />
                      {attr.distance}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-white/80">
                      <Clock size={14} />
                      {attr.travelTime}
                    </span>
                  </div>
                </div>
                <div className="absolute top-3 left-3 flex h-9 w-9 items-center justify-center rounded-full glass-dark text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <Navigation size={16} />
                </div>
              </button>
            </ScrollReveal>
          ))}
        </div>
      </div>

      {selected !== null && (
        <AttractionPopup attraction={attractions[selected]} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}
