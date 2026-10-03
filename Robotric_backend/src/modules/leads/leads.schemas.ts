import { z } from 'zod';
import { newId } from '../../shared/db/ids';
import { booleanish, numeric } from '../../shared/http/validate';
import { DEPOSIT_METHODS, LEAD_STATUSES, type PhoneEntry, type SocialEntry } from './leads.table';

const text = z.string().trim();
const optionalText = z.string().trim().nullish();
const optionalDate = z.union([z.coerce.date(), z.null()]).optional();
const gender = z.preprocess((v) => (typeof v === 'string' ? v.toLowerCase() : v), z.enum(['male', 'female', 'other'])).nullish();
const status = z.enum(LEAD_STATUSES, { error: 'Invalid lead status' });

const phones = z
  .array(z.object({ _id: z.string().optional(), number: text.min(1), label: text.default('Other') }))
  .transform((list): PhoneEntry[] => list.map((p) => ({ ...p, _id: p._id ?? newId() })));
const socials = z
  .array(z.object({ _id: z.string().optional(), platform: text.min(1), handle: text.min(1) }))
  .transform((list): SocialEntry[] => list.map((s) => ({ ...s, _id: s._id ?? newId() })));

const leadFields = {
  englishName: optionalText,
  firstName: optionalText,
  lastName: optionalText,
  gender,
  fatherName: optionalText,
  motherName: optionalText,
  dateOfBirth: optionalDate,
  age: numeric('Age must be a number').nullish(),
  residence: optionalText,
  schoolName: optionalText,
  mobileNumberLabel: optionalText,
  additionalNumbers: phones.optional(),
  socialMedia: socials.optional(),
  assignedTo: z.string().nullish(),
  interestField: optionalText,
  referralSource: optionalText,
  notes: optionalText,
  leadDate: optionalDate,
};

const REQUIRED = 'Full name and mobile number are required';

export const createLeadBody = z.object({
  fullName: z.string({ error: REQUIRED }).trim().min(1, REQUIRED),
  mobileNumber: z.string({ error: REQUIRED }).trim().min(1, REQUIRED),
  ...leadFields,
  status: status.optional(),
});

/** Editable fields. Logs (follow-ups, status history) and conversion links change only through their own endpoints. */
export const updateLeadBody = z.object({
  fullName: text.min(1, 'Full name cannot be empty').optional(),
  mobileNumber: text.min(1, 'Mobile number cannot be empty').optional(),
  ...leadFields,
  status: status.optional(),
  nextFollowUpDate: optionalDate,
  isBannedFromPlatform: booleanish.optional(),
  blacklistReason: optionalText,
  waitingInfo: z
    .object({
      courseId: z.union([z.string(), z.object({ _id: z.string() }).transform((c) => c._id)]).nullish(),
      depositAmount: numeric('Deposit amount must be a number').refine((v) => v >= 0, 'Deposit cannot be negative').optional(),
      depositPaidAt: optionalDate,
      depositMethod: z.enum(DEPOSIT_METHODS).optional(),
      depositNotes: z.string().optional(),
    })
    .optional(),
});

export const listLeadsQuery = z.object({
  status: z.string().optional(),
  interestField: z.string().optional(),
  referralSource: z.string().optional(),
  assignedTo: z.string().optional(),
  search: z.string().optional(),
  fromDate: z.coerce.date().optional().catch(undefined),
  toDate: z.coerce.date().optional().catch(undefined),
  sortBy: z.enum(['leadDate', 'createdAt', 'fullName']).catch('leadDate'),
  sortOrder: z.enum(['asc', 'desc']).catch('desc'),
});

export const followUpBody = z.object({
  note: z.string({ error: 'Follow-up note is required' }).trim().min(1, 'Follow-up note is required'),
  nextFollowUpDate: optionalDate,
});

export const changeStatusBody = z.object({
  newStatus: z.string({ error: 'New status is required' }).min(1, 'New status is required').pipe(status),
  reason: z.string({ error: 'Reason is required' }).trim().min(1, 'Reason is required'),
  isBannedFromPlatform: booleanish.optional(),
});

const ACCOUNT_REQUIRED = 'Email and password are required to create student account';
export const convertBody = z.object({
  email: z.string({ error: ACCOUNT_REQUIRED }).trim().min(1, ACCOUNT_REQUIRED).email('Invalid email address'),
  password: z.string({ error: ACCOUNT_REQUIRED }).min(1, ACCOUNT_REQUIRED),
});

const WAITING_ACCOUNT = 'Email and password are required to create a user account';
export const setWaitingBody = z.object({
  email: z.string({ error: WAITING_ACCOUNT }).trim().min(1, WAITING_ACCOUNT).email('Invalid email address'),
  password: z.string({ error: WAITING_ACCOUNT }).min(1, WAITING_ACCOUNT),
  courseId: z.string({ error: 'Course is required for the waiting list' }).min(1, 'Course is required for the waiting list'),
  depositAmount: z.union([z.string(), z.number()]).optional().transform((v) => Number.parseFloat(String(v ?? 0)) || 0),
  depositMethod: z.enum(DEPOSIT_METHODS).catch('cash').default('cash'),
  depositNotes: z.string().default(''),
});

export type CreateLeadInput = z.infer<typeof createLeadBody>;
export type UpdateLeadInput = z.infer<typeof updateLeadBody>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuery>;
export type SetWaitingInput = z.infer<typeof setWaitingBody>;
