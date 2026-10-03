import { newId } from '../../shared/db/ids';
import { AppError, BadRequestError, ForbiddenError } from '../../shared/http/errors';
import type { FileStorage } from '../../shared/storage/file-storage';
import { sanitizeFilename } from '../../shared/storage/file-storage';
import type { EnrollmentRepository } from '../enrollments/enrollments.repository';
import type { Assignment, AssignmentRepository } from './assignments.repository';
import type { SubmissionRow, SubmittedFile } from './assignments.table';

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const notFound = () => new AppError('Assignment not found', 404, 'NOT_FOUND');
const extOf = (name: string) => name.toLowerCase().split('.').pop() ?? '';

export class AssignmentService {
  constructor(
    private readonly assignments: AssignmentRepository,
    private readonly enrollments: Pick<EnrollmentRepository, 'findForStudentCourse'>,
    private readonly storage: FileStorage,
    private readonly bucket: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async enrolled(assignment: Assignment, studentId: string): Promise<void> {
    const e = await this.enrollments.findForStudentCourse(studentId, assignment.courseId);
    if (!e || e.status !== 'active') throw new ForbiddenError('You are not enrolled in this course');
  }

  /** Signed links for a submission's files (they are private). */
  async fileLinks(files: SubmittedFile[]): Promise<Map<string, string | null>> {
    const links = new Map<string, string | null>();
    for (const f of files) {
      links.set(f._id, await this.storage.signedUrl({ bucket: this.bucket, path: f.storagePath }).catch(() => null));
    }
    return links;
  }

  async view(assignmentId: string, studentId: string) {
    const assignment = await this.assignments.findById(assignmentId);
    if (!assignment || !assignment.isActive) throw notFound();
    await this.enrolled(assignment, studentId);
    const submission = await this.assignments.latestSubmission(studentId, assignmentId);
    return {
      assignment,
      submission,
      isOverdue: this.now() > assignment.dueDate,
      canSubmit: !submission || (submission.resubmissionAllowed && submission.status === 'resubmit_required'),
    };
  }

  /** Validates every file against the assignment's rules before anything is uploaded. */
  async submit(assignmentId: string, studentId: string, files: UploadedFile[] | undefined): Promise<{ submission: SubmissionRow; isLate: boolean }> {
    if (!files || files.length === 0) throw new BadRequestError('No files uploaded');
    const assignment = await this.assignments.findById(assignmentId);
    if (!assignment || !assignment.isActive) throw notFound();
    await this.enrolled(assignment, studentId);

    if (files.length > assignment.maxFiles) throw new BadRequestError(`Maximum ${assignment.maxFiles} files allowed`);
    for (const file of files) {
      const ext = extOf(file.originalname);
      if (assignment.allowedFileTypes.length > 0 && !assignment.allowedFileTypes.includes(ext)) throw new BadRequestError(`File type .${ext} is not allowed`);
      if (file.size > assignment.maxFileSize * 1024 * 1024) throw new BadRequestError(`File size exceeds ${assignment.maxFileSize}MB limit`);
    }
    const submittedAt = this.now();
    const isLate = submittedAt > assignment.dueDate;
    if (isLate && !assignment.allowLateSubmission) throw new BadRequestError('Late submissions are not allowed for this assignment');

    const previous = await this.assignments.latestSubmission(studentId, assignmentId);
    if (previous && (!previous.resubmissionAllowed || previous.status !== 'resubmit_required')) {
      throw new BadRequestError('You cannot resubmit this assignment');
    }

    const stored: SubmittedFile[] = [];
    try {
      for (const file of files) {
        const filename = `${submittedAt.getTime()}-${sanitizeFilename(file.originalname)}`;
        const { path } = await this.storage.upload({
          bucket: this.bucket,
          path: `assignments/${assignmentId}/${studentId}/${filename}`,
          body: file.buffer,
          contentType: file.mimetype,
        });
        stored.push({ _id: newId(), filename, originalName: file.originalname, storagePath: path, fileType: extOf(file.originalname), fileSize: file.size, uploadedAt: submittedAt.toISOString() });
      }
      if (previous) await this.assignments.updateSubmission(previous.id, { resubmissionCount: previous.resubmissionCount + 1 });
      const submission = await this.assignments.createSubmission({
        studentId,
        assignmentId,
        courseId: assignment.courseId,
        files: stored,
        submittedAt,
        isLate,
        status: 'submitted',
        version: previous ? previous.version + 1 : 1,
      });
      return { submission, isLate };
    } catch (err) {
      // Nothing is kept from a failed submission.
      for (const f of stored) await this.storage.remove({ bucket: this.bucket, path: f.storagePath });
      throw err;
    }
  }

  async status(assignmentId: string, studentId: string) {
    const assignment = await this.assignments.findById(assignmentId);
    if (!assignment) throw notFound();
    const submissions = await this.assignments.submissions(studentId, assignmentId);
    const graders = await this.assignments.userNames(submissions.flatMap((s) => (s.grade.gradedBy ? [s.grade.gradedBy] : [])));
    return { assignment, submissions, graders, isOverdue: this.now() > assignment.dueDate };
  }

  async deleteSubmission(submissionId: string, studentId: string): Promise<void> {
    const s = await this.assignments.findSubmission(submissionId, studentId);
    if (!s) throw new AppError('Submission not found', 404, 'NOT_FOUND');
    if (s.status === 'graded' || s.status === 'returned') throw new BadRequestError('Cannot delete graded submission');
    await this.assignments.deleteSubmission(s.id);
    for (const f of s.files) await this.storage.remove({ bucket: this.bucket, path: f.storagePath });
  }

  async comment(submissionId: string, studentId: string, text: string | undefined) {
    if (!text) throw new BadRequestError('Comment text is required');
    const s = await this.assignments.findSubmission(submissionId, studentId);
    if (!s) throw new AppError('Submission not found', 404, 'NOT_FOUND');
    const comment = { _id: newId(), author: studentId, text: text.slice(0, 1000), createdAt: this.now().toISOString() };
    await this.assignments.updateSubmission(s.id, { comments: [...s.comments, comment] });
    return comment;
  }
}
