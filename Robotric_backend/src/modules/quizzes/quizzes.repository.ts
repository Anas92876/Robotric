import { and, count, desc, eq, inArray, max } from 'drizzle-orm';
import type { DbExecutor } from '../../shared/db/client';
import { courseModules } from '../course-modules/course-modules.table';
import { courses } from '../courses/courses.table';
import { groups } from '../groups/groups.table';
import { sessions } from '../sessions/sessions.table';
import { type NewQuizRow, type QuizAttemptRow, quizAttempts, type QuizRow, quizzes } from './quizzes.table';

export interface Quiz extends QuizRow {
  course: { id: string; title: string; category: string } | null;
  module: { id: string; title: string; order: number } | null;
  session: { id: string; title: string; scheduledDate: Date | null } | null;
  group: { id: string; name: string } | null;
}

export interface QuizRepository {
  findById(id: string): Promise<Quiz | null>;
  listForCourses(courseIds: string[]): Promise<Quiz[]>;
  listForSessions(sessionIds: string[]): Promise<Quiz[]>;
  create(data: NewQuizRow): Promise<string>;
  update(id: string, data: Partial<NewQuizRow>): Promise<void>;
  delete(id: string): Promise<void>;
  // Attempts
  submittedCount(studentId: string, quizId: string): Promise<number>;
  inProgress(studentId: string, quizId: string): Promise<QuizAttemptRow | null>;
  createAttempt(data: typeof quizAttempts.$inferInsert): Promise<QuizAttemptRow>;
  findAttempt(id: string, studentId: string, quizId: string): Promise<QuizAttemptRow | null>;
  updateAttempt(id: string, data: Partial<typeof quizAttempts.$inferInsert>): Promise<QuizAttemptRow>;
  submittedAttempts(studentId: string, quizId: string): Promise<QuizAttemptRow[]>;
  bestScore(studentId: string, quizId: string): Promise<number | null>;
  /** Every attempt of the student on these quizzes. */
  attemptsFor(studentId: string, quizIds: string[]): Promise<QuizAttemptRow[]>;
  /** All the student's submitted attempts, on any quiz. */
  submittedAttemptsOf(studentId: string): Promise<QuizAttemptRow[]>;
}

export class DrizzleQuizRepository implements QuizRepository {
  constructor(private readonly db: DbExecutor) {}

  private base() {
    return this.db
      .select({
        q: quizzes,
        course: { id: courses.id, title: courses.title, category: courses.category },
        module: { id: courseModules.id, title: courseModules.title, order: courseModules.order },
        session: { id: sessions.id, title: sessions.title, scheduledDate: sessions.scheduledDate },
        group: { id: groups.id, name: groups.name },
      })
      .from(quizzes)
      .leftJoin(courses, eq(courses.id, quizzes.courseId))
      .leftJoin(courseModules, eq(courseModules.id, quizzes.moduleId))
      .leftJoin(sessions, eq(sessions.id, quizzes.sessionId))
      .leftJoin(groups, eq(groups.id, quizzes.groupId));
  }

  private static merge(r: { q: QuizRow; course: Quiz['course']; module: Quiz['module']; session: Quiz['session']; group: Quiz['group'] }): Quiz {
    const ref = <T extends { id: string } | null>(x: T) => (x?.id ? x : null);
    return { ...r.q, course: ref(r.course), module: ref(r.module), session: ref(r.session), group: ref(r.group) };
  }

  async findById(id: string) {
    const [row] = await this.base().where(eq(quizzes.id, id)).limit(1);
    return row ? DrizzleQuizRepository.merge(row) : null;
  }

  async listForSessions(sessionIds: string[]) {
    if (sessionIds.length === 0) return [];
    return (await this.base().where(inArray(quizzes.sessionId, sessionIds))).map(DrizzleQuizRepository.merge);
  }

  submittedAttemptsOf(studentId: string) {
    return this.db.select().from(quizAttempts).where(and(eq(quizAttempts.studentId, studentId), eq(quizAttempts.status, 'submitted')));
  }

  async attemptsFor(studentId: string, quizIds: string[]) {
    if (quizIds.length === 0) return [];
    return this.db.select().from(quizAttempts).where(and(eq(quizAttempts.studentId, studentId), inArray(quizAttempts.quizId, quizIds)));
  }

  async listForCourses(courseIds: string[]) {
    if (courseIds.length === 0) return [];
    const rows = await this.base().where(inArray(quizzes.courseId, courseIds)).orderBy(desc(quizzes.createdAt));
    return rows.map(DrizzleQuizRepository.merge);
  }

  async create(data: NewQuizRow) {
    const [row] = await this.db.insert(quizzes).values(data).returning({ id: quizzes.id });
    if (!row) throw new Error('Insert returned no row');
    return row.id;
  }

  async update(id: string, data: Partial<NewQuizRow>) {
    await this.db.update(quizzes).set(data).where(eq(quizzes.id, id));
  }

  async delete(id: string) {
    await this.db.delete(quizzes).where(eq(quizzes.id, id));
  }

  async submittedCount(studentId: string, quizId: string) {
    const [row] = await this.db
      .select({ n: count() })
      .from(quizAttempts)
      .where(and(eq(quizAttempts.studentId, studentId), eq(quizAttempts.quizId, quizId), eq(quizAttempts.status, 'submitted')));
    return row?.n ?? 0;
  }

  async inProgress(studentId: string, quizId: string) {
    const [row] = await this.db
      .select()
      .from(quizAttempts)
      .where(and(eq(quizAttempts.studentId, studentId), eq(quizAttempts.quizId, quizId), eq(quizAttempts.status, 'in_progress')))
      .limit(1);
    return row ?? null;
  }

  async createAttempt(data: typeof quizAttempts.$inferInsert) {
    const [row] = await this.db.insert(quizAttempts).values(data).returning();
    if (!row) throw new Error('Insert returned no row');
    return row;
  }

  async findAttempt(id: string, studentId: string, quizId: string) {
    const [row] = await this.db
      .select()
      .from(quizAttempts)
      .where(and(eq(quizAttempts.id, id), eq(quizAttempts.studentId, studentId), eq(quizAttempts.quizId, quizId)))
      .limit(1);
    return row ?? null;
  }

  async updateAttempt(id: string, data: Partial<typeof quizAttempts.$inferInsert>) {
    const [row] = await this.db.update(quizAttempts).set(data).where(eq(quizAttempts.id, id)).returning();
    if (!row) throw new Error('Attempt vanished');
    return row;
  }

  submittedAttempts(studentId: string, quizId: string) {
    return this.db
      .select()
      .from(quizAttempts)
      .where(and(eq(quizAttempts.studentId, studentId), eq(quizAttempts.quizId, quizId), eq(quizAttempts.status, 'submitted')))
      .orderBy(desc(quizAttempts.attemptNumber));
  }

  async bestScore(studentId: string, quizId: string) {
    const [row] = await this.db
      .select({ best: max(quizAttempts.score) })
      .from(quizAttempts)
      .where(and(eq(quizAttempts.studentId, studentId), eq(quizAttempts.quizId, quizId), eq(quizAttempts.status, 'submitted')));
    return row?.best ?? null;
  }
}
