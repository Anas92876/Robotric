import type { Request, Response } from 'express';
import { currentUser } from '../../shared/http/request-user';
import type { Assignment } from './assignments.repository';
import type { AssignmentService } from './assignments.service';
import type { SubmissionRow } from './assignments.table';

function assignmentDoc(a: Assignment) {
  return {
    _id: a.id,
    module: a.module ? { _id: a.module.id, title: a.module.title, order: a.module.order } : a.moduleId,
    course: a.course ? { _id: a.course.id, title: a.course.title } : a.courseId,
    title: a.title,
    description: a.description,
    instructions: a.instructions,
    dueDate: a.dueDate,
    maxScore: a.maxScore,
    allowedFileTypes: a.allowedFileTypes,
    maxFileSize: a.maxFileSize,
    maxFiles: a.maxFiles,
    allowLateSubmission: a.allowLateSubmission,
    lateSubmissionDeadline: a.lateSubmissionDeadline,
    latePenalty: a.latePenalty,
    resources: a.resources,
    rubric: a.rubric,
    isActive: a.isActive,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

/** A submission; each file's `fileUrl` is a short-lived signed link (files are private now). */
function submissionDoc(s: SubmissionRow, links: Map<string, string | null>, graders?: Map<string, string>) {
  const gradedBy = s.grade.gradedBy;
  return {
    _id: s.id,
    student: s.studentId,
    assignment: s.assignmentId,
    course: s.courseId,
    files: s.files.map((f) => ({
      _id: f._id,
      filename: f.filename,
      originalName: f.originalName,
      fileUrl: links.get(f._id) ?? null,
      fileType: f.fileType,
      fileSize: f.fileSize,
      uploadedAt: f.uploadedAt,
    })),
    submittedAt: s.submittedAt,
    isLate: s.isLate,
    status: s.status,
    grade: { ...s.grade, gradedBy: gradedBy && graders?.has(gradedBy) ? { _id: gradedBy, name: graders.get(gradedBy) } : (gradedBy ?? null) },
    resubmission: { allowed: s.resubmissionAllowed, count: s.resubmissionCount, deadline: s.resubmissionDeadline },
    comments: s.comments,
    version: s.version,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

type AReq = Request<{ assignmentId: string }>;
type SReq = Request<{ submissionId: string }>;

/** /api/student/assignments */
export class StudentAssignmentController {
  constructor(private readonly assignments: AssignmentService) {}

  get = async (req: AReq, res: Response) => {
    const r = await this.assignments.view(req.params.assignmentId, currentUser(req).id);
    const links = r.submission ? await this.assignments.fileLinks(r.submission.files) : new Map();
    res.json({
      success: true,
      data: { assignment: assignmentDoc(r.assignment), submission: r.submission ? submissionDoc(r.submission, links) : null, isOverdue: r.isOverdue, canSubmit: r.canSubmit },
    });
  };

  submit = async (req: AReq, res: Response) => {
    const files = Array.isArray(req.files) ? req.files : undefined;
    const { submission, isLate } = await this.assignments.submit(req.params.assignmentId, currentUser(req).id, files);
    res.status(201).json({
      success: true,
      message: isLate ? 'Late submission received' : 'Assignment submitted successfully',
      data: submissionDoc(submission, await this.assignments.fileLinks(submission.files)),
    });
  };

  status = async (req: AReq, res: Response) => {
    const { assignment, submissions, graders, isOverdue } = await this.assignments.status(req.params.assignmentId, currentUser(req).id);
    const docs = await Promise.all(submissions.map(async (s) => submissionDoc(s, await this.assignments.fileLinks(s.files), graders)));
    res.json({
      success: true,
      data: {
        assignmentId: assignment.id,
        hasSubmitted: docs.length > 0,
        submissionCount: docs.length,
        latestSubmission: docs[0] ?? null,
        allSubmissions: docs,
        assignment: { title: assignment.title, dueDate: assignment.dueDate, maxScore: assignment.maxScore, isOverdue },
      },
    });
  };

  delete = async (req: SReq, res: Response) => {
    await this.assignments.deleteSubmission(req.params.submissionId, currentUser(req).id);
    res.json({ success: true, message: 'Submission deleted successfully' });
  };

  comment = async (req: SReq, res: Response) => {
    const text = (req.body as { text?: string } | undefined)?.text;
    const comment = await this.assignments.comment(req.params.submissionId, currentUser(req).id, text);
    res.json({ success: true, message: 'Comment added', data: comment });
  };
}
