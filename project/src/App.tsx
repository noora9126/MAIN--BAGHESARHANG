import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
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
import VerifyOtpPage from './pages/VerifyOtpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import PaymentResultPage from './pages/PaymentResultPage';
import CustomerLayout from '@/layouts/CustomerLayout';
import { BookingProvider } from './context/BookingContext';

import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { RequireAdmin } from '@/features/auth/RequireAdmin';
import { AdminRoutes } from '@/features/admin/AdminRoutes';
import AdminLayout from '@/layouts/AdminLayout';
import { CustomerAuthProvider } from '@/features/customerAuth/CustomerAuthProvider';
import { RequireCustomer } from '@/features/customerAuth/RequireCustomer';
import { CustomerRoutes } from '@/features/customer/CustomerRoutes';
import { Toaster } from '@/components/ui/sonner';

function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <FloatingCall />
    </div>
  );
}

export default function App() {
  return (
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <BookingProvider>
          <AuthProvider>
            <CustomerAuthProvider>
              <Routes>
                <Route element={<PublicLayout />}>
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
                  <Route path="/verify-otp" element={<VerifyOtpPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                </Route>

                <Route
                  path="/account/*"
                  element={
                    <RequireCustomer>
                      <CustomerLayout />
                    </RequireCustomer>
                  }
                >
                  {CustomerRoutes()}
                </Route>

                <Route path="/admin/login" element={<Navigate to="/login" replace />} />
                <Route
                  path="/admin/*"
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
            </CustomerAuthProvider>
          </AuthProvider>
        </BookingProvider>
      </BrowserRouter>
    </QueryClientProvider>
    </HelmetProvider>
  );
}
