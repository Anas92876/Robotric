import { and, asc, count, eq, gte, ilike, inArray, lte, or, sql, type SQL } from 'drizzle-orm';
import type { DbExecutor } from '../../shared/db/client';
import { escapeLike } from '../../shared/db/like';
import { courses } from '../courses/courses.table';
import { groups } from '../groups/groups.table';
import { type NewSessionRow, type SessionRow, sessions } from './sessions.table';

export interface Session extends SessionRow {
  group: { id: string; name: string; color: string; maxStudents: number } | null;
  course: { id: string; title: string; category: string; level: string } | null;
}

export interface SessionFilter {
  /** Restrict to these groups (e.g. a trainer's groups). */
  groupIds?: string[];
  groupId?: string;
  /** Sessions taught by this trainer. */
  trainerId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export interface SessionRepository {
  list(filter: SessionFilter): Promise<Session[]>;
  findById(id: string): Promise<Session | null>;
  countForGroup(groupId: string): Promise<number>;
  create(data: NewSessionRow): Promise<string>;
  update(id: string, data: Partial<NewSessionRow>): Promise<void>;
  delete(id: string): Promise<void>;
}

export class DrizzleSessionRepository implements SessionRepository {
  constructor(private readonly db: DbExecutor) {}

  private base() {
    return this.db
      .select({
        s: sessions,
        group: { id: groups.id, name: groups.name, color: groups.color, maxStudents: groups.maxStudents },
        course: { id: courses.id, title: courses.title, category: courses.category, level: courses.level },
      })
      .from(sessions)
      .leftJoin(groups, eq(groups.id, sessions.groupId))
      .leftJoin(courses, eq(courses.id, sessions.courseId));
  }

  private static merge(r: { s: SessionRow; group: Session['group']; course: Session['course'] }): Session {
    return { ...r.s, group: r.group?.id ? r.group : null, course: r.course?.id ? r.course : null };
  }

  async list(f: SessionFilter): Promise<Session[]> {
    if (f.groupIds && f.groupIds.length === 0) return [];
    const s = f.search ? `%${escapeLike(f.search)}%` : null;
    const where: SQL | undefined = and(
      f.groupIds ? inArray(sessions.groupId, f.groupIds) : undefined,
      f.groupId ? eq(sessions.groupId, f.groupId) : undefined,
      f.trainerId ? eq(sessions.trainerId, f.trainerId) : undefined,
      f.status ? sql`${sessions.status}::text = ${f.status}` : undefined,
      f.startDate ? gte(sessions.scheduledDate, f.startDate) : undefined,
      f.endDate ? lte(sessions.scheduledDate, f.endDate) : undefined,
      s ? or(ilike(sessions.title, s), ilike(sessions.description, s)) : undefined,
    );
    const rows = await this.base().where(where).orderBy(asc(sessions.scheduledDate), asc(sessions.startTime));
    return rows.map(DrizzleSessionRepository.merge);
  }

  async findById(id: string): Promise<Session | null> {
    const [row] = await this.base().where(eq(sessions.id, id)).limit(1);
    return row ? DrizzleSessionRepository.merge(row) : null;
  }

  async countForGroup(groupId: string): Promise<number> {
    const [row] = await this.db.select({ n: count() }).from(sessions).where(eq(sessions.groupId, groupId));
    return row?.n ?? 0;
  }

  async create(data: NewSessionRow): Promise<string> {
    const [row] = await this.db.insert(sessions).values(data).returning({ id: sessions.id });
    if (!row) throw new Error('Insert returned no row');
    return row.id;
  }

  async update(id: string, data: Partial<NewSessionRow>): Promise<void> {
    await this.db.update(sessions).set(data).where(eq(sessions.id, id));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, id));
  }
}
