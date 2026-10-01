import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { Lead, SetWaitingRequest } from '../../../hooks/reception/useReceptionLeads';

export type { Lead };

export interface LeadFilters {
  search: string;
  status: '' | 'interest' | 'waiting' | 'student' | 'blacklist';
  interest: string;
  sort: 'leadDate:desc' | 'leadDate:asc' | 'createdAt:desc' | 'createdAt:asc' | 'fullName:asc' | 'fullName:desc';
  page: number;
}

export interface LeadStats {
  total: number;
  interest: number;
  waiting: number;
  student: number;
  blacklist: number;
  needsFollowUp: number;
}

export const PAGE_SIZE = 20;
const ROOT = ['reception', 'leads'] as const;

export const useLeads = (f: LeadFilters) =>
  useQuery({
    queryKey: [...ROOT, 'list', f],
    queryFn: async () => {
      const [sortBy, sortOrder] = f.sort.split(':');
      const p = new URLSearchParams({ page: String(f.page), limit: String(PAGE_SIZE), sortBy, sortOrder });
      if (f.search) p.set('search', f.search);
      if (f.status) p.set('status', f.status);
      if (f.interest) p.set('interestField', f.interest);
      const res = await api.get(`/reception/leads?${p}`);
      return { rows: (res.data.leads ?? []) as Lead[], total: (res.data.pagination?.total ?? 0) as number, pages: (res.data.pagination?.pages ?? 1) as number };
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

export const useLeadStats = () =>
  useQuery({ queryKey: [...ROOT, 'stats'], queryFn: async () => (await api.get('/reception/leads/stats')).data as LeadStats, staleTime: 30_000 });

/** Active interests (set up by the CLO) for the interest filter. */
export const useInterests = () =>
  useQuery({
    queryKey: ['reception', 'interests'],
    queryFn: async () => ((await api.get('/reception/interests?status=active')).data.interests ?? []) as { _id: string; name: string }[],
    staleTime: 5 * 60_000,
  });

/** Every change refreshes the list, the stats and the reception overview. */
export function useLeadMutations() {
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ROOT });
    void qc.invalidateQueries({ queryKey: ['reception', 'overview'] });
    void qc.invalidateQueries({ queryKey: ['reception', 'users'] });
  };
  return {
    create: useMutation({ mutationFn: (body: Record<string, unknown>) => api.post('/reception/leads', body), onSuccess: refresh }),
    update: useMutation({ mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api.put(`/reception/leads/${id}`, body), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: string) => api.delete(`/reception/leads/${id}`), onSuccess: refresh }),
    changeStatus: useMutation({
      mutationFn: ({ id, body }: { id: string; body: { newStatus: string; reason: string; isBannedFromPlatform?: boolean } }) => api.post(`/reception/leads/${id}/change-status`, body),
      onSuccess: refresh,
    }),
    convert: useMutation({ mutationFn: ({ id, email, password }: { id: string; email: string; password: string }) => api.post(`/reception/leads/${id}/convert`, { email, password }), onSuccess: refresh }),
    setWaiting: useMutation({ mutationFn: ({ id, body }: { id: string; body: SetWaitingRequest }) => api.post(`/reception/leads/${id}/set-waiting`, body), onSuccess: refresh }),
    addContact: useMutation({ mutationFn: ({ id, body }: { id: string; body: unknown }) => api.post(`/reception/leads/${id}/contact-history`, body), onSuccess: refresh }),
  };
}
