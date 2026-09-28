import { and, asc, count, desc, eq, getTableColumns, ilike, ne, notInArray, or, sql, type SQL } from 'drizzle-orm';
import { escapeLike } from '../../shared/db/like';
import type { DbExecutor } from '../../shared/db/client';
import { type NewUserRow, type OtpPurpose, type UserOtpRow, type UserRow, userOtps, users } from './users.table';
import { enrollments, payments } from '../enrollments/enrollments.table';
import { attendanceRecords } from '../attendance/attendance.table';
import { certificates } from '../certificates/certificates.table';
import { sessionRequests, userSubscriptions } from '../subscriptions/subscriptions.table';

/** A user as the rest of the app sees it: never includes the password hash. */
export type User = Omit<UserRow, 'passwordHash'>;
export type UserWithPassword = UserRow;

/** Emails are compared case-insensitively; they are stored lowercased. */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByIdWithPassword(id: string): Promise<UserWithPassword | null>;
  findByEmailWithPassword(email: string): Promise<UserWithPassword | null>;
  findTokenVersion(id: string): Promise<number | null>;
  emailExists(email: string): Promise<boolean>;
  create(data: NewUserRow): Promise<User>;
  /** Sets a new password hash and bumps tokenVersion; returns the new version. */
  replacePassword(id: string, passwordHash: string): Promise<number>;
  updateEmail(id: string, email: string): Promise<void>;
  /** Returns the updated user, or null if no such user. */
  setAssignedCompetition(id: string, competitionId: string | null): Promise<User | null>;
  /** Students by name/email, alphabetical, optionally excluding some ids. */
  searchStudents(search: string | undefined, excludeIds: string[], limit: number): Promise<{ id: string; name: string; email: string }[]>;
  list(filter: UserFilter, page: { limit: number; offset: number }): Promise<User[]>;
  count(filter: UserFilter): Promise<number>;
  emailTakenByOther(email: string, userId: string): Promise<boolean>;
  /** Updates profile fields; `bumpTokenVersion` signs the user out everywhere. */
  update(id: string, patch: Partial<Pick<NewUserRow, 'name' | 'email' | 'role' | 'profile' | 'passwordHash'>>, bumpTokenVersion: boolean): Promise<User | null>;
  delete(id: string): Promise<void>;
  /** True if a student has enrollments, payments, attendance, certificates, subscriptions or session requests. */
  hasLearningHistory(id: string): Promise<boolean>;
}

export interface UserFilter {
  role?: string;
  search?: string;
  /** "inactive" = disabled accounts; "active" = everyone else (no status counts as active). */
  status?: 'active' | 'inactive';
}

function userWhere(f: UserFilter): SQL | undefined {
  const s = f.search ? `%${escapeLike(f.search)}%` : null;
  const inactive = sql`coalesce(${users.profile}->>'status', '') = 'inactive'`;
  return and(
    f.role ? sql`${users.role}::text = ${f.role}` : undefined,
    s ? or(ilike(users.name, s), ilike(users.email, s)) : undefined,
    f.status === 'inactive' ? inactive : f.status === 'active' ? sql`not (${inactive})` : undefined,
  );
}

export interface OtpRecord {
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  pendingValue: string | null;
}

export interface OtpRepository {
  find(userId: string, purpose: OtpPurpose): Promise<OtpRecord | null>;
  /** Replaces any existing code for this purpose and resets attempts. */
  save(userId: string, purpose: OtpPurpose, record: Omit<OtpRecord, 'attempts'>): Promise<void>;
  setAttempts(userId: string, purpose: OtpPurpose, attempts: number): Promise<void>;
  delete(userId: string, purpose: OtpPurpose): Promise<void>;
}

// Every column except the password hash.
const { passwordHash: _omit, ...publicColumns } = getTableColumns(users);

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: DbExecutor) {}

  async findById(id: string): Promise<User | null> {
    const [row] = await this.db.select(publicColumns).from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  }

  async findByIdWithPassword(id: string): Promise<UserWithPassword | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  }

  async findByEmailWithPassword(email: string): Promise<UserWithPassword | null> {
    const [row] = await this.db.select().from(users).where(eq(users.email, normalizeEmail(email))).limit(1);
    return row ?? null;
  }

  async findTokenVersion(id: string): Promise<number | null> {
    const [row] = await this.db.select({ v: users.tokenVersion }).from(users).where(eq(users.id, id)).limit(1);
    return row ? row.v : null;
  }

  async emailExists(email: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizeEmail(email)))
      .limit(1);
    return Boolean(row);
  }

  async create(data: NewUserRow): Promise<User> {
    const [row] = await this.db
      .insert(users)
      .values({ ...data, email: normalizeEmail(data.email) })
      .returning(publicColumns);
    if (!row) throw new Error('Insert returned no row');
    return row;
  }

  async replacePassword(id: string, passwordHash: string): Promise<number> {
    const [row] = await this.db
      .update(users)
      .set({ passwordHash, tokenVersion: sql`${users.tokenVersion} + 1` })
      .where(eq(users.id, id))
      .returning({ v: users.tokenVersion });
    if (!row) throw new Error(`User ${id} not found`);
    return row.v;
  }

  async updateEmail(id: string, email: string): Promise<void> {
    await this.db.update(users).set({ email: normalizeEmail(email) }).where(eq(users.id, id));
  }

  searchStudents(search: string | undefined, excludeIds: string[], limit: number) {
    const s = search ? `%${escapeLike(search)}%` : null;
    return this.db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(
        and(
          eq(users.role, 'student'),
          s ? or(ilike(users.name, s), ilike(users.email, s)) : undefined,
          excludeIds.length ? notInArray(users.id, excludeIds) : undefined,
        ),
      )
      .orderBy(asc(users.name))
      .limit(limit);
  }

  async list(f: UserFilter, page: { limit: number; offset: number }) {
    return this.db.select(publicColumns).from(users).where(userWhere(f)).orderBy(desc(users.createdAt)).limit(page.limit).offset(page.offset);
  }

  async count(f: UserFilter) {
    const [row] = await this.db.select({ n: count() }).from(users).where(userWhere(f));
    return row?.n ?? 0;
  }

  async emailTakenByOther(email: string, userId: string) {
    const [row] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, normalizeEmail(email)), ne(users.id, userId)))
      .limit(1);
    return Boolean(row);
  }

  async update(id: string, patch: Partial<Pick<NewUserRow, 'name' | 'email' | 'role' | 'profile' | 'passwordHash'>>, bumpTokenVersion: boolean) {
    const [row] = await this.db
      .update(users)
      .set({ ...patch, ...(patch.email ? { email: normalizeEmail(patch.email) } : {}), ...(bumpTokenVersion ? { tokenVersion: sql`${users.tokenVersion} + 1` } : {}) })
      .where(eq(users.id, id))
      .returning(publicColumns);
    return row ?? null;
  }

  async delete(id: string) {
    await this.db.delete(users).where(eq(users.id, id));
  }

  async hasLearningHistory(id: string): Promise<boolean> {
    // These rows are deleted along with the user (ON DELETE CASCADE), so they are
    // checked before a delete instead of relying on a foreign-key refusal.
    // Compared with the id value, not ${users.id}: in a one-table query Drizzle writes
    // columns without their table name, which would bind to the subquery's own table.
    const [row] = await this.db
      .select({
        found: sql<boolean>`(
          exists (select 1 from ${enrollments} where ${enrollments.studentId} = ${id})
          or exists (select 1 from ${payments} where ${payments.studentId} = ${id})
          or exists (select 1 from ${attendanceRecords} where ${attendanceRecords.studentId} = ${id})
          or exists (select 1 from ${certificates} where ${certificates.studentId} = ${id})
          or exists (select 1 from ${userSubscriptions} where ${userSubscriptions.userId} = ${id})
          or exists (select 1 from ${sessionRequests} where ${sessionRequests.userId} = ${id})
        )`,
      })
      .from(users)
      .where(eq(users.id, id));
    return Boolean(row?.found);
  }

  async setAssignedCompetition(id: string, competitionId: string | null): Promise<User | null> {
    const [row] = await this.db
      .update(users)
      .set({ assignedCompetitionId: competitionId })
      .where(eq(users.id, id))
      .returning(publicColumns);
    return row ?? null;
  }
}

export class DrizzleOtpRepository implements OtpRepository {
  constructor(private readonly db: DbExecutor) {}

  private where(userId: string, purpose: OtpPurpose) {
    return and(eq(userOtps.userId, userId), eq(userOtps.purpose, purpose));
  }

  async find(userId: string, purpose: OtpPurpose): Promise<OtpRecord | null> {
    const [row]: UserOtpRow[] = await this.db.select().from(userOtps).where(this.where(userId, purpose)).limit(1);
    return row ? { codeHash: row.codeHash, expiresAt: row.expiresAt, attempts: row.attempts, pendingValue: row.pendingValue } : null;
  }

  async save(userId: string, purpose: OtpPurpose, record: Omit<OtpRecord, 'attempts'>): Promise<void> {
    const values = { ...record, attempts: 0, createdAt: new Date() };
    await this.db
      .insert(userOtps)
      .values({ userId, purpose, ...values })
      .onConflictDoUpdate({ target: [userOtps.userId, userOtps.purpose], set: values });
  }

  async setAttempts(userId: string, purpose: OtpPurpose, attempts: number): Promise<void> {
    await this.db.update(userOtps).set({ attempts }).where(this.where(userId, purpose));
  }

  async delete(userId: string, purpose: OtpPurpose): Promise<void> {
    await this.db.delete(userOtps).where(this.where(userId, purpose));
  }
}
