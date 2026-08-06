import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ScrollReveal from '../ScrollReveal';
import RoomCard from '../RoomCard';
import { getRooms, type Room } from '../../services/api';
import { rooms as staticRooms } from '../../data/rooms';

export default function PopularRooms() {
  const [popularRooms, setPopularRooms] = useState<Room[]>([]);

  useEffect(() => {
    getRooms()
      .then((rooms) => {
        const list = rooms.length > 0 ? rooms : (staticRooms as unknown as Room[]);
        setPopularRooms(list.filter((r) => r.popular).slice(0, 3));
      })
      .catch(() => {
        setPopularRooms((staticRooms as unknown as Room[]).filter((r) => r.popular).slice(0, 3));
      });
  }, []);

  return (
    <section className="section-padding bg-gradient-to-b from-transparent to-forest-50">
      <div className="container-x">
        <ScrollReveal className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <span className="inline-block rounded-full bg-forest-100 px-4 py-1.5 text-sm font-medium text-forest-600 mb-3">
              اتاق‌های محبوب
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-forest-800">
              انتخابی برای هر سفر
            </h2>
          </div>
          <Link
            to="/rooms"
            className="flex items-center gap-2 text-forest-600 font-medium hover:text-forest-700 transition-colors"
          >
            مشاهده همه اتاق‌ها
            <ArrowLeft size={18} />
          </Link>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {popularRooms.map((room, i) => (
            <ScrollReveal key={room.id} delay={i * 150}>
              <RoomCard room={room} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
