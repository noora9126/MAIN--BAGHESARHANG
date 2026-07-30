import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Home, X, ChevronLeft, ChevronRight } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import { galleryImages, galleryCategories } from '../data/gallery';

export default function GalleryPage() {
  const [category, setCategory] = useState('همه');
  const [lightbox, setLightbox] = useState<number | null>(null);

  const filtered =
    category === 'همه'
      ? galleryImages
      : galleryImages.filter((img) => img.category === category);

  const nextImage = () => {
    if (lightbox === null) return;
    setLightbox((lightbox + 1) % filtered.length);
  };
  const prevImage = () => {
    if (lightbox === null) return;
    setLightbox((lightbox - 1 + filtered.length) % filtered.length);
  };

  return (
    <div className="pt-20">
      {/* Header */}
      <section className="relative py-16 sm:py-20 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/hotel/eghamat-02.jpg"
            alt="گالری هتل باغ سرهنگ"
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
            <span className="text-white">گالری</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white text-shadow-lg">
            گالری تصاویر
          </h1>
        </div>
      </section>

      {/* Category Filter */}
      <section className="section-padding">
        <div className="container-x">
          <ScrollReveal className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {galleryCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-300 ${
                  category === cat
                    ? 'bg-forest-600 text-white shadow-md'
                    : 'bg-forest-50 text-forest-600 hover:bg-forest-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </ScrollReveal>

          {/* Gallery Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((img, i) => (
              <ScrollReveal key={i} delay={i * 50}>
                <button
                  onClick={() => setLightbox(i)}
                  className="group relative block w-full overflow-hidden rounded-xl sm:rounded-2xl shadow-md"
                >
                  <img
                    src={img.src}
                    alt={img.alt}
                    loading="lazy"
                    className="w-full h-32 sm:h-44 lg:h-48 object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-forest-950/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span className="absolute bottom-2 right-2 rounded-full glass-dark px-2.5 py-1 text-xs text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    {img.category}
                  </span>
                </button>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-forest-950/90 backdrop-blur-sm animate-fade-in p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full glass-dark text-white"
            aria-label="بستن"
          >
            <X size={24} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); prevImage(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full glass-dark text-white"
            aria-label="قبلی"
          >
            <ChevronRight size={28} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); nextImage(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full glass-dark text-white"
            aria-label="بعدی"
          >
            <ChevronLeft size={28} />
          </button>
          <div onClick={(e) => e.stopPropagation()} className="max-w-4xl w-full">
            <img
              src={filtered[lightbox].src}
              alt={filtered[lightbox].alt}
              className="w-full max-h-[80vh] object-contain rounded-2xl"
            />
            <p className="text-center text-white/80 mt-4 text-sm">{filtered[lightbox].alt}</p>
          </div>
        </div>
      )}
    </div>
  );
}
