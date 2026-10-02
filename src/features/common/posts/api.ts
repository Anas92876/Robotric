import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';

export interface Post {
  _id: string;
  slug: string;
  title: string;
  body: string;
  tags: string[];
  status: 'draft' | 'published';
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface PostInput {
  slug?: string;
  title: string;
  body: string;
  tags: string[];
  status: Post['status'];
}

/** Roles the backend lets write posts. */
export const WRITERS = ['editor', 'admin', 'superadmin', 'reception', 'social'];

const ROOT = ['posts'] as const;

/** Writers see drafts too; everyone else sees the published ones. */
export const usePosts = (writer: boolean) =>
  useQuery({
    queryKey: [...ROOT, writer ? 'all' : 'published'],
    queryFn: async () => (await api.get(writer ? '/posts/manage' : '/posts')).data as Post[],
    staleTime: 30_000,
  });

export function usePostMutations() {
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: ROOT });
  return {
    save: useMutation({ mutationFn: ({ id, d }: { id?: string; d: PostInput }) => (id ? api.put(`/posts/${id}`, d) : api.post('/posts', d)), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: string) => api.delete(`/posts/${id}`), onSuccess: refresh }),
  };
}

/** "My first post!" → "my-first-post". Arabic titles give an empty slug, so the person types one. */
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
