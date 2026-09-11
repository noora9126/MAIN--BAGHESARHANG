import { useEffect, useState } from "react";
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import RoomCard from '../components/RoomCard';
import { getRooms, type Room } from '../services/api';
import { rooms as staticRooms } from '../data/rooms';
import SEO from '../components/SEO';

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRooms()
      .then((data) => {
        if (data.length > 0) {
          setRooms(data);
        } else {
          setRooms(staticRooms as unknown as Room[]);
        }
      })
      .catch(() => {
        setRooms(staticRooms as unknown as Room[]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pt-20">
      <SEO
        title="اتاق‌های هتل باغ سرهنگ بابل"
        description="اتاق‌های متنوع و تمیز هتل باغ سرهنگ بابل: اتاق دوتخته، طرح سنتی، سوئیت سه تخته و سوئیت پنج نفره. رزرو آنلاین با قیمت مناسب."
        canonical="/rooms"
        ogImage="/images/hotel/eghamat-01.jpg"
      />
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
          <h1 className="text-3xl font-black text-white">
            اتاق‌های هتل باغ سرهنگ
          </h1>
          <p className="text-white/80 max-w-2xl mx-auto leading-relaxed">
            اتاق‌های متنوع و تمیز برای هر نوع سفر، از اقامت فردی تا خانوادگی
          </p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-x">
          {loading && (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-forest-600"></div>
            </div>
          )}
          {!loading && rooms.length === 0 && (
            <div className="text-center py-20">
              <p className="text-forest-400 text-lg">اتاقی یافت نشد</p>
            </div>
          )}
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
