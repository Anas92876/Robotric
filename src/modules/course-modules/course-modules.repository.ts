import { and, asc, count, desc, eq, gt, inArray, lt } from 'drizzle-orm';
import type { DbExecutor } from '../../shared/db/client';
import { assignments } from '../assignments/assignments.table';
import { quizzes } from '../quizzes/quizzes.table';
import { type CourseModuleRow, courseModules, type ModuleProgressRow, moduleProgress, type NewCourseModuleRow } from './course-modules.table';

export interface CourseModule extends CourseModuleRow {
  quiz: { id: string; title: string; description: string | null; passingScore: number; timeLimit: number | null; maxAttempts: number } | null;
  assignment: { id: string; title: string; description: string; dueDate: Date; maxScore: number; allowedFileTypes: string[] } | null;
}

export interface CourseModuleRepository {
  findById(id: string): Promise<CourseModule | null>;
  findRow(id: string): Promise<CourseModuleRow | null>;
  /** The next (`after`) or previous (`before`) active module of the course by order. */
  neighbour(courseId: string, order: number, direction: 'after' | 'before'): Promise<CourseModuleRow | null>;
  countActive(courseId: string): Promise<number>;
  create(data: NewCourseModuleRow): Promise<string>;
  /** Module ids per course, in order (the old `course.modules` array). */
  idsByCourse(courseIds: string[]): Promise<Map<string, string[]>>;
  findByCourse(courseId: string): Promise<CourseModuleRow[]>;
}

export interface ModuleProgressRepository {
  find(studentId: string, moduleId: string): Promise<ModuleProgressRow | null>;
  /** Existing progress, or a fresh "not started" record. */
  getOrCreate(studentId: string, moduleId: string, courseId: string): Promise<ModuleProgressRow>;
  update(id: string, data: Partial<typeof moduleProgress.$inferInsert>): Promise<ModuleProgressRow>;
  isCompleted(studentId: string, moduleId: string): Promise<boolean>;
  forStudentInCourse(studentId: string, courseId: string): Promise<ModuleProgressRow[]>;
}

export class DrizzleCourseModuleRepository implements CourseModuleRepository {
  constructor(private readonly db: DbExecutor) {}

  async findById(id: string): Promise<CourseModule | null> {
    const [row] = await this.db
      .select({
        m: courseModules,
        quiz: { id: quizzes.id, title: quizzes.title, description: quizzes.description, passingScore: quizzes.passingScore, timeLimit: quizzes.timeLimit, maxAttempts: quizzes.maxAttempts },
        assignment: {
          id: assignments.id,
          title: assignments.title,
          description: assignments.description,
          dueDate: assignments.dueDate,
          maxScore: assignments.maxScore,
          allowedFileTypes: assignments.allowedFileTypes,
        },
      })
      .from(courseModules)
      .leftJoin(quizzes, eq(quizzes.id, courseModules.quizId))
      .leftJoin(assignments, eq(assignments.id, courseModules.assignmentId))
      .where(eq(courseModules.id, id))
      .limit(1);
    if (!row) return null;
    return { ...row.m, quiz: row.quiz?.id ? row.quiz : null, assignment: row.assignment?.id ? row.assignment : null };
  }

  async findRow(id: string) {
    const [row] = await this.db.select().from(courseModules).where(eq(courseModules.id, id)).limit(1);
    return row ?? null;
  }

  async neighbour(courseId: string, order: number, direction: 'after' | 'before') {
    const [row] = await this.db
      .select()
      .from(courseModules)
      .where(and(eq(courseModules.courseId, courseId), eq(courseModules.isActive, true), direction === 'after' ? gt(courseModules.order, order) : lt(courseModules.order, order)))
      .orderBy(direction === 'after' ? asc(courseModules.order) : desc(courseModules.order))
      .limit(1);
    return row ?? null;
  }

  async countActive(courseId: string) {
    const [row] = await this.db.select({ n: count() }).from(courseModules).where(and(eq(courseModules.courseId, courseId), eq(courseModules.isActive, true)));
    return row?.n ?? 0;
  }

  async create(data: NewCourseModuleRow) {
    const [row] = await this.db.insert(courseModules).values(data).returning({ id: courseModules.id });
    if (!row) throw new Error('Insert returned no row');
    return row.id;
  }

  async idsByCourse(courseIds: string[]) {
    const result = new Map<string, string[]>(courseIds.map((id) => [id, []]));
    if (courseIds.length === 0) return result;
    const rows = await this.db
      .select({ id: courseModules.id, courseId: courseModules.courseId })
      .from(courseModules)
      .where(inArray(courseModules.courseId, courseIds))
      .orderBy(asc(courseModules.order), asc(courseModules.createdAt));
    for (const r of rows) result.get(r.courseId)?.push(r.id);
    return result;
  }

  findByCourse(courseId: string) {
    return this.db.select().from(courseModules).where(eq(courseModules.courseId, courseId)).orderBy(asc(courseModules.order));
  }
}

export class DrizzleModuleProgressRepository implements ModuleProgressRepository {
  constructor(private readonly db: DbExecutor) {}

  async find(studentId: string, moduleId: string) {
    const [row] = await this.db
      .select()
      .from(moduleProgress)
      .where(and(eq(moduleProgress.studentId, studentId), eq(moduleProgress.moduleId, moduleId)))
      .limit(1);
    return row ?? null;
  }

  async getOrCreate(studentId: string, moduleId: string, courseId: string) {
    await this.db.insert(moduleProgress).values({ studentId, moduleId, courseId, status: 'not_started' }).onConflictDoNothing();
    return (await this.find(studentId, moduleId))!;
  }

  async update(id: string, data: Partial<typeof moduleProgress.$inferInsert>) {
    const [row] = await this.db.update(moduleProgress).set(data).where(eq(moduleProgress.id, id)).returning();
    if (!row) throw new Error('Progress row vanished');
    return row;
  }

  async isCompleted(studentId: string, moduleId: string) {
    return (await this.find(studentId, moduleId))?.status === 'completed';
  }

  forStudentInCourse(studentId: string, courseId: string) {
    return this.db.select().from(moduleProgress).where(and(eq(moduleProgress.studentId, studentId), eq(moduleProgress.courseId, courseId)));
  }
}
