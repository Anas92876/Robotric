import { and, desc, eq, sql } from 'drizzle-orm';
import type { DbExecutor } from '../../shared/db/client';
import { courses } from '../courses/courses.table';
import { users } from '../users/users.table';
import { certificateCounters, type CertificateRow, certificates, type NewCertificateRow } from './certificates.table';

export interface CertificateCourse {
  id: string;
  title: string;
  level: string;
  category: string;
  totalHours: number;
  duration: string;
}

export interface Certificate extends CertificateRow {
  course: CertificateCourse | null;
  issuedByName: string | null;
}

export interface CertificateRepository {
  nextNumber(year: number): Promise<string>;
  create(data: NewCertificateRow): Promise<string>;
  findForStudentGroup(studentId: string, groupId: string): Promise<CertificateRow | null>;
  findByNumber(certificateNumber: string, studentId?: string): Promise<Certificate | null>;
  listForStudent(studentId: string): Promise<Certificate[]>;
  setHours(id: string, trainingHours: number): Promise<void>;
  deleteForGroup(groupId: string): Promise<number>;
}

export class DrizzleCertificateRepository implements CertificateRepository {
  constructor(private readonly db: DbExecutor) {}

  async nextNumber(year: number) {
    const [row] = await this.db
      .insert(certificateCounters)
      .values({ year, last: 1 })
      .onConflictDoUpdate({ target: certificateCounters.year, set: { last: sql`${certificateCounters.last} + 1` } })
      .returning({ last: certificateCounters.last });
    return `CERT-${year}-${String(row?.last ?? 1).padStart(6, '0')}`;
  }

  async create(data: NewCertificateRow) {
    const [row] = await this.db.insert(certificates).values(data).returning({ id: certificates.id });
    if (!row) throw new Error('Insert returned no row');
    return row.id;
  }

  async findForStudentGroup(studentId: string, groupId: string) {
    const [row] = await this.db
      .select()
      .from(certificates)
      .where(and(eq(certificates.studentId, studentId), eq(certificates.groupId, groupId)))
      .limit(1);
    return row ?? null;
  }

  private base() {
    return this.db
      .select({
        c: certificates,
        course: { id: courses.id, title: courses.title, level: courses.level, category: courses.category, totalHours: courses.totalHours, duration: courses.duration },
        issuedByName: users.name,
      })
      .from(certificates)
      .leftJoin(courses, eq(courses.id, certificates.courseId))
      .leftJoin(users, eq(users.id, certificates.issuedById));
  }

  private static merge(r: { c: CertificateRow; course: CertificateCourse | null; issuedByName: string | null }): Certificate {
    return { ...r.c, course: r.course?.id ? r.course : null, issuedByName: r.issuedByName };
  }

  async findByNumber(certificateNumber: string, studentId?: string) {
    const [row] = await this.base()
      .where(and(eq(certificates.certificateNumber, certificateNumber), studentId ? eq(certificates.studentId, studentId) : undefined))
      .limit(1);
    return row ? DrizzleCertificateRepository.merge(row) : null;
  }

  async listForStudent(studentId: string) {
    const rows = await this.base().where(eq(certificates.studentId, studentId)).orderBy(desc(certificates.issuedAt));
    return rows.map(DrizzleCertificateRepository.merge);
  }

  async setHours(id: string, trainingHours: number) {
    await this.db.update(certificates).set({ trainingHours }).where(eq(certificates.id, id));
  }

  async deleteForGroup(groupId: string) {
    const rows = await this.db.delete(certificates).where(eq(certificates.groupId, groupId)).returning({ id: certificates.id });
    return rows.length;
  }
}
