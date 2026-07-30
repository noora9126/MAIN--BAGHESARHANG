import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import RoomCard from '../components/RoomCard';
import { rooms } from '../data/rooms';

export default function RoomsPage() {
  return (
    <div className="pt-20">
      {/* Header */}
      <section className="relative py-16 sm:py-20 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/hotel/eghamat-01.jpg"
            alt="اتاق‌های هتل باغ سرهنگ"
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
            <span className="text-white">اتاق‌ها</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white text-shadow-lg mb-4">
            اتاق‌های هتل باغ سرهنگ
          </h1>
          <p className="text-white/80 max-w-2xl mx-auto leading-relaxed">
            اتاق‌های متنوع و تمیز برای هر نوع سفر، از اقامت فردی تا خانوادگی
          </p>
        </div>
      </section>

      {/* Rooms Grid */}
      <section className="section-padding">
        <div className="container-x">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room, i) => (
              <ScrollReveal key={room.id} delay={i * 100}>
                <RoomCard room={room} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
