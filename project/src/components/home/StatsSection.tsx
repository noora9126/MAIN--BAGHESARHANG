import { useEffect, useRef, useState } from 'react';
import ScrollReveal from '../ScrollReveal';
import { stats } from '../../data/hotel';

function useCountUp(target: number, duration = 1500, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number;
    const animate = (now: number) => {
      if (!startTime) startTime = now;
      const progress = Math.min((now - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration, start]);
  return count;
}

export default function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="relative -mt-16 z-20 px-4 sm:px-6 lg:px-8">
      <div className="container-x">
        <div className="glass rounded-3xl shadow-2xl shadow-forest-900/10 p-6 sm:p-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <StatItem key={i} stat={stat} visible={visible} delay={i * 200} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatItem({ stat, visible, delay }: { stat: typeof stats[0]; visible: boolean; delay: number }) {
  const count = useCountUp(stat.value, 1500, visible);
  return (
    <ScrollReveal delay={delay} className="text-center">
      <p className="text-3xl sm:text-4xl font-black text-forest-700">
        {count.toLocaleString('fa-IR')}
        <span className="text-gold-500">{stat.suffix}</span>
      </p>
      <p className="mt-1 text-sm text-forest-500 font-medium">{stat.label}</p>
    </ScrollReveal>
  );
}
