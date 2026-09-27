import { and, asc, count, desc, eq, exists, gte, inArray, lte, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { DbExecutor } from '../../shared/db/client';
import { courses } from '../courses/courses.table';
import { groups } from '../groups/groups.table';
import { sessions } from '../sessions/sessions.table';
import { type UserProfile, users } from '../users/users.table';
import {
  type CriteriaRow,
  evaluationCriteria,
  evaluationCriteriaCourses,
  evaluationCriteriaGroups,
  type NewStudentEvaluationRow,
  type StudentEvaluationRow,
  studentEvaluations,
} from './evaluations.table';

export interface Criteria extends CriteriaRow {
  courses: { id: string; title: string; category: string; level: string }[];
  groups: { id: string; name: string }[];
}

export interface Evaluation extends StudentEvaluationRow {
  student: { id: string; name: string; email: string } | null;
  trainer: { id: string; name: string; email: string; profile: UserProfile | null } | null;
  session: { id: string; title: string; scheduledDate: Date | null; duration: number; sessionNumber: number | null; lessonPlan: unknown } | null;
  group: { id: string; name: string; courseId: string } | null;
  course: { id: string; title: string; category: string; level: string } | null;
}

export interface EvaluationFilter {
  trainerId?: string;
  studentId?: string;
  sessionId?: string;
  groupId?: string;
  groupIds?: string[];
  minRating?: number;
  maxRating?: number;
  needsAttention?: boolean;
  atRisk?: boolean;
  excelling?: boolean;
  participationLevel?: string;
  startDate?: Date;
  endDate?: Date;
}

export const EVALUATION_SORT_FIELDS = ['evaluationDate', 'overallRating', 'createdAt', 'updatedAt'] as const;
export type EvaluationSort = { by: (typeof EVALUATION_SORT_FIELDS)[number]; order: 'asc' | 'desc' };

export interface EvaluationRepository {
  listCriteria(filter: { createdById: string; courseId?: string; status?: string }): Promise<Criteria[]>;
  findCriteria(id: string): Promise<Criteria | null>;
  createCriteria(row: typeof evaluationCriteria.$inferInsert, courseIds: string[], groupIds: string[]): Promise<string>;
  updateCriteria(id: string, row: Partial<typeof evaluationCriteria.$inferInsert>, links: { courseIds?: string[]; groupIds?: string[] }): Promise<void>;
  deleteCriteria(id: string): Promise<void>;
  /** The newest active criteria for the group, else for its course, else for the course's bundle. */
  criteriaForGroup(groupId: string, courseIds: string[]): Promise<Criteria | null>;

  list(filter: EvaluationFilter, sort?: EvaluationSort, page?: { limit: number; offset: number }): Promise<Evaluation[]>;
  count(filter: EvaluationFilter): Promise<number>;
  findById(id: string): Promise<Evaluation | null>;
  findForSessionStudent(sessionId: string, studentId: string): Promise<StudentEvaluationRow | null>;
  create(row: NewStudentEvaluationRow): Promise<string>;
  update(id: string, patch: Partial<NewStudentEvaluationRow>): Promise<void>;
  delete(id: string): Promise<void>;
}

const student = alias(users, 'eval_student');
const trainer = alias(users, 'eval_trainer');

function evaluationWhere(f: EvaluationFilter): SQL | undefined {
  const e = studentEvaluations;
  return and(
    f.trainerId ? eq(e.trainerId, f.trainerId) : undefined,
    f.studentId ? eq(e.studentId, f.studentId) : undefined,
    f.sessionId ? eq(e.sessionId, f.sessionId) : undefined,
    f.groupId ? eq(e.groupId, f.groupId) : undefined,
    f.groupIds ? (f.groupIds.length ? inArray(e.groupId, f.groupIds) : sql`false`) : undefined,
    f.minRating !== undefined ? gte(e.overallRating, f.minRating) : undefined,
    f.maxRating !== undefined ? lte(e.overallRating, f.maxRating) : undefined,
    f.needsAttention ? eq(e.needsAttention, true) : undefined,
    f.atRisk ? eq(e.atRisk, true) : undefined,
    f.excelling ? eq(e.excelling, true) : undefined,
    f.participationLevel ? sql`${e.participation}->>'level' = ${f.participationLevel}` : undefined,
    f.startDate ? gte(e.evaluationDate, f.startDate) : undefined,
    f.endDate ? lte(e.evaluationDate, f.endDate) : undefined,
  );
}

export class DrizzleEvaluationRepository implements EvaluationRepository {
  constructor(private readonly db: DbExecutor) {}

  // ---- Criteria ----

  private async hydrateCriteria(rows: CriteriaRow[]): Promise<Criteria[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const [courseLinks, groupLinks] = await Promise.all([
      this.db
        .select({ criteriaId: evaluationCriteriaCourses.criteriaId, id: courses.id, title: courses.title, category: courses.category, level: courses.level })
        .from(evaluationCriteriaCourses)
        .innerJoin(courses, eq(courses.id, evaluationCriteriaCourses.courseId))
        .where(inArray(evaluationCriteriaCourses.criteriaId, ids))
        .orderBy(asc(evaluationCriteriaCourses.position)),
      this.db
        .select({ criteriaId: evaluationCriteriaGroups.criteriaId, id: groups.id, name: groups.name })
        .from(evaluationCriteriaGroups)
        .innerJoin(groups, eq(groups.id, evaluationCriteriaGroups.groupId))
        .where(inArray(evaluationCriteriaGroups.criteriaId, ids))
        .orderBy(asc(evaluationCriteriaGroups.position)),
    ]);
    return rows.map((r) => ({
      ...r,
      courses: courseLinks.filter((c) => c.criteriaId === r.id).map(({ criteriaId: _c, ...c }) => c),
      groups: groupLinks.filter((g) => g.criteriaId === r.id).map(({ criteriaId: _c, ...g }) => g),
    }));
  }

  async listCriteria(f: { createdById: string; courseId?: string; status?: string }) {
    const c = evaluationCriteria;
    const rows = await this.db
      .select()
      .from(c)
      .where(
        and(
          eq(c.createdById, f.createdById),
          f.status ? sql`${c.status}::text = ${f.status}` : undefined,
          f.courseId
            ? exists(
                this.db
                  .select({ one: sql`1` })
                  .from(evaluationCriteriaCourses)
                  .where(and(eq(evaluationCriteriaCourses.criteriaId, c.id), eq(evaluationCriteriaCourses.courseId, f.courseId))),
              )
            : undefined,
        ),
      )
      .orderBy(desc(c.updatedAt));
    return this.hydrateCriteria(rows);
  }

  async findCriteria(id: string) {
    const rows = await this.db.select().from(evaluationCriteria).where(eq(evaluationCriteria.id, id)).limit(1);
    return (await this.hydrateCriteria(rows))[0] ?? null;
  }

  private async setLinks(tx: DbExecutor, id: string, links: { courseIds?: string[]; groupIds?: string[] }) {
    if (links.courseIds) {
      await tx.delete(evaluationCriteriaCourses).where(eq(evaluationCriteriaCourses.criteriaId, id));
      if (links.courseIds.length) await tx.insert(evaluationCriteriaCourses).values(links.courseIds.map((courseId, position) => ({ criteriaId: id, courseId, position })));
    }
    if (links.groupIds) {
      await tx.delete(evaluationCriteriaGroups).where(eq(evaluationCriteriaGroups.criteriaId, id));
      if (links.groupIds.length) await tx.insert(evaluationCriteriaGroups).values(links.groupIds.map((groupId, position) => ({ criteriaId: id, groupId, position })));
    }
  }

  async createCriteria(row: typeof evaluationCriteria.$inferInsert, courseIds: string[], groupIds: string[]) {
    return this.db.transaction(async (tx) => {
      const [created] = await tx.insert(evaluationCriteria).values(row).returning({ id: evaluationCriteria.id });
      if (!created) throw new Error('Insert returned no row');
      await this.setLinks(tx, created.id, { courseIds, groupIds });
      return created.id;
    });
  }

  async updateCriteria(id: string, row: Partial<typeof evaluationCriteria.$inferInsert>, links: { courseIds?: string[]; groupIds?: string[] }) {
    await this.db.transaction(async (tx) => {
      await tx.update(evaluationCriteria).set({ ...row, updatedAt: new Date() }).where(eq(evaluationCriteria.id, id));
      await this.setLinks(tx, id, links);
    });
  }

  async deleteCriteria(id: string) {
    await this.db.delete(evaluationCriteria).where(eq(evaluationCriteria.id, id));
  }

  async criteriaForGroup(groupId: string, courseIds: string[]) {
    const c = evaluationCriteria;
    const newest = (where: SQL) => this.db.select().from(c).where(and(eq(c.status, 'active'), where)).orderBy(desc(c.updatedAt)).limit(1);
    const [forGroup] = await newest(
      and(
        eq(c.appliesTo, 'groups'),
        exists(this.db.select({ one: sql`1` }).from(evaluationCriteriaGroups).where(and(eq(evaluationCriteriaGroups.criteriaId, c.id), eq(evaluationCriteriaGroups.groupId, groupId)))),
      )!,
    );
    if (forGroup) return this.findCriteria(forGroup.id);
    for (const courseId of courseIds) {
      const [forCourse] = await newest(
        and(
          eq(c.appliesTo, 'course'),
          exists(this.db.select({ one: sql`1` }).from(evaluationCriteriaCourses).where(and(eq(evaluationCriteriaCourses.criteriaId, c.id), eq(evaluationCriteriaCourses.courseId, courseId)))),
        )!,
      );
      if (forCourse) return this.findCriteria(forCourse.id);
    }
    return null;
  }

  // ---- Evaluations ----

  private base() {
    return this.db
      .select({
        e: studentEvaluations,
        student: { id: student.id, name: student.name, email: student.email },
        trainer: { id: trainer.id, name: trainer.name, email: trainer.email, profile: trainer.profile },
        session: {
          id: sessions.id,
          title: sessions.title,
          scheduledDate: sessions.scheduledDate,
          duration: sessions.duration,
          sessionNumber: sessions.sessionNumber,
          lessonPlan: sessions.lessonPlan,
        },
        group: { id: groups.id, name: groups.name, courseId: groups.courseId },
        course: { id: courses.id, title: courses.title, category: courses.category, level: courses.level },
      })
      .from(studentEvaluations)
      .leftJoin(student, eq(student.id, studentEvaluations.studentId))
      .leftJoin(trainer, eq(trainer.id, studentEvaluations.trainerId))
      .leftJoin(sessions, eq(sessions.id, studentEvaluations.sessionId))
      .leftJoin(groups, eq(groups.id, studentEvaluations.groupId))
      .leftJoin(courses, eq(courses.id, groups.courseId));
  }

  private static merge(r: Awaited<ReturnType<DrizzleEvaluationRepository['base']>>[number]): Evaluation {
    return {
      ...r.e,
      student: r.student?.id ? r.student : null,
      trainer: r.trainer?.id ? r.trainer : null,
      session: r.session?.id ? r.session : null,
      group: r.group?.id ? r.group : null,
      course: r.course?.id ? r.course : null,
    };
  }

  async list(f: EvaluationFilter, sort: EvaluationSort = { by: 'evaluationDate', order: 'desc' }, page?: { limit: number; offset: number }) {
    const column = studentEvaluations[sort.by];
    let q = this.base()
      .where(evaluationWhere(f))
      .orderBy(sort.order === 'asc' ? asc(column) : desc(column), desc(studentEvaluations.createdAt))
      .$dynamic();
    if (page) q = q.limit(page.limit).offset(page.offset);
    return (await q).map(DrizzleEvaluationRepository.merge);
  }

  async count(f: EvaluationFilter) {
    const [row] = await this.db.select({ n: count() }).from(studentEvaluations).where(evaluationWhere(f));
    return row?.n ?? 0;
  }

  async findById(id: string) {
    const [row] = await this.base().where(eq(studentEvaluations.id, id)).limit(1);
    return row ? DrizzleEvaluationRepository.merge(row) : null;
  }

  async findForSessionStudent(sessionId: string, studentId: string) {
    const [row] = await this.db
      .select()
      .from(studentEvaluations)
      .where(and(eq(studentEvaluations.sessionId, sessionId), eq(studentEvaluations.studentId, studentId)))
      .limit(1);
    return row ?? null;
  }

  async create(row: NewStudentEvaluationRow) {
    const [created] = await this.db.insert(studentEvaluations).values(row).returning({ id: studentEvaluations.id });
    if (!created) throw new Error('Insert returned no row');
    return created.id;
  }

  async update(id: string, patch: Partial<NewStudentEvaluationRow>) {
    await this.db.update(studentEvaluations).set({ ...patch, updatedAt: new Date() }).where(eq(studentEvaluations.id, id));
  }

  async delete(id: string) {
    await this.db.delete(studentEvaluations).where(eq(studentEvaluations.id, id));
  }
}
