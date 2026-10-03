import { and, asc, desc, eq, ilike, inArray, lt, or, sql } from 'drizzle-orm';
import type { DbExecutor } from '../../shared/db/client';
import { escapeLike } from '../../shared/db/like';
import { courses } from '../courses/courses.table';
import { groups } from '../groups/groups.table';
import { sessions } from '../sessions/sessions.table';
import { users } from '../users/users.table';
import { type ResourceAssignmentRow, resourceAssignments, type ResourceRow, resources, resourceViewTokens, type ViewTokenRow } from './resources.table';

export interface Resource extends ResourceRow {
  course: { id: string; title: string; category: string; level: string } | null;
  uploadedBy: { id: string; name: string; email: string } | null;
}
export interface Assignment extends ResourceAssignmentRow {
  group: { id: string; name: string } | null;
  session: { id: string; sessionNumber: number | null; title: string; scheduledDate: Date | null; startTime: string | null; endTime: string | null } | null;
  assignedBy: { id: string; name: string; email: string } | null;
}

export interface ResourceFilter {
  courseId?: string;
  status?: string;
  search?: string;
  ids?: string[];
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  order?: 'asc' | 'desc';
}

export interface ResourceRepository {
  list(filter: ResourceFilter): Promise<Resource[]>;
  findById(id: string): Promise<Resource | null>;
  create(data: typeof resources.$inferInsert): Promise<string>;
  update(id: string, data: Partial<typeof resources.$inferInsert>): Promise<void>;
  delete(id: string): Promise<void>;
  assignments(filter: { resourceIds?: string[]; groupIds?: string[]; sessionId?: string; visibleOnly?: boolean }): Promise<Assignment[]>;
  /** Adds assignments, skipping ones that already exist; returns how many were new. */
  addAssignments(rows: (typeof resourceAssignments.$inferInsert)[]): Promise<number>;
  /** Replaces a resource's assignments within one group. */
  replaceGroupAssignments(resourceId: string, groupId: string, rows: (typeof resourceAssignments.$inferInsert)[]): Promise<void>;
  deleteAssignment(resourceId: string, assignmentId: string): Promise<boolean>;
  saveViewToken(row: ViewTokenRow): Promise<void>;
  /** Deletes and returns the token, so it can only ever be used once. Also purges expired ones. */
  consumeViewToken(tokenHash: string, now: Date): Promise<ViewTokenRow | null>;
}

export class DrizzleResourceRepository implements ResourceRepository {
  constructor(private readonly db: DbExecutor) {}

  private base() {
    return this.db
      .select({
        r: resources,
        course: { id: courses.id, title: courses.title, category: courses.category, level: courses.level },
        uploader: { id: users.id, name: users.name, email: users.email },
      })
      .from(resources)
      .leftJoin(courses, eq(courses.id, resources.courseId))
      .leftJoin(users, eq(users.id, resources.uploadedById));
  }

  private static merge(r: { r: ResourceRow; course: Resource['course']; uploader: Resource['uploadedBy'] }): Resource {
    return { ...r.r, course: r.course?.id ? r.course : null, uploadedBy: r.uploader?.id ? r.uploader : null };
  }

  async list(f: ResourceFilter) {
    const s = f.search ? `%${escapeLike(f.search)}%` : null;
    const column = resources[f.sortBy ?? 'createdAt'];
    const rows = await this.base()
      .where(
        and(
          f.status ? sql`${resources.status}::text = ${f.status}` : undefined,
          f.courseId ? eq(resources.courseId, f.courseId) : undefined,
          f.ids ? (f.ids.length ? inArray(resources.id, f.ids) : sql`false`) : undefined,
          s ? or(ilike(resources.title, s), ilike(resources.description, s)) : undefined,
        ),
      )
      .orderBy(f.order === 'asc' ? asc(column) : desc(column));
    return rows.map(DrizzleResourceRepository.merge);
  }

  async findById(id: string) {
    const [row] = await this.base().where(eq(resources.id, id)).limit(1);
    return row ? DrizzleResourceRepository.merge(row) : null;
  }

  async create(data: typeof resources.$inferInsert) {
    const [row] = await this.db.insert(resources).values(data).returning({ id: resources.id });
    if (!row) throw new Error('Insert returned no row');
    return row.id;
  }

  async update(id: string, data: Partial<typeof resources.$inferInsert>) {
    await this.db.update(resources).set(data).where(eq(resources.id, id));
  }

  async delete(id: string) {
    await this.db.delete(resources).where(eq(resources.id, id));
  }

  async assignments(f: { resourceIds?: string[]; groupIds?: string[]; sessionId?: string; visibleOnly?: boolean }) {
    if ((f.resourceIds && f.resourceIds.length === 0) || (f.groupIds && f.groupIds.length === 0)) return [];
    const rows = await this.db
      .select({
        a: resourceAssignments,
        group: { id: groups.id, name: groups.name },
        session: { id: sessions.id, sessionNumber: sessions.sessionNumber, title: sessions.title, scheduledDate: sessions.scheduledDate, startTime: sessions.startTime, endTime: sessions.endTime },
        by: { id: users.id, name: users.name, email: users.email },
      })
      .from(resourceAssignments)
      .leftJoin(groups, eq(groups.id, resourceAssignments.groupId))
      .leftJoin(sessions, eq(sessions.id, resourceAssignments.sessionId))
      .leftJoin(users, eq(users.id, resourceAssignments.assignedById))
      .where(
        and(
          f.resourceIds ? inArray(resourceAssignments.resourceId, f.resourceIds) : undefined,
          f.groupIds ? inArray(resourceAssignments.groupId, f.groupIds) : undefined,
          f.sessionId ? eq(resourceAssignments.sessionId, f.sessionId) : undefined,
          f.visibleOnly ? eq(resourceAssignments.isVisible, true) : undefined,
        ),
      )
      .orderBy(desc(resourceAssignments.assignedAt));
    return rows.map((r) => ({ ...r.a, group: r.group?.id ? r.group : null, session: r.session?.id ? r.session : null, assignedBy: r.by?.id ? r.by : null }));
  }

  async addAssignments(rows: (typeof resourceAssignments.$inferInsert)[]) {
    if (rows.length === 0) return 0;
    const inserted = await this.db.insert(resourceAssignments).values(rows).onConflictDoNothing().returning({ id: resourceAssignments.id });
    return inserted.length;
  }

  async replaceGroupAssignments(resourceId: string, groupId: string, rows: (typeof resourceAssignments.$inferInsert)[]) {
    await this.db.transaction(async (tx) => {
      await tx.delete(resourceAssignments).where(and(eq(resourceAssignments.resourceId, resourceId), eq(resourceAssignments.groupId, groupId)));
      if (rows.length) await tx.insert(resourceAssignments).values(rows).onConflictDoNothing();
    });
  }

  async deleteAssignment(resourceId: string, assignmentId: string) {
    const rows = await this.db
      .delete(resourceAssignments)
      .where(and(eq(resourceAssignments.id, assignmentId), eq(resourceAssignments.resourceId, resourceId)))
      .returning({ id: resourceAssignments.id });
    return rows.length > 0;
  }

  async saveViewToken(row: ViewTokenRow) {
    await this.db.insert(resourceViewTokens).values(row);
  }

  async consumeViewToken(tokenHash: string, now: Date) {
    const [row] = await this.db.delete(resourceViewTokens).where(eq(resourceViewTokens.tokenHash, tokenHash)).returning();
    await this.db.delete(resourceViewTokens).where(lt(resourceViewTokens.expiresAt, now));
    return row ?? null;
  }
}
