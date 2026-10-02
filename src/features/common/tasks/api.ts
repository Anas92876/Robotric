import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { InternalProject, InternalTask } from '../../../hooks/cto/useCTOProjects';

export type { InternalTask as Task };
export type TaskStatus = InternalTask['status'];

export interface SubTask {
  _id: string;
  title: string;
  note?: string;
  isDone: boolean;
  createdBy: { _id: string; name: string };
  createdAt: string;
}
export interface Submission {
  images: { url: string; publicId: string }[];
  links: string[];
  note: string;
}
export interface ExtensionRequest {
  _id: string;
  reason: string;
  proposedDate: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
  createdAt: string;
}

const ROOT = ['my', 'tasks'] as const;
const data = <T,>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

export const useMyTasks = () => useQuery({ queryKey: [...ROOT, 'list'], queryFn: () => data<InternalTask[]>(api.get('/engineer/tasks')), staleTime: 30_000 });
export const useMyProjects = () => useQuery({ queryKey: [...ROOT, 'projects'], queryFn: () => data<InternalProject[]>(api.get('/engineer/projects')), staleTime: 5 * 60_000 });

export function useSetTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => data<InternalTask>(api.patch(`/engineer/tasks/${id}/status`, { status })),
    onSuccess: (task) => {
      qc.setQueryData<InternalTask[]>([...ROOT, 'list'], (cur) => cur?.map((t) => (t._id === task._id ? task : t)));
      void qc.invalidateQueries({ queryKey: ['engineer'] });
    },
  });
}

/** Steps the person breaks a task into. */
export function useSubTasks(taskId: string) {
  const qc = useQueryClient();
  const key = [...ROOT, 'subtasks', taskId];
  const refresh = () => void qc.invalidateQueries({ queryKey: key });
  return {
    list: useQuery({ queryKey: key, queryFn: () => data<SubTask[]>(api.get(`/engineer/tasks/${taskId}/subtasks`)) }),
    add: useMutation({ mutationFn: (d: { title: string; note?: string }) => api.post(`/engineer/tasks/${taskId}/subtasks`, d), onSuccess: refresh }),
    toggle: useMutation({ mutationFn: (id: string) => api.patch(`/engineer/subtasks/${id}/toggle`), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: string) => api.delete(`/engineer/subtasks/${id}`), onSuccess: refresh }),
  };
}

/** Photos, links and a note the person hands in for a task. */
export function useSubmission(taskId: string) {
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: [...ROOT, 'list'] });
  return {
    upload: useMutation({
      mutationFn: (files: File[]) => {
        const form = new FormData();
        files.forEach((f) => form.append('images', f));
        return data<Submission>(api.post(`/engineer/tasks/${taskId}/submission/images`, form, { headers: { 'Content-Type': 'multipart/form-data' } }));
      },
      onSuccess: refresh,
    }),
    removeImage: useMutation({ mutationFn: (publicId: string) => api.delete(`/engineer/tasks/${taskId}/submission/images/${encodeURIComponent(publicId)}`), onSuccess: refresh }),
    saveLinks: useMutation({ mutationFn: (d: { links: string[]; note: string }) => data<Submission>(api.patch(`/engineer/tasks/${taskId}/submission/links`, d)), onSuccess: refresh }),
  };
}

/** Asking the manager for more time on a task. */
export function useExtensions(taskId: string) {
  const qc = useQueryClient();
  const key = [...ROOT, 'extensions', taskId];
  const refresh = () => void qc.invalidateQueries({ queryKey: key });
  return {
    list: useQuery({ queryKey: key, queryFn: () => data<ExtensionRequest[]>(api.get(`/engineer/tasks/${taskId}/extension-requests`)) }),
    request: useMutation({ mutationFn: (d: { reason: string; proposedDate: string }) => api.post(`/engineer/tasks/${taskId}/extension-requests`, d), onSuccess: refresh }),
    withdraw: useMutation({ mutationFn: (id: string) => api.delete(`/engineer/extension-requests/${id}`), onSuccess: refresh }),
  };
}

export type Urgency = 'overdue' | 'today' | 'soon' | 'ok' | 'none';

/** How close the (hard) deadline is, in whole days. */
export function dueOf(task: InternalTask): { urgency: Urgency; days: number | null; date: string | null } {
  const ref = task.hardDeadline || task.dueDate;
  if (!ref) return { urgency: 'none', days: null, date: null };
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((start(new Date(ref)) - start(new Date())) / 864e5);
  return { urgency: days < 0 ? 'overdue' : days === 0 ? 'today' : days <= 3 ? 'soon' : 'ok', days, date: ref };
}

export const projectName = (t: InternalTask) => (typeof t.projectId === 'object' && t.projectId ? t.projectId.name : '');
