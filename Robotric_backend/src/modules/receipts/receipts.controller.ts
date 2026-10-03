import type { Request, Response } from 'express';
import { z } from 'zod';
import { ForbiddenError, NotFoundError } from '../../shared/http/errors';
import { currentUser } from '../../shared/http/request-user';
import { numeric, parse } from '../../shared/http/validate';
import type { EnrollmentRepository } from '../enrollments/enrollments.repository';
import { enrollmentDoc } from '../enrollments/enrollments.controller';
import { normalizeMethod } from '../enrollments/enrollments.schemas';
import type { Receipt } from './receipts.repository';
import { downloadUrl, legacyPdfPath, type ReceiptService } from './receipts.service';

/** The receipt document; references are populated only where the old endpoint populated them. */
export function receiptDoc(r: Receipt, populate: { student?: boolean; course?: boolean; enrollment?: unknown } = {}) {
  return {
    _id: r.id,
    receiptNumber: r.receiptNumber,
    enrollment: populate.enrollment ?? r.enrollmentId,
    student: populate.student && r.student ? { _id: r.student.id, name: r.student.name, email: r.student.email } : r.studentId,
    course: populate.course && r.course ? { _id: r.course.id, title: r.course.title } : r.courseId,
    payment: {
      amount: r.amount,
      method: r.method,
      date: r.paymentDate,
      notes: r.notes,
      paidInSP: r.paidInSP,
      paymentCurrency: r.paymentCurrency,
    },
    billing: { totalAmount: r.billingTotal, paidBefore: r.billingPaidBefore, paidNow: r.billingPaidNow, remainingBalance: r.billingRemaining },
    pdfPath: legacyPdfPath(r),
    issuedBy: r.issuedBy ? { _id: r.issuedBy.id, name: r.issuedBy.name } : r.issuedById,
    type: r.type,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function sendPdf(res: Response, { filename, pdf }: { filename: string; pdf: Buffer }) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(pdf);
}

const manualBody = z.object({
  enrollmentId: z.string().optional(),
  paymentAmount: numeric('Payment amount must be a number').optional(),
  paymentMethod: z.string().optional(),
  paymentNotes: z.string().optional(),
});

/** Receipts for reception staff. */
export class ReceiptController {
  constructor(
    private readonly receipts: ReceiptService,
    private readonly enrollments: Pick<EnrollmentRepository, 'findRow' | 'findById'>,
  ) {}

  create = async (req: Request, res: Response) => {
    const input = parse(manualBody, req.body);
    const enrollment = input.enrollmentId ? await this.enrollments.findRow(input.enrollmentId) : null;
    const { id, receiptNumber } = await this.receipts.createManual(
      { ...input, paymentMethod: normalizeMethod(input.paymentMethod) },
      enrollment,
      currentUser(req).id,
    );
    res.status(201).json({
      success: true,
      message: 'Receipt generated successfully',
      data: { receiptId: id, receiptNumber, downloadUrl: downloadUrl(id) },
    });
  };

  get = async (req: Request<{ id: string }>, res: Response) => {
    const r = await this.receipts.get(req.params.id);
    const e = await this.enrollments.findById(r.enrollmentId);
    // The old endpoint populated the whole enrollment document.
    res.json({ success: true, data: receiptDoc(r, { student: true, course: true, enrollment: e ? enrollmentDoc(e) : r.enrollmentId }) });
  };

  download = async (req: Request<{ id: string }>, res: Response) => {
    sendPdf(res, await this.receipts.pdfFor(req.params.id));
  };

  forEnrollment = async (req: Request<{ enrollmentId: string }>, res: Response) => {
    const list = await this.receipts.list({ enrollmentId: req.params.enrollmentId });
    res.json({ success: true, data: list.map((r) => receiptDoc(r)) });
  };

  /** GET /api/reception/enrollments/:id/transportation-receipts */
  transportForEnrollment = async (req: Request<{ id: string }>, res: Response) => {
    if (!(await this.enrollments.findRow(req.params.id))) throw new NotFoundError('Enrollment');
    const list = await this.receipts.list({ enrollmentId: req.params.id, type: 'transportation' });
    res.json({ success: true, data: list.map((r) => receiptDoc(r)) });
  };
}

/**
 * The student's own payments. Read-only: payments are recorded at the
 * company by reception, so the old initiate/confirm endpoints — which let a
 * student mark their own payment as paid — now refuse.
 */
export class StudentPaymentController {
  constructor(
    private readonly receipts: ReceiptService,
    private readonly enrollments: Pick<EnrollmentRepository, 'forStudent' | 'findForStudentCourse'>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private static asPayment(r: Receipt) {
    return {
      _id: r.id,
      amount: r.amount,
      paymentMethod: r.method,
      transactionId: r.receiptNumber,
      status: 'completed',
      paidAt: r.paymentDate,
      receipt: { receiptNumber: r.receiptNumber, receiptUrl: legacyPdfPath(r), generatedAt: r.createdAt },
      notes: r.notes,
      createdAt: r.createdAt,
      course: r.course ? { _id: r.course.id, title: r.course.title } : r.courseId,
      type: r.type,
    };
  }

  all = async (req: Request, res: Response) => {
    const list = await this.receipts.list({ studentId: currentUser(req).id });
    res.json({ success: true, count: list.length, data: list.map(StudentPaymentController.asPayment) });
  };

  forCourse = async (req: Request<{ courseId: string }>, res: Response) => {
    const studentId = currentUser(req).id;
    if (!(await this.enrollments.findForStudentCourse(studentId, req.params.courseId))) {
      throw new ForbiddenError('You are not enrolled in this course');
    }
    const list = await this.receipts.list({ studentId, courseId: req.params.courseId });
    res.json({ success: true, count: list.length, data: list.map(StudentPaymentController.asPayment) });
  };

  receipt = async (req: Request<{ paymentId: string }>, res: Response) => {
    sendPdf(res, await this.receipts.pdfFor(req.params.paymentId, currentUser(req).id));
  };

  summary = async (req: Request, res: Response) => {
    const studentId = currentUser(req).id;
    const [enrollments, receipts] = await Promise.all([this.enrollments.forStudent(studentId), this.receipts.list({ studentId })]);
    const now = this.now();
    const s = {
      totalAmount: 0,
      paidAmount: 0,
      remainingAmount: 0,
      totalPayments: receipts.length,
      completedPayments: receipts.length,
      pendingPayments: 0,
      overduePayments: 0,
      nextPaymentDue: null as { amount: number; dueDate: Date; isOverdue: boolean } | null,
      transportationTotal: 0,
      transportationPaid: 0,
      transportationRemaining: 0,
      transportationPendingPayments: 0,
      transportationOverduePayments: 0,
      transportationNextPaymentDue: null as { amount: number; dueDate: Date; isOverdue: boolean } | null,
    };
    const earliest = (cur: typeof s.nextPaymentDue, i: { amount: number; dueDate: Date }) =>
      !cur || i.dueDate < cur.dueDate ? { amount: i.amount, dueDate: i.dueDate, isOverdue: i.dueDate < now } : cur;

    for (const e of enrollments) {
      s.totalAmount += e.paymentTotal;
      s.paidAmount += e.paymentPaid;
      s.remainingAmount += e.paymentTotal - e.paymentPaid;
      for (const i of e.courseInstallments) {
        if (i.status !== 'pending') continue;
        s.pendingPayments++;
        if (i.dueDate < now) s.overduePayments++;
        s.nextPaymentDue = earliest(s.nextPaymentDue, i);
      }
      if (e.transportEnabled) {
        s.transportationTotal += e.transportTotal;
        s.transportationPaid += e.transportPaid;
        s.transportationRemaining += e.transportTotal - e.transportPaid;
        for (const i of e.transportInstallments) {
          if (i.status !== 'pending') continue;
          s.transportationPendingPayments++;
          if (i.dueDate < now) s.transportationOverduePayments++;
          s.transportationNextPaymentDue = earliest(s.transportationNextPaymentDue, i);
        }
      }
    }
    res.json({ success: true, data: s });
  };

  /** POST /initiate and /:paymentId/confirm — disabled; see class comment. */
  disabled = async () => {
    throw new ForbiddenError('Payments are recorded at the company by reception. Online payment is not available.', 'PAYMENTS_AT_RECEPTION');
  };
}
