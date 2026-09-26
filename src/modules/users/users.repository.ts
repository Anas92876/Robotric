import { and, asc, eq, getTableColumns, ilike, notInArray, or, sql } from 'drizzle-orm';
import { escapeLike } from '../../shared/db/like';
import type { DbExecutor } from '../../shared/db/client';
import { type NewUserRow, type OtpPurpose, type UserOtpRow, type UserRow, userOtps, users } from './users.table';

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
