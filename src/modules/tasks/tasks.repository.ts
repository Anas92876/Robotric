import { and, asc, count, desc, eq, inArray, ne, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { DbExecutor } from '../../shared/db/client';
import { courses } from '../courses/courses.table';
import { groups } from '../groups/groups.table';
import { sessions } from '../sessions/sessions.table';
import { users } from '../users/users.table';
import { type NewTaskRow, type TaskRow, taskGroups, tasks, taskSessions, type TaskSubmissionRow, taskSubmissions } from './tasks.table';

export interface SessionRef {
  id: string;
  title: string;
  sessionNumber: number | null;
  scheduledDate: Date | null;
}
export interface Task extends TaskRow {
  group: { id: string; name: string } | null;
  course: { id: string; title: string } | null;
  session: SessionRef | null;
  createdBy: { id: string; name: string; email: string } | null;
  groups: { id: string; name: string; courseId: string }[];
  sessions: SessionRef[];
  courses: { id: string; title: string }[];
}
export interface TaskSubmission extends TaskSubmissionRow {
  student: { id: string; name: string; email: string } | null;
  gradedBy: { id: string; name: string; email: string } | null;
}

export interface TaskFilter {
  /** Tasks targeting any of these groups. */
  groupIds?: string[];
  courseId?: string;
  sessionId?: string;
  status?: string;
  excludeDraft?: boolean;
}

export interface TaskRepository {
  list(filter: TaskFilter, page?: { limit: number; offset: number }): Promise<Task[]>;
  count(filter: TaskFilter): Promise<number>;
  findById(id: string): Promise<Task | null>;
  create(data: NewTaskRow, groupIds: string[], sessionIds: string[]): Promise<string>;
  update(id: string, data: Partial<NewTaskRow>, targets?: { groupIds: string[]; sessionIds: string[] }): Promise<void>;
  delete(id: string): Promise<void>;
  submissions(taskId: string): Promise<TaskSubmission[]>;
  submissionCount(taskId: string): Promise<number>;
  findSubmission(id: string): Promise<TaskSubmissionRow | null>;
  studentSubmission(taskId: string, studentId: string): Promise<TaskSubmissionRow | null>;
  studentSubmissions(taskIds: string[], studentId: string): Promise<Map<string, TaskSubmissionRow>>;
  saveSubmission(taskId: string, studentId: string, data: Omit<typeof taskSubmissions.$inferInsert, 'taskId' | 'studentId'>): Promise<TaskSubmissionRow>;
  updateSubmission(id: string, data: Partial<typeof taskSubmissions.$inferInsert>): Promise<TaskSubmissionRow>;
}

const creator = alias(users, 'task_creator');
const subStudent = alias(users, 'sub_student');
const grader = alias(users, 'sub_grader');
const primarySession = alias(sessions, 'primary_session');

export class DrizzleTaskRepository implements TaskRepository {
  constructor(private readonly db: DbExecutor) {}

  private base() {
    return this.db
      .select({
        t: tasks,
        group: { id: groups.id, name: groups.name },
        course: { id: courses.id, title: courses.title },
        session: { id: primarySession.id, title: primarySession.title, sessionNumber: primarySession.sessionNumber, scheduledDate: primarySession.scheduledDate },
        creator: { id: creator.id, name: creator.name, email: creator.email },
      })
      .from(tasks)
      .leftJoin(groups, eq(groups.id, tasks.groupId))
      .leftJoin(courses, eq(courses.id, tasks.courseId))
      .leftJoin(primarySession, eq(primarySession.id, tasks.sessionId))
      .leftJoin(creator, eq(creator.id, tasks.createdById));
  }

  private async hydrate(rows: Awaited<ReturnType<ReturnType<DrizzleTaskRepository['base']>['execute']>>): Promise<Task[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.t.id);
    const [g, s] = await Promise.all([
      this.db
        .select({ taskId: taskGroups.taskId, id: groups.id, name: groups.name, courseId: groups.courseId, courseTitle: courses.title })
        .from(taskGroups)
        .innerJoin(groups, eq(groups.id, taskGroups.groupId))
        .leftJoin(courses, eq(courses.id, groups.courseId))
        .where(inArray(taskGroups.taskId, ids)),
      this.db
        .select({ taskId: taskSessions.taskId, id: sessions.id, title: sessions.title, sessionNumber: sessions.sessionNumber, scheduledDate: sessions.scheduledDate })
        .from(taskSessions)
        .innerJoin(sessions, eq(sessions.id, taskSessions.sessionId))
        .where(inArray(taskSessions.taskId, ids))
        .orderBy(asc(sessions.scheduledDate)),
    ]);
    const ref = <T extends { id: string } | null>(x: T) => (x?.id ? x : null);
    return rows.map((r) => {
      const own = g.filter((x) => x.taskId === r.t.id);
      const courseMap = new Map(own.filter((x) => x.courseTitle).map((x) => [x.courseId, { id: x.courseId, title: x.courseTitle! }]));
      return {
        ...r.t,
        group: ref(r.group),
        course: ref(r.course),
        session: ref(r.session),
        createdBy: ref(r.creator),
        groups: own.map(({ id, name, courseId }) => ({ id, name, courseId })),
        sessions: s.filter((x) => x.taskId === r.t.id).map(({ taskId: _t, ...rest }) => rest),
        courses: [...courseMap.values()],
      };
    });
  }

  private static where(f: TaskFilter): SQL | undefined {
    return and(
      f.groupIds ? (f.groupIds.length ? inArray(tasks.id, sql`(select ${taskGroups.taskId} from ${taskGroups} where ${inArray(taskGroups.groupId, f.groupIds)})`) : sql`false`) : undefined,
      f.courseId
        ? or(eq(tasks.courseId, f.courseId), inArray(tasks.id, sql`(select ${taskGroups.taskId} from ${taskGroups} join ${groups} on ${groups.id} = ${taskGroups.groupId} where ${groups.courseId} = ${f.courseId})`))
        : undefined,
      f.sessionId ? or(eq(tasks.sessionId, f.sessionId), inArray(tasks.id, sql`(select ${taskSessions.taskId} from ${taskSessions} where ${taskSessions.sessionId} = ${f.sessionId})`)) : undefined,
      f.status ? sql`${tasks.status}::text = ${f.status}` : undefined,
      f.excludeDraft ? ne(tasks.status, 'draft') : undefined,
    );
  }

  async list(f: TaskFilter, page?: { limit: number; offset: number }) {
    let q = this.base().where(DrizzleTaskRepository.where(f)).orderBy(asc(tasks.deadline), desc(tasks.createdAt)).$dynamic();
    if (page) q = q.limit(page.limit).offset(page.offset);
    return this.hydrate(await q);
  }

  async count(f: TaskFilter) {
    const [row] = await this.db.select({ n: count() }).from(tasks).where(DrizzleTaskRepository.where(f));
    return row?.n ?? 0;
  }

  async findById(id: string) {
    const [t] = await this.hydrate(await this.base().where(eq(tasks.id, id)).limit(1));
    return t ?? null;
  }

  private async setTargets(taskId: string, groupIds: string[], sessionIds: string[]) {
    await this.db.delete(taskGroups).where(eq(taskGroups.taskId, taskId));
    await this.db.delete(taskSessions).where(eq(taskSessions.taskId, taskId));
    if (groupIds.length) await this.db.insert(taskGroups).values([...new Set(groupIds)].map((groupId) => ({ taskId, groupId })));
    if (sessionIds.length) await this.db.insert(taskSessions).values([...new Set(sessionIds)].map((sessionId) => ({ taskId, sessionId })));
  }

  async create(data: NewTaskRow, groupIds: string[], sessionIds: string[]) {
    const [row] = await this.db.insert(tasks).values(data).returning({ id: tasks.id });
    if (!row) throw new Error('Insert returned no row');
    await this.setTargets(row.id, groupIds, sessionIds);
    return row.id;
  }

  async update(id: string, data: Partial<NewTaskRow>, targets?: { groupIds: string[]; sessionIds: string[] }) {
    if (Object.keys(data).length) await this.db.update(tasks).set(data).where(eq(tasks.id, id));
    if (targets) await this.setTargets(id, targets.groupIds, targets.sessionIds);
  }

  async delete(id: string) {
    await this.db.delete(tasks).where(eq(tasks.id, id));
  }

  async submissions(taskId: string) {
    const rows = await this.db
      .select({ s: taskSubmissions, student: { id: subStudent.id, name: subStudent.name, email: subStudent.email }, grader: { id: grader.id, name: grader.name, email: grader.email } })
      .from(taskSubmissions)
      .leftJoin(subStudent, eq(subStudent.id, taskSubmissions.studentId))
      .leftJoin(grader, eq(grader.id, taskSubmissions.gradedById))
      .where(eq(taskSubmissions.taskId, taskId))
      .orderBy(desc(taskSubmissions.submittedAt));
    return rows.map((r) => ({ ...r.s, student: r.student?.id ? r.student : null, gradedBy: r.grader?.id ? r.grader : null }));
  }

  async submissionCount(taskId: string) {
    const [row] = await this.db.select({ n: count() }).from(taskSubmissions).where(eq(taskSubmissions.taskId, taskId));
    return row?.n ?? 0;
  }

  async findSubmission(id: string) {
    const [row] = await this.db.select().from(taskSubmissions).where(eq(taskSubmissions.id, id)).limit(1);
    return row ?? null;
  }

  async studentSubmission(taskId: string, studentId: string) {
    const [row] = await this.db.select().from(taskSubmissions).where(and(eq(taskSubmissions.taskId, taskId), eq(taskSubmissions.studentId, studentId))).limit(1);
    return row ?? null;
  }

  async studentSubmissions(taskIds: string[], studentId: string) {
    if (taskIds.length === 0) return new Map();
    const rows = await this.db.select().from(taskSubmissions).where(and(inArray(taskSubmissions.taskId, taskIds), eq(taskSubmissions.studentId, studentId)));
    return new Map(rows.map((r) => [r.taskId, r]));
  }

  async saveSubmission(taskId: string, studentId: string, data: Omit<typeof taskSubmissions.$inferInsert, 'taskId' | 'studentId'>) {
    const [row] = await this.db
      .insert(taskSubmissions)
      .values({ taskId, studentId, ...data })
      .onConflictDoUpdate({ target: [taskSubmissions.taskId, taskSubmissions.studentId], set: { ...data, updatedAt: new Date() } })
      .returning();
    if (!row) throw new Error('Upsert returned no row');
    return row;
  }

  async updateSubmission(id: string, data: Partial<typeof taskSubmissions.$inferInsert>) {
    const [row] = await this.db.update(taskSubmissions).set(data).where(eq(taskSubmissions.id, id)).returning();
    if (!row) throw new Error('Submission vanished');
    return row;
  }
}
