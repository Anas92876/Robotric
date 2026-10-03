import type { Request, Response } from 'express';
import { currentUser } from '../../shared/http/request-user';
import type { CertificateService } from './certificates.service';

type GroupReq = Request<{ groupId: string }>;
type NumberReq = Request<{ certNumber: string }>;

export class CertificateController {
  constructor(private readonly certificates: CertificateService) {}

  /** POST /api/clo/certificates/generate-group/:groupId */
  issueForGroup = async (req: GroupReq, res: Response) => {
    const r = await this.certificates.issueForGroup(req.params.groupId, currentUser(req).id);
    if (r.empty) {
      res.json({ success: true, issued: 0, skipped: 0, certificates: [], message: 'No students in this group' });
      return;
    }
    res.status(201).json({ success: true, issued: r.issued, skipped: r.skipped, certificates: r.results, issuedAt: r.issuedAt.toISOString(), warning: r.warning });
  };

  /** DELETE /api/clo/certificates/group/:groupId */
  deleteForGroup = async (req: GroupReq, res: Response) => {
    const deleted = await this.certificates.deleteForGroup(req.params.groupId);
    res.json({ success: true, deleted, message: `${deleted} certificate(s) deleted` });
  };

  /** GET /api/student/certificates */
  mine = async (req: Request, res: Response) => {
    const list = await this.certificates.mine(currentUser(req).id);
    res.json({
      success: true,
      count: list.length,
      data: list.map(({ certificate: c, trainingHours }) => ({
        _id: c.id,
        certificateNumber: c.certificateNumber,
        issuedAt: c.issuedAt,
        studentName: c.studentName,
        courseName: c.courseName,
        courseLevel: c.courseLevel,
        trainingHours,
        gender: c.gender,
        course: c.course
          ? { _id: c.course.id, title: c.course.title, level: c.course.level, category: c.course.category, totalHours: c.course.totalHours, duration: c.course.duration }
          : c.courseId,
      })),
    });
  };

  /** GET /api/student/certificates/:certNumber/pdf */
  pdf = async (req: NumberReq, res: Response) => {
    const { certNumber } = req.params;
    const pdf = await this.certificates.pdfFor(certNumber, currentUser(req).id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${certNumber.replace(/[^A-Za-z0-9-]/g, '')}.pdf"`);
    res.setHeader('Content-Length', pdf.length);
    res.setHeader('Cache-Control', 'no-cache');
    res.send(pdf);
  };

  /** GET /api/certificates/verify/:certNumber — public. */
  verify = async (req: NumberReq, res: Response) => {
    const c = await this.certificates.verify(req.params.certNumber);
    if (!c) {
      res.status(404).json({ success: false, valid: false, message: 'Certificate not found' });
      return;
    }
    res.json({
      success: true,
      valid: true,
      certificate: {
        certificateNumber: c.certificateNumber,
        studentName: c.studentName,
        courseName: c.courseName,
        courseLevel: c.courseLevel,
        trainingHours: c.trainingHours || 0,
        gender: c.gender,
        issuedAt: c.issuedAt,
        issuedBy: c.issuedByName || 'Robotrick',
        course: c.course ? { _id: c.course.id, title: c.course.title, level: c.course.level, category: c.course.category } : c.courseId,
      },
    });
  };
}
