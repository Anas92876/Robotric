import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { api } from '../../../lib/api';

/**
 * The class pages serve the trainer (their own groups) and the CLO (every group).
 * Which one comes from the address, so the same pages work under /trainer and /clo.
 */
export function useSessionRole() {
  const clo = useLocation().pathname.startsWith('/clo');
  return clo
    ? ({ role: 'clo', base: '/clo', api: '/clo/sessions', groups: '/clo/groups' } as const)
    : ({ role: 'trainer', base: '/trainer', api: '/trainer/sessions', groups: '/trainer/groups' } as const);
}

export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export interface TrainerSession {
  _id: string;
  title: string;
  description?: string | null;
  sessionNumber: number;
  groupId: { _id: string; name: string; students?: string[] } | null;
  courseId?: { _id: string; title: string } | null;
  overrideSchedule?: boolean;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  duration?: number;
  status: SessionStatus;
  cancellationReason?: string | null;
  lessonPlan?: { objectives?: string[]; materialsNeeded?: string[]; notes?: string; outline?: { title: string; startTime: string; endTime: string; description?: string }[] };
  video?: { hasVideo?: boolean; youtubeId?: string };
}
export interface SessionInput {
  title: string;
  description?: string;
  groupId?: string;
  overrideSchedule: boolean;
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  lessonPlan: { objectives: string[]; materialsNeeded: string[]; notes: string };
  video?: { hasVideo: boolean; youtubeId: string };
}

export const useTrainerSessionList = () => {
  const r = useSessionRole();
  return useQuery({ queryKey: [r.role, 'sessions', 'list'], queryFn: async () => ((await api.get(`${r.api}?limit=500`)).data.data ?? []) as TrainerSession[], staleTime: 30_000 });
};

export const useTrainerSession = (id: string) => {
  const r = useSessionRole();
  return useQuery({ queryKey: [r.role, 'sessions', id], queryFn: async () => (await api.get(`${r.api}/${id}`)).data.data as TrainerSession, enabled: !!id });
};

/** The groups a class can belong to (the trainer's own, or every group for the CLO). */
export const useTrainerGroupOptions = () => {
  const r = useSessionRole();
  return useQuery({ queryKey: [r.role, 'groups', ...(r.role === 'clo' ? ['list', ''] : [])], queryFn: async () => ((await api.get(r.groups)).data.data ?? []) as { _id: string; name: string; courseId?: { title: string } | null; schedule: { day: string; startTime: string; endTime: string }[]; status: string }[], staleTime: 60_000 });
};

export function useSessionMutations() {
  const qc = useQueryClient();
  const r = useSessionRole();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: [r.role, 'sessions'] });
    void qc.invalidateQueries({ queryKey: [r.role, 'overview'] });
    void qc.invalidateQueries({ queryKey: [r.role, 'group'] });
    void qc.invalidateQueries({ queryKey: [r.role, 'groups'] });
  };
  return {
    save: useMutation({ mutationFn: ({ id, d }: { id?: string; d: SessionInput }) => (id ? api.put(`${r.api}/${id}`, d) : api.post(r.api, d)).then((r) => r.data.data as TrainerSession), onSuccess: refresh }),
    cancel: useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => api.delete(`${r.api}/${id}?${new URLSearchParams(reason ? { reason } : {})}`), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: string) => api.delete(`${r.api}/${id}?permanent=true`), onSuccess: refresh }),
  };
}
