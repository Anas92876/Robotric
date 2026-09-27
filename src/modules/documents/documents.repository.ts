import { and, asc, count, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { DbExecutor } from '../../shared/db/client';
import { courses } from '../courses/courses.table';
import { groups, groupStudents } from '../groups/groups.table';
import { users } from '../users/users.table';
import { type StudentDocumentRow, studentDocuments } from './documents.table';

export interface StudentDocument extends StudentDocumentRow {
  student: { id: string; name: string; email: string } | null;
  verifiedByName: string | null;
}

export interface DocumentSummary {
  studentId: string;
  name: string;
  email: string;
  total: number;
  pending: number;
  verified: number;
  rejected: number;
}

export interface StudentGroupCourse {
  groupId: string;
  groupName: string;
  courseId: string | null;
  courseTitle: string | null;
  courseStatus: string | null;
  wroDocumentsRequired: boolean | null;
}

export interface DocumentRepository {
  list(filter: { studentId?: string; status?: string; documentType?: string }, order: 'newest' | 'type', page?: { limit: number; offset: number }): Promise<StudentDocument[]>;
  count(filter: { status?: string; documentType?: string }): Promise<number>;
  findById(id: string): Promise<StudentDocument | null>;
  findByType(studentId: string, documentType: string): Promise<StudentDocumentRow | null>;
  create(row: typeof studentDocuments.$inferInsert): Promise<string>;
  update(id: string, patch: Partial<typeof studentDocuments.$inferInsert>): Promise<void>;
  delete(id: string): Promise<void>;
  /** The student's groups with their course's WRO flag. */
  groupsOf(studentId: string): Promise<StudentGroupCourse[]>;
  /** Per-student document counts, for students in a course that requires WRO documents. */
  summary(): Promise<DocumentSummary[]>;
}

const verifier = alias(users, 'document_verifier');

function where(f: { studentId?: string; status?: string; documentType?: string }): SQL | undefined {
  const d = studentDocuments;
  return and(
    f.studentId ? eq(d.studentId, f.studentId) : undefined,
    f.status ? sql`${d.verificationStatus}::text = ${f.status}` : undefined,
    f.documentType ? sql`${d.documentType}::text = ${f.documentType}` : undefined,
  );
}

export class DrizzleDocumentRepository implements DocumentRepository {
  constructor(private readonly db: DbExecutor) {}

  private base() {
    return this.db
      .select({ d: studentDocuments, student: { id: users.id, name: users.name, email: users.email }, verifiedByName: verifier.name })
      .from(studentDocuments)
      .leftJoin(users, eq(users.id, studentDocuments.studentId))
      .leftJoin(verifier, eq(verifier.id, studentDocuments.verifiedById));
  }

  private static merge(r: { d: StudentDocumentRow; student: StudentDocument['student']; verifiedByName: string | null }): StudentDocument {
    return { ...r.d, student: r.student?.id ? r.student : null, verifiedByName: r.verifiedByName };
  }

  async list(f: { studentId?: string; status?: string; documentType?: string }, order: 'newest' | 'type', page?: { limit: number; offset: number }) {
    let q = this.base()
      .where(where(f))
      .orderBy(order === 'type' ? asc(studentDocuments.documentType) : desc(studentDocuments.createdAt))
      .$dynamic();
    if (page) q = q.limit(page.limit).offset(page.offset);
    return (await q).map(DrizzleDocumentRepository.merge);
  }

  async count(f: { status?: string; documentType?: string }) {
    const [row] = await this.db.select({ n: count() }).from(studentDocuments).where(where(f));
    return row?.n ?? 0;
  }

  async findById(id: string) {
    const [row] = await this.base().where(eq(studentDocuments.id, id)).limit(1);
    return row ? DrizzleDocumentRepository.merge(row) : null;
  }

  async findByType(studentId: string, documentType: string) {
    const [row] = await this.db
      .select()
      .from(studentDocuments)
      .where(and(eq(studentDocuments.studentId, studentId), sql`${studentDocuments.documentType}::text = ${documentType}`))
      .limit(1);
    return row ?? null;
  }

  async create(row: typeof studentDocuments.$inferInsert) {
    const [created] = await this.db.insert(studentDocuments).values(row).returning({ id: studentDocuments.id });
    if (!created) throw new Error('Insert returned no row');
    return created.id;
  }

  async update(id: string, patch: Partial<typeof studentDocuments.$inferInsert>) {
    await this.db.update(studentDocuments).set(patch).where(eq(studentDocuments.id, id));
  }

  async delete(id: string) {
    await this.db.delete(studentDocuments).where(eq(studentDocuments.id, id));
  }

  async groupsOf(studentId: string) {
    return this.db
      .select({
        groupId: groups.id,
        groupName: groups.name,
        courseId: courses.id,
        courseTitle: courses.title,
        courseStatus: sql<string | null>`${courses.status}::text`,
        wroDocumentsRequired: courses.wroDocumentsRequired,
      })
      .from(groupStudents)
      .innerJoin(groups, eq(groups.id, groupStudents.groupId))
      .leftJoin(courses, eq(courses.id, groups.courseId))
      .where(eq(groupStudents.studentId, studentId));
  }

  async summary() {
    const wroStudents = this.db
      .selectDistinct({ id: groupStudents.studentId })
      .from(groupStudents)
      .innerJoin(groups, eq(groups.id, groupStudents.groupId))
      .innerJoin(courses, eq(courses.id, groups.courseId))
      .where(eq(courses.wroDocumentsRequired, true));
    const d = studentDocuments;
    const status = (s: string) => sql<number>`count(*) filter (where ${d.verificationStatus} = ${s})::int`;
    const pending = status('pending');
    return this.db
      .select({
        studentId: d.studentId,
        name: users.name,
        email: users.email,
        total: sql<number>`count(*)::int`,
        pending,
        verified: status('verified'),
        rejected: status('rejected'),
      })
      .from(d)
      .innerJoin(users, eq(users.id, d.studentId))
      .where(inArray(d.studentId, wroStudents))
      .groupBy(d.studentId, users.name, users.email)
      .orderBy(desc(pending), asc(users.name));
  }
}
