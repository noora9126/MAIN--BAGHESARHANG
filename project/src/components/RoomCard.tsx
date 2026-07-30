import { Link } from 'react-router-dom';
import { Users, Maximize, Star, ArrowLeft } from 'lucide-react';
import type { Room } from '../data/rooms';
import { formatPrice } from '../data/rooms';

interface RoomCardProps {
  room: Room;
}

export default function RoomCard({ room }: RoomCardProps) {
  return (
    <Link
      to={`/rooms/${room.slug}`}
      className="group block overflow-hidden rounded-2xl bg-white shadow-lg shadow-forest-900/5 transition-all duration-500 hover:shadow-2xl hover:shadow-forest-900/10 hover:-translate-y-1"
    >
      {/* Image */}
      <div className="relative h-48 sm:h-56 overflow-hidden">
        <img
          src={room.images[0]}
          alt={room.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {room.popular && (
          <span className="absolute top-3 right-3 rounded-full bg-gold-500 px-3 py-1 text-xs font-bold text-forest-900 shadow-md">
            محبوب
          </span>
        )}
        <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full glass-dark px-3 py-1.5">
          <Star size={14} className="text-gold-400 fill-gold-400" />
          <span className="text-xs font-bold text-white">{room.rating.toFixed(1)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-forest-800 mb-2 group-hover:text-forest-600 transition-colors">
          {room.name}
        </h3>
        <p className="text-sm text-forest-500 leading-relaxed mb-4 line-clamp-2">
          {room.description}
        </p>

        {/* Info Row */}
        <div className="flex items-center gap-4 mb-4 text-xs text-forest-600">
          <span className="flex items-center gap-1">
            <Users size={14} className="text-forest-400" />
            {room.capacity} نفر
            {room.extraCapacity > 0 && ` + ${room.extraCapacity}`}
          </span>
          <span className="flex items-center gap-1">
            <Maximize size={14} className="text-forest-400" />
            {room.area}
          </span>
        </div>

        {/* Price & CTA */}
        <div className="flex items-center justify-between pt-4 border-t border-forest-50">
          <div>
            <span className="text-xs text-forest-400">شروع از</span>
            <p className="text-lg font-bold text-forest-700">
              {formatPrice(room.price)}
              <span className="text-xs font-normal text-forest-400"> تومان/شب</span>
            </p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-forest-50 px-4 py-2 text-sm font-medium text-forest-700 transition-all group-hover:bg-forest-600 group-hover:text-white">
            جزئیات
            <ArrowLeft size={16} />
          </span>
        </div>
      </div>
    </Link>
  );
}
