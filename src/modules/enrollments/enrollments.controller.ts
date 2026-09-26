import type { Request, Response } from 'express';
import { paginationMeta, parsePagination } from '../../shared/http/pagination';
import { currentUser } from '../../shared/http/request-user';
import { parse } from '../../shared/http/validate';
import { downloadUrl } from '../receipts/receipts.service';
import type { EnrollmentPaymentService } from './enrollment-payments.service';
import type { Enrollment } from './enrollments.repository';
import {
  bundleBody,
  createEnrollmentBody,
  fromWaitingBody,
  listEnrollmentsQuery,
  paymentBody,
  statusBody,
  updateEnrollmentBody,
} from './enrollments.schemas';
import type { EnrollmentService } from './enrollments.service';
import type { InstallmentRow } from './enrollments.table';

type CourseShape = 'basic' | 'withType' | 'detailed';

const installmentDoc = (i: InstallmentRow) => ({
  _id: i.id,
  amount: i.amount,
  dueDate: i.dueDate,
  paidDate: i.paidDate,
  status: i.status,
  paymentId: i.paymentId,
});

/** The enrollment document with the old nested layout (payment / transportation / progress ...). */
export function enrollmentDoc(e: Enrollment, course: CourseShape = 'basic') {
  const c = e.course;
  const courseRef = !c
    ? e.courseId
    : course === 'withType'
      ? { _id: c.id, title: c.title, price: c.price, type: c.type, bundlePrice: c.bundlePrice }
      : course === 'detailed'
        ? { _id: c.id, title: c.title, category: c.category, level: c.level, price: c.price, thumbnail: c.thumbnail }
        : { _id: c.id, title: c.title, price: c.price };
  return {
    _id: e.id,
    student: e.student ? { _id: e.student.id, name: e.student.name, email: e.student.email } : e.studentId,
    course: courseRef,
    enrolledAt: e.enrolledAt,
    status: e.status,
    progress: {
      completedModules: e.completedModuleIds,
      currentModule: e.currentModuleId,
      percentageComplete: e.percentageComplete,
      lastAccessedAt: e.lastAccessedAt,
    },
    payment: {
      totalAmount: e.paymentTotal,
      paidAmount: e.paymentPaid,
      remainingAmount: e.paymentTotal - e.paymentPaid,
      discount: e.discount,
      installments: e.courseInstallments.map(installmentDoc),
      lastPaymentDate: e.lastPaymentDate,
    },
    attendance: { totalSessions: e.attendanceTotalSessions, attendedSessions: e.attendanceAttendedSessions, percentage: e.attendancePercentage },
    grade: { quizAverage: e.quizAverage, assignmentAverage: e.assignmentAverage, overallGrade: e.overallGrade },
    completedAt: e.completedAt,
    certificate: {
      issued: e.certificateIssued,
      issuedAt: e.certificateIssuedAt,
      certificateUrl: e.certificateUrl,
      certificateNumber: e.certificateNumber,
    },
    statusHistory: e.statusHistory.map((h) => ({ _id: h.id, status: h.status, reason: h.reason, changedAt: h.changedAt, changedBy: h.changedBy })),
    notes: e.notes,
    enrollmentSource: e.source,
    bundleEnrollmentId: e.bundleEnrollmentId,
    transportation: {
      enabled: e.transportEnabled,
      totalAmount: e.transportTotal,
      paidAmount: e.transportPaid,
      remainingAmount: e.transportTotal - e.transportPaid,
      installments: e.transportInstallments.map(installmentDoc),
      routeId: e.transportRouteId,
      homeLocation: { lat: e.homeLat, lng: e.homeLng },
      homeAddress: e.homeAddress,
      rawDistanceKm: e.rawDistanceKm,
      roadDistanceKm: e.roadDistanceKm,
      monthlyFeeEstimate: e.monthlyFeeEstimate,
      locationUpdatedAt: e.locationUpdatedAt,
      locationUpdatedBy: e.locationUpdatedById,
    },
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

const receiptLink = (r: { receiptId: string; receiptNumber: string }) => ({
  receiptId: r.receiptId,
  receiptNumber: r.receiptNumber,
  downloadUrl: downloadUrl(r.receiptId),
});

type IdReq = Request<{ id: string }>;

export class EnrollmentController {
  constructor(
    private readonly enrollments: EnrollmentService,
    private readonly payments: EnrollmentPaymentService,
  ) {}

  list = async (req: Request, res: Response) => {
    const page = parsePagination(req.query);
    const q = parse(listEnrollmentsQuery, req.query);
    const { items, total } = await this.enrollments.list(
      {
        courseId: q.course,
        status: q.status,
        studentSearch: q.student,
        paymentStatus: q.paymentStatus,
        hasDiscount: q.hasDiscount === undefined ? undefined : q.hasDiscount === 'true',
        transportation: q.transportationFilter,
      },
      page,
    );
    const { total: t, page: p, pages, limit } = paginationMeta(total, page);
    res.json({ success: true, data: items.map((e) => enrollmentDoc(e, 'withType')), pagination: { page: p, limit, total: t, pages } });
  };

  recent = async (req: Request, res: Response) => {
    const { limit } = parsePagination(req.query, { defaultLimit: 10 });
    const list = await this.enrollments.recent(limit);
    res.json({ success: true, data: list.map((e) => enrollmentDoc(e)) });
  };

  get = async (req: IdReq, res: Response) => {
    res.json({ success: true, data: enrollmentDoc(await this.enrollments.get(req.params.id)) });
  };

  create = async (req: Request, res: Response) => {
    const e = await this.enrollments.create(parse(createEnrollmentBody, req.body));
    res.status(201).json({ success: true, message: 'Enrollment created successfully', data: enrollmentDoc(e) });
  };

  update = async (req: IdReq, res: Response) => {
    const e = await this.enrollments.update(req.params.id, parse(updateEnrollmentBody, req.body), currentUser(req));
    res.json({ success: true, message: 'Enrollment updated successfully', data: enrollmentDoc(e) });
  };

  setStatus = async (req: IdReq, res: Response) => {
    const { status, reason } = parse(statusBody, req.body);
    const e = await this.enrollments.setStatus(req.params.id, status, reason);
    res.json({ success: true, message: 'Enrollment status updated successfully', data: enrollmentDoc(e) });
  };

  delete = async (req: IdReq, res: Response) => {
    await this.enrollments.delete(req.params.id);
    res.json({ success: true, message: 'Enrollment and all related data deleted successfully' });
  };

  check = async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const { courseEnrollment, groupEnrollment } = await this.enrollments.check(q.studentId, q.courseId, q.groupId);
    res.json({
      success: true,
      data: {
        isEnrolledInCourse: Boolean(courseEnrollment),
        isEnrolledInGroup: Boolean(groupEnrollment),
        courseEnrollment: courseEnrollment
          ? {
              _id: courseEnrollment.id,
              status: courseEnrollment.status,
              course: courseEnrollment.course ? { _id: courseEnrollment.course.id, title: courseEnrollment.course.title } : courseEnrollment.courseId,
              student: courseEnrollment.student
                ? { _id: courseEnrollment.student.id, name: courseEnrollment.student.name, email: courseEnrollment.student.email }
                : courseEnrollment.studentId,
            }
          : null,
        groupEnrollment,
      },
    });
  };

  fromWaiting = async (req: Request, res: Response) => {
    const { enrollment, deposit } = await this.enrollments.enrollFromWaiting(parse(fromWaitingBody, req.body), currentUser(req));
    res.status(201).json({
      success: true,
      message: `Student enrolled successfully${deposit > 0 ? ` with $${deposit} deposit applied` : ''}`,
      data: enrollmentDoc(enrollment),
    });
  };

  bundle = async (req: Request, res: Response) => {
    const result = await this.enrollments.enrollInBundle(parse(bundleBody, req.body));
    if (result.kind === 'full') {
      res.status(201).json({
        success: true,
        message: `Student enrolled in full bundle (${result.subEnrollments.length} courses)`,
        data: {
          bundleEnrollment: enrollmentDoc(result.bundleEnrollment),
          subEnrollments: result.subEnrollments.map((e) => enrollmentDoc(e)),
          pricing: result.pricing,
        },
      });
      return;
    }
    res.status(201).json({
      success: true,
      message: `Student enrolled in ${result.enrollments.length} course(s) from bundle`,
      data: { enrollments: result.enrollments.map((e) => enrollmentDoc(e)), pricing: result.pricing },
    });
  };

  subEnrollments = async (req: Request<{ enrollmentId: string }>, res: Response) => {
    const subs = await this.enrollments.subEnrollments(req.params.enrollmentId);
    res.json({
      success: true,
      data: subs.map(({ enrollment: e, group, groupSize }) => ({
        _id: e.id,
        course: enrollmentDoc(e, 'detailed').course,
        status: e.status,
        enrolledAt: e.enrolledAt,
        group: group ? { _id: group.id, name: group.name, status: group.status, enrolledCount: groupSize, maxStudents: group.maxStudents } : null,
      })),
    });
  };

  recordPayment = async (req: IdReq, res: Response) => {
    const { enrollment, receipt } = await this.payments.recordCoursePayment(req.params.id, parse(paymentBody, req.body), currentUser(req));
    res.json({ success: true, message: 'Payment recorded successfully', data: enrollmentDoc(enrollment), receipt: receiptLink(receipt) });
  };

  recordTransportPayment = async (req: IdReq, res: Response) => {
    const { enrollment, receipt } = await this.payments.recordTransportPayment(req.params.id, parse(paymentBody, req.body), currentUser(req));
    res.json({
      success: true,
      message: 'Transportation payment recorded successfully',
      data: { enrollment: enrollmentDoc(enrollment), receipt: receiptLink(receipt) },
    });
  };

  markOverdueTransport = async (_req: Request, res: Response) => {
    const r = await this.payments.markOverdueTransportInstallments();
    res.json({
      success: true,
      message: `Successfully marked ${r.installments} transportation installment(s) as overdue across ${r.enrollments} enrollment(s)`,
      data: { installmentsMarked: r.installments, enrollmentsUpdated: r.enrollments, totalEnrollmentsChecked: r.checked },
    });
  };

  deleteTransportation = async (req: IdReq, res: Response) => {
    const e = await this.payments.deleteTransportation(req.params.id);
    res.json({
      success: true,
      message: 'Transportation deleted successfully. All transportation data, receipts, and payments have been removed.',
      data: enrollmentDoc(e),
    });
  };
}
