import type { User } from '../users/users.repository';

/**
 * Things the auth module needs from features that are ported later.
 * Each has a simple default today; the owning module supplies the real
 * implementation in `src/container.ts` once it exists.
 */

export interface DisplayNames {
  name: string;
  nameAr: string | null;
}

/**
 * Old behaviour: English/Arabic names come from the matching CRM lead.
 * Real implementation arrives with the leads module (phase 3).
 */
export interface DisplayNameResolver {
  resolve(user: Pick<User, 'name' | 'email'>): Promise<DisplayNames>;
}

export const plainDisplayNames: DisplayNameResolver = {
  resolve: async (user) => ({ name: user.name, nameAr: null }),
};

/**
 * Old behaviour: a student whose every enrollment is inactive cannot log in.
 * Real implementation arrives with the enrollments module (phase 4).
 */
export interface StudentAccessChecker {
  allEnrollmentsInactive(studentId: string): Promise<boolean>;
}

export const noEnrollmentRestriction: StudentAccessChecker = {
  allEnrollmentsInactive: async () => false,
};
