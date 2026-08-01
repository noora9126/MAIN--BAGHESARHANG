import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
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

import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { RequireAdmin } from '@/features/auth/RequireAdmin';
import { AdminRoutes } from '@/features/admin/AdminRoutes';
import AdminLoginPage from '@/features/auth/LoginPage';
import AdminLayout from '@/layouts/AdminLayout';
import { Toaster } from '@/components/ui/sonner';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <BookingProvider>
          <AuthProvider>
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
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              }
            >
              {AdminRoutes()}
            </Route>
            </Routes>
            <Toaster />
          </AuthProvider>
        </BookingProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
