import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import Header from './components/Header';
import Footer from './components/Footer';
import FloatingCall from './components/FloatingCall';
import HomePage from './pages/HomePage';
import RoomsPage from './pages/RoomsPage';
import RoomDetailPage from './pages/RoomDetailPage';
import GalleryPage from './pages/GalleryPage';
import FacilitiesPage from './pages/FacilitiesPage';
import MagazinePage from './pages/MagazinePage';
import ArticleDetailPage from './pages/ArticleDetailPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import RulesPage from './pages/RulesPage';
import ReservationPage from './pages/ReservationPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import PaymentResultPage from './pages/PaymentResultPage';
import { BookingProvider } from './context/BookingContext';

import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminReservations from './pages/admin/AdminReservations';
import AdminGuests from './pages/admin/AdminGuests';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminRooms from './pages/admin/AdminRooms';
import AdminSettings from './pages/admin/AdminSettings';

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <BookingProvider>
        <Routes>
          {/* صفحات عمومی */}
          <Route
            path="*"
            element={
              <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/rooms" element={<RoomsPage />} />
                    <Route path="/rooms/:slug" element={<RoomDetailPage />} />
                    <Route path="/gallery" element={<GalleryPage />} />
                    <Route path="/facilities" element={<FacilitiesPage />} />
                    <Route path="/magazine" element={<MagazinePage />} />
                    <Route path="/magazine/:slug" element={<ArticleDetailPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/rules" element={<RulesPage />} />
                    <Route path="/reserve" element={<ReservationPage />} />
                    <Route path="/payment/result" element={<PaymentResultPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                  </Routes>
                </main>
                <Footer />
                <FloatingCall />
              </div>
            }
          />

          {/* پنل مدیریت */}
          <Route path="/admin" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="reservations" element={<AdminReservations />} />
            <Route path="guests" element={<AdminGuests />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="rooms" element={<AdminRooms />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Routes>
      </BookingProvider>
    </BrowserRouter>
  );
}
