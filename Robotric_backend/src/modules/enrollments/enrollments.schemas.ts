import { z } from 'zod';
import { booleanish } from '../../shared/http/validate';
import { PAYMENT_METHODS } from './enrollments.table';

/** `parseFloat(x) || 0` semantics, as the old handlers used everywhere. */
const money = z.union([z.string(), z.number()]).nullish().transform((v) => Number.parseFloat(String(v ?? '')) || 0);
const date = z.coerce.date({ error: 'Invalid date' });

const installment = z.object({ amount: z.union([z.string(), z.number()]).transform((v) => Number.parseFloat(String(v))), dueDate: date });

export const transportationInput = z.object({
  enabled: booleanish.optional(),
  totalAmount: z.union([z.string(), z.number()]).optional(),
  paidNow: z.union([z.string(), z.number()]).optional(),
  installments: z.array(installment).optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});
export type TransportationInput = z.infer<typeof transportationInput>;

export const createEnrollmentBody = z.object({
  studentId: z.string({ error: 'Student and course are required' }).min(1, 'Student and course are required'),
  courseId: z.string({ error: 'Student and course are required' }).min(1, 'Student and course are required'),
  groupId: z.string().nullish(),
  installments: z.array(installment).optional(),
  installmentPlan: z
    .object({ numberOfInstallments: z.coerce.number().int().min(0), startDate: date.optional() })
    .optional(),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').nullish(),
  discount: money,
  transportation: transportationInput.optional(),
});
export type CreateEnrollmentInput = z.infer<typeof createEnrollmentBody>;

export const updateEnrollmentBody = z.object({
  status: z.enum(['active', 'inactive'], { error: 'Status must be active or inactive' }).optional(),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').nullish(),
  transportation: transportationInput.optional(),
});
export type UpdateEnrollmentInput = z.infer<typeof updateEnrollmentBody>;

export const statusBody = z.object({
  status: z.string({ error: 'Status is required' }).min(1, 'Status is required').pipe(z.enum(['active', 'inactive'], { error: 'Status must be active or inactive' })),
  reason: z.string().trim().optional(),
});

export const paymentBody = z.object({
  amount: z.union([z.string(), z.number()]).optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  paymentCurrency: z.string().optional(),
  amountInSP: z.union([z.string(), z.number()]).nullish(),
});
export type PaymentInput = z.infer<typeof paymentBody>;

/** Unknown methods are recorded as "other" instead of failing the payment. */
export const normalizeMethod = (m: string | undefined) =>
  (PAYMENT_METHODS as readonly string[]).includes(m ?? '') ? (m as (typeof PAYMENT_METHODS)[number]) : m ? 'other' : 'cash';

export const fromWaitingBody = z.object({
  leadId: z.string({ error: 'leadId is required' }).min(1, 'leadId is required'),
  groupId: z.string({ error: 'groupId is required — student must be assigned to a group' }).min(1, 'groupId is required — student must be assigned to a group'),
  notes: z.string().nullish(),
  discount: money,
  installments: z.array(installment).optional(),
  transportation: transportationInput.optional(),
});
export type FromWaitingInput = z.infer<typeof fromWaitingBody>;

export const bundleBody = z.object({
  studentId: z.string({ error: 'studentId and bundleId are required' }).min(1, 'studentId and bundleId are required'),
  bundleId: z.string({ error: 'studentId and bundleId are required' }).min(1, 'studentId and bundleId are required'),
  enrollFull: booleanish.default(true),
  selectedCourseIds: z.array(z.string()).default([]),
  groupSelections: z.array(z.object({ courseId: z.string(), groupId: z.string() })).default([]),
  notes: z.string().default(''),
  discount: money,
  installments: z.array(installment).optional(),
});
export type BundleInput = z.infer<typeof bundleBody>;

export const listEnrollmentsQuery = z.object({
  course: z.string().optional(),
  student: z.string().optional(),
  status: z.string().optional(),
  paymentStatus: z.enum(['paid', 'unpaid', 'partial']).optional().catch(undefined),
  hasDiscount: z.enum(['true', 'false']).optional().catch(undefined),
  transportationFilter: z.enum(['enabled', 'disabled', 'paid', 'pending']).optional().catch(undefined),
});
