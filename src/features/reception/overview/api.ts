import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';

/** Everything the reception overview shows, one query per endpoint. */

export interface OverviewStats {
  totalStudents: number;
  totalTrainers: number;
  totalEnrollments: number;
  recentEnrollments: number;
  activeGroups: number;
}

export interface RecentEnrollment {
  _id: string;
  student: { _id: string; name: string; email: string } | null;
  course: { _id: string; title: string; price?: number } | null;
  enrolledAt: string;
  status: string;
  payment?: { totalAmount: number; paidAmount: number; remainingAmount: number };
}

export interface LeadStats {
  total: number;
  interest: number;
  waiting: number;
  student: number;
  blacklist: number;
  needsFollowUp: number;
}

export interface CalendarEvent {
  _id: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  color?: string;
}

const keys = {
  stats: ['reception', 'overview', 'stats'] as const,
  recent: ['reception', 'overview', 'recent-enrollments'] as const,
  leads: ['reception', 'overview', 'lead-stats'] as const,
  events: ['reception', 'events'] as const,
  pendingRequests: ['reception', 'overview', 'pending-session-requests'] as const,
  pendingTransport: ['reception', 'overview', 'pending-transport'] as const,
};

export const useOverviewStats = () =>
  useQuery({
    queryKey: keys.stats,
    queryFn: async () => (await api.get('/reception/dashboard')).data.data as OverviewStats,
    staleTime: 60_000,
  });

export const useRecentEnrollments = (limit = 6) =>
  useQuery({
    queryKey: [...keys.recent, limit],
    queryFn: async () => ((await api.get(`/reception/recent-enrollments?limit=${limit}`)).data.data ?? []) as RecentEnrollment[],
    staleTime: 60_000,
  });

export const useLeadStats = () =>
  useQuery({
    queryKey: keys.leads,
    queryFn: async () => (await api.get('/reception/leads/stats')).data as LeadStats,
    staleTime: 60_000,
  });

export const useEvents = () =>
  useQuery({
    queryKey: keys.events,
    queryFn: async () => ((await api.get('/reception/events')).data.events ?? []) as CalendarEvent[],
    staleTime: 60_000,
  });

export const usePendingSessionRequests = () =>
  useQuery({
    queryKey: keys.pendingRequests,
    queryFn: async () => ((await api.get('/reception/session-requests?status=pending')).data.data?.requests ?? []).length as number,
    staleTime: 60_000,
  });

export const usePendingTransport = () =>
  useQuery({
    queryKey: keys.pendingTransport,
    queryFn: async () => ((await api.get('/reception/transport/pending-assignment-count')).data.data?.pendingCount ?? 0) as number,
    staleTime: 60_000,
  });
