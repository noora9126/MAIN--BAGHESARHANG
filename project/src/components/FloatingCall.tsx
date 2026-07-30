import { Phone } from 'lucide-react';
import { hotelInfo } from '../data/hotel';

export default function FloatingCall() {
  return (
    <a
      href={`tel:${hotelInfo.phone}`}
      className="fixed bottom-5 left-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-forest-600 text-white shadow-xl shadow-forest-600/40 transition-all duration-300 hover:bg-forest-700 hover:scale-110 animate-pulse-slow"
      aria-label={`تماس با هتل ${hotelInfo.phone}`}
      title={`تماس: ${hotelInfo.phone}`}
    >
      <Phone size={24} className="animate-fade-in" />
      <span className="absolute -top-1 -right-1 flex h-4 w-4">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-400 opacity-75"></span>
        <span className="relative inline-flex h-4 w-4 rounded-full bg-gold-500"></span>
      </span>
    </a>
  );
}
