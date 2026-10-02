import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';

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
  video: { hasVideo: boolean; youtubeId: string };
}

const ROOT = ['trainer', 'sessions'] as const;

export const useTrainerSessionList = () =>
  useQuery({ queryKey: [...ROOT, 'list'], queryFn: async () => ((await api.get('/trainer/sessions?limit=500')).data.data ?? []) as TrainerSession[], staleTime: 30_000 });

export const useTrainerSession = (id: string) =>
  useQuery({ queryKey: [...ROOT, id], queryFn: async () => (await api.get(`/trainer/sessions/${id}`)).data.data as TrainerSession, enabled: !!id });

export const useTrainerGroupOptions = () =>
  useQuery({ queryKey: ['trainer', 'groups'], queryFn: async () => ((await api.get('/trainer/groups')).data.data ?? []) as { _id: string; name: string; courseId?: { title: string } | null; schedule: { day: string; startTime: string; endTime: string }[]; status: string }[], staleTime: 60_000 });

export function useSessionMutations() {
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ROOT });
    void qc.invalidateQueries({ queryKey: ['trainer', 'overview'] });
    void qc.invalidateQueries({ queryKey: ['trainer', 'group'] });
  };
  return {
    save: useMutation({ mutationFn: ({ id, d }: { id?: string; d: SessionInput }) => (id ? api.put(`/trainer/sessions/${id}`, d) : api.post('/trainer/sessions', d)).then((r) => r.data.data as TrainerSession), onSuccess: refresh }),
    cancel: useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => api.delete(`/trainer/sessions/${id}?${new URLSearchParams(reason ? { reason } : {})}`), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: string) => api.delete(`/trainer/sessions/${id}?permanent=true`), onSuccess: refresh }),
  };
}
