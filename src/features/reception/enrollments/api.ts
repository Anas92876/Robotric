import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { Course, Enrollment } from '../../../hooks/reception/useReceptionEnrollments';

export type { Enrollment };
/** Course (or bundle) as the enrollment form lists it. */
export type CourseOption = Course;

export interface EnrollmentFilters {
  search: string;
  course: string;
  status: '' | 'active' | 'inactive';
  payment: '' | 'paid' | 'partial' | 'unpaid';
  discount: '' | 'true' | 'false';
  transport: '' | 'enabled' | 'disabled' | 'paid' | 'pending';
  page: number;
}

export interface EnrollmentSummary {
  total: number;
  active: number;
  inactive: number;
  amountTotal: number;
  amountPaid: number;
  amountRemaining: number;
}

/** Transport-side status of a student who pays for transport (from the bus module). */
export interface TransportAssignment {
  assigned: boolean;
  driverName?: string | null;
}

export interface Receipt {
  receiptId: string;
  receiptNumber: string;
}

export const PAGE_SIZE = 20;
const ROOT = ['reception', 'enrollments'] as const;

const listQuery = (f: EnrollmentFilters) => {
  const p = new URLSearchParams({ page: String(f.page), limit: String(PAGE_SIZE) });
  if (f.search) p.set('student', f.search);
  if (f.course) p.set('course', f.course);
  if (f.status) p.set('status', f.status);
  if (f.payment) p.set('paymentStatus', f.payment);
  if (f.discount) p.set('hasDiscount', f.discount);
  if (f.transport) p.set('transportationFilter', f.transport);
  return p.toString();
};

export const useEnrollments = (f: EnrollmentFilters) =>
  useQuery({
    queryKey: [...ROOT, 'list', f],
    queryFn: async () => {
      const res = await api.get(`/reception/enrollments?${listQuery(f)}`);
      return { rows: (res.data.data ?? []) as Enrollment[], total: (res.data.pagination?.total ?? 0) as number, pages: (res.data.pagination?.pages ?? 1) as number };
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

/** Real totals over every enrollment (not only the rows on screen). */
export const useEnrollmentSummary = () =>
  useQuery({
    queryKey: [...ROOT, 'summary'],
    queryFn: async () => (await api.get('/reception/enrollments/summary')).data.data as EnrollmentSummary,
    staleTime: 30_000,
  });

/** Published courses (and bundles) for the course filter and the new-enrollment form. */
export const useCourseOptions = () =>
  useQuery({
    queryKey: [...ROOT, 'courses'],
    queryFn: async () => ((await api.get('/reception/enrollments/available-courses?includeBundles=true')).data.data ?? []) as CourseOption[],
    staleTime: 5 * 60_000,
  });

/** For each student on the page who pays for transport: do they have a driver yet? */
export const useTransportAssignments = (rows: Enrollment[] | undefined) => {
  const ids = Array.from(new Set((rows ?? []).filter((e) => e.transportation?.enabled && e.student?._id).map((e) => String(e.student._id)))).sort();
  return useQuery({
    queryKey: ['reception', 'transport', 'assignments', ids],
    queryFn: async () => ((await api.post('/reception/transport/students/status-by-students', { studentIds: ids })).data?.data?.byStudent ?? {}) as Record<string, TransportAssignment>,
    enabled: ids.length > 0,
    staleTime: 60_000,
  });
};

/** Downloads a receipt PDF (receipts are protected, so it goes through the API). */
export async function downloadReceipt(receiptId: string, receiptNumber: string) {
  const res = await api.get(`/reception/receipts/${receiptId}/download`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `receipt-${receiptNumber}.pdf` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The newest receipt of an enrollment, or null when it has none. */
export async function latestReceipt(enrollmentId: string): Promise<{ _id: string; receiptNumber: string } | null> {
  const list = (await api.get(`/reception/receipts/enrollment/${enrollmentId}`)).data.data as { _id: string; receiptNumber: string }[] | undefined;
  return list?.[0] ?? null;
}

export interface PaymentInput {
  amount: number;
  paymentMethod: string;
  notes?: string;
  /** Paid in Syrian pounds: the USD amount above is the converted value. */
  paymentCurrency?: 'sp';
  amountInSP?: number;
}

export interface TransportationInput {
  enabled: true;
  totalAmount: number;
  paidNow?: number;
  paymentMethod?: string;
  notes?: string;
  installments?: { amount: number; dueDate: string }[];
}

/** Every change refreshes the list, the summary and the reception overview. */
export function useEnrollmentMutations() {
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ROOT });
    void qc.invalidateQueries({ queryKey: ['reception', 'overview'] });
    void qc.invalidateQueries({ queryKey: ['reception', 'transport'] });
  };
  return {
    create: useMutation({ mutationFn: async (body: Record<string, unknown>) => (await api.post('/reception/enrollments', body)).data.data as Enrollment, onSuccess: refresh }),
    setStatus: useMutation({
      mutationFn: ({ id, status, reason }: { id: string; status: 'active' | 'inactive'; reason?: string }) => api.put(`/reception/enrollments/${id}/status`, { status, reason }),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (id: string) => api.delete(`/reception/enrollments/${id}`), onSuccess: refresh }),
    pay: useMutation({
      mutationFn: async ({ id, body }: { id: string; body: PaymentInput }) => ((await api.post(`/reception/enrollments/${id}/payment`, body)).data.receipt ?? null) as Receipt | null,
      onSuccess: refresh,
    }),
    payTransport: useMutation({
      mutationFn: async ({ id, body }: { id: string; body: Omit<PaymentInput, 'paymentCurrency' | 'amountInSP'> }) =>
        ((await api.post(`/reception/enrollments/${id}/transportation-payment`, body)).data.data?.receipt ?? null) as Receipt | null,
      onSuccess: refresh,
    }),
    addTransport: useMutation({ mutationFn: ({ id, transportation }: { id: string; transportation: TransportationInput }) => api.put(`/reception/enrollments/${id}`, { transportation }), onSuccess: refresh }),
    removeTransport: useMutation({ mutationFn: (id: string) => api.delete(`/reception/enrollments/${id}/transportation`), onSuccess: refresh }),
    refresh,
  };
}
