import { Star, Quote } from 'lucide-react';
import ScrollReveal from '../ScrollReveal';
import { reviews, reviewScores } from '../../data/hotel';

export default function GuestReviews() {
  return (
    <section className="section-padding bg-gradient-to-b from-forest-50 to-transparent">
      <div className="container-x">
        <ScrollReveal className="text-center mb-12">
          <span className="inline-block rounded-full bg-forest-100 px-4 py-1.5 text-sm font-medium text-forest-600 mb-3">
            نظرات مهمانان
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-forest-800 mb-4">
            تجربه واقعی مسافران ما
          </h2>
          <div className="inline-flex items-center gap-3 rounded-full glass px-6 py-3 mt-4">
            <span className="text-3xl font-black text-forest-700">{reviewScores.overall.toLocaleString('fa-IR')}</span>
            <div className="text-right">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={16} className={s <= 4 ? 'text-gold-400 fill-gold-400' : 'text-gray-300'} />
                ))}
              </div>
              <p className="text-xs text-forest-500 mt-1">از ۲۹ نظر واقعی مسافران</p>
            </div>
          </div>
        </ScrollReveal>

        {/* Score Categories */}
        <ScrollReveal className="mb-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {reviewScores.categories.map((cat, i) => (
              <div key={i} className="rounded-xl bg-white p-4 text-center shadow-sm">
                <p className="text-2xl font-bold text-forest-700">{cat.score.toLocaleString('fa-IR')}</p>
                <p className="text-xs text-forest-500 mt-1">{cat.label}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review, i) => (
            <ScrollReveal key={i} delay={i * 100}>
              <div className="h-full rounded-2xl bg-white p-6 shadow-lg shadow-forest-900/5 transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
                <Quote className="text-forest-200 mb-3" size={32} />
                <p className="text-sm text-forest-600 leading-relaxed mb-4">{review.text}</p>
                <div className="flex items-center justify-between pt-4 border-t border-forest-50">
                  <div>
                    <p className="text-sm font-bold text-forest-800">{review.name}</p>
                    <p className="text-xs text-forest-400">{review.date}</p>
                  </div>
                  <div className="text-left">
                    <div className="flex gap-0.5 mb-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={12} className={s <= review.rating ? 'text-gold-400 fill-gold-400' : 'text-gray-200'} />
                      ))}
                    </div>
                    <span className="text-xs text-forest-400">{review.source}</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
