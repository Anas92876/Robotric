import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { Lead } from '../../../hooks/reception/useReceptionLeads';
import { endOf, startOf, studentOf, useSessionRequests, type SessionRequest } from '../sessions/api';

export const EVENT_COLORS = ['blue', 'green', 'red', 'yellow', 'purple', 'gray'] as const;
export type EventColor = (typeof EVENT_COLORS)[number];
export const COMPANY_ROLES = ['CEO', 'CLO', 'CTO'] as const;
export type CompanyRole = (typeof COMPANY_ROLES)[number];

/** Working hours of the centre: the calendar shows them and events must fit inside. */
export const DAY_START = 10;
export const DAY_END = 19;

export type Participant =
  | { type: 'lead'; leadId: { _id: string; fullName: string; mobileNumber: string } }
  | { type: 'custom'; customName: string; customPhone?: string | null }
  | { type: 'company'; companyRole: CompanyRole };

export interface CalendarEvent {
  _id: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  color: EventColor;
  participants: Participant[];
  createdBy: { _id: string; name: string } | null;
}

export interface EventInput {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  color: EventColor;
  participants: ({ type: 'lead'; leadId: string } | { type: 'custom'; customName: string; customPhone: string } | { type: 'company'; companyRole: CompanyRole })[];
}

/** One block on the calendar: a meeting/event, or an approved private session of a student. */
export type CalendarItem =
  | { kind: 'event'; id: string; title: string; start: Date; end: Date; event: CalendarEvent }
  | { kind: 'session'; id: string; title: string; start: Date; end: Date; session: SessionRequest };

const ROOT = ['reception', 'schedule'] as const;

export const useEvents = () =>
  useQuery({
    queryKey: [...ROOT, 'events'],
    queryFn: async () => ((await api.get('/reception/events')).data.events ?? []) as CalendarEvent[],
    staleTime: 30_000,
  });

/** Events and booked private sessions together, ready for the calendar. */
export function useCalendarItems(sessionTitle: (name: string) => string) {
  const events = useEvents();
  const sessions = useSessionRequests();
  const items: CalendarItem[] = [
    ...(events.data ?? []).map((e): CalendarItem => ({ kind: 'event', id: e._id, title: e.title, start: new Date(e.startTime), end: new Date(e.endTime), event: e })),
    ...(sessions.data ?? [])
      .filter((s) => s.status === 'approved' || s.status === 'completed')
      .map((s): CalendarItem => ({ kind: 'session', id: `session-${s._id}`, title: sessionTitle(studentOf(s)?.name ?? ''), start: startOf(s), end: endOf(s), session: s })),
  ];
  return { items, isLoading: events.isLoading || sessions.isLoading, isError: events.isError, refetch: () => void events.refetch() };
}

export function useEventMutations() {
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ROOT });
    void qc.invalidateQueries({ queryKey: ['reception', 'overview'] });
  };
  return {
    save: useMutation({
      mutationFn: ({ id, data }: { id?: string; data: EventInput }) => (id ? api.put(`/reception/events/${id}`, data) : api.post('/reception/events', data)),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (id: string) => api.delete(`/reception/events/${id}`), onSuccess: refresh }),
  };
}

/** Leads matching a name or phone, for adding them to a meeting. */
export const useLeadSearch = (search: string) =>
  useQuery({
    queryKey: ['reception', 'leads', 'pick', search],
    queryFn: async () => ((await api.get(`/reception/leads?limit=6&search=${encodeURIComponent(search)}`)).data.leads ?? []) as Lead[],
    enabled: search.trim().length >= 2,
    staleTime: 30_000,
  });
