import { and, count, desc, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { DbExecutor } from '../../shared/db/client';
import { courses } from '../courses/courses.table';
import { groups } from '../groups/groups.table';
import { users } from '../users/users.table';
import { type NewStudentProjectRow, type StudentProjectRow, studentProjects } from './student-projects.table';

type Person = { id: string; name: string; email: string } | null;

export interface StudentProject extends StudentProjectRow {
  student: Person;
  createdBy: Person;
  gradedBy: Person;
  group: { id: string; name: string } | null;
  course: { id: string; title: string } | null;
}

export interface ProjectFilter {
  studentId?: string;
  groupId?: string;
  /** Projects of these groups, or (with `orStudentId`) the student's own. */
  groupIds?: string[];
  orStudentId?: string;
  courseId?: string;
  status?: string;
}

export interface StudentProjectRepository {
  list(filter: ProjectFilter, page?: { limit: number; offset: number }): Promise<StudentProject[]>;
  count(filter: ProjectFilter): Promise<number>;
  findById(id: string): Promise<StudentProject | null>;
  create(row: NewStudentProjectRow): Promise<string>;
  update(id: string, patch: Partial<NewStudentProjectRow>): Promise<void>;
  delete(id: string): Promise<void>;
}

const student = alias(users, 'project_student');
const creator = alias(users, 'project_creator');
const grader = alias(users, 'project_grader');

function where(f: ProjectFilter): SQL | undefined {
  const p = studentProjects;
  const scope = f.groupIds
    ? or(f.groupIds.length ? inArray(p.groupId, f.groupIds) : sql`false`, f.orStudentId ? eq(p.studentId, f.orStudentId) : undefined)
    : undefined;
  return and(
    scope,
    f.studentId ? eq(p.studentId, f.studentId) : undefined,
    f.groupId ? eq(p.groupId, f.groupId) : undefined,
    f.courseId ? eq(p.courseId, f.courseId) : undefined,
    f.status ? sql`${p.status}::text = ${f.status}` : undefined,
  );
}

export class DrizzleStudentProjectRepository implements StudentProjectRepository {
  constructor(private readonly db: DbExecutor) {}

  private base() {
    return this.db
      .select({
        p: studentProjects,
        student: { id: student.id, name: student.name, email: student.email },
        creator: { id: creator.id, name: creator.name, email: creator.email },
        grader: { id: grader.id, name: grader.name, email: grader.email },
        group: { id: groups.id, name: groups.name },
        course: { id: courses.id, title: courses.title },
      })
      .from(studentProjects)
      .leftJoin(student, eq(student.id, studentProjects.studentId))
      .leftJoin(creator, eq(creator.id, studentProjects.createdById))
      .leftJoin(grader, eq(grader.id, studentProjects.gradedById))
      .leftJoin(groups, eq(groups.id, studentProjects.groupId))
      .leftJoin(courses, eq(courses.id, studentProjects.courseId));
  }

  private static merge(r: Awaited<ReturnType<DrizzleStudentProjectRepository['base']>>[number]): StudentProject {
    return {
      ...r.p,
      student: r.student?.id ? r.student : null,
      createdBy: r.creator?.id ? r.creator : null,
      gradedBy: r.grader?.id ? r.grader : null,
      group: r.group?.id ? r.group : null,
      course: r.course?.id ? r.course : null,
    };
  }

  async list(f: ProjectFilter, page?: { limit: number; offset: number }) {
    let q = this.base().where(where(f)).orderBy(desc(studentProjects.createdAt)).$dynamic();
    if (page) q = q.limit(page.limit).offset(page.offset);
    return (await q).map(DrizzleStudentProjectRepository.merge);
  }

  async count(f: ProjectFilter) {
    const [row] = await this.db.select({ n: count() }).from(studentProjects).where(where(f));
    return row?.n ?? 0;
  }

  async findById(id: string) {
    const [row] = await this.base().where(eq(studentProjects.id, id)).limit(1);
    return row ? DrizzleStudentProjectRepository.merge(row) : null;
  }

  async create(row: NewStudentProjectRow) {
    const [created] = await this.db.insert(studentProjects).values(row).returning({ id: studentProjects.id });
    if (!created) throw new Error('Insert returned no row');
    return created.id;
  }

  async update(id: string, patch: Partial<NewStudentProjectRow>) {
    await this.db.update(studentProjects).set(patch).where(eq(studentProjects.id, id));
  }

  async delete(id: string) {
    await this.db.delete(studentProjects).where(eq(studentProjects.id, id));
  }
}
