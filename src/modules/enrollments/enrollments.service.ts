import type { UnitOfWork } from '../../shared/db/unit-of-work';
import { BadRequestError, NotFoundError } from '../../shared/http/errors';
import type { Page } from '../../shared/http/pagination';
import type { Logger } from '../../shared/logger';
import type { Group, GroupRepository } from '../groups/groups.repository';
import type { LeadRepository } from '../leads/leads.repository';
import type { User } from '../users/users.repository';
import type { Enrollment, EnrollmentFilter, EnrollmentRepository, InstallmentInput } from './enrollments.repository';
import { clampDiscount, discounted, type EnrollmentNotifier, type EnrollmentRepos } from './enrollments.ports';
import type {
  BundleInput,
  CreateEnrollmentInput,
  FromWaitingInput,
  TransportationInput,
  UpdateEnrollmentInput,
} from './enrollments.schemas';
import type { EnrollmentStatus, NewEnrollmentRow } from './enrollments.table';
import { issueReceipt } from '../receipts/receipts.service';
import { normalizeMethod } from './enrollments.schemas';


export interface CourseInfo {
  id: string;
  title: string;
  price: number;
  type: string;
  bundlePrice: number | null;
}

/** Narrow view of the courses module. */
export interface CourseReader {
  findById(id: string): Promise<CourseInfo | null>;
  subCoursesOf(bundleIds: string[]): Promise<Map<string, CourseInfo[]>>;
}
export interface UserLookup {
  findById(id: string): Promise<User | null>;
}

const ALREADY_ENROLLED = 'Student is already enrolled in this course';
const notFound = () => new NotFoundError('Enrollment');
const num = (v: unknown) => Number.parseFloat(String(v ?? '')) || 0;

/** The course installment plan: custom rows, an even monthly split, or one payment due now. */
function coursePlan(total: number, input: Pick<CreateEnrollmentInput, 'installments' | 'installmentPlan'>, now: Date): InstallmentInput[] {
  if (input.installments?.length) return input.installments.map((i) => ({ amount: i.amount, dueDate: i.dueDate }));
  const n = input.installmentPlan?.numberOfInstallments ?? 0;
  if (n > 0) {
    const start = input.installmentPlan?.startDate ?? now;
    return Array.from({ length: n }, (_, i) => {
      const due = new Date(start);
      due.setMonth(due.getMonth() + i);
      return { amount: Math.round((total / n) * 100) / 100, dueDate: due };
    });
  }
  return [{ amount: total, dueDate: now }];
}

/** Transportation fees when first enabled: total, what was paid now, and the plan for the rest. */
function transportSetup(t: TransportationInput | undefined, now: Date) {
  if (!t?.enabled) return null;
  const total = num(t.totalAmount);
  const paid = num(t.paidNow);
  const remaining = Math.max(0, total - paid);
  const plan: InstallmentInput[] = t.installments?.length
    ? t.installments.map((i) => ({ amount: i.amount, dueDate: i.dueDate }))
    : remaining > 0
      ? [{ amount: remaining, dueDate: now }]
      : [];
  return { total, paid, plan };
}

export class EnrollmentService {
  constructor(
    private readonly enrollments: EnrollmentRepository,
    private readonly groups: GroupRepository,
    private readonly leads: LeadRepository,
    private readonly uow: UnitOfWork<EnrollmentRepos>,
    private readonly courses: CourseReader,
    private readonly users: UserLookup,
    private readonly notifier: EnrollmentNotifier,
    private readonly logger: Logger,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async require(id: string): Promise<Enrollment> {
    const e = await this.enrollments.findById(id);
    if (!e) throw notFound();
    return e;
  }

  private async requireStudent(id: string, label = 'Student'): Promise<User> {
    const user = await this.users.findById(id);
    if (!user || user.role !== 'student') throw new NotFoundError(label);
    return user;
  }

  /** Notifications are best effort: a failure is logged, never surfaced. */
  private notify(...args: Parameters<EnrollmentNotifier['notify']>): void {
    this.notifier.notify(...args).catch((err: unknown) => this.logger.warn({ err }, 'Enrollment notification failed'));
  }
  private remind(enrollmentId: string): void {
    this.notifier.remindDueInstallments(enrollmentId).catch((err: unknown) => this.logger.warn({ err }, 'Payment reminder failed'));
  }

  // ─── Reading ─────────────────────────────────────────────────────────────

  list(filter: EnrollmentFilter, page: Page) {
    return this.enrollments.list(filter, page);
  }

  get(id: string): Promise<Enrollment> {
    return this.require(id);
  }

  recent(limit: number): Promise<Enrollment[]> {
    const since = this.now();
    since.setDate(since.getDate() - 7);
    return this.enrollments.recent(since, limit);
  }

  async subEnrollments(id: string): Promise<{ enrollment: Enrollment; group: Group | null; groupSize: number }[]> {
    const subs = await this.enrollments.subEnrollments(id);
    const groups = await Promise.all(subs.map((s) => this.groups.groupOfStudentInCourse(s.studentId, s.courseId)));
    const sizes = await this.groups.memberCounts(groups.flatMap((g) => (g ? [g.id] : [])));
    return subs.map((enrollment, i) => {
      const group = groups[i] ?? null;
      return { enrollment, group, groupSize: group ? (sizes.get(group.id) ?? 0) : 0 };
    });
  }

  async check(studentId: string | undefined, courseId: string | undefined, groupId: string | undefined) {
    if (!studentId || !courseId) throw new BadRequestError('Student ID and Course ID are required');
    const existing = await this.enrollments.findForStudentCourse(studentId, courseId);
    const courseEnrollment = existing?.status === 'active' ? existing : null;
    let groupEnrollment: { groupId: string; groupName: string } | null = null;
    if (groupId && (await this.groups.isMember(groupId, studentId))) {
      const group = await this.groups.findById(groupId);
      groupEnrollment = { groupId, groupName: group?.name || 'Unnamed Group' };
    }
    return { courseEnrollment, groupEnrollment };
  }

  // ─── Creating ────────────────────────────────────────────────────────────

  async create(input: CreateEnrollmentInput): Promise<Enrollment> {
    await this.requireStudent(input.studentId);
    const course = await this.courses.findById(input.courseId);
    if (!course) throw new NotFoundError('Course');
    if (await this.enrollments.findForStudentCourse(input.studentId, input.courseId)) throw new BadRequestError(ALREADY_ENROLLED);

    const now = this.now();
    const discount = clampDiscount(input.discount);
    const total = discounted(course.price, discount);
    const transport = transportSetup(input.transportation, now);

    const id = await this.uow.run(async ({ enrollments, groups }) => {
      const enrollmentId = await enrollments.create(
        {
          studentId: input.studentId,
          courseId: input.courseId,
          paymentTotal: total,
          discount,
          notes: input.notes ?? '',
          transportEnabled: Boolean(transport),
          transportTotal: transport?.total ?? 0,
          transportPaid: transport?.paid ?? 0,
        },
        { course: coursePlan(total, input, now), transportation: transport?.plan ?? [] },
      );
      if (input.groupId) await groups.addStudent(input.groupId, input.studentId, false);
      return enrollmentId;
    });

    this.notify(input.studentId, 'enrollment', 'New Enrollment Created', `You have been enrolled in ${course.title}. Total amount: ${total.toLocaleString()} S.P.`, {
      enrollmentId: id,
      courseId: course.id,
      courseTitle: course.title,
      totalAmount: total,
    });
    this.remind(id);
    return this.require(id);
  }

  /** Enrolls a waiting-list lead into a group; their deposit becomes the first payment. */
  async enrollFromWaiting(input: FromWaitingInput, byUser: { id: string }): Promise<{ enrollment: Enrollment; deposit: number }> {
    const lead = await this.leads.findById(input.leadId);
    if (!lead) throw new NotFoundError('Lead');
    if (lead.status !== 'waiting') throw new BadRequestError('Lead is not in waiting status');
    if (!lead.convertedToStudentId) throw new BadRequestError('Lead has no associated user account');
    if (!lead.waitingCourseId) throw new BadRequestError('Lead has no course interest recorded');
    const studentId = lead.convertedToStudentId;
    const courseId = lead.waitingCourseId;

    await this.requireStudent(studentId, 'Student account');
    const group = await this.groups.findById(input.groupId);
    if (!group) throw new NotFoundError('Group');
    if (group.courseId !== courseId) throw new BadRequestError("Group does not belong to the lead's course interest");
    const course = await this.courses.findById(courseId);
    if (!course) throw new NotFoundError('Course');
    if (await this.enrollments.findForStudentCourse(studentId, courseId)) throw new BadRequestError(ALREADY_ENROLLED);

    const now = this.now();
    const discount = clampDiscount(input.discount);
    const total = discounted(course.price, discount);
    const deposit = lead.depositAmount || 0;
    const remaining = Math.max(0, total - deposit);
    const plan: InstallmentInput[] = input.installments?.length
      ? input.installments.map((i) => ({ amount: i.amount, dueDate: i.dueDate }))
      : [{ amount: remaining, dueDate: now, status: remaining === 0 ? 'paid' : 'pending' }];
    const transport = transportSetup(input.transportation, now);

    const id = await this.uow.run(async ({ enrollments, groups, leads }) => {
      const enrollmentId = await enrollments.create(
        {
          studentId,
          courseId,
          paymentTotal: total,
          paymentPaid: deposit,
          discount,
          notes: input.notes || `Enrolled from waiting list. Deposit of $${deposit} applied.`,
          transportEnabled: Boolean(transport),
          transportTotal: transport?.total ?? 0,
          transportPaid: transport?.paid ?? 0,
        },
        { course: plan, transportation: transport?.plan ?? [] },
      );
      await groups.addStudent(group.id, studentId, false);
      if (deposit > 0) {
        await enrollments.recordPayment({
          studentId,
          enrollmentId,
          courseId,
          amount: deposit,
          method: normalizeMethod(lead.depositMethod),
          paidAt: lead.depositPaidAt ?? now,
          notes: `Pre-enrollment deposit recorded. ${lead.depositNotes || ''}`.trim(),
          processedById: byUser.id,
        });
      }
      await leads.update(lead.id, { status: 'student', convertedAt: now });
      await leads.addStatusChange(lead.id, {
        fromStatus: 'waiting',
        toStatus: 'student',
        reason: `Enrolled in group "${group.name}" for course "${course.title}"`,
        changedById: byUser.id,
      });
      return enrollmentId;
    });

    this.notify(
      studentId,
      'enrollment',
      'Enrolled in Course',
      `You have been enrolled in ${course.title} — Group: ${group.name}. Total: $${total}${deposit > 0 ? ` (deposit $${deposit} applied)` : ''}.`,
      { enrollmentId: id, courseId, courseTitle: course.title },
    );
    return { enrollment: await this.require(id), deposit };
  }

  /**
   * Bundle enrollment. Full: one paying enrollment on the bundle plus a free
   * enrollment per sub-course. Partial: a normal paying enrollment per
   * selected sub-course at its own price.
   */
  async enrollInBundle(input: BundleInput) {
    await this.requireStudent(input.studentId);
    const bundle = await this.courses.findById(input.bundleId);
    if (!bundle) throw new NotFoundError('Bundle');
    if (bundle.type !== 'bundle') throw new BadRequestError('Selected course is not a bundle');
    const subCourses = (await this.courses.subCoursesOf([bundle.id])).get(bundle.id) ?? [];
    if (subCourses.length === 0) throw new BadRequestError('Bundle has no sub-courses');

    const chosen = input.enrollFull ? subCourses : subCourses.filter((c) => input.selectedCourseIds.includes(c.id));
    if (chosen.length === 0) throw new BadRequestError('No sub-courses selected for enrollment');

    // Enrollments already on these courses. With cascading deletes a bundle's
    // sub-enrollments can no longer outlive it, so every hit is a real conflict.
    const conflicts = await this.enrollments.existingForCourses(input.studentId, chosen.map((c) => c.id));
    if (conflicts.length > 0) {
      const byId = new Map(chosen.map((c) => [c.id, c.title]));
      const titles = conflicts.map((e) => byId.get(e.courseId) ?? e.courseId).join(', ');
      throw Object.assign(
        new BadRequestError(`Student is already enrolled in: ${titles}. Remove those enrollments first or deselect those sub-courses.`),
        { details: { conflicts: conflicts.map((e) => ({ courseId: e.courseId, title: byId.get(e.courseId) })) } },
      );
    }

    const now = this.now();
    const discount = clampDiscount(input.discount);
    const groupFor = new Map(input.groupSelections.map((g) => [g.courseId, g.groupId]));
    const plan = (total: number): InstallmentInput[] =>
      input.installments?.length ? input.installments.map((i) => ({ amount: i.amount, dueDate: i.dueDate })) : [{ amount: total, dueDate: now }];

    if (input.enrollFull) {
      const total = discounted(bundle.bundlePrice ?? 0, discount);
      const ids = await this.uow.run(async ({ enrollments, groups }) => {
        const bundleEnrollmentId = await enrollments.create(
          { studentId: input.studentId, courseId: bundle.id, paymentTotal: total, discount, notes: input.notes, source: 'direct' },
          { course: plan(total) },
        );
        const subIds: string[] = [];
        for (const sc of chosen) {
          subIds.push(
            await enrollments.create(
              { studentId: input.studentId, courseId: sc.id, paymentTotal: 0, notes: `Part of bundle: ${bundle.title}`, source: 'bundle', bundleEnrollmentId },
              {},
            ),
          );
          const gid = groupFor.get(sc.id);
          if (gid) await groups.addStudent(gid, input.studentId, false);
        }
        return { bundleEnrollmentId, subIds };
      });
      this.notify(input.studentId, 'enrollment', 'Bundle Enrollment', `You have been enrolled in the ${bundle.title} bundle (${chosen.length} courses). Total: ${total.toLocaleString()} S.P.`, {
        enrollmentId: ids.bundleEnrollmentId,
        courseId: bundle.id,
        courseTitle: bundle.title,
        totalAmount: total,
      });
      return {
        kind: 'full' as const,
        bundleEnrollment: await this.require(ids.bundleEnrollmentId),
        subEnrollments: await Promise.all(ids.subIds.map((id) => this.require(id))),
        pricing: { bundlePrice: bundle.bundlePrice, discount, totalCharged: total },
      };
    }

    const ids = await this.uow.run(async ({ enrollments, groups }) => {
      const created: string[] = [];
      for (const sc of chosen) {
        const total = discounted(sc.price || 0, discount);
        created.push(
          await enrollments.create(
            { studentId: input.studentId, courseId: sc.id, paymentTotal: total, discount, notes: input.notes, source: 'direct' },
            { course: plan(total) },
          ),
        );
        const gid = groupFor.get(sc.id);
        if (gid) await groups.addStudent(gid, input.studentId, false);
      }
      return created;
    });
    const created = await Promise.all(ids.map((id) => this.require(id)));
    this.notify(input.studentId, 'enrollment', 'Course Enrollment', `You have been enrolled in ${created.length} course(s) from the ${bundle.title} bundle.`, {
      courseTitle: bundle.title,
    });
    return {
      kind: 'partial' as const,
      enrollments: created,
      pricing: { individualTotal: created.reduce((s, e) => s + e.paymentTotal, 0), discount },
    };
  }

  // ─── Changing ────────────────────────────────────────────────────────────

  /**
   * Updates status, notes and transportation. When transportation is newly
   * enabled with money paid on the spot, a transportation receipt is issued
   * in the same transaction.
   */
  async update(id: string, input: UpdateEnrollmentInput, byUser: { id: string }): Promise<Enrollment> {
    const current = await this.require(id);
    const now = this.now();
    const changes: Partial<NewEnrollmentRow> = {};
    if (input.status) changes.status = input.status;
    if (input.notes !== undefined) changes.notes = input.notes;

    const t = input.transportation;
    let newTransportPlan: InstallmentInput[] | undefined;
    let receiptForPaidNow: number | null = null;

    if (t?.enabled === false) changes.transportEnabled = false;
    if (t?.enabled === true) {
      const wasEnabled = current.transportEnabled;
      let total = current.transportTotal;
      let paid = current.transportPaid;
      changes.transportEnabled = true;

      if (t.totalAmount !== undefined) {
        const newTotal = num(t.totalAmount);
        if (newTotal >= 0) {
          if (newTotal < paid) {
            throw new BadRequestError(
              `New transportation total (${newTotal.toLocaleString()} S.P.) cannot be less than already paid amount (${paid.toLocaleString()} S.P.)`,
            );
          }
          total = newTotal;
        }
      }
      if (t.paidNow !== undefined) {
        const paidNow = num(t.paidNow);
        if (paidNow < 0) throw new BadRequestError('Paid amount cannot be negative');
        if (paidNow > total) {
          throw new BadRequestError(`Paid amount (${paidNow.toLocaleString()} S.P.) cannot exceed total amount (${total.toLocaleString()} S.P.)`);
        }
        paid = paidNow;
        if (!wasEnabled && paidNow > 0) receiptForPaidNow = paidNow;
      }
      changes.transportTotal = total;
      changes.transportPaid = paid;
      if (t.installments) {
        newTransportPlan = total - paid > 0.01 ? t.installments.map((i) => ({ amount: i.amount, dueDate: i.dueDate })) : [];
      }
    }

    await this.uow.run(async ({ enrollments, receipts }) => {
      if (Object.keys(changes).length > 0) await enrollments.update(id, changes);
      if (newTransportPlan) await enrollments.replaceInstallments(id, 'transportation', newTransportPlan);
      if (receiptForPaidNow !== null) {
        await issueReceipt(receipts, {
          enrollmentId: id,
          studentId: current.studentId,
          courseId: current.courseId,
          type: 'transportation',
          amount: receiptForPaidNow,
          method: normalizeMethod(t?.paymentMethod),
          date: now,
          notes: t?.notes ?? '',
          amountInSP: null,
          billing: {
            totalAmount: changes.transportTotal ?? 0,
            paidBefore: 0,
            paidNow: receiptForPaidNow,
            remainingBalance: (changes.transportTotal ?? 0) - (changes.transportPaid ?? 0),
          },
          issuedById: byUser.id,
        });
      }
    });

    if (input.status && input.status !== current.status) {
      this.notify(current.studentId, 'enrollment', 'Enrollment Status Updated', `Your enrollment in ${current.course?.title ?? 'your course'} has been updated to ${input.status}.`, {
        enrollmentId: id,
        courseId: current.courseId,
        status: input.status,
      });
    }
    this.remind(id);
    return this.require(id);
  }

  /** Changes status with a history entry; a bundle enrollment passes it on to its sub-courses. */
  async setStatus(id: string, status: EnrollmentStatus, reason: string | undefined): Promise<Enrollment> {
    if (status === 'inactive' && !reason) throw new BadRequestError('Reason is required when marking enrollment as inactive');
    const current = await this.require(id);
    await this.uow.run(async ({ enrollments }) => {
      await enrollments.update(id, { status });
      await enrollments.addStatusChange(id, { status, reason: reason || `Changed to ${status}` });
      await enrollments.cascadeStatus(id, status, reason || `Bundle enrollment set to ${status}`);
    });
    if (status === 'inactive') {
      const courseTitle = current.course?.title || 'your course';
      this.notify(current.studentId, 'enrollment', 'Account Deactivated', `Your enrollment in ${courseTitle} has been deactivated. Reason: ${reason}`, {
        enrollmentId: id,
        courseTitle,
        reason,
        status: 'inactive',
      });
    }
    return this.require(id);
  }

  /**
   * Deletes the enrollment with its receipts, payments and installments
   * (database cascades), takes the student out of the course's groups, and —
   * for a bundle enrollment — does the same for every sub-course enrollment.
   */
  async delete(id: string): Promise<void> {
    const current = await this.enrollments.findRow(id);
    if (!current) throw notFound();
    const subs = await this.enrollments.subEnrollments(id);
    await this.uow.run(async ({ enrollments, groups }) => {
      await groups.removeStudentFromCourse(current.studentId, current.courseId);
      for (const sub of subs) await groups.removeStudentFromCourse(sub.studentId, sub.courseId);
      await enrollments.delete(id);
    });
  }

  /** Whether login should be refused because every enrollment of the student is inactive. */
  allEnrollmentsInactive(studentId: string): Promise<boolean> {
    return this.enrollments.allInactive(studentId);
  }
}

