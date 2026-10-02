import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { InternalProject, InternalTask } from '../../hooks/cto/useCTOProjects';

export type Project = InternalProject;
export type Task = InternalTask;
export interface Person { _id: string; name: string; email: string; role: string }
export interface ProjectInput { name: string; description: string; priority: 1 | 2 | 3; assignedEngineers: string[]; clients: string[]; parentProject?: string }
export interface TaskInput { projectId?: string; subProjectId?: string | null; title: string; description: string; priority: 1 | 2 | 3; assignedTo: string[]; dueDate: string | null; hardDeadline: string | null; status?: Task['status'] }

const ROOT = ['cto', 'work'] as const;
const B = '/cto/internal';
const data = <T,>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

export const useCtoProjects = () => useQuery({ queryKey: [...ROOT, 'projects'], queryFn: () => data<Project[]>(api.get(`${B}/projects`)) });
export const useCtoProject = (id: string) => useQuery({ queryKey: [...ROOT, 'projects', id], queryFn: () => data<{ project: Project; taskCounts: Project['taskCounts'] }>(api.get(`${B}/projects/${id}`)), enabled: !!id });
export const useSubProjects = (id: string, enabled = true) => useQuery({ queryKey: [...ROOT, 'projects', id, 'subs'], queryFn: () => data<Project[]>(api.get(`${B}/projects/${id}/sub-projects`)), enabled: !!id && enabled });
export const useCtoTasks = (filter: Record<string, string> = {}) =>
  useQuery({ queryKey: [...ROOT, 'tasks', filter], queryFn: () => data<Task[]>(api.get(`${B}/tasks`, { params: filter })) });
export const useStaff = () => useQuery({ queryKey: ['cto', 'engineers'], queryFn: () => data<Person[]>(api.get(`${B}/engineers`)), staleTime: 300_000 });
export const useClients = () => useQuery({ queryKey: ['cto', 'clients'], queryFn: () => data<Person[]>(api.get(`${B}/clients`)), staleTime: 300_000 });

export function useWorkMutations() {
  const qc = useQueryClient();
  const refresh = () => { void qc.invalidateQueries({ queryKey: ROOT }); void qc.invalidateQueries({ queryKey: ['cto', 'analytics'] }); };
  return {
    saveProject: useMutation({ mutationFn: ({ id, d }: { id?: string; d: ProjectInput }) => data<Project>(id ? api.put(`${B}/projects/${id}`, d) : api.post(`${B}/projects`, d)), onSuccess: refresh }),
    deleteProject: useMutation({ mutationFn: (id: string) => api.delete(`${B}/projects/${id}`), onSuccess: refresh }),
    saveTask: useMutation({ mutationFn: ({ id, d }: { id?: string; d: Partial<TaskInput> }) => data<Task>(id ? api.put(`${B}/tasks/${id}`, d) : api.post(`${B}/tasks`, d)), onSuccess: refresh }),
    deleteTask: useMutation({ mutationFn: (id: string) => api.delete(`${B}/tasks/${id}`), onSuccess: refresh }),
    declineTask: useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => api.patch(`${B}/tasks/${id}/decline`, { reason }), onSuccess: refresh }),
  };
}

export const PRIORITIES = [1, 2, 3] as const;
export const nameOf = (x: { name: string } | string | null | undefined) => (x && typeof x === 'object' ? x.name : '');
export const idOf = (x: { _id: string } | string | null | undefined) => (x && typeof x === 'object' ? x._id : x ?? '');
