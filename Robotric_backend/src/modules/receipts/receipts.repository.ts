import { and, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { DbExecutor } from '../../shared/db/client';
import { courses } from '../courses/courses.table';
import { enrollments } from '../enrollments/enrollments.table';
import { users } from '../users/users.table';
import { type NewReceiptRow, receiptCounters, type ReceiptRow, receipts } from './receipts.table';

export interface Receipt extends ReceiptRow {
  student: { id: string; name: string; email: string } | null;
  course: { id: string; title: string } | null;
  issuedBy: { id: string; name: string } | null;
  enrollmentNotes: string | null;
}

export interface ReceiptFilter {
  enrollmentId?: string;
  studentId?: string;
  courseId?: string;
  type?: 'course' | 'transportation';
}

export interface ReceiptRepository {
  /** Reserves the next REC-YYYY-NNNN number for the year. */
  nextNumber(year: number): Promise<string>;
  create(data: NewReceiptRow): Promise<string>;
  findById(id: string): Promise<Receipt | null>;
  list(filter: ReceiptFilter): Promise<Receipt[]>;
  deleteForEnrollment(enrollmentId: string, type?: 'course' | 'transportation'): Promise<void>;
}

const student = alias(users, 'receipt_student');
const issuer = alias(users, 'receipt_issuer');

export class DrizzleReceiptRepository implements ReceiptRepository {
  constructor(private readonly db: DbExecutor) {}

  async nextNumber(year: number): Promise<string> {
    const [row] = await this.db
      .insert(receiptCounters)
      .values({ year, last: 1 })
      .onConflictDoUpdate({ target: receiptCounters.year, set: { last: sql`${receiptCounters.last} + 1` } })
      .returning({ last: receiptCounters.last });
    return `REC-${year}-${String(row?.last ?? 1).padStart(4, '0')}`;
  }

  async create(data: NewReceiptRow): Promise<string> {
    const [row] = await this.db.insert(receipts).values(data).returning({ id: receipts.id });
    if (!row) throw new Error('Insert returned no row');
    return row.id;
  }

  private base() {
    return this.db
      .select({
        receipt: receipts,
        student: { id: student.id, name: student.name, email: student.email },
        course: { id: courses.id, title: courses.title },
        issuer: { id: issuer.id, name: issuer.name },
        enrollmentNotes: enrollments.notes,
      })
      .from(receipts)
      .leftJoin(student, eq(student.id, receipts.studentId))
      .leftJoin(courses, eq(courses.id, receipts.courseId))
      .leftJoin(issuer, eq(issuer.id, receipts.issuedById))
      .leftJoin(enrollments, eq(enrollments.id, receipts.enrollmentId));
  }

  private static merge(r: {
    receipt: ReceiptRow;
    student: Receipt['student'];
    course: Receipt['course'];
    issuer: Receipt['issuedBy'];
    enrollmentNotes: string | null;
  }): Receipt {
    return {
      ...r.receipt,
      student: r.student?.id ? r.student : null,
      course: r.course?.id ? r.course : null,
      issuedBy: r.issuer?.id ? r.issuer : null,
      enrollmentNotes: r.enrollmentNotes,
    };
  }

  async findById(id: string): Promise<Receipt | null> {
    const [row] = await this.base().where(eq(receipts.id, id)).limit(1);
    return row ? DrizzleReceiptRepository.merge(row) : null;
  }

  async list(f: ReceiptFilter): Promise<Receipt[]> {
    const rows = await this.base()
      .where(
        and(
          f.enrollmentId ? eq(receipts.enrollmentId, f.enrollmentId) : undefined,
          f.studentId ? eq(receipts.studentId, f.studentId) : undefined,
          f.courseId ? eq(receipts.courseId, f.courseId) : undefined,
          f.type ? eq(receipts.type, f.type) : undefined,
        ),
      )
      .orderBy(desc(receipts.createdAt), desc(receipts.receiptNumber));
    return rows.map(DrizzleReceiptRepository.merge);
  }

  async deleteForEnrollment(enrollmentId: string, type?: 'course' | 'transportation'): Promise<void> {
    await this.db.delete(receipts).where(and(eq(receipts.enrollmentId, enrollmentId), type ? eq(receipts.type, type) : undefined));
  }
}
