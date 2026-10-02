import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { ClientMediaItem, ClientUrgency, InternalProject, InternalTask, TaskStatus } from '../../hooks/cto/useCTOProjects';
import type { BadgeTone } from '../../ui';

export type { ClientMediaItem, ClientUrgency, InternalProject as ClientProject, InternalTask as ClientRequest, TaskStatus };

export const REQUEST_TONE: Record<TaskStatus, BadgeTone> = { pending_review: 'warning', todo: 'neutral', in_progress: 'info', done: 'success', declined: 'danger' };
export const projectIdOf = (t: InternalTask) => (typeof t.projectId === 'string' ? t.projectId : t.projectId?._id ?? '');

export const useClientProjects = () =>
  useQuery({ queryKey: ['client', 'projects'], queryFn: async () => ((await api.get('/client/projects')).data.data ?? []) as InternalProject[] });

export const useClientRequests = () =>
  useQuery({ queryKey: ['client', 'requests'], queryFn: async () => ((await api.get('/client/tasks')).data.data ?? []) as InternalTask[] });

export const useClientRequest = (id: string) =>
  useQuery({ queryKey: ['client', 'requests', id], queryFn: async () => (await api.get(`/client/tasks/${id}`)).data.data as InternalTask, enabled: !!id });

export const useClientMedia = (id: string) =>
  useQuery({ queryKey: ['client', 'requests', id, 'media'], queryFn: async () => ((await api.get(`/client/tasks/${id}/media`)).data.data ?? []) as ClientMediaItem[], enabled: !!id });

/** Uploads one attachment of a request, reporting progress. */
export async function uploadRequestMedia(taskId: string, file: File, durationSeconds: number | undefined, onProgress: (percent: number) => void) {
  const fd = new FormData();
  fd.append('file', file);
  if (durationSeconds !== undefined) fd.append('durationSeconds', String(Math.round(durationSeconds)));
  return (await api.post(`/client/tasks/${taskId}/media`, fd, {
    onUploadProgress: (e) => { const total = e.total ?? e.loaded; onProgress(total ? Math.round((e.loaded * 100) / total) : 0); },
  })).data.data as ClientMediaItem;
}
