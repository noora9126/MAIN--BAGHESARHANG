import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Home, Calendar, Clock, User, Star, CheckCircle2 } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import ArticleCard from '../components/ArticleCard';
import { getArticleBySlug, articles } from '../data/articles';

export default function ArticleDetailPage() {
  const { slug } = useParams();
  const article = getArticleBySlug(slug || '');

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [savedRating, setSavedRating] = useState<number | null>(null);

  useEffect(() => {
    if (article) {
      const stored = localStorage.getItem(`article-rating-${article.id}`);
      if (stored) {
        setSavedRating(parseInt(stored));
        setRating(parseInt(stored));
      }
    }
  }, [article]);

  if (!article) {
    return (
      <div className="pt-32 pb-20 text-center">
        <p className="text-forest-600 mb-4">مقاله مورد نظر یافت نشد.</p>
        <Link to="/magazine" className="btn-primary">بازگشت به مجله</Link>
      </div>
    );
  }

  const relatedArticles = articles.filter((a) => a.id !== article.id).slice(0, 3);

  const handleSubmit = () => {
    if (rating > 0) {
      localStorage.setItem(`article-rating-${article.id}`, rating.toString());
      setSubmitted(true);
      setSavedRating(rating);
    }
  };

  return (
    <div className="pt-20">
      {/* Breadcrumb */}
      <div className="container-x px-4 sm:px-6 lg:px-8 py-4">
        <nav className="flex items-center gap-2 text-sm text-forest-500 flex-wrap">
          <Link to="/" className="flex items-center gap-1 hover:text-forest-700 transition-colors">
            <Home size={14} />
            خانه
          </Link>
          <span>/</span>
          <Link to="/magazine" className="hover:text-forest-700 transition-colors">مجله</Link>
          <span>/</span>
          <span className="text-forest-700 font-medium line-clamp-1">{article.title}</span>
        </nav>
      </div>

      {/* Hero Image */}
      <section className="container-x px-4 sm:px-6 lg:px-8 mb-8">
        <div className="relative overflow-hidden rounded-2xl shadow-lg">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-56 sm:h-72 lg:h-96 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-forest-950/80 via-forest-900/30 to-transparent" />
          <div className="absolute bottom-0 right-0 left-0 p-6 sm:p-8">
            <span className="inline-block rounded-full bg-gold-500 px-3 py-1 text-xs font-bold text-forest-900 mb-3">
              {article.category}
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white text-shadow-lg mb-3 leading-tight">
              {article.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-white/80">
              <span className="flex items-center gap-1.5">
                <User size={16} />
                {article.author}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={16} />
                {article.date}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={16} />
                {article.readTime}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <section className="container-x px-4 sm:px-6 lg:px-8 mb-12">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <div className="space-y-6">
              <p className="text-lg text-forest-700 font-medium leading-relaxed pb-4 border-b border-forest-100">
                {article.excerpt}
              </p>
              {article.content.map((paragraph, i) => (
                <p key={i} className="text-forest-600 leading-relaxed text-base sm:text-lg">
                  {paragraph}
                </p>
              ))}
            </div>
          </ScrollReveal>

          {/* Star Rating Section */}
          <ScrollReveal delay={200}>
            <div className="mt-12 rounded-2xl bg-gradient-to-b from-forest-50 to-white p-6 sm:p-8 text-center border border-forest-100">
              <h3 className="text-lg sm:text-xl font-bold text-forest-800 mb-2">
                به این مقاله چند امتیاز می‌دهید؟
              </h3>
              <p className="text-sm text-forest-500 mb-6">
                {savedRating && !submitted
                  ? `شما قبلاً ${savedRating.toLocaleString('fa-IR')} امتیاز ثبت کرده‌اید`
                  : 'امتیاز خود را روی ستاره‌ها ثبت کنید'}
              </p>

              <div className="flex items-center justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(0)}
                    className="transition-transform hover:scale-125"
                    aria-label={`${star} ستاره`}
                  >
                    <Star
                      size={36}
                      className={`transition-colors ${
                        (hover || rating) >= star
                          ? 'text-gold-400 fill-gold-400'
                          : 'text-gray-300 fill-gray-200'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <button
                onClick={handleSubmit}
                disabled={rating === 0 || (submitted && savedRating === rating)}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ثبت امتیاز
              </button>

              {submitted && (
                <div className="mt-4 flex items-center justify-center gap-2 text-forest-600 animate-fade-in">
                  <CheckCircle2 size={20} className="text-forest-500" />
                  <p className="font-medium">
                    امتیاز شما ({rating.toLocaleString('fa-IR')} ستاره) ثبت شد. متشکریم!
                  </p>
                </div>
              )}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Related Articles */}
      <section className="section-padding bg-forest-50">
        <div className="container-x">
          <ScrollReveal className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-forest-800">مقالات مرتبط</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedArticles.map((a, i) => (
              <ScrollReveal key={a.id} delay={i * 100}>
                <ArticleCard article={a} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
