import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';

export interface Part { _id: string; name: string; category?: string | null; description?: string | null; sku?: string | null; group?: string | null; partNumber?: string | null; availableQty: number; reservedQty: number; imageUrl?: string | null }
export interface Movement { _id: string; partName: string; sku?: string | null; qtyChange: number; reason: string; notes?: string | null; createdAt: string; createdBy: { name: string } | null }
export type OrderStatus = 'pending' | 'approved' | 'rejected' | 'fulfilled' | 'cancelled';
export interface Order { _id: string; studentId: string; projectId?: string | null; status: OrderStatus; items: { partId: Part | string; qty: number }[]; createdAt: string }
export interface OpsProject { _id: string; title: string; description?: string | null; ownerId: string; parts: { partId: string; qty: number }[]; createdAt: string }
export interface Competition { _id: string; title: string; startDate: string; endDate: string; description?: string | null; maxTeams: number }
export interface Team { _id: string; competitionId: string; coachId?: string | null; name: string; members: string[] }

const OPS = ['ops'] as const;
export const useIsAdmin = () => { const { user } = useAuth(); return user?.role === 'admin' || user?.role === 'superadmin'; };

export const useParts = () => useQuery({ queryKey: [...OPS, 'parts'], queryFn: async () => ((await api.get('/parts')).data ?? []) as Part[] });
export const useStockStats = () => useQuery({ queryKey: [...OPS, 'stock', 'stats'], queryFn: async () => (await api.get('/stock/stats')).data as { totalParts: number; lowStock: number; outOfStock: number } });
export const useMovements = () => useQuery({ queryKey: [...OPS, 'stock', 'recent'], queryFn: async () => ((await api.get('/stock/recent-movements', { params: { limit: 12 } })).data ?? []) as Movement[] });
export const useOrders = () => useQuery({ queryKey: [...OPS, 'orders'], queryFn: async () => ((await api.get('/orders')).data ?? []) as Order[] });
export const useOpsProjects = () => useQuery({ queryKey: [...OPS, 'projects'], queryFn: async () => ((await api.get('/projects')).data ?? []) as OpsProject[] });
export const useCompetitions = () => useQuery({ queryKey: [...OPS, 'competitions'], queryFn: async () => ((await api.get('/competitions')).data ?? []) as Competition[] });
export const useTeams = () => useQuery({ queryKey: [...OPS, 'teams'], queryFn: async () => ((await api.get('/teams')).data ?? []) as Team[] });

/** Create/update/delete for one resource path, refreshing every operations list. */
export function useCrud<T>(path: string) {
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: OPS });
  return {
    save: useMutation({ mutationFn: ({ id, d }: { id?: string; d: T }) => (id ? api.put(`${path}/${id}`, d) : api.post(path, d)), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: string) => api.delete(`${path}/${id}`), onSuccess: refresh }),
    post: useMutation({ mutationFn: ({ url, d }: { url: string; d?: unknown }) => api.post(url, d), onSuccess: refresh }),
    put: useMutation({ mutationFn: ({ url, d }: { url: string; d?: unknown }) => api.put(url, d), onSuccess: refresh }),
  };
}

export const partOf = (x: Part | string, parts: Part[] = []) => (typeof x === 'object' ? x : parts.find((p) => p._id === x));
