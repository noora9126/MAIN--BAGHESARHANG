import { lazy, Suspense } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

const DashboardPage = lazy(() => import('@/features/admin/DashboardPage'));
const ReservationsPage = lazy(() => import('@/features/admin/ReservationsPage'));
const RefundsPage = lazy(() => import('@/features/admin/RefundsPage'));
const RoomsPage = lazy(() => import('@/features/admin/RoomsPage'));
const CustomersPage = lazy(() => import('@/features/admin/CustomersPage'));
const FinancePage = lazy(() => import('@/features/admin/FinancePage'));
const ReviewsPage = lazy(() => import('@/features/admin/ReviewsPage'));
const DiscountsPage = lazy(() => import('@/features/admin/DiscountsPage'));
const AdminSettingsPage = lazy(() => import('@/features/admin/AdminSettingsPage'));
const UsersPage = lazy(() => import('@/features/admin/UsersPage'));

function AdminPageFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}

export function AdminRoutes() {
  return (
    <>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<Suspense fallback={<AdminPageFallback />}><DashboardPage /></Suspense>} />
      <Route path="reservations" element={<Suspense fallback={<AdminPageFallback />}><ReservationsPage /></Suspense>} />
      <Route path="refunds" element={<Suspense fallback={<AdminPageFallback />}><RefundsPage /></Suspense>} />
      <Route path="rooms" element={<Suspense fallback={<AdminPageFallback />}><RoomsPage /></Suspense>} />
      <Route path="customers" element={<Suspense fallback={<AdminPageFallback />}><CustomersPage /></Suspense>} />
      <Route path="finance" element={<Suspense fallback={<AdminPageFallback />}><FinancePage /></Suspense>} />
      <Route path="reviews" element={<Suspense fallback={<AdminPageFallback />}><ReviewsPage /></Suspense>} />
      <Route path="discounts" element={<Suspense fallback={<AdminPageFallback />}><DiscountsPage /></Suspense>} />
      <Route path="users" element={<Suspense fallback={<AdminPageFallback />}><UsersPage /></Suspense>} />
      <Route path="settings" element={<Suspense fallback={<AdminPageFallback />}><AdminSettingsPage /></Suspense>} />
    </>
  );
}
