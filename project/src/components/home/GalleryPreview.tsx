import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ScrollReveal from '../ScrollReveal';
import { galleryImages } from '../../data/gallery';

export default function GalleryPreview() {
  const preview = galleryImages.slice(0, 6);

  return (
    <section className="section-padding">
      <div className="container-x">
        <ScrollReveal className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <span className="inline-block rounded-full bg-forest-100 px-4 py-1.5 text-sm font-medium text-forest-600 mb-3">
              گالری تصاویر
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-forest-800">
              نگاهی به هتل و اطراف آن
            </h2>
          </div>
          <Link
            to="/gallery"
            className="flex items-center gap-2 text-forest-600 font-medium hover:text-forest-700 transition-colors"
          >
            مشاهده گالری کامل
            <ArrowLeft size={18} />
          </Link>
        </ScrollReveal>

        <ScrollReveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {preview.map((img, i) => (
              <div
                key={i}
                className={`group relative overflow-hidden rounded-xl sm:rounded-2xl shadow-md ${
                  i === 0 ? 'col-span-2 row-span-2' : ''
                }`}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  loading="lazy"
                  className={`w-full object-cover transition-transform duration-700 group-hover:scale-110 ${
                    i === 0 ? 'h-full min-h-[200px] sm:min-h-[280px]' : 'h-32 sm:h-40 lg:h-44'
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-forest-950/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <span className="absolute bottom-2 right-2 rounded-full glass-dark px-2.5 py-1 text-xs text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {img.category}
                </span>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
