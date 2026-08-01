import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const QUERY_KEYS = {
  admin: {
    me: ['admin', 'me'],
    dashboard: ['admin', 'dashboard'],
    reservations: (params?: string) => ['admin', 'reservations', params ?? 'list'],
    reservation: (id: number) => ['admin', 'reservations', id],
    guests: (params?: string) => ['admin', 'guests', params ?? 'list'],
    guest: (phone: string) => ['admin', 'guests', phone],
    revenue: (params?: string) => ['admin', 'analytics', 'revenue', params ?? 'all'],
    occupancy: (from: string, to: string) => ['admin', 'analytics', 'occupancy', from, to],
    roomsPerformance: (params?: string) => ['admin', 'analytics', 'rooms', params ?? 'all'],
    guestStats: ['admin', 'analytics', 'guests'],
    settings: ['admin', 'settings'],
    rooms: ['admin', 'rooms'],
  },
} as const;
