import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { DbExecutor } from '../../shared/db/client';
import { escapeLike } from '../../shared/db/like';
import { users } from '../users/users.table';
import { type CourseRow, courses, type NewCourseRow } from './courses.table';

export interface InstructorRef {
  id: string;
  name: string;
  email: string;
}

export interface CourseWithInstructor extends CourseRow {
  instructor: InstructorRef | null;
}

export const COURSE_SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'price', 'category', 'level', 'status', 'totalHours'] as const;
export type CourseSortField = (typeof COURSE_SORT_FIELDS)[number];

export interface CourseFilter {
  status?: string;
  category?: string;
  search?: string;
  type?: string;
  /** Sub-courses are hidden unless asked for; they appear nested under their bundle. */
  includeSubCourses?: boolean;
  sortBy?: CourseSortField;
  order?: 'asc' | 'desc';
}

export interface CourseRepository {
  list(filter: CourseFilter): Promise<CourseWithInstructor[]>;
  findById(id: string): Promise<CourseWithInstructor | null>;
  /** Sub-courses of the given bundles, keyed by bundle id, in the order they were added. */
  subCoursesOf(bundleIds: string[]): Promise<Map<string, CourseWithInstructor[]>>;
  create(data: NewCourseRow): Promise<CourseRow>;
  update(id: string, data: Partial<NewCourseRow>): Promise<void>;
  /** Links or unlinks a course to/from a bundle. */
  setParentBundle(courseId: string, bundleId: string | null): Promise<void>;
  /** Detaches every sub-course of a bundle. */
  detachAllFrom(bundleId: string): Promise<void>;
  delete(id: string): Promise<void>;
}

const instructor = alias(users, 'instructor');

export class DrizzleCourseRepository implements CourseRepository {
  constructor(private readonly db: DbExecutor) {}

  private query() {
    return this.db
      .select({ course: courses, instructor: { id: instructor.id, name: instructor.name, email: instructor.email } })
      .from(courses)
      .leftJoin(instructor, eq(instructor.id, courses.instructorId));
  }

  private static merge(row: { course: CourseRow; instructor: InstructorRef | null }): CourseWithInstructor {
    return { ...row.course, instructor: row.instructor?.id ? row.instructor : null };
  }

  async list(f: CourseFilter): Promise<CourseWithInstructor[]> {
    const search = f.search ? `%${escapeLike(f.search)}%` : null;
    const sortColumn = courses[f.sortBy ?? 'createdAt'];
    const rows = await this.query()
      .where(
        and(
          f.status ? sql`${courses.status}::text = ${f.status}` : undefined,
          f.category ? eq(courses.category, f.category) : undefined,
          f.type ? sql`${courses.type}::text = ${f.type}` : undefined,
          search ? or(ilike(courses.title, search), ilike(courses.description, search)) : undefined,
          f.includeSubCourses ? undefined : isNull(courses.parentBundleId),
        ),
      )
      .orderBy(f.order === 'asc' ? asc(sortColumn) : desc(sortColumn));
    return rows.map(DrizzleCourseRepository.merge);
  }

  async findById(id: string): Promise<CourseWithInstructor | null> {
    const [row] = await this.query().where(eq(courses.id, id)).limit(1);
    return row ? DrizzleCourseRepository.merge(row) : null;
  }

  async subCoursesOf(bundleIds: string[]): Promise<Map<string, CourseWithInstructor[]>> {
    const result = new Map<string, CourseWithInstructor[]>(bundleIds.map((id) => [id, []]));
    if (bundleIds.length === 0) return result;
    const rows = await this.query()
      .where(inArray(courses.parentBundleId, bundleIds))
      .orderBy(asc(courses.bundleLinkedAt), asc(courses.createdAt));
    for (const row of rows) {
      const course = DrizzleCourseRepository.merge(row);
      if (course.parentBundleId) result.get(course.parentBundleId)?.push(course);
    }
    return result;
  }

  async create(data: NewCourseRow): Promise<CourseRow> {
    const [row] = await this.db.insert(courses).values(data).returning();
    if (!row) throw new Error('Insert returned no row');
    return row;
  }

  async update(id: string, data: Partial<NewCourseRow>): Promise<void> {
    await this.db.update(courses).set(data).where(eq(courses.id, id));
  }

  async setParentBundle(courseId: string, bundleId: string | null): Promise<void> {
    await this.db
      .update(courses)
      .set({ parentBundleId: bundleId, bundleLinkedAt: bundleId ? new Date() : null })
      .where(eq(courses.id, courseId));
  }

  async detachAllFrom(bundleId: string): Promise<void> {
    await this.db.update(courses).set({ parentBundleId: null, bundleLinkedAt: null }).where(eq(courses.parentBundleId, bundleId));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(courses).where(eq(courses.id, id));
  }
}
