import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';

export type ProjectStatus = 'in_progress' | 'submitted' | 'completed';
export interface TrainerProject {
  _id: string;
  title: string;
  titleAr?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  studentId: { _id: string; name: string; email: string } | string;
  groupId: { _id: string; name: string } | string;
  courseId?: { _id: string; title: string } | string | null;
  createdBy?: { _id: string; name: string } | string | null;
  images: { _id: string; cloudinaryUrl: string | null; order: number }[];
  components: string[];
  technologies: string[];
  status: ProjectStatus;
  grade?: number | null;
  feedback?: string | null;
  gradedAt?: string | null;
  createdAt: string;
}
export interface ProjectInput { groupId?: string; studentId?: string; title: string; titleAr: string; description: string; descriptionAr: string; components: string[]; technologies: string[] }

const ROOT = ['trainer', 'projects'] as const;

export const useGroupProjects = (groupId: string) =>
  useQuery({ queryKey: [...ROOT, 'group', groupId], queryFn: async () => ((await api.get(`/trainer/projects/group/${groupId}`)).data.data ?? []) as TrainerProject[], enabled: !!groupId });

export const useProject = (id: string) =>
  useQuery({ queryKey: [...ROOT, id], queryFn: async () => (await api.get(`/trainer/projects/${id}`)).data.data as TrainerProject, enabled: !!id });

export const useGroupStudents = (groupId: string) =>
  useQuery({ queryKey: ['trainer', 'group', groupId, 'students'], queryFn: async () => ((await api.get(`/trainer/groups/${groupId}/students`)).data.data ?? []) as { _id: string; name: string; email: string }[], enabled: !!groupId });

export function useProjectMutations() {
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: ROOT });
  return {
    save: useMutation({ mutationFn: ({ id, d }: { id?: string; d: ProjectInput }) => (id ? api.put(`/trainer/projects/${id}`, d) : api.post('/trainer/projects', d)).then((r) => r.data.data as TrainerProject), onSuccess: refresh }),
    status: useMutation({ mutationFn: ({ id, status }: { id: string; status: ProjectStatus }) => api.patch(`/trainer/projects/${id}/status`, { status }), onSuccess: refresh }),
    grade: useMutation({ mutationFn: ({ id, grade, feedback }: { id: string; grade: number; feedback: string }) => api.post(`/trainer/projects/${id}/grade`, { grade, feedback }), onSuccess: refresh }),
    addImages: useMutation({
      mutationFn: ({ id, files }: { id: string; files: File[] }) => {
        const fd = new FormData();
        files.forEach((f) => fd.append('images', f));
        return api.post(`/trainer/projects/${id}/images`, fd);
      },
      onSuccess: refresh,
    }),
    removeImage: useMutation({ mutationFn: ({ id, index }: { id: string; index: number }) => api.delete(`/trainer/projects/${id}/images/${index}`), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: string) => api.delete(`/trainer/projects/${id}`), onSuccess: refresh }),
  };
}
