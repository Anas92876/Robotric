import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';

/** Accounts as reception sees them (GET /reception/users). */
export interface Account {
  _id: string;
  name: string;
  email: string;
  role: string;
  profile?: { phone?: string; status?: string };
  createdAt: string;
}

export interface AccountFilters {
  search: string;
  role: string;
  status: 'active' | 'inactive';
  page: number;
}

export interface AccountInput {
  name: string;
  email: string;
  role: string;
  phone?: string;
  /** Required when creating; when editing, leave out to keep the current one. */
  password?: string;
  status?: 'active' | 'inactive';
}

export const PAGE_SIZE = 20;

const keys = {
  all: ['reception', 'users'] as const,
  list: (f: AccountFilters) => ['reception', 'users', 'list', f] as const,
  counts: ['reception', 'users', 'counts'] as const,
};

const query = (f: Partial<AccountFilters> & { limit?: number }) => {
  const p = new URLSearchParams();
  if (f.search) p.set('search', f.search);
  if (f.role) p.set('role', f.role);
  if (f.status) p.set('status', f.status);
  p.set('page', String(f.page ?? 1));
  p.set('limit', String(f.limit ?? PAGE_SIZE));
  return p.toString();
};

/** One page of accounts; the previous page stays on screen while the next loads. */
export const useAccounts = (f: AccountFilters) =>
  useQuery({
    queryKey: keys.list(f),
    queryFn: async () => {
      const res = await api.get(`/reception/users?${query(f)}`);
      return {
        rows: (res.data.data ?? []) as Account[],
        total: (res.data.pagination?.total ?? 0) as number,
        pages: (res.data.pagination?.pages ?? 1) as number,
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

/** Real totals from the server (not just the rows on the current page). */
export const useAccountCounts = () =>
  useQuery({
    queryKey: keys.counts,
    queryFn: async () => {
      const total = async (f: Partial<AccountFilters>) => ((await api.get(`/reception/users?${query({ ...f, limit: 1 })}`)).data.pagination?.total ?? 0) as number;
      const [active, students, trainers, teachers, disabled] = await Promise.all([
        total({ status: 'active' }),
        total({ status: 'active', role: 'student' }),
        total({ status: 'active', role: 'trainer' }),
        total({ status: 'active', role: 'teacher' }),
        total({ status: 'inactive' }),
      ]);
      return { active, students, trainers: trainers + teachers, disabled };
    },
    staleTime: 30_000,
  });

/** Create, update and delete; every change refreshes the list, the counts and the overview. */
export function useAccountMutations() {
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: keys.all });
    void qc.invalidateQueries({ queryKey: ['reception', 'overview'] });
  };
  return {
    create: useMutation({ mutationFn: (body: AccountInput) => api.post('/reception/users', body), onSuccess: refresh }),
    update: useMutation({ mutationFn: ({ id, body }: { id: string; body: Partial<AccountInput> }) => api.put(`/reception/users/${id}`, body), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: string) => api.delete(`/reception/users/${id}`), onSuccess: refresh }),
  };
}
