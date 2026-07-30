import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ScrollReveal from '../ScrollReveal';
import ArticleCard from '../ArticleCard';
import { articles } from '../../data/articles';

export default function MagazinePreview() {
  const preview = articles.slice(0, 3);

  return (
    <section className="section-padding bg-gradient-to-b from-transparent to-forest-50">
      <div className="container-x">
        <ScrollReveal className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <span className="inline-block rounded-full bg-forest-100 px-4 py-1.5 text-sm font-medium text-forest-600 mb-3">
              مجله سفر
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-forest-800">
              مقالات و راهنمای سفر
            </h2>
          </div>
          <Link
            to="/magazine"
            className="flex items-center gap-2 text-forest-600 font-medium hover:text-forest-700 transition-colors"
          >
            مشاهده همه مقالات
            <ArrowLeft size={18} />
          </Link>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {preview.map((article, i) => (
            <ScrollReveal key={article.id} delay={i * 150}>
              <ArticleCard article={article} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
