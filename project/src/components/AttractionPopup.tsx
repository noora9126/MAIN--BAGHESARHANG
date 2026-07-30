import { X, MapPin, Clock, Navigation } from 'lucide-react';
import type { Attraction } from '../data/attractions';

interface AttractionPopupProps {
  attraction: Attraction;
  onClose: () => void;
}

export default function AttractionPopup({ attraction, onClose }: AttractionPopupProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-forest-950/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div className="relative h-44 sm:h-52 overflow-hidden">
          <img
            src={attraction.image}
            alt={attraction.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-forest-900/70 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 left-3 flex h-9 w-9 items-center justify-center rounded-full glass-dark text-white transition-colors hover:bg-forest-800"
            aria-label="بستن"
          >
            <X size={20} />
          </button>
          <div className="absolute bottom-3 right-4 left-4">
            <span className="inline-block rounded-full bg-gold-500 px-3 py-1 text-xs font-bold text-forest-900 mb-2">
              {attraction.category}
            </span>
            <h3 className="text-xl font-bold text-white text-shadow-md">{attraction.name}</h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[50vh] overflow-y-auto">
          {/* Quick Info */}
          <div className="flex flex-wrap gap-3 mb-4">
            <span className="flex items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1.5 text-xs font-medium text-forest-700">
              <MapPin size={14} className="text-forest-500" />
              {attraction.distance}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1.5 text-xs font-medium text-forest-700">
              <Clock size={14} className="text-forest-500" />
              {attraction.travelTime}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-forest-600 leading-relaxed mb-4">
            {attraction.longDescription}
          </p>

          {/* Address */}
          <div className="rounded-xl bg-forest-50 p-3 mb-3">
            <p className="flex items-start gap-2 text-xs text-forest-600">
              <MapPin size={16} className="shrink-0 mt-0.5 text-forest-500" />
              <span>{attraction.address}</span>
            </p>
          </div>

          {/* Map Link */}
          <a
            href={attraction.mapLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-full bg-forest-600 px-5 py-3 text-white text-sm font-medium transition-all hover:bg-forest-700 hover:shadow-lg"
          >
            <Navigation size={16} />
            مشاهده روی نقشه
          </a>
        </div>
      </div>
    </div>
  );
}
