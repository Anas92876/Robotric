import type { GroupRepository } from '../groups/groups.repository';
import type { LeadRepository } from '../leads/leads.repository';
import type { ReceiptRepository } from '../receipts/receipts.repository';
import type { EnrollmentRepository } from './enrollments.repository';

/** Repositories bound to one transaction. */
export interface EnrollmentRepos {
  enrollments: EnrollmentRepository;
  groups: GroupRepository;
  receipts: ReceiptRepository;
  leads: LeadRepository;
}

/**
 * Messages to the student (web notifications, push, payment reminders).
 * The notifications feature (phase 9) provides the real implementation;
 * until then nothing is sent. Failures never undo the enrollment action.
 */
export interface EnrollmentNotifier {
  notify(studentId: string, kind: 'enrollment' | 'payment', title: string, message: string, data: Record<string, unknown>): Promise<void>;
  remindDueInstallments(enrollmentId: string): Promise<void>;
}

export const silentNotifier: EnrollmentNotifier = {
  notify: async () => {},
  remindDueInstallments: async () => {},
};

/** Money helpers shared by the enrollment flows (same rounding as before). */
export const round2 = (n: number) => Math.round(n * 100) / 100;
export const clampDiscount = (d: number) => Math.min(Math.max(d || 0, 0), 100);
export const discounted = (price: number, discountPct: number) => round2(price - price * (clampDiscount(discountPct) / 100));
