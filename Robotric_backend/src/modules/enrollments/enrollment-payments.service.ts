import type { UnitOfWork } from '../../shared/db/unit-of-work';
import { BadRequestError, NotFoundError } from '../../shared/http/errors';
import type { Logger } from '../../shared/logger';
import { issueReceipt } from '../receipts/receipts.service';
import type { Enrollment, EnrollmentRepository, InstallmentInput } from './enrollments.repository';
import type { EnrollmentNotifier, EnrollmentRepos } from './enrollments.ports';
import { normalizeMethod, type PaymentInput } from './enrollments.schemas';
import type { InstallmentRow } from './enrollments.table';

export interface IssuedReceipt {
  receiptId: string;
  receiptNumber: string;
}

const notFound = () => new NotFoundError('Enrollment');

function positiveAmount(raw: unknown): number {
  const amount = Number.parseFloat(String(raw ?? ''));
  if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestError('Valid payment amount is required');
  return amount;
}

/**
 * Applies a payment to pending installments, oldest first. A partly-covered
 * installment is split: the covered part is marked paid and the rest becomes
 * a new pending installment with the same due date (old behaviour).
 */
export function allocate(installments: InstallmentRow[], amount: number, at: Date): InstallmentInput[] {
  let left = amount;
  const result: InstallmentInput[] = [];
  const extra: InstallmentInput[] = [];
  for (const i of installments) {
    const item: InstallmentInput = { amount: i.amount, dueDate: i.dueDate, status: i.status, paidDate: i.paidDate, paymentId: i.paymentId };
    if (i.status === 'pending' && left > 0) {
      if (left >= i.amount) {
        item.status = 'paid';
        item.paidDate = at;
        left -= i.amount;
      } else {
        extra.push({ amount: i.amount - left, dueDate: i.dueDate, status: 'pending' });
        item.amount = left;
        item.status = 'paid';
        item.paidDate = at;
        left = 0;
      }
    }
    result.push(item);
  }
  return [...result, ...extra];
}

export class EnrollmentPaymentService {
  constructor(
    private readonly enrollments: EnrollmentRepository,
    private readonly uow: UnitOfWork<EnrollmentRepos>,
    private readonly notifier: EnrollmentNotifier,
    private readonly logger: Logger,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private notify(...args: Parameters<EnrollmentNotifier['notify']>): void {
    this.notifier.notify(...args).catch((err: unknown) => this.logger.warn({ err }, 'Payment notification failed'));
  }

  private async load(id: string): Promise<Enrollment> {
    const e = await this.enrollments.findById(id);
    if (!e) throw notFound();
    return e;
  }

  /**
   * POST /api/reception/enrollments/:id/payment. The balance check and the
   * increment are one atomic UPDATE, and the receipt is written in the same
   * transaction, so a payment always has exactly one receipt.
   */
  async recordCoursePayment(id: string, input: PaymentInput, byUser: { id: string }): Promise<{ enrollment: Enrollment; receipt: IssuedReceipt }> {
    const amount = positiveAmount(input.amount);
    const now = this.now();
    const amountInSP = input.paymentCurrency === 'sp' && input.amountInSP != null ? Number.parseFloat(String(input.amountInSP)) : null;

    const receipt = await this.uow.run(async ({ enrollments, receipts }) => {
      const result = await enrollments.addCoursePayment(id, amount, now);
      if (!result.ok) {
        if (result.reason === 'not_found') throw notFound();
        throw new BadRequestError(`Payment amount exceeds remaining balance. Remaining: ${result.remaining}`);
      }
      const e = (await enrollments.findRow(id))!;
      const issued = await issueReceipt(receipts, {
        enrollmentId: id,
        studentId: e.studentId,
        courseId: e.courseId,
        type: 'course',
        amount,
        method: normalizeMethod(input.paymentMethod),
        date: now,
        notes: input.notes ?? '',
        amountInSP,
        billing: { totalAmount: e.paymentTotal, paidBefore: e.paymentPaid - amount, paidNow: amount, remainingBalance: e.paymentTotal - e.paymentPaid },
        issuedById: byUser.id,
      });
      return { receiptId: issued.id, receiptNumber: issued.receiptNumber };
    });

    const enrollment = await this.load(id);
    const remaining = enrollment.paymentTotal - enrollment.paymentPaid;
    this.notify(
      enrollment.studentId,
      'payment',
      'Payment Received',
      `Payment of ${amount.toLocaleString()} S.P. has been recorded for ${enrollment.course?.title ?? 'your course'}. Remaining balance: ${remaining.toLocaleString()} S.P.`,
      { enrollmentId: id, courseId: enrollment.courseId, amount, remainingAmount: remaining, paymentType: 'course' },
    );
    return { enrollment, receipt };
  }

  /**
   * POST /api/reception/enrollments/:id/transportation-payment. The
   * enrollment row is locked for the whole update, so concurrent payments are
   * applied one after the other instead of the old retry-on-conflict loop.
   */
  async recordTransportPayment(id: string, input: PaymentInput, byUser: { id: string }): Promise<{ enrollment: Enrollment; receipt: IssuedReceipt }> {
    const amount = positiveAmount(input.amount);
    const now = this.now();

    const receipt = await this.uow.run(async ({ enrollments, receipts }) => {
      const e = await enrollments.lockRow(id);
      if (!e) throw notFound();
      if (!e.transportEnabled) throw new BadRequestError('Transportation is not enabled for this enrollment');
      const newPaid = e.transportPaid + amount;
      if (newPaid > e.transportTotal) {
        throw new BadRequestError(`Payment amount exceeds remaining balance. Remaining: ${(e.transportTotal - e.transportPaid).toLocaleString()} S.P.`);
      }
      const current = (await enrollments.findById(id))!.transportInstallments;
      await enrollments.replaceInstallments(id, 'transportation', allocate(current, amount, now));
      await enrollments.update(id, { transportPaid: newPaid });

      const issued = await issueReceipt(receipts, {
        enrollmentId: id,
        studentId: e.studentId,
        courseId: e.courseId,
        type: 'transportation',
        amount,
        method: normalizeMethod(input.paymentMethod),
        date: now,
        notes: input.notes ?? '',
        amountInSP: null,
        billing: { totalAmount: e.transportTotal, paidBefore: e.transportPaid, paidNow: amount, remainingBalance: e.transportTotal - newPaid },
        issuedById: byUser.id,
      });
      return { receiptId: issued.id, receiptNumber: issued.receiptNumber };
    });

    const enrollment = await this.load(id);
    this.notify(enrollment.studentId, 'payment', 'Transportation Payment Received', `Your transportation payment of ${amount.toLocaleString()} S.P. has been recorded`, {
      enrollmentId: id,
      courseId: enrollment.courseId,
      amount,
      paymentType: 'transportation',
    });
    return { enrollment, receipt };
  }

  markOverdueTransportInstallments() {
    return this.enrollments.markOverdueTransportInstallments(this.now());
  }

  /** Turns transportation off and removes its installments and receipts. */
  async deleteTransportation(id: string): Promise<Enrollment> {
    const e = await this.enrollments.findRow(id);
    if (!e) throw notFound();
    if (!e.transportEnabled) throw new BadRequestError('Transportation is not enabled for this enrollment');
    await this.uow.run(async ({ enrollments, receipts }) => {
      await receipts.deleteForEnrollment(id, 'transportation');
      await enrollments.replaceInstallments(id, 'transportation', []);
      await enrollments.update(id, { transportEnabled: false, transportTotal: 0, transportPaid: 0 });
    });
    return this.load(id);
  }
}
