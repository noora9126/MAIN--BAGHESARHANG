import { Link } from 'react-router-dom';
import { Clock, ArrowLeft } from 'lucide-react';
import type { Article } from '../data/articles';

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  return (
    <Link
      to={`/magazine/${article.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-lg shadow-forest-900/5 transition-all duration-500 hover:shadow-2xl hover:shadow-forest-900/10 hover:-translate-y-1"
    >
      {/* Image */}
      <div className="relative h-48 sm:h-52 overflow-hidden shrink-0">
        <img
          src={article.image}
          alt={article.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <span className="absolute top-3 right-3 rounded-full glass-dark px-3 py-1 text-xs font-medium text-white">
          {article.category}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base sm:text-lg font-bold text-forest-800 mb-2 leading-snug group-hover:text-forest-600 transition-colors line-clamp-2">
          {article.title}
        </h3>
        <p className="text-sm text-forest-500 leading-relaxed mb-4 line-clamp-3 flex-1">
          {article.excerpt}
        </p>

        {/* Meta */}
        <div className="flex items-center justify-between pt-4 border-t border-forest-50">
          <span className="flex items-center gap-1 text-xs text-forest-400">
            <Clock size={14} />
            {article.readTime}
          </span>
          <span className="flex items-center gap-1 text-sm font-medium text-forest-600 group-hover:text-forest-700 transition-colors">
            ادامه مطلب
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}
