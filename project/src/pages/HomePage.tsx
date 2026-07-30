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

export default function HomePage() {
  return (
    <>
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
