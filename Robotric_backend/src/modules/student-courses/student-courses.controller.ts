import type { Request, Response } from 'express';
import { AppError } from '../../shared/http/errors';
import { currentUser } from '../../shared/http/request-user';
import type { CourseWithInstructor } from '../courses/courses.repository';
import { enrollmentDoc } from '../enrollments/enrollments.controller';
import type { Criteria, Evaluation } from '../evaluations/evaluations.repository';
import type { Quiz } from '../quizzes/quizzes.repository';
import { sessionVirtuals } from '../sessions/session-time';
import type { Session } from '../sessions/sessions.repository';
import { isoDay, isSessionLocked, isSessionOver } from './course-progress';
import type { CourseStanding, StudentCourseService } from './student-courses.service';

const trainerOf = (s: CourseStanding) => (s.group?.trainer ? { _id: s.group.trainer.id, name: s.group.trainer.name, email: s.group.trainer.email } : null);
const certificateOf = (s: CourseStanding) => (s.certificate ? { _id: s.certificate.id, certificateNumber: s.certificate.certificateNumber, issuedAt: s.certificate.issuedAt } : null);

/**
 * Criteria answers with display names: first as snapshotted with the
 * evaluation, then as in the current criteria, then any other numeric answer.
 */
export function evaluationParameters(e: Evaluation, criteria: Criteria | null) {
  const out: { id: string; name: string; nameAr: string | null; score: unknown; maxScore: number }[] = [];
  const added = new Set<string>();
  const add = (name: string, maxScore: number | undefined) => {
    const value = e.parameters[name];
    if (added.has(name) || value === undefined || value === null) return;
    out.push({ id: name, name, nameAr: null, score: value, maxScore: maxScore || 5 });
    added.add(name);
  };
  for (const p of e.criteriaMetadata?.parametersConfig ?? []) add(p.name, p.ratingScale?.max);
  for (const p of criteria?.parameters ?? []) add(p.name, p.ratingScale?.max);
  for (const [name, value] of Object.entries(e.parameters)) if (typeof value === 'number') add(name, 5);
  return out;
}

/** Mean of the numeric criteria answers (0–5), else the overall rating. */
function overallScore(e: Evaluation): number | null {
  const scores = evaluationParameters(e, null)
    .map((p) => p.score)
    .filter((s): s is number => typeof s === 'number');
  if (scores.length === 0) return e.overallRating || null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}

/** A session as the student's course page lists it. The YouTube id is left out (the video page serves it). */
function studentSessionDoc(s: Session) {
  return {
    _id: s.id,
    groupId: s.groupId,
    courseId: s.courseId,
    trainerId: s.trainerId,
    title: s.title,
    description: s.description,
    sessionNumber: s.sessionNumber,
    scheduledDate: s.scheduledDate,
    startTime: s.startTime,
    endTime: s.endTime,
    duration: s.duration,
    isOnline: s.isOnline,
    meetingLink: s.meetingLink,
    status: s.status,
    cancellationReason: s.cancellationReason,
    lessonPlan: s.lessonPlan,
    video: { hasVideo: s.videoHas && Boolean(s.videoYoutubeId) },
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    ...sessionVirtuals(s),
    id: s.id,
  };
}

/** A quiz without its answers (the old list sent the full questions, correct answers included). */
function quizSummary(q: Quiz) {
  return {
    _id: q.id,
    session: q.sessionId,
    title: q.title,
    passingScore: q.passingScore,
    timeLimit: q.timeLimit,
    questions: q.questions.map((qq) => ({ _id: qq._id, question: qq.question, type: qq.type, points: qq.points, options: qq.options.map((o, index) => ({ index, text: o.text })) })),
  };
}

const courseCard = (c: CourseWithInstructor) => ({ _id: c.id, title: c.title, category: c.category, level: c.level, thumbnail: c.thumbnail, duration: c.duration, totalHours: c.totalHours, price: c.price });

type CReq = Request<{ courseId: string }>;
type SReq = Request<{ sessionId: string }>;

/** /api/student/courses and /api/student/sessions/:sessionId… */
export class StudentCourseController {
  constructor(
    private readonly courses: StudentCourseService,
    private readonly backendUrl: string | undefined,
    private readonly frontendOrigin: string,
  ) {}

  myCourses = async (req: Request, res: Response) => {
    const list = await this.courses.myCourses(currentUser(req).id);
    const data = list.map(({ enrollment: e, course: c, bundleCourses, standing: s, subCourses }) => ({
      _id: e.id,
      enrollmentSource: e.source,
      course: {
        _id: c.id,
        title: c.title,
        description: c.description,
        instructor: c.instructor ? { _id: c.instructor.id, name: c.instructor.name, email: c.instructor.email } : c.instructorId,
        trainer: trainerOf(s),
        duration: c.duration,
        price: c.price,
        thumbnail: c.thumbnail,
        category: c.category,
        level: c.level,
        startDate: c.startDate,
        endDate: c.endDate,
        type: c.type,
        bundlePrice: c.bundlePrice || null,
        bundleCourses: bundleCourses.map(courseCard),
      },
      enrolledAt: e.enrolledAt,
      status: e.status,
      groupStatus: s.group?.status || 'active',
      groupId: s.group?.id ?? null,
      hasCertificate: Boolean(s.certificate),
      certificate: certificateOf(s),
      progress: s.progress,
      attendance: { percentage: s.attendance },
      payment: { totalAmount: e.paymentTotal, paidAmount: e.paymentPaid, remainingAmount: Math.max(0, e.paymentTotal - e.paymentPaid) },
      bundleSubCourses:
        subCourses?.map((sub) => ({
          _id: sub.enrollment.id,
          enrollmentId: sub.enrollment.id,
          course: { _id: sub.course.id, title: sub.course.title, category: sub.course.category, level: sub.course.level, thumbnail: sub.course.thumbnail, duration: sub.course.duration, price: sub.course.price },
          groupId: sub.standing.group?.id ?? null,
          groupStatus: sub.standing.group?.status ?? null,
          trainer: sub.standing.group?.trainer ? { _id: sub.standing.group.trainer.id, name: sub.standing.group.trainer.name } : null,
          progress: sub.standing.progress,
          attendance: { percentage: sub.standing.attendance },
          status: sub.enrollment.status,
        })) ?? null,
    }));
    res.json({ success: true, count: data.length, data });
  };

  details = async (req: CReq, res: Response) => {
    const r = await this.courses.courseDetails(currentUser(req).id, req.params.courseId);
    const { course: c, standing: s } = r;
    const now = new Date();
    res.json({
      success: true,
      course: {
        id: c.id,
        title: c.title,
        titleAr: null,
        description: c.description,
        groupStatus: s.group?.status || 'active',
        boardEnabled: s.group?.boardEnabled || false,
        groupId: s.group?.id ?? null,
        hasCertificate: Boolean(s.certificate),
        certificate: certificateOf(s),
        instructor: c.instructor ? { _id: c.instructor.id, name: c.instructor.name, email: c.instructor.email } : null,
        trainer: trainerOf(s),
        studentStats: {
          evaluationAverage: r.evaluationAverage || null,
          attendanceAverage: r.attendanceAverage || null,
          progressPercentage: s.progress.percentageComplete,
          completedSessions: s.progress.completedSessions,
          totalSessions: s.progress.totalSessions,
        },
        sessions: s.sessions.map((session) => {
          const record = r.sheetBySession.get(session.id)?.records[0];
          return {
            id: session.id,
            title: session.title,
            titleAr: null,
            order: session.sessionNumber || 0,
            evaluationAverage: r.ratingBySession.get(session.id) || null,
            isCompleted: isSessionOver(session, now),
            date: isoDay(session.scheduledDate),
            attendance: record ? { status: record.status, checkedInAt: record.checkInTime ? record.checkInTime.toISOString() : null } : null,
          };
        }),
      },
    });
  };

  sessions = async (req: CReq, res: Response) => {
    const { sessions, quizzes, attempts } = await this.courses.courseSessions(currentUser(req).id, req.params.courseId);
    const now = new Date();
    const data = sessions.map((s) => {
      const quiz = quizzes.find((q) => q.sessionId === s.id) ?? null;
      const tries = quiz ? attempts.filter((a) => a.quizId === quiz.id && a.status === 'submitted') : [];
      const best = tries.reduce<(typeof tries)[number] | null>((b, a) => (!b || (a.score ?? 0) > (b.score ?? 0) ? a : b), null);
      return {
        ...studentSessionDoc(s),
        quiz: quiz ? quizSummary(quiz) : null,
        quizAttempt: best ? { score: best.score, passed: best.passed, submittedAt: best.submittedAt } : null,
        isLocked: isSessionLocked(s, now),
        type: 'live_session',
      };
    });
    res.json({ success: true, count: data.length, data });
  };

  /** Registration happens at the academy; students cannot enroll themselves. */
  enroll = async (_req: Request, _res: Response) => {
    throw new AppError('Enrollment is done at the academy reception', 403, 'ENROLLMENT_AT_RECEPTION');
  };

  enrollment = async (req: Request<{ enrollmentId: string }>, res: Response) => {
    const e = await this.courses.enrollmentDetails(currentUser(req).id, req.params.enrollmentId);
    res.json({ success: true, data: enrollmentDoc(e, 'detailed') });
  };

  session = async (req: SReq, res: Response) => {
    const r = await this.courses.sessionDetails(currentUser(req).id, req.params.sessionId);
    const s = r.session;
    if (r.locked) {
      res.status(403).json({
        success: false,
        locked: true,
        scheduledDate: s.scheduledDate,
        startTime: s.startTime,
        endTime: s.endTime,
        title: s.title,
        message: 'This session is not yet available',
        error: { message: 'This session is not yet available' },
      });
      return;
    }
    const materials = r.materials.map((m) => ({
      id: m.id,
      _id: m.id,
      title: m.title,
      description: m.description || '',
      category: 'Documents',
      type: 'pdf',
      fileSize: m.fileSize || 0,
      createdAt: m.createdAt.toISOString(),
      viewerUrl: `/student/resources/${m.id}/viewer`,
      url: `/student/resources/${m.id}/viewer`,
    }));
    res.json({
      success: true,
      session: {
        id: s.id,
        _id: s.id,
        title: s.title,
        titleAr: null,
        description: s.description,
        type: 'session',
        scheduledDate: s.scheduledDate ? s.scheduledDate.toISOString() : null,
        date: isoDay(s.scheduledDate),
        startTime: s.startTime,
        endTime: s.endTime,
        location: null,
        courseId: s.course ? { _id: s.course.id, title: s.course.title } : null,
        pdfUrl: materials[0]?.viewerUrl ?? null,
        materials: materials.length > 0 ? materials : null,
        attendance: r.record ? { status: r.record.status, checkedInAt: r.record.checkInTime ? r.record.checkInTime.toISOString() : null } : null,
        evaluation: r.evaluation
          ? { overallScore: overallScore(r.evaluation), parameters: evaluationParameters(r.evaluation, r.criteria), trainerNotes: r.evaluation.trainerNotes.generalNotes || null }
          : null,
        hasVideo: s.videoHas && Boolean(s.videoYoutubeId),
        tasks: r.tasks.map((t) => {
          const sub = r.submissions.get(t.id);
          return {
            _id: t.id,
            title: t.title,
            titleAr: t.titleAr ?? null,
            deadline: t.deadline,
            maxScore: t.maxScore,
            hasQuestions: t.hasQuestions,
            status: t.status,
            submission: sub ? { status: sub.status, score: sub.score, isLate: sub.isLate } : null,
          };
        }),
      },
    });
  };

  videoToken = async (req: SReq, res: Response) => {
    res.json({ success: true, data: await this.courses.videoToken(currentUser(req).id, req.params.sessionId) });
  };

  /** The video page (or, for the app, `?format=json`), reached with a video token instead of a sign-in. */
  videoEmbed = async (req: SReq, res: Response) => {
    const ytId = await this.courses.videoFor(req.params.sessionId, req.query.token);
    if (req.query.format === 'json') {
      res.json({ success: true, data: { embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?controls=1&rel=0&playsinline=1` } });
      return;
    }
    const backendOrigin = this.backendUrl || `${req.protocol}://${req.get('host')}`;
    const embedSrc = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(ytId)}?controls=1&rel=0&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(backendOrigin)}`;
    res.removeHeader('X-Frame-Options');
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-src https://www.youtube-nocookie.com; img-src data: https:; connect-src 'self'; ` +
        `frame-ancestors ${this.frontendOrigin} http://localhost:5173 http://localhost:5174 http://localhost:3000`,
    );
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(videoPage(embedSrc));
  };
}

/** YouTube hides "Watch on YouTube" below 514 px, so the player is drawn at 514×289 and scaled. */
function videoPage(embedSrc: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#000;overflow:hidden}
#outer{width:100%;height:100%;overflow:hidden;position:relative}
#scaler{position:absolute;top:0;left:0;width:514px;height:289px;transform-origin:top left}
#yt{width:514px;height:289px;border:none;display:block}
</style>
</head>
<body>
<div id="outer">
  <div id="scaler">
    <iframe id="yt" src="${embedSrc}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowfullscreen
    ></iframe>
  </div>
</div>
<script>
var scaler = document.getElementById('scaler');
function rescale() {
  scaler.style.transform = 'scale('+( window.innerWidth/514)+','+(window.innerHeight/289)+')';
}
rescale();
window.addEventListener('resize', rescale);
document.addEventListener('fullscreenchange', rescale);
</script>
</body>
</html>`;
}
