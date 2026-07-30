import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Home, Users, Maximize, Star, Check, Calendar, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import RoomCard from '../components/RoomCard';
import FaqSection from '../components/home/FaqSection';
import { getRoomBySlug, formatPrice, rooms } from '../data/rooms';

export default function RoomDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const room = getRoomBySlug(slug || '');
  const [activeImage, setActiveImage] = useState(0);

  if (!room) {
    return (
      <div className="pt-32 pb-20 text-center">
        <p className="text-forest-600 mb-4">اتاق مورد نظر یافت نشد.</p>
        <Link to="/rooms" className="btn-primary">بازگشت به اتاق‌ها</Link>
      </div>
    );
  }

  const relatedRooms = rooms.filter((r) => r.id !== room.id).slice(0, 3);

  const nextImage = () => setActiveImage((prev) => (prev + 1) % room.images.length);
  const prevImage = () => setActiveImage((prev) => (prev - 1 + room.images.length) % room.images.length);

  return (
    <div className="pt-20">
      {/* Breadcrumb */}
      <div className="container-x px-4 sm:px-6 lg:px-8 py-4">
        <nav className="flex items-center gap-2 text-sm text-forest-500">
          <Link to="/" className="flex items-center gap-1 hover:text-forest-700 transition-colors">
            <Home size={14} />
            خانه
          </Link>
          <span>/</span>
          <Link to="/rooms" className="hover:text-forest-700 transition-colors">اتاق‌ها</Link>
          <span>/</span>
          <span className="text-forest-700 font-medium">{room.name}</span>
        </nav>
      </div>

      {/* Gallery */}
      <section className="container-x px-4 sm:px-6 lg:px-8 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Main Image */}
          <div className="lg:col-span-3 relative overflow-hidden rounded-2xl shadow-lg group">
            <img
              src={room.images[activeImage]}
              alt={`${room.name} - تصویر ${activeImage + 1}`}
              className="w-full h-64 sm:h-80 lg:h-96 object-cover"
            />
            <button
              onClick={prevImage}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full glass-dark text-white opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="قبلی"
            >
              <ChevronRight size={22} />
            </button>
            <button
              onClick={nextImage}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full glass-dark text-white opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="بعدی"
            >
              <ChevronLeft size={22} />
            </button>
          </div>
          {/* Thumbnails */}
          <div className="flex lg:flex-col gap-3 sm:gap-4">
            {room.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={`relative overflow-hidden rounded-xl flex-1 lg:flex-none transition-all ${
                  activeImage === i ? 'ring-2 ring-forest-600 ring-offset-2' : ''
                }`}
              >
                <img src={img} alt={`${room.name} ${i + 1}`} className="w-full h-20 lg:h-24 object-cover" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Info */}
      <section className="container-x px-4 sm:px-6 lg:px-8 mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Description */}
          <div className="lg:col-span-2">
            <ScrollReveal>
              <div className="flex items-center gap-3 mb-4">
                <h1 className="text-2xl sm:text-3xl font-black text-forest-800">{room.name}</h1>
                <span className="flex items-center gap-1 rounded-full bg-gold-100 px-3 py-1 text-sm font-bold text-gold-700">
                  <Star size={14} className="fill-gold-500 text-gold-500" />
                  {room.rating.toFixed(1)}
                </span>
              </div>

              <div className="flex flex-wrap gap-4 mb-6">
                <span className="flex items-center gap-2 rounded-full bg-forest-50 px-4 py-2 text-sm text-forest-700">
                  <Users size={18} className="text-forest-500" />
                  ظرفیت: {room.capacity} نفر
                  {room.extraCapacity > 0 && ` (+${room.extraCapacity} نفر اضافه)`}
                </span>
                <span className="flex items-center gap-2 rounded-full bg-forest-50 px-4 py-2 text-sm text-forest-700">
                  <Maximize size={18} className="text-forest-500" />
                  {room.area}
                </span>
              </div>

              <p className="text-forest-600 leading-relaxed mb-8">{room.longDescription}</p>

              {/* Amenities */}
              <h3 className="text-lg font-bold text-forest-800 mb-4">امکانات اتاق</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {room.amenities.map((amenity, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-forest-600">
                    <Check size={16} className="text-forest-500" />
                    {amenity}
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>

          {/* Booking Card */}
          <ScrollReveal delay={200}>
            <div className="sticky top-24 rounded-2xl bg-white p-6 shadow-xl shadow-forest-900/10">
              <p className="text-sm text-forest-400 mb-1">شروع قیمت از</p>
              <p className="text-3xl font-black text-forest-700 mb-1">
                {formatPrice(room.price)}
                <span className="text-base font-normal text-forest-400"> تومان</span>
              </p>
              <p className="text-sm text-forest-400 mb-6">برای هر شب با صبحانه</p>

              <div className="space-y-3 mb-6 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-forest-50">
                  <span className="text-forest-500">ساعت ورود</span>
                  <span className="font-medium text-forest-700">۱۴:۰۰</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-forest-50">
                  <span className="text-forest-500">ساعت خروج</span>
                  <span className="font-medium text-forest-700">۱۲:۰۰</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-forest-50">
                  <span className="text-forest-500">صبحانه</span>
                  <span className="font-medium text-forest-700">دارد</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-forest-50">
                  <span className="text-forest-500">اینترنت</span>
                  <span className="font-medium text-red-500">ندارد</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/reserve')}
                className="btn-gold w-full mb-3"
              >
                <Calendar size={18} />
                رزرو این اتاق
              </button>
              <Link to="/rooms" className="btn-outline w-full">
                <ArrowRight size={18} />
                بازگشت به اتاق‌ها
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Related Rooms */}
      <section className="section-padding bg-forest-50">
        <div className="container-x">
          <ScrollReveal className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-forest-800">اتاق‌های مرتبط</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedRooms.map((r, i) => (
              <ScrollReveal key={r.id} delay={i * 100}>
                <RoomCard room={r} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FaqSection />
    </div>
  );
}
