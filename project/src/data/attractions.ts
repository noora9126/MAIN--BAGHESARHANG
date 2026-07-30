export interface Attraction {
  id: string;
  name: string;
  category: string;
  distance: string;
  distanceKm: string;
  travelTime: string;
  description: string;
  longDescription: string;
  image: string;
  phone?: string;
  address: string;
  mapLink: string;
}

// Real nearby attractions of Babol, researched from Google and tourism sites
// Images are real photos from Iranian tourism websites
export const attractions: Attraction[] = [
  {
    id: '1',
    name: 'پارک جنگلی بزچفت',
    category: 'طبیعت',
    distance: 'مجاور هتل',
    distanceKm: 'کمتر از ۱ کیلومتر',
    travelTime: 'کوتاه پیاده',
    description: 'جنگلی سرسبز و آرام در مجاورت هتل',
    longDescription:
      'پارک جنگلی بزچفت (بابل‌کنار) یکی از معروف‌ترین جاذبه‌های طبیعی بابل است که در فاصله ۲۳ کیلومتری جنوب بابل و در روستای درونکلا شرقی قرار دارد. هتل باغ سرهنگ در ابتدای مسیر ورودی این پارک جنگلی واقع شده است. این جنگل با درختان انبوه، کلبه‌های جنگلی و فضای آرام، مکان مناسبی برای پیاده‌روی، پیک‌نیک و استراحت در دل طبیعت است.',
    image: '/images/attractions/bezchaft.webp',
    address: 'بابل، بابل‌کنار، روستای درونکلا شرقی',
    mapLink: 'https://www.google.com/maps/search/?api=1&query=پارک+جنگلی+بزچفت+بابل',
  },
  {
    id: '2',
    name: 'آبشار کلیره',
    category: 'طبیعت',
    distance: '۵ کیلومتر',
    distanceKm: '۵.۱ کیلومتر',
    travelTime: '۱۰ دقیقه با خودرو',
    description: 'آبشاری زیبا با ارتفاع ۷ متر در دل جنگل',
    longDescription:
      'آبشار کلیره یکی از زیباترین جاذبه‌های طبیعی بابل است که در دل جنگل‌های سرسبز بندپی شرقی قرار دارد. این آبشار با ارتفاعی در حدود ۷ متر، در میان طبیعتی آرام و خنک جریان دارد و همیشه پرآب است. مسیر دسترسی به آبشار از میان جنگل عبور می‌کند و خود تجربه‌ای لذت‌بخش است.',
    image: '/images/attractions/kelireh.jpg',
    address: 'بابل، بخش بندپی شرقی، جنگل‌های کلیره',
    mapLink: 'https://www.google.com/maps/search/?api=1&query=آبشار+کلیره+بابل',
  },
  {
    id: '3',
    name: 'روستای فیلبند',
    category: 'ییلاقی',
    distance: '۳۰ کیلومتر',
    distanceKm: '۳۰ کیلومتر',
    travelTime: '۴۵ دقیقه با خودرو',
    description: 'مرتفع‌ترین روستای بابل در دل ابرها',
    longDescription:
      'روستای فیلبند معروف‌ترین جاذبه گردشگری شهرستان بابل است. این روستای ییلاقی مرتفع‌ترین روستای منطقه است و در دل ابرها جای گرفته است. فیلبند به خاطر ارتفاع زیادش، منظره‌ای بی‌نظیر از دریای ابر را ارائه می‌دهد و در فصل‌های بهار و تابستان مقصدی محبوب برای گردشگران است.',
    image: '/images/attractions/filband.jpg',
    address: 'بابل، بخش بندپی شرقی، روستای فیلبند',
    mapLink: 'https://www.google.com/maps/search/?api=1&query=روستای+فیلبند+بابل',
  },
  {
    id: '4',
    name: 'پل آجری خرما کلا',
    category: 'تاریخی',
    distance: '۹ کیلومتر',
    distanceKm: '۹ کیلومتر',
    travelTime: '۱۵ دقیقه با خودرو',
    description: 'پل تاریخی آجری در روستای خرما کلا',
    longDescription:
      'پل آجری خرما کلا یکی از آثار تاریخی بابل است که در فاصله حدود ۹ کیلومتری هتل قرار دارد. این پل با معماری آجری سنتی، نمادی از تاریخ و فرهنگ منطقه مازندران است و در کنار رودخانه، منظره‌ای زیبا برای عکاسی و گشت‌وگذار ارائه می‌دهد.',
    image: '/images/attractions/pol-ajori.jpg',
    address: 'بابل، روستای خرما کلا',
    mapLink: 'https://www.google.com/maps/search/?api=1&query=پل+آجری+خرما+کلا+بابل',
  },
  {
    id: '5',
    name: 'سد لفور',
    category: 'طبیعت',
    distance: '۲۵ کیلومتر',
    distanceKm: '۲۵ کیلومتر',
    travelTime: '۴۰ دقیقه با خودرو',
    description: 'سدی زیبا در میان جنگل‌های مازندران',
    longDescription:
      'سد لفور یکی از مناطق طبیعی زیبای نزدیک بابل است که در میان جنگل‌های سرسبز مازندران قرار دارد. این سد با آبگیر بزرگ و محیط جنگلی اطراف، مکانی مناسب برای طبیعت‌گردی، استراحت و لذت بردن از مناظر طبیعی است.',
    image: '/images/attractions/lafour.jpg',
    address: 'مازندران، نزدیک بابل، سد لفور',
    mapLink: 'https://www.google.com/maps/search/?api=1&query=سد+لفور+مازندران',
  },
  {
    id: '6',
    name: 'بازار بزرگ بابل',
    category: 'خرید',
    distance: '۱۵ کیلومتر',
    distanceKm: '۱۵ کیلومتر',
    travelTime: '۲۰ دقیقه با خودرو',
    description: 'بازاری تاریخی و سنتی در مرکز بابل',
    longDescription:
      'بازار بزرگ بابل یکی از قدیمی‌ترین و پرهجول‌ترین بازارهای شمال ایران است که در مرکز شهر بابل قرار دارد. این بازار سنتی انواع کالاها، محصولات محلی، خوراکی‌های شمالی و صنایع دستی مازندران را عرضه می‌کند. برای تجربه فرهنگ و زندگی مردم بابل، بازدید از این بازار ضروری است.',
    image: '/images/attractions/babol-market.jpg',
    address: 'بابل، مرکز شهر، بازار بزرگ',
    mapLink: 'https://www.google.com/maps/search/?api=1&query=بازار+بزرگ+بابل',
  },
];
