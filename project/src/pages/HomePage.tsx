import HeroSection from '../components/home/HeroSection';
import StatsSection from '../components/home/StatsSection';
import WhyChooseUs from '../components/home/WhyChooseUs';
import PopularRooms from '../components/home/PopularRooms';
import NearbyAttractions from '../components/home/NearbyAttractions';
import GuestReviews from '../components/home/GuestReviews';
import GalleryPreview from '../components/home/GalleryPreview';
import MagazinePreview from '../components/home/MagazinePreview';
import FaqSection from '../components/home/FaqSection';
import FinalCta from '../components/home/FinalCta';
import SEO, { buildHotelSchema } from '../components/SEO';

export default function HomePage() {
  return (
    <>
      <SEO
        title="اقامتی تمیز و آرام در دل جنگل بابل"
        description="هتل باغ سرهنگ بابل - اقامتگاهی اقتصادی و دلپذیر در دل جنگل‌های سرسبز مازندران. نزدیک پارک جنگلی بزچفت، تمیزی عالی، رفتار خوب پرسنل. رزرو آنلاین اتاق‌ها."
        canonical="/"
        ogImage="/images/hotel/eghamat-14.jpg"
        schema={buildHotelSchema()}
      />
      <HeroSection />
      <StatsSection />
      <WhyChooseUs />
      <PopularRooms />
      <NearbyAttractions />
      <GuestReviews />
      <GalleryPreview />
      <MagazinePreview />
      <FaqSection />
      <FinalCta />
    </>
  );
}
