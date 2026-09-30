import { and, asc, count, desc, eq, gte, ilike, inArray, lt, ne, or, sql, type SQL } from 'drizzle-orm';
import type { DbExecutor } from '../../shared/db/client';
import { escapeLike } from '../../shared/db/like';
import { courses } from '../courses/courses.table';
import { users } from '../users/users.table';
import {
  type EnrollmentRow,
  enrollmentInstallments,
  enrollments,
  enrollmentStatusChanges,
  type InstallmentKind,
  type InstallmentRow,
  type NewEnrollmentRow,
  payments,
  type PaymentMethod,
  type StatusChangeRow,
} from './enrollments.table';

export interface StudentRef {
  id: string;
  name: string;
  email: string;
}
export interface CourseRef {
  id: string;
  title: string;
  price: number;
  type: string;
  bundlePrice: number | null;
  category: string;
  level: string;
  thumbnail: string | null;
}

/** An enrollment with its student, course, installment plans and status history. */
export interface Enrollment extends EnrollmentRow {
  student: StudentRef | null;
  course: CourseRef | null;
  courseInstallments: InstallmentRow[];
  transportInstallments: InstallmentRow[];
  statusHistory: StatusChangeRow[];
}

export interface InstallmentInput {
  amount: number;
  dueDate: Date;
  status?: InstallmentRow['status'];
  paidDate?: Date | null;
  paymentId?: string | null;
}

export interface EnrollmentFilter {
  courseId?: string;
  status?: string;
  /** Matches student name or email. */
  studentSearch?: string;
  paymentStatus?: 'paid' | 'unpaid' | 'partial';
  hasDiscount?: boolean;
  transportation?: 'enabled' | 'disabled' | 'paid' | 'pending';
}

export type CoursePaymentResult = { ok: true } | { ok: false; reason: 'not_found' } | { ok: false; reason: 'exceeds'; remaining: number };

/** Headline numbers for the reception enrollments page (money: active enrollments only). */
export interface EnrollmentSummary {
  total: number;
  active: number;
  inactive: number;
  amountTotal: number;
  amountPaid: number;
  amountRemaining: number;
}

export interface CourseEnrollmentCounts {
  total: number;
  active: number;
  completed: number;
}

export interface EnrollmentRepository {
  list(filter: EnrollmentFilter, page: { limit: number; offset: number }): Promise<{ items: Enrollment[]; total: number }>;
  recent(since: Date, limit: number): Promise<Enrollment[]>;
  findById(id: string): Promise<Enrollment | null>;
  findRow(id: string): Promise<EnrollmentRow | null>;
  /** Locks the enrollment row until the surrounding transaction ends. */
  lockRow(id: string): Promise<EnrollmentRow | null>;
  findForStudentCourse(studentId: string, courseId: string): Promise<Enrollment | null>;
  existingForCourses(studentId: string, courseIds: string[]): Promise<EnrollmentRow[]>;
  studentIdsEnrolledIn(courseId: string): Promise<string[]>;
  forStudent(studentId: string): Promise<Enrollment[]>;
  forStudentsInCourse(studentIds: string[], courseId: string): Promise<EnrollmentRow[]>;
  subEnrollments(bundleEnrollmentId: string): Promise<Enrollment[]>;
  create(data: NewEnrollmentRow, plans: { course?: InstallmentInput[]; transportation?: InstallmentInput[] }): Promise<string>;
  update(id: string, data: Partial<NewEnrollmentRow>): Promise<boolean>;
  replaceInstallments(id: string, kind: InstallmentKind, items: InstallmentInput[]): Promise<void>;
  addStatusChange(id: string, entry: { status: StatusChangeRow['status']; reason: string | null; changedBy?: string | null }): Promise<void>;
  /** Applies a status to every sub-enrollment of a bundle enrollment, with history. */
  cascadeStatus(bundleEnrollmentId: string, status: EnrollmentRow['status'], reason: string): Promise<number>;
  delete(id: string): Promise<void>;
  /**
   * Adds a course payment atomically: the balance check happens inside the
   * UPDATE, so two simultaneous payments can never both pass it.
   */
  addCoursePayment(id: string, amount: number, at: Date): Promise<CoursePaymentResult>;
  markOverdueTransportInstallments(now: Date): Promise<{ installments: number; enrollments: number; checked: number }>;
  countsByCourse(courseIds: string[]): Promise<Map<string, CourseEnrollmentCounts>>;
  /** Counts and money over every enrollment (bundle sub-courses only count under their bundle). */
  summary(): Promise<EnrollmentSummary>;
  forCourse(courseId: string): Promise<Enrollment[]>;
  /** Per-day counts (YYYY-MM-DD) of enrollments, or of completions, since a date. */
  dailyCounts(courseId: string, since: Date, field: 'enrolledAt' | 'completedAt'): Promise<{ _id: string; count: number }[]>;
  /** How many enrollments fall in each progress band (0–25, 25–50, 50–75, 75–100). */
  progressBands(courseId: string): Promise<{ _id: number; count: number; students: string[] }[]>;
  /** True when the student has enrollments and every one is inactive. */
  allInactive(studentId: string): Promise<boolean>;
  recordPayment(p: {
    studentId: string;
    enrollmentId: string;
    courseId: string;
    amount: number;
    method: PaymentMethod;
    paidAt: Date;
    notes: string;
    processedById: string;
  }): Promise<void>;
}

export class DrizzleEnrollmentRepository implements EnrollmentRepository {
  constructor(private readonly db: DbExecutor) {}

  private base() {
    return this.db
      .select({
        e: enrollments,
        student: { id: users.id, name: users.name, email: users.email },
        course: {
          id: courses.id,
          title: courses.title,
          price: courses.price,
          type: courses.type,
          bundlePrice: courses.bundlePrice,
          category: courses.category,
          level: courses.level,
          thumbnail: courses.thumbnail,
        },
      })
      .from(enrollments)
      .leftJoin(users, eq(users.id, enrollments.studentId))
      .leftJoin(courses, eq(courses.id, enrollments.courseId));
  }

  /** Loads installments and history for a page of enrollments with two batched queries. */
  private async hydrate(rows: { e: EnrollmentRow; student: StudentRef | null; course: CourseRef | null }[]): Promise<Enrollment[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.e.id);
    const [installments, history] = await Promise.all([
      this.db
        .select()
        .from(enrollmentInstallments)
        .where(inArray(enrollmentInstallments.enrollmentId, ids))
        .orderBy(asc(enrollmentInstallments.position)),
      this.db
        .select()
        .from(enrollmentStatusChanges)
        .where(inArray(enrollmentStatusChanges.enrollmentId, ids))
        .orderBy(asc(enrollmentStatusChanges.changedAt), asc(enrollmentStatusChanges.id)),
    ]);
    return rows.map((r) => ({
      ...r.e,
      student: r.student?.id ? r.student : null,
      course: r.course?.id ? r.course : null,
      courseInstallments: installments.filter((i) => i.enrollmentId === r.e.id && i.kind === 'course'),
      transportInstallments: installments.filter((i) => i.enrollmentId === r.e.id && i.kind === 'transportation'),
      statusHistory: history.filter((h) => h.enrollmentId === r.e.id),
    }));
  }

  private static where(f: EnrollmentFilter): SQL | undefined {
    const s = f.studentSearch ? `%${escapeLike(f.studentSearch)}%` : null;
    const remaining = sql`(${enrollments.paymentTotal} - ${enrollments.paymentPaid})`;
    const transportRemaining = sql`(${enrollments.transportTotal} - ${enrollments.transportPaid})`;
    return and(
      // Bundle sub-course enrollments appear only under their bundle enrollment.
      ne(enrollments.source, 'bundle'),
      f.courseId ? eq(enrollments.courseId, f.courseId) : undefined,
      f.status ? sql`${enrollments.status}::text = ${f.status}` : undefined,
      s ? and(eq(users.role, 'student'), or(ilike(users.name, s), ilike(users.email, s))) : undefined,
      f.paymentStatus === 'paid' ? sql`${remaining} <= 0` : undefined,
      f.paymentStatus === 'unpaid' ? eq(enrollments.paymentPaid, 0) : undefined,
      f.paymentStatus === 'partial' ? and(sql`${enrollments.paymentPaid} > 0`, sql`${remaining} > 0`) : undefined,
      f.hasDiscount === true ? sql`${enrollments.discount} > 0` : undefined,
      f.hasDiscount === false ? eq(enrollments.discount, 0) : undefined,
      f.transportation === 'enabled' ? eq(enrollments.transportEnabled, true) : undefined,
      f.transportation === 'disabled' ? eq(enrollments.transportEnabled, false) : undefined,
      f.transportation === 'paid' ? and(eq(enrollments.transportEnabled, true), sql`${transportRemaining} <= 0`) : undefined,
      f.transportation === 'pending' ? and(eq(enrollments.transportEnabled, true), sql`${transportRemaining} > 0`) : undefined,
    );
  }

  async list(f: EnrollmentFilter, page: { limit: number; offset: number }) {
    const where = DrizzleEnrollmentRepository.where(f);
    const [rows, [totalRow]] = await Promise.all([
      this.base().where(where).orderBy(desc(enrollments.enrolledAt), desc(enrollments.id)).limit(page.limit).offset(page.offset),
      this.db
        .select({ n: count() })
        .from(enrollments)
        .leftJoin(users, eq(users.id, enrollments.studentId))
        .where(where),
    ]);
    return { items: await this.hydrate(rows), total: totalRow?.n ?? 0 };
  }

  async recent(since: Date, limit: number): Promise<Enrollment[]> {
    return this.hydrate(await this.base().where(gte(enrollments.createdAt, since)).orderBy(desc(enrollments.enrolledAt)).limit(limit));
  }

  async findById(id: string): Promise<Enrollment | null> {
    const [e] = await this.hydrate(await this.base().where(eq(enrollments.id, id)).limit(1));
    return e ?? null;
  }

  async findRow(id: string): Promise<EnrollmentRow | null> {
    const [row] = await this.db.select().from(enrollments).where(eq(enrollments.id, id)).limit(1);
    return row ?? null;
  }

  async lockRow(id: string): Promise<EnrollmentRow | null> {
    const [row] = await this.db.select().from(enrollments).where(eq(enrollments.id, id)).for('update');
    return row ?? null;
  }

  async findForStudentCourse(studentId: string, courseId: string): Promise<Enrollment | null> {
    const [e] = await this.hydrate(
      await this.base().where(and(eq(enrollments.studentId, studentId), eq(enrollments.courseId, courseId))).limit(1),
    );
    return e ?? null;
  }

  existingForCourses(studentId: string, courseIds: string[]): Promise<EnrollmentRow[]> {
    if (courseIds.length === 0) return Promise.resolve([]);
    return this.db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.studentId, studentId), inArray(enrollments.courseId, courseIds)));
  }

  async studentIdsEnrolledIn(courseId: string): Promise<string[]> {
    const rows = await this.db.select({ id: enrollments.studentId }).from(enrollments).where(eq(enrollments.courseId, courseId));
    return rows.map((r) => r.id);
  }

  async forStudent(studentId: string): Promise<Enrollment[]> {
    return this.hydrate(await this.base().where(eq(enrollments.studentId, studentId)).orderBy(desc(enrollments.enrolledAt)));
  }

  forStudentsInCourse(studentIds: string[], courseId: string): Promise<EnrollmentRow[]> {
    if (studentIds.length === 0) return Promise.resolve([]);
    return this.db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.courseId, courseId), inArray(enrollments.studentId, studentIds)));
  }

  async subEnrollments(bundleEnrollmentId: string): Promise<Enrollment[]> {
    return this.hydrate(
      await this.base()
        .where(and(eq(enrollments.bundleEnrollmentId, bundleEnrollmentId), eq(enrollments.source, 'bundle')))
        .orderBy(asc(enrollments.enrolledAt)),
    );
  }

  async create(data: NewEnrollmentRow, plans: { course?: InstallmentInput[]; transportation?: InstallmentInput[] }): Promise<string> {
    const [row] = await this.db.insert(enrollments).values(data).returning({ id: enrollments.id });
    if (!row) throw new Error('Insert returned no row');
    if (plans.course?.length) await this.replaceInstallments(row.id, 'course', plans.course);
    if (plans.transportation?.length) await this.replaceInstallments(row.id, 'transportation', plans.transportation);
    return row.id;
  }

  async update(id: string, data: Partial<NewEnrollmentRow>): Promise<boolean> {
    const rows = await this.db.update(enrollments).set(data).where(eq(enrollments.id, id)).returning({ id: enrollments.id });
    return rows.length > 0;
  }

  async replaceInstallments(id: string, kind: InstallmentKind, items: InstallmentInput[]): Promise<void> {
    await this.db
      .delete(enrollmentInstallments)
      .where(and(eq(enrollmentInstallments.enrollmentId, id), eq(enrollmentInstallments.kind, kind)));
    if (items.length === 0) return;
    await this.db.insert(enrollmentInstallments).values(
      items.map((i, position) => ({
        enrollmentId: id,
        kind,
        position,
        amount: i.amount,
        dueDate: i.dueDate,
        status: i.status ?? 'pending',
        paidDate: i.paidDate ?? null,
        paymentId: i.paymentId ?? null,
      })),
    );
  }

  async addStatusChange(id: string, entry: { status: StatusChangeRow['status']; reason: string | null; changedBy?: string | null }): Promise<void> {
    await this.db.insert(enrollmentStatusChanges).values({ enrollmentId: id, status: entry.status, reason: entry.reason, changedBy: entry.changedBy ?? null });
  }

  async cascadeStatus(bundleEnrollmentId: string, status: EnrollmentRow['status'], reason: string): Promise<number> {
    const subs = await this.db
      .update(enrollments)
      .set({ status })
      .where(eq(enrollments.bundleEnrollmentId, bundleEnrollmentId))
      .returning({ id: enrollments.id });
    if (subs.length > 0) {
      await this.db.insert(enrollmentStatusChanges).values(subs.map((s) => ({ enrollmentId: s.id, status, reason })));
    }
    return subs.length;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(enrollments).where(eq(enrollments.id, id));
  }

  async addCoursePayment(id: string, amount: number, at: Date): Promise<CoursePaymentResult> {
    const updated = await this.db
      .update(enrollments)
      .set({ paymentPaid: sql`${enrollments.paymentPaid} + ${amount}`, lastPaymentDate: at })
      .where(and(eq(enrollments.id, id), sql`${enrollments.paymentPaid} + ${amount} <= ${enrollments.paymentTotal}`))
      .returning({ id: enrollments.id });
    if (updated.length > 0) return { ok: true };
    const row = await this.findRow(id);
    if (!row) return { ok: false, reason: 'not_found' };
    return { ok: false, reason: 'exceeds', remaining: row.paymentTotal - row.paymentPaid };
  }

  async markOverdueTransportInstallments(now: Date) {
    const eligible = this.db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(eq(enrollments.transportEnabled, true));
    const [checkedRow] = await this.db
      .select({ n: sql<number>`count(distinct ${enrollmentInstallments.enrollmentId})`.mapWith(Number) })
      .from(enrollmentInstallments)
      .where(and(eq(enrollmentInstallments.kind, 'transportation'), inArray(enrollmentInstallments.enrollmentId, eligible)));
    const marked = await this.db
      .update(enrollmentInstallments)
      .set({ status: 'overdue' })
      .where(
        and(
          eq(enrollmentInstallments.kind, 'transportation'),
          eq(enrollmentInstallments.status, 'pending'),
          lt(enrollmentInstallments.dueDate, now),
          inArray(enrollmentInstallments.enrollmentId, eligible),
        ),
      )
      .returning({ enrollmentId: enrollmentInstallments.enrollmentId });
    return { installments: marked.length, enrollments: new Set(marked.map((m) => m.enrollmentId)).size, checked: checkedRow?.n ?? 0 };
  }

  async summary(): Promise<EnrollmentSummary> {
    const active = sql`${enrollments.status} = 'active'`;
    const [r] = await this.db
      .select({
        total: count(),
        active: sql<number>`count(*) filter (where ${active})`.mapWith(Number),
        inactive: sql<number>`count(*) filter (where ${enrollments.status} = 'inactive')`.mapWith(Number),
        amountTotal: sql<number>`coalesce(sum(${enrollments.paymentTotal}) filter (where ${active}), 0)`.mapWith(Number),
        amountPaid: sql<number>`coalesce(sum(${enrollments.paymentPaid}) filter (where ${active}), 0)`.mapWith(Number),
      })
      .from(enrollments)
      .where(ne(enrollments.source, 'bundle'));
    const amountTotal = r?.amountTotal ?? 0;
    const amountPaid = r?.amountPaid ?? 0;
    return { total: r?.total ?? 0, active: r?.active ?? 0, inactive: r?.inactive ?? 0, amountTotal, amountPaid, amountRemaining: Math.max(0, amountTotal - amountPaid) };
  }

  async countsByCourse(courseIds: string[]): Promise<Map<string, CourseEnrollmentCounts>> {
    const result = new Map<string, CourseEnrollmentCounts>();
    if (courseIds.length === 0) return result;
    const rows = await this.db
      .select({
        courseId: enrollments.courseId,
        total: count(),
        active: sql<number>`count(*) filter (where ${enrollments.status} = 'active')`.mapWith(Number),
        completed: sql<number>`count(*) filter (where ${enrollments.completedAt} is not null)`.mapWith(Number),
      })
      .from(enrollments)
      .where(inArray(enrollments.courseId, courseIds))
      .groupBy(enrollments.courseId);
    for (const { courseId, ...c } of rows) result.set(courseId, c);
    return result;
  }

  async forCourse(courseId: string): Promise<Enrollment[]> {
    return this.hydrate(await this.base().where(eq(enrollments.courseId, courseId)).orderBy(desc(enrollments.enrolledAt)));
  }

  async dailyCounts(courseId: string, since: Date, field: 'enrolledAt' | 'completedAt') {
    const column = field === 'enrolledAt' ? enrollments.enrolledAt : enrollments.completedAt;
    const day = sql<string>`to_char(${column}, 'YYYY-MM-DD')`;
    const rows = await this.db
      .select({ _id: day, count: count() })
      .from(enrollments)
      .where(and(eq(enrollments.courseId, courseId), gte(column, since)))
      .groupBy(day)
      .orderBy(day);
    return rows;
  }

  async progressBands(courseId: string) {
    // Same buckets as the old $bucket stage: [0,25), [25,50), [50,75), [75,100).
    const band = sql<number>`(case when ${enrollments.percentageComplete} < 25 then 0 when ${enrollments.percentageComplete} < 50 then 25 when ${enrollments.percentageComplete} < 75 then 50 else 75 end)`.mapWith(Number);
    const rows = await this.db
      .select({ _id: band, count: count(), students: sql<string[]>`array_agg(${enrollments.studentId})` })
      .from(enrollments)
      .where(eq(enrollments.courseId, courseId))
      .groupBy(band)
      .orderBy(band);
    return rows;
  }

  async allInactive(studentId: string): Promise<boolean> {
    const [row] = await this.db
      .select({
        total: count(),
        active: sql<number>`count(*) filter (where ${enrollments.status} <> 'inactive')`.mapWith(Number),
      })
      .from(enrollments)
      .where(eq(enrollments.studentId, studentId));
    return (row?.total ?? 0) > 0 && (row?.active ?? 0) === 0;
  }

  async recordPayment(p: {
    studentId: string;
    enrollmentId: string;
    courseId: string;
    amount: number;
    method: PaymentMethod;
    paidAt: Date;
    notes: string;
    processedById: string;
  }): Promise<void> {
    await this.db.insert(payments).values({
      studentId: p.studentId,
      enrollmentId: p.enrollmentId,
      courseId: p.courseId,
      amount: p.amount,
      paymentMethod: p.method,
      status: 'completed',
      paidAt: p.paidAt,
      notes: p.notes,
      processedById: p.processedById,
    });
  }
}

