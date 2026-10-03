import { z } from 'zod';
import { booleanish, numeric } from '../../shared/http/validate';

// Messages and their order match the old controller's hand-written checks.
const name = (emptyMessage: string) =>
  z
    .string({ error: emptyMessage })
    .refine((v) => v.trim().length > 0, emptyMessage)
    .refine((v) => v.length <= 100, 'Plan name cannot exceed 100 characters')
    .transform((v) => v.trim());

const monthlyHours = (missing: string) =>
  numeric(missing).refine((v) => v >= 1 && v <= 1000, 'Monthly hours must be between 1 and 1000');

const price = (missing: string) => numeric(missing).refine((v) => v >= 0, 'Price cannot be negative');

const description = z
  .string()
  .nullish()
  .refine((v) => !v || v.length <= 500, 'Description cannot exceed 500 characters')
  .transform((v) => (v ? v.trim() : null));

export const createPlanBody = z.object({
  name: name('Plan name is required'),
  monthlyHours: monthlyHours('Monthly hours is required'),
  price: price('Price is required'),
  isActive: booleanish.optional(),
  description: description.optional(),
});

export const updatePlanBody = z.object({
  name: name('Plan name cannot be empty').optional(),
  monthlyHours: monthlyHours('Monthly hours must be between 1 and 1000').optional(),
  price: price('Price cannot be negative').optional(),
  isActive: booleanish.optional(),
  description: description.optional(),
});

export type CreatePlanInput = z.infer<typeof createPlanBody>;
export type UpdatePlanInput = z.infer<typeof updatePlanBody>;
