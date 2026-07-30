import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import ScrollReveal from '../ScrollReveal';
import { faqs } from '../../data/hotel';

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="section-padding">
      <div className="container-x">
        <ScrollReveal className="text-center mb-12">
          <span className="inline-block rounded-full bg-forest-100 px-4 py-1.5 text-sm font-medium text-forest-600 mb-3">
            پرسش و پاسخ
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-forest-800">
            سوالات متداول
          </h2>
        </ScrollReveal>

        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, i) => (
            <ScrollReveal key={i} delay={i * 50}>
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-forest-50">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-right"
                >
                  <span className="text-sm sm:text-base font-bold text-forest-800">{faq.q}</span>
                  <ChevronDown
                    size={20}
                    className={`shrink-0 text-forest-500 transition-transform duration-300 ${
                      open === i ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    open === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="px-5 pb-5 text-sm text-forest-600 leading-relaxed">{faq.a}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
