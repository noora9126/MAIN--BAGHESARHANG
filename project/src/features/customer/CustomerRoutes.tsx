import { lazy, Suspense } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

const DashboardPage = lazy(() => import('@/features/customer/DashboardPage'));
const ProfilePage = lazy(() => import('@/features/customer/ProfilePage'));
const ChangePasswordPage = lazy(() => import('@/features/customer/ChangePasswordPage'));
const MyReservationsPage = lazy(() => import('@/features/customer/MyReservationsPage'));
const ReservationDetailPage = lazy(() => import('@/features/customer/ReservationDetailPage'));
const NotificationsPage = lazy(() => import('@/features/customer/NotificationsPage'));

function CustomerPageFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

export function CustomerRoutes() {
  return (
    <>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<Suspense fallback={<CustomerPageFallback />}><DashboardPage /></Suspense>} />
      <Route path="reservations" element={<Suspense fallback={<CustomerPageFallback />}><MyReservationsPage /></Suspense>} />
      <Route path="reservations/:id" element={<Suspense fallback={<CustomerPageFallback />}><ReservationDetailPage /></Suspense>} />
      <Route path="notifications" element={<Suspense fallback={<CustomerPageFallback />}><NotificationsPage /></Suspense>} />
      <Route path="profile" element={<Suspense fallback={<CustomerPageFallback />}><ProfilePage /></Suspense>} />
      <Route path="password" element={<Suspense fallback={<CustomerPageFallback />}><ChangePasswordPage /></Suspense>} />
    </>
  );
}
