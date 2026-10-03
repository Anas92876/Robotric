import { BadRequestError, NotFoundError } from '../../shared/http/errors';
import type { PdfRenderer } from '../../shared/pdf/pdf-renderer';
import type { DisplayNameResolver } from '../auth/auth.ports';
import type { PaymentMethod } from '../enrollments/enrollments.table';
import { buildReceiptHtml } from './receipt-html';
import type { Receipt, ReceiptFilter, ReceiptRepository } from './receipts.repository';

export interface IssueReceiptInput {
  enrollmentId: string;
  studentId: string;
  courseId: string;
  type: 'course' | 'transportation';
  amount: number;
  method: PaymentMethod;
  date: Date;
  notes: string;
  amountInSP: number | null;
  billing: { totalAmount: number; paidBefore: number; paidNow: number; remainingBalance: number };
  issuedById: string;
}

/**
 * Creates receipt records. Takes the repository per call so callers can
 * pass one bound to their transaction: the payment and its receipt are then
 * saved together or not at all.
 */
export async function issueReceipt(repo: ReceiptRepository, input: IssueReceiptInput): Promise<{ id: string; receiptNumber: string }> {
  const receiptNumber = await repo.nextNumber(input.date.getFullYear());
  const id = await repo.create({
    receiptNumber,
    enrollmentId: input.enrollmentId,
    studentId: input.studentId,
    courseId: input.courseId,
    type: input.type,
    amount: input.amount,
    method: input.method,
    paymentDate: input.date,
    notes: input.notes,
    paymentCurrency: input.amountInSP != null ? 'sp' : 'usd',
    paidInSP: input.amountInSP,
    billingTotal: input.billing.totalAmount,
    billingPaidBefore: input.billing.paidBefore,
    billingPaidNow: input.billing.paidNow,
    billingRemaining: input.billing.remainingBalance,
    issuedById: input.issuedById,
  });
  return { id, receiptNumber };
}

/** Where the old API said a receipt's PDF lived; kept in responses for compatibility. */
export const legacyPdfPath = (r: { receiptNumber: string; type: string }) =>
  `uploads/receipts/${r.type === 'transportation' ? 'TRANS-' : ''}${r.receiptNumber}.pdf`;

export const downloadUrl = (id: string) => `/api/reception/receipts/${id}/download`;

export class ReceiptService {
  constructor(
    private readonly receipts: ReceiptRepository,
    private readonly pdf: PdfRenderer,
    private readonly names: DisplayNameResolver,
  ) {}

  async get(id: string, ownerStudentId?: string): Promise<Receipt> {
    const receipt = await this.receipts.findById(id);
    // A student may only see their own receipts; others look like "not found".
    if (!receipt || (ownerStudentId && receipt.studentId !== ownerStudentId)) throw new NotFoundError('Receipt');
    return receipt;
  }

  list(filter: ReceiptFilter): Promise<Receipt[]> {
    return this.receipts.list(filter);
  }

  /** Renders the receipt PDF from its stored data (with the student's English name when known). */
  async pdfFor(id: string, ownerStudentId?: string): Promise<{ filename: string; pdf: Buffer }> {
    const r = await this.get(id, ownerStudentId);
    const names = r.student ? await this.names.resolve(r.student) : { name: '', nameAr: null };
    const html = buildReceiptHtml({
      type: r.type,
      receiptNumber: r.receiptNumber,
      studentName: names.name,
      studentEmail: r.student?.email ?? '',
      courseTitle: r.course?.title ?? '',
      payment: { amount: r.amount, method: r.method, date: r.paymentDate, notes: r.notes, amountInSP: r.paymentCurrency === 'sp' ? r.paidInSP : null },
      billing: { totalAmount: r.billingTotal, paidBefore: r.billingPaidBefore, paidNow: r.billingPaidNow, remainingBalance: r.billingRemaining },
      enrollmentNotes: r.enrollmentNotes ?? '',
      issuedByName: r.issuedBy?.name ?? '',
    });
    return { filename: `${r.receiptNumber}.pdf`, pdf: await this.pdf.render(html) };
  }

  /**
   * POST /api/reception/receipts — a receipt for a payment that was already
   * recorded (the balance is not changed here, exactly as before).
   */
  async createManual(
    input: { enrollmentId?: string; paymentAmount?: number; paymentMethod?: PaymentMethod; paymentNotes?: string },
    enrollment: { id: string; studentId: string; courseId: string; paymentTotal: number; paymentPaid: number } | null,
    issuedById: string,
  ): Promise<{ id: string; receiptNumber: string }> {
    if (!input.enrollmentId || !input.paymentAmount) throw new BadRequestError('Enrollment ID and payment amount are required');
    if (!enrollment) throw new NotFoundError('Enrollment');
    return issueReceipt(this.receipts, {
      enrollmentId: enrollment.id,
      studentId: enrollment.studentId,
      courseId: enrollment.courseId,
      type: 'course',
      amount: input.paymentAmount,
      method: input.paymentMethod ?? 'cash',
      date: new Date(),
      notes: input.paymentNotes ?? '',
      amountInSP: null,
      billing: {
        totalAmount: enrollment.paymentTotal,
        paidBefore: enrollment.paymentPaid - input.paymentAmount,
        paidNow: input.paymentAmount,
        remainingBalance: enrollment.paymentTotal - enrollment.paymentPaid,
      },
      issuedById,
    });
  }
}
