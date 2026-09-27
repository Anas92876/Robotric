import { and, asc, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import type { DbExecutor } from '../../shared/db/client';
import { courseModules } from '../course-modules/course-modules.table';
import { courses } from '../courses/courses.table';
import { users } from '../users/users.table';
import { type AssignmentRow, assignments, assignmentSubmissions, type SubmissionRow } from './assignments.table';

export interface Assignment extends AssignmentRow {
  module: { id: string; title: string; order: number } | null;
  course: { id: string; title: string } | null;
}

export interface AssignmentRepository {
  findById(id: string): Promise<Assignment | null>;
  /** Active assignments of these courses due between the two dates, soonest first. */
  dueBetween(courseIds: string[], from: Date, to: Date): Promise<Assignment[]>;
  /** Every submission the student has made. */
  submissionsOf(studentId: string): Promise<SubmissionRow[]>;
  latestSubmission(studentId: string, assignmentId: string): Promise<SubmissionRow | null>;
  submissions(studentId: string, assignmentId: string): Promise<SubmissionRow[]>;
  /** Names of graders, for populating `grade.gradedBy`. */
  userNames(ids: string[]): Promise<Map<string, string>>;
  findSubmission(id: string, studentId: string): Promise<SubmissionRow | null>;
  createSubmission(data: typeof assignmentSubmissions.$inferInsert): Promise<SubmissionRow>;
  updateSubmission(id: string, data: Partial<typeof assignmentSubmissions.$inferInsert>): Promise<SubmissionRow>;
  deleteSubmission(id: string): Promise<void>;
}

export class DrizzleAssignmentRepository implements AssignmentRepository {
  constructor(private readonly db: DbExecutor) {}

  async dueBetween(courseIds: string[], from: Date, to: Date) {
    if (courseIds.length === 0) return [];
    const rows = await this.db
      .select({ a: assignments, module: { id: courseModules.id, title: courseModules.title, order: courseModules.order }, course: { id: courses.id, title: courses.title } })
      .from(assignments)
      .leftJoin(courseModules, eq(courseModules.id, assignments.moduleId))
      .leftJoin(courses, eq(courses.id, assignments.courseId))
      .where(and(inArray(assignments.courseId, courseIds), gte(assignments.dueDate, from), lte(assignments.dueDate, to), eq(assignments.isActive, true)))
      .orderBy(asc(assignments.dueDate));
    return rows.map((r) => ({ ...r.a, module: r.module?.id ? r.module : null, course: r.course?.id ? r.course : null }));
  }

  submissionsOf(studentId: string) {
    return this.db.select().from(assignmentSubmissions).where(eq(assignmentSubmissions.studentId, studentId));
  }

  async findById(id: string) {
    const [row] = await this.db
      .select({ a: assignments, module: { id: courseModules.id, title: courseModules.title, order: courseModules.order }, course: { id: courses.id, title: courses.title } })
      .from(assignments)
      .leftJoin(courseModules, eq(courseModules.id, assignments.moduleId))
      .leftJoin(courses, eq(courses.id, assignments.courseId))
      .where(eq(assignments.id, id))
      .limit(1);
    if (!row) return null;
    return { ...row.a, module: row.module?.id ? row.module : null, course: row.course?.id ? row.course : null };
  }

  async latestSubmission(studentId: string, assignmentId: string) {
    const [row] = await this.submissions(studentId, assignmentId);
    return row ?? null;
  }

  submissions(studentId: string, assignmentId: string) {
    return this.db
      .select()
      .from(assignmentSubmissions)
      .where(and(eq(assignmentSubmissions.studentId, studentId), eq(assignmentSubmissions.assignmentId, assignmentId)))
      .orderBy(desc(assignmentSubmissions.version));
  }

  async userNames(ids: string[]) {
    const result = new Map<string, string>();
    for (const id of new Set(ids)) {
      const [u] = await this.db.select({ name: users.name }).from(users).where(eq(users.id, id)).limit(1);
      if (u) result.set(id, u.name);
    }
    return result;
  }

  async findSubmission(id: string, studentId: string) {
    const [row] = await this.db
      .select()
      .from(assignmentSubmissions)
      .where(and(eq(assignmentSubmissions.id, id), eq(assignmentSubmissions.studentId, studentId)))
      .limit(1);
    return row ?? null;
  }

  async createSubmission(data: typeof assignmentSubmissions.$inferInsert) {
    const [row] = await this.db.insert(assignmentSubmissions).values(data).returning();
    if (!row) throw new Error('Insert returned no row');
    return row;
  }

  async updateSubmission(id: string, data: Partial<typeof assignmentSubmissions.$inferInsert>) {
    const [row] = await this.db.update(assignmentSubmissions).set(data).where(eq(assignmentSubmissions.id, id)).returning();
    if (!row) throw new Error('Submission vanished');
    return row;
  }

  async deleteSubmission(id: string) {
    await this.db.delete(assignmentSubmissions).where(eq(assignmentSubmissions.id, id));
  }
}
