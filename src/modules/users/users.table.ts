import { boolean, index, integer, jsonb, pgEnum, pgTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';

export const USER_ROLES = [
  'student',
  'trainer',
  'teacher',
  'admin',
  'judge',
  'editor',
  'organizer',
  'superadmin',
  'reception',
  'clo',
  'social',
  'cto',
  'engineer',
  'driver',
  'client',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const userRole = pgEnum('user_role', USER_ROLES);

/**
 * Free-form per-role details (phone, avatar, status, authorizedCourses, ...).
 * Kept as JSON because each role stores different fields. Fields that start
 * being queried or joined on get promoted to real columns.
 */
export interface UserProfile {
  status?: 'active' | 'inactive';
  avatar?: string;
  phone?: string;
  [key: string]: unknown;
}

export const users = pgTable(
  'users',
  {
    id: primaryId(),
    email: varchar('email', { length: 320 }).notNull(),
    passwordHash: varchar('password_hash', { length: 100 }).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    role: userRole('role').notNull().default('student'),
    assignedCompetitionId: idRef('assigned_competition_id'),
    profile: jsonb('profile').$type<UserProfile>(),
    /**
     * Embedded in every JWT and compared on each request. Bumped on password
     * change/reset, role change or logout-all, which revokes all sessions.
     */
    tokenVersion: integer('token_version').notNull().default(0),
    isHourly: boolean('is_hourly').notNull().default(false),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('users_email_unique').on(t.email),
    index('users_role_idx').on(t.role),
    index('users_assigned_competition_idx').on(t.assignedCompetitionId),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

export const OTP_PURPOSES = ['password_change', 'email_change', 'forgot_password'] as const;
export type OtpPurpose = (typeof OTP_PURPOSES)[number];
export const otpPurpose = pgEnum('otp_purpose', OTP_PURPOSES);

/**
 * Short-lived one-time codes, one row per (user, purpose). Separate from
 * `users` so no query that returns a user can ever leak a live code.
 * Codes are stored hashed.
 */
export const userOtps = pgTable(
  'user_otps',
  {
    userId: idRef('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    purpose: otpPurpose('purpose').notNull(),
    codeHash: varchar('code_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    /** New email address or new bcrypt hash, depending on purpose. */
    pendingValue: varchar('pending_value', { length: 320 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('user_otps_user_purpose_unique').on(t.userId, t.purpose)],
);

export type UserOtpRow = typeof userOtps.$inferSelect;
