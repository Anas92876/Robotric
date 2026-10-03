import jwt from 'jsonwebtoken';
import { isValidId } from '../../shared/db/ids';
import { AppError, ForbiddenError } from '../../shared/http/errors';
import type { AttendanceRepository, AttendanceSheet } from '../attendance/attendance.repository';
import { attendancePercent } from '../attendance/attendance.service';
import type { CertificateRepository } from '../certificates/certificates.repository';
import type { CourseRepository, CourseWithInstructor } from '../courses/courses.repository';
import type { Enrollment, EnrollmentRepository } from '../enrollments/enrollments.repository';
import type { EvaluationRepository } from '../evaluations/evaluations.repository';
import type { Group, GroupRepository } from '../groups/groups.repository';
import type { QuizRepository } from '../quizzes/quizzes.repository';
import type { ResourceRepository } from '../resources/resources.repository';
import type { Session, SessionRepository } from '../sessions/sessions.repository';
import type { TaskRepository } from '../tasks/tasks.repository';
import { type CourseProgress, isSessionLocked, progressDetail } from './course-progress';

const VIDEO_TOKEN_SECONDS = 15 * 60;
const ACTIVE = new Set(['active', 'completed']);
const notEnrolled = () => new ForbiddenError('You are not enrolled in this course');
const hidden = () => new AppError('Session not found or access denied', 404, 'NOT_FOUND');

/** How a student is doing in one course (their group, progress, attendance, certificate). */
export interface CourseStanding {
  group: Group | null;
  sessions: Session[];
  progress: CourseProgress;
  completedHours: number;
  creditedSessions: number;
  sheets: AttendanceSheet[];
  attendance: number;
  certificate: { id: string; certificateNumber: string; issuedAt: Date } | null;
}

export interface SessionLocked {
  locked: true;
  session: Session;
}

/**
 * The student's "My courses" area: read-only views that pull together
 * enrollments, the student's group, its sessions, attendance, evaluations,
 * quizzes, materials and tasks.
 */
export class StudentCourseService {
  constructor(
    private readonly enrollments: Pick<EnrollmentRepository, 'forStudent' | 'subEnrollments' | 'findForStudentCourse' | 'findById'>,
    private readonly groups: Pick<GroupRepository, 'groupOfStudentInCourse' | 'isMember' | 'findById'>,
    private readonly sessions: Pick<SessionRepository, 'list' | 'findById'>,
    private readonly courses: Pick<CourseRepository, 'findById' | 'subCoursesOf'>,
    private readonly attendance: Pick<AttendanceRepository, 'forStudent'>,
    private readonly certificates: Pick<CertificateRepository, 'findForStudentGroup'>,
    private readonly evaluations: Pick<EvaluationRepository, 'list' | 'criteriaForGroup'>,
    private readonly quizzes: Pick<QuizRepository, 'listForSessions' | 'attemptsFor'>,
    private readonly resources: Pick<ResourceRepository, 'assignments' | 'list'>,
    private readonly tasks: Pick<TaskRepository, 'list' | 'studentSubmissions'>,
    private readonly jwtSecret: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** The group's sessions for the course, in teaching order. */
  private async groupSessions(groupId: string, courseId: string): Promise<Session[]> {
    const list = (await this.sessions.list({ groupId })).filter((s) => s.courseId === courseId);
    return list.sort(
      (a, b) => (a.sessionNumber ?? Number.MAX_SAFE_INTEGER) - (b.sessionNumber ?? Number.MAX_SAFE_INTEGER) || (a.scheduledDate?.getTime() ?? 0) - (b.scheduledDate?.getTime() ?? 0),
    );
  }

  async standing(studentId: string, course: { id: string; totalHours: number; duration: string | null }, opts: { creditEarlierSessions: boolean }): Promise<CourseStanding> {
    const group = await this.groups.groupOfStudentInCourse(studentId, course.id);
    if (!group) {
      return { group: null, sessions: [], progress: { percentageComplete: 0, completedSessions: 0, totalSessions: 0 }, completedHours: 0, creditedSessions: 0, sheets: [], attendance: 0, certificate: null };
    }
    const [sessions, sheets, cert] = await Promise.all([
      this.groupSessions(group.id, course.id),
      this.attendance.forStudent(studentId, [group.id]),
      this.certificates.findForStudentGroup(studentId, group.id),
    ]);
    const detail =
      sessions.length > 0
        ? progressDetail({ sessions, course, group: opts.creditEarlierSessions ? group : undefined, now: this.now() })
        : { progress: { percentageComplete: 0, completedSessions: 0, totalSessions: 0 }, completedHours: 0, creditedSessions: 0 };
    const attended = sheets.filter((s) => s.records.some((r) => r.status === 'present' || r.status === 'late')).length;
    return {
      group,
      sessions,
      progress: detail.progress,
      completedHours: detail.completedHours,
      creditedSessions: detail.creditedSessions,
      sheets,
      attendance: attendancePercent(attended, sheets.length, group.startingSessionNumber),
      certificate: cert ? { id: cert.id, certificateNumber: cert.certificateNumber, issuedAt: cert.issuedAt } : null,
    };
  }

  /** Direct and bundle enrollments (a bundle's own sub-course enrollments are listed under it). */
  async myCourses(studentId: string) {
    const list = (await this.enrollments.forStudent(studentId)).filter((e) => ACTIVE.has(e.status) && e.source !== 'bundle' && e.course);
    return Promise.all(
      list.map(async (enrollment) => {
        const course = (await this.courses.findById(enrollment.courseId))!;
        const standing = await this.standing(studentId, course, { creditEarlierSessions: true });
        const bundleCourses = course.type === 'bundle' ? ((await this.courses.subCoursesOf([course.id])).get(course.id) ?? []) : [];
        let subCourses: { enrollment: Enrollment; course: CourseWithInstructor; standing: CourseStanding }[] | null = null;
        if (course.type === 'bundle') {
          const subs = (await this.enrollments.subEnrollments(enrollment.id)).filter((e) => ACTIVE.has(e.status));
          subCourses = await Promise.all(
            subs.map(async (sub) => {
              const subCourse = (await this.courses.findById(sub.courseId))!;
              return { enrollment: sub, course: subCourse, standing: await this.standing(studentId, subCourse, { creditEarlierSessions: false }) };
            }),
          );
        }
        return { enrollment, course, bundleCourses, standing, subCourses };
      }),
    );
  }

  private async requireEnrollment(studentId: string, courseId: string) {
    const e = isValidId(courseId) ? await this.enrollments.findForStudentCourse(studentId, courseId) : null;
    if (!e || !ACTIVE.has(e.status)) throw notEnrolled();
    return e;
  }

  async courseDetails(studentId: string, courseId: string) {
    if (!isValidId(courseId)) throw new AppError('Invalid course ID format', 400, 'BAD_REQUEST');
    await this.requireEnrollment(studentId, courseId);
    const course = await this.courses.findById(courseId);
    if (!course) throw new AppError('Course not found', 404, 'NOT_FOUND');
    const standing = await this.standing(studentId, course, { creditEarlierSessions: true });
    const { group, sessions, sheets } = standing;

    const evaluations = group ? await this.evaluations.list({ studentId, groupId: group.id }) : [];
    const sessionIds = new Set(sessions.map((s) => s.id));
    const ratings = evaluations.filter((e) => sessionIds.has(e.sessionId));
    const evaluationAverage = ratings.length ? Math.round((ratings.reduce((s, e) => s + e.overallRating, 0) / ratings.length) * 10) / 10 : null;
    const attendanceAverage = sheets.length ? standing.attendance : null;

    const ratingBySession = new Map(ratings.map((e) => [e.sessionId, e.overallRating]));
    const sheetBySession = new Map(sheets.map((s) => [s.sessionId, s]));
    return { course, standing, evaluationAverage, attendanceAverage, ratingBySession, sheetBySession };
  }

  async courseSessions(studentId: string, courseId: string) {
    await this.requireEnrollment(studentId, courseId);
    const group = await this.groups.groupOfStudentInCourse(studentId, courseId);
    if (!group) return { sessions: [], quizzes: [], attempts: [] };
    const sessions = await this.groupSessions(group.id, courseId);
    const quizzes = await this.quizzes.listForSessions(sessions.map((s) => s.id));
    const attempts = await this.quizzes.attemptsFor(
      studentId,
      quizzes.map((q) => q.id),
    );
    return { sessions, quizzes, attempts };
  }

  async enrollmentDetails(studentId: string, enrollmentId: string) {
    const e = isValidId(enrollmentId) ? await this.enrollments.findById(enrollmentId) : null;
    if (!e || e.studentId !== studentId) throw new AppError('Enrollment not found', 404, 'NOT_FOUND');
    return e;
  }

  /** One session, for a student of its group who is enrolled in its course; locked until its day. */
  async sessionDetails(studentId: string, sessionId: string) {
    if (!isValidId(sessionId)) throw new AppError('Invalid session ID format', 400, 'BAD_REQUEST');
    const session = await this.sessions.findById(sessionId);
    if (!session) throw new AppError('Session not found', 404, 'NOT_FOUND');
    if (!session.group || !(await this.groups.isMember(session.groupId, studentId))) throw hidden();
    if (!session.courseId || !session.course) throw new AppError('Session does not belong to a valid course', 404, 'NOT_FOUND');
    const enrollment = await this.enrollments.findForStudentCourse(studentId, session.courseId);
    if (!enrollment || !ACTIVE.has(enrollment.status)) throw hidden();
    if (isSessionLocked(session, this.now())) return { locked: true as const, session };

    const [sheets, evaluations, assignments, tasks] = await Promise.all([
      this.attendance.forStudent(studentId, [session.groupId]),
      this.evaluations.list({ studentId, sessionId: session.id, groupId: session.groupId }),
      this.resources.assignments({ groupIds: [session.groupId], sessionId: session.id, visibleOnly: true }),
      this.tasks.list({ sessionId: session.id, excludeDraft: true }),
    ]);
    const sheet = sheets.find((s) => s.sessionId === session.id);
    const record = sheet?.records.find((r) => r.studentId === studentId) ?? null;
    const evaluation = evaluations[0] ?? null;
    let criteria = null;
    if (evaluation) {
      const course = await this.courses.findById(session.courseId);
      criteria = await this.evaluations.criteriaForGroup(session.groupId, course?.parentBundleId ? [session.courseId, course.parentBundleId] : [session.courseId]);
    }

    // Materials currently open to the group for this session (one entry per resource).
    const now = this.now();
    const open = assignments.filter((a) => (!a.availableFrom || now >= a.availableFrom) && (!a.availableUntil || now <= a.availableUntil));
    const resourceIds = [...new Set(open.map((a) => a.resourceId))];
    const resources = resourceIds.length ? await this.resources.list({ ids: resourceIds, status: 'active' }) : [];
    const byId = new Map(resources.map((r) => [r.id, r]));
    const materials = resourceIds.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));

    const submissions = await this.tasks.studentSubmissions(
      tasks.map((t) => t.id),
      studentId,
    );
    return { locked: false as const, session, record, evaluation, criteria, materials, tasks, submissions };
  }

  /** A 15-minute token for the session's video page; the YouTube id itself is never sent. */
  async videoToken(studentId: string, sessionId: string) {
    const session = isValidId(sessionId) ? await this.sessions.findById(sessionId) : null;
    if (!session) throw new AppError('Session not found', 404, 'NOT_FOUND');
    if (!(await this.groups.isMember(session.groupId, studentId))) throw new ForbiddenError('Access denied');
    if (!session.videoHas || !session.videoYoutubeId) throw new AppError('This session has no video', 404, 'NOT_FOUND');
    const token = jwt.sign({ sessionId: session.id, userId: studentId, purpose: 'video-embed' }, this.jwtSecret, { expiresIn: VIDEO_TOKEN_SECONDS });
    return { token, expiresIn: VIDEO_TOKEN_SECONDS };
  }

  /** Checks a video token and returns the YouTube id to embed. */
  async videoFor(sessionId: string, token: unknown): Promise<string> {
    if (typeof token !== 'string' || !token) throw new AppError('Video token required', 400, 'BAD_REQUEST');
    let payload: { purpose?: string; sessionId?: string };
    try {
      payload = jwt.verify(token, this.jwtSecret) as typeof payload;
    } catch {
      throw new AppError('Video token is invalid or expired', 401, 'UNAUTHORIZED');
    }
    if (payload.purpose !== 'video-embed' || payload.sessionId !== sessionId) throw new AppError('Video token mismatch', 401, 'UNAUTHORIZED');
    const session = await this.sessions.findById(sessionId);
    if (!session?.videoHas || !session.videoYoutubeId) throw new AppError('This session has no video', 404, 'NOT_FOUND');
    return session.videoYoutubeId;
  }
}
