import { Router } from 'express';
import type { Container } from '../container';
import { ASSIGNMENT_POLICY, createUploader, DOCUMENT_POLICY, TASK_SUBMISSION_POLICY } from '../shared/http/upload';

/** Mounted at /api/student/payments — the signed-in student's own payments (read-only). */
export function studentPaymentRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  r.use(guards.requireAuth);
  r.get('/', c.studentPayments.all);
  r.get('/summary', c.studentPayments.summary);
  r.get('/courses/:courseId', c.studentPayments.forCourse);
  r.get('/:paymentId/receipt', c.studentPayments.receipt);
  // Payments are recorded at the company; these two now always refuse.
  r.post('/initiate', c.studentPayments.disabled);
  r.post('/:paymentId/confirm', c.studentPayments.disabled);
  return r;
}

/** Mounted at /api/subscriptions — the signed-in student's hour package and private sessions. */
export function studentSubscriptionRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const s = c.studentSubscriptions;
  r.use(guards.requireAuth);
  r.get('/plans', c.subscriptionPlans.listActive);
  r.get('/me', s.me);
  r.get('/my-requests', s.myRequests);
  r.get('/my-reports', s.myReports);
  r.get('/session-requests/:id/report', s.report);
  r.post('/session-requests', s.requireActive, s.createRequest);
  r.post('/session-requests/:id/cancel', s.requireActive, s.cancelRequest);
  return r;
}

/** Mounted at /api/student/attendance — the signed-in student's own attendance. */
export function studentAttendanceRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  r.use(guards.requireAuth);
  r.get('/overview', c.attendance.overview);
  r.get('/courses/:courseId', c.attendance.course);
  r.get('/summary/:courseId', c.attendance.summary);
  r.get('/courses/:courseId/month/:year/:month', c.attendance.month);
  return r;
}

/** Mounted at /api/student/modules */
export function studentModuleRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const m = c.studentModules;
  r.use(guards.requireAuth);
  r.get('/:moduleId', m.content);
  r.post('/:moduleId/start', m.start);
  r.post('/:moduleId/complete', m.complete);
  r.patch('/:moduleId/progress', m.updateProgress);
  r.get('/:moduleId/progress', m.progress);
  r.get('/:moduleId/next', m.next);
  r.get('/:moduleId/previous', m.previous);
  return r;
}

/** Mounted at /api/student/quizzes */
export function studentQuizRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const q = c.studentQuizzes;
  r.use(guards.requireAuth);
  r.get('/:quizId', q.get);
  r.post('/:quizId/start', q.start);
  r.post('/:quizId/submit', q.submit);
  r.get('/:quizId/attempts', q.attempts);
  r.get('/:quizId/results/:attemptId', q.result);
  return r;
}

/** Mounted at /api/student/assignments */
export function studentAssignmentRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const a = c.studentAssignments;
  r.use(guards.requireAuth);
  r.get('/:assignmentId', a.get);
  r.post('/:assignmentId/submit', ...createUploader(ASSIGNMENT_POLICY).array('files', 10), a.submit);
  r.get('/:assignmentId/submission', a.status);
  r.delete('/submissions/:submissionId', a.delete);
  r.post('/submissions/:submissionId/comments', a.comment);
  return r;
}

/** Mounted at /api/student/tasks — students only (as before). */
export function studentTaskRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  r.use(guards.requireAuth, guards.requireRoles('student'));
  r.get('/', c.tasks.myTasks);
  r.get('/:taskId', c.tasks.studentDetails);
  r.post('/:taskId/submit', ...createUploader(TASK_SUBMISSION_POLICY).array('files', 20), c.tasks.submit);
  return r;
}

/** Mounted at /api/student/resources — course PDFs for students (and trainers/staff via the viewer). */
export function studentResourceRoutes({ guards, limiters, controllers: c }: Container): Router {
  const r = Router();
  const s = c.studentResources;
  r.use(guards.requireAuth);
  r.get('/:resourceId/viewer', limiters.resourceViewer, s.viewer);
  r.get('/:resourceId/download', s.download);
  r.get('/sessions/:sessionId/materials', s.sessionMaterials);
  return r;
}

/** Mounted at /api/student/sessions — the student's session pages. */
export function studentSessionRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  // The video page is opened with a short-lived video token instead of a sign-in.
  r.get('/:sessionId/video-embed', c.studentCourses.videoEmbed);
  r.use(guards.requireAuth);
  r.get('/evaluations', c.studentEvaluations.mine);
  r.get('/:sessionId/video-token', c.studentCourses.videoToken);
  r.get('/:sessionId', c.studentCourses.session);
  return r;
}

/** Mounted at /api/student/courses — the student's courses. */
export function studentCourseRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const s = c.studentCourses;
  r.use(guards.requireAuth);
  r.get('/', s.myCourses);
  r.get('/:courseId', s.details);
  r.get('/:courseId/sessions', s.sessions);
  r.post('/:courseId/enroll', s.enroll);
  r.get('/enrollments/:enrollmentId', s.enrollment);
  return r;
}

/** Mounted at /api/student/certificates. */
export function studentCertificateRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  r.use(guards.requireAuth);
  r.get('/', c.certificates.mine);
  r.get('/:certNumber/pdf', c.certificates.pdf);
  return r;
}

/** Mounted at /api/certificates — public certificate verification (no sign-in). */
export function publicCertificateRoutes({ controllers: c }: Container): Router {
  const r = Router();
  r.get('/verify/:certNumber', c.certificates.verify);
  return r;
}

/** Mounted at /api/student/projects — the student's and their group-mates' projects. */
export function studentProjectRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  r.use(guards.requireAuth, guards.requireRoles('student'));
  r.get('/', c.studentProjects.list);
  r.get('/:projectId', c.studentProjects.details);
  return r;
}

/** Mounted at /api/student/gallery — photos from the student's groups. */
export function studentGalleryRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  r.use(guards.requireAuth, guards.requireRoles('student'));
  r.get('/', c.studentGallery.list);
  r.get('/:imageId', c.studentGallery.details);
  return r;
}

/** Mounted at /api/student/documents — WRO documents (students only, as before). */
export function studentDocumentRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const d = c.studentDocuments;
  const studentOnly = guards.allowRoles(['student'], 'Access denied');
  r.use(guards.requireAuth);
  r.get('/', studentOnly, d.list);
  r.post('/', guards.allowRoles(['student'], 'Only students can upload documents'), createUploader(DOCUMENT_POLICY).single('document'), d.upload);
  r.delete('/:docId', studentOnly, d.delete);
  r.get('/debug-wro', d.debugWro);
  return r;
}

/** Mounted at /api/student/board — boards of the student's groups. */
export function studentBoardRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const b = c.studentBoard;
  r.use(guards.requireAuth, guards.requireRoles('student'));
  r.get('/:groupId', b.get);
  r.post('/:groupId/notes', b.createNote);
  r.patch('/:groupId/notes/:noteId', b.updateNote);
  r.delete('/:groupId/notes/:noteId', b.deleteNote);
  r.patch('/:groupId/tasks/:taskId/status', b.setTaskStatus);
  return r;
}

/** Mounted at /api/student/dashboard. */
export function studentDashboardRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const d = c.studentDashboard;
  r.use(guards.requireAuth);
  r.get('/stats', d.stats);
  r.get('/recent-activity', d.recentActivity);
  r.get('/upcoming-deadlines', d.deadlines);
  r.get('/progress', d.progress);
  return r;
}
