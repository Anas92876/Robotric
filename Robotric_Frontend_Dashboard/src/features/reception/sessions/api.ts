import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveSessionRequest,
  createSessionReport,
  declineSessionRequest,
  getAllSessionReports,
  getAllSessionRequests,
  type SessionReport,
  type SessionRequest,
} from '../../../services/subscription.service';

export type { SessionReport, SessionRequest };
const ROOT = ['reception', 'sessions'] as const;

/** Every session request (the list is small, so filtering and counting happen here). */
export const useSessionRequests = () => useQuery({ queryKey: [...ROOT, 'requests'], queryFn: () => getAllSessionRequests(), staleTime: 30_000 });
export const useSessionReports = () => useQuery({ queryKey: [...ROOT, 'reports'], queryFn: () => getAllSessionReports(), staleTime: 30_000 });

export function useSessionMutations() {
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ROOT });
    void qc.invalidateQueries({ queryKey: ['reception', 'overview'] });
  };
  return {
    approve: useMutation({ mutationFn: (id: string) => approveSessionRequest(id), onSuccess: refresh }),
    decline: useMutation({ mutationFn: ({ id, reason }: { id: string; reason?: string }) => declineSessionRequest(id, reason), onSuccess: refresh }),
    report: useMutation({ mutationFn: ({ id, data }: { id: string; data: Parameters<typeof createSessionReport>[1] }) => createSessionReport(id, data), onSuccess: refresh }),
  };
}

/** The student of a request (populated object) — or null when the account is gone. */
export const studentOf = (r: SessionRequest) => (typeof r.userId === 'object' && r.userId ? r.userId : null);

/** "16:00" + 2h on the request's date → end Date. */
export const endOf = (r: SessionRequest) => new Date(new Date(`${r.date.split('T')[0]}T${r.startTime}`).getTime() + r.durationHours * 3_600_000);
export const startOf = (r: SessionRequest) => new Date(`${r.date.split('T')[0]}T${r.startTime}`);
