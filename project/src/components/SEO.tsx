import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  schema?: object;
}

const SITE_NAME = 'هتل باغ سرهنگ بابل';
const DEFAULT_IMAGE = '/og-image.jpg';
const SITE_URL = 'https://baghsarhang.ir';

export default function SEO({
  title,
  description,
  canonical,
  ogImage = DEFAULT_IMAGE,
  ogType = 'website',
  schema,
}: SEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const fullUrl = canonical ? `${SITE_URL}${canonical}` : SITE_URL;
  const imageUrl = ogImage.startsWith('http') ? ogImage : `${SITE_URL}${ogImage}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="fa_IR" />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:image" content={imageUrl} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={imageUrl} />

      {/* Schema.org JSON-LD */}
      {schema && (
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      )}
    </Helmet>
  );
}

export function buildHotelSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: 'هتل باغ سرهنگ بابل',
    description:
      'هتلی اقتصادی در دل فضای جنگلی بابل با تمرکز بر تمیزی، رفتار خوب و موقعیت مکانی عالی',
    url: SITE_URL,
    telephone: '+989112106640',
    email: 'info@baghsarhang.ir',
    address: {
      '@type': 'PostalAddress',
      streetAddress:
        'روستای درونکلا شرقی، بابل کنار، ابتدای مسیر ورودی پارک جنگلی بزچفت',
      addressLocality: 'بابل',
      addressRegion: 'مازندران',
      addressCountry: 'IR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '36.15',
      longitude: '52.7',
    },
    starRating: { '@type': 'Rating', ratingValue: '1' },
    checkinTime: '14:00',
    checkoutTime: '12:00',
    numberOfRooms: '9',
    amenities: [
      'پارکینگ',
      'رستوران',
      'لابی',
      'پذیرش ۲۴ ساعته',
      'چایخانه سنتی',
      'لاندری',
      'صبحانه',
    ],
    priceRange: '$$',
    image: `${SITE_URL}/og-image.jpg`,
    sameAs: ['https://www.instagram.com/baghesarhang'],
  };
}

export function buildRoomSchema(room: {
  name: string;
  description: string;
  price: number;
  capacity: number;
  area: string;
  images: string[];
  slug: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${room.name} - هتل باغ سرهنگ بابل`,
    description: room.description,
    image: room.images.map((img) =>
      img.startsWith('http') ? img : `${SITE_URL}${img}`
    ),
    brand: {
      '@type': 'Hotel',
      name: 'هتل باغ سرهنگ بابل',
    },
    offers: {
      '@type': 'Offer',
      price: room.price,
      priceCurrency: 'IRR',
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/rooms/${room.slug}`,
    },
  };
}

export function buildArticleSchema(article: {
  title: string;
  excerpt: string;
  date: string;
  slug: string;
  image: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.date,
    author: {
      '@type': 'Organization',
      name: 'هتل باغ سرهنگ بابل',
    },
    publisher: {
      '@type': 'Organization',
      name: 'هتل باغ سرهنگ بابل',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
    image: article.image.startsWith('http')
      ? article.image
      : `${SITE_URL}${article.image}`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/magazine/${article.slug}`,
    },
  };
}

export function buildFAQSchema(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };
}
