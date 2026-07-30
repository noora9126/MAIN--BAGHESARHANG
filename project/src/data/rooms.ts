export interface Room {
  id: string;
  name: string;
  slug: string;
  type: string;
  capacity: number;
  extraCapacity: number;
  price: number;
  pricePerNight: number;
  rating: number;
  area: string;
  description: string;
  longDescription: string;
  amenities: string[];
  images: string[];
  popular: boolean;
}

// Real room data from eghamat24.com and other booking sites
// Images are real photos from eghamat24.com and baghsarhang.ir
export const rooms: Room[] = [
  {
    id: '1',
    name: 'اتاق دوتخته',
    slug: 'double-room',
    type: 'اتاق دوتخته',
    capacity: 2,
    extraCapacity: 1,
    price: 2000000,
    pricePerNight: 2000000,
    rating: 8.5,
    area: '۲۰ متر مربع',
    description: 'اتاقی دنج و تمیز با دو تخت单人 برای اقامت راحت دو نفر',
    longDescription:
      'اتاق دوتخته هتل باغ سرهنگ، فضایی دنج و تمیز برای اقامت دو نفر است. این اتاق با تخت‌های راحت، سرویس بهداشتی ایرانی، سیستم تهویه مطبوع و صبحانه سنتی، انتخابی اقتصادی برای زوج‌ها یا مسافران تکی محسوب می‌شود. نظافت روزانه اتاق تضمین می‌شود.',
    amenities: ['دو تخت单人', 'سرویس بهداشتی ایرانی', 'تهویه مطبوع', 'صبحانه', 'بالکن', 'آب رایگان'],
    images: [
      '/images/hotel/eghamat-05.jpg',
      '/images/hotel/eghamat-04.jpg',
      '/images/hotel/eghamat-03.jpg',
    ],
    popular: true,
  },
  {
    id: '2',
    name: 'اتاق طرح سنتی',
    slug: 'traditional-room',
    type: 'اتاق طرح سنتی',
    capacity: 2,
    extraCapacity: 1,
    price: 2200000,
    pricePerNight: 2200000,
    rating: 8.8,
    area: '۲۵ متر مربع',
    description: 'اتاقی با طراحی سنتی مازندرانی و فضایی گرم و دلنشین',
    longDescription:
      'اتاق طرح سنتی هتل باغ سرهنگ، با طراحی الهام‌گرفته از معماری سنتی مازندران، فضایی گرم و دلنشین را برای شما فراهم می‌کند. این اتاق با تزئینات سنتی، تخت‌های راحت و امکانات کامل، تجربه‌ای متفاوت از اقامت در بابل ارائه می‌دهد. برای علاقه‌مندان به فرهنگ و تاریخ منطقه، این اتاق انتخابی ایده‌آل است.',
    amenities: ['طراحی سنتی', 'سرویس بهداشتی ایرانی', 'تهویه مطبوع', 'صبحانه', 'بالکن', 'تزئینات سنتی', 'آب رایگان'],
    images: [
      '/images/hotel/eghamat-12.jpg',
      '/images/hotel/eghamat-15.jpg',
      '/images/hotel/eghamat-17.jpg',
    ],
    popular: true,
  },
  {
    id: '3',
    name: 'سوئیت سه تخته ویژه',
    slug: 'triple-suite',
    type: 'سوئیت سه تخته ویژه',
    capacity: 3,
    extraCapacity: 2,
    price: 3500000,
    pricePerNight: 3500000,
    rating: 8.7,
    area: '۳۵ متر مربع',
    description: 'سوئیتی جادار برای خانواده‌ها با سه تخت و امکانات کامل',
    longDescription:
      'سوئیت سه تخته ویژه هتل باغ سرهنگ، فضایی جادار و راحت برای خانواده‌های سه نفره یا گروه‌های کوچک است. این سوئیت با سه تخت، سرویس بهداشتی مجهز، تهویه مطبوع و صبحانه، اقامتی آسوده را برای شما و همراهانتان تضمین می‌کند. امکان افزودن دو نفر اضافه با هزینه مجزا وجود دارد.',
    amenities: ['سه تخت', 'سرویس بهداشتی ایرانی', 'تهویه مطبوع', 'صبحانه', 'بالکن', 'فضای جادار', 'آب رایگان'],
    images: [
      '/images/hotel/eghamat-19.jpg',
      '/images/hotel/eghamat-09.jpg',
      '/images/hotel/eghamat-10.jpg',
    ],
    popular: true,
  },
  {
    id: '4',
    name: 'سوئیت یک‌خوابه پنج نفره ویژه',
    slug: 'family-suite',
    type: 'سوئیت یک‌خوابه پنج نفره ویژه',
    capacity: 5,
    extraCapacity: 1,
    price: 5000000,
    pricePerNight: 5000000,
    rating: 8.9,
    area: '۵۰ متر مربع',
    description: 'سوئیتی بزرگ برای خانواده‌های پنج نفره با فضایی راحت و کامل',
    longDescription:
      'سوئیت یک‌خوابه پنج نفره ویژه هتل باغ سرهنگ، بزرگ‌ترین واحد هتل است که برای خانواده‌های بزرگ یا گروه‌های دوستانه طراحی شده است. این سوئیت با فضای وسیع، امکانات کامل و ظرفیت پنج نفر (با امکان افزودن یک نفر اضافه)، انتخابی عالی برای اقامت خانوادگی در دل طبیعت بابل است.',
    amenities: ['ظرفیت ۵ نفر', 'سرویس بهداشتی ایرانی', 'تهویه مطبوع', 'صبحانه', 'بالکن', 'فضای بزرگ', 'آب رایگان'],
    images: [
      '/images/hotel/eghamat-18.jpg',
      '/images/hotel/eghamat-20.jpg',
      '/images/hotel/eghamat-16.jpg',
    ],
    popular: false,
  },
];

export function getRoomBySlug(slug: string): Room | undefined {
  return rooms.find((r) => r.slug === slug);
}

export function formatPrice(price: number): string {
  return price.toLocaleString('fa-IR');
}
