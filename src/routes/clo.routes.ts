import { Router } from 'express';
import type { Container } from '../container';
import { createUploader, IMAGE_POLICY, PDF_POLICY } from '../shared/http/upload';

export const CLO_ROLES = ['clo', 'admin', 'superadmin'] as const;

/** Mounted at /api/clo — the Chief Learning Officer's area. */
export function cloRoutes({ guards, limiters, controllers: c }: Container): Router {
  const r = Router();
  const image = createUploader(IMAGE_POLICY).single('image');
  const pdf = createUploader(PDF_POLICY).single('pdf');
  const res = c.cloResources;

  r.use(guards.requireAuth);
  // Trainers may read the resource list and a resource's assignments.
  const cloOrTrainer = guards.requireRoles(...CLO_ROLES, 'trainer');
  r.get('/resources', cloOrTrainer, res.list);
  r.get('/resources/:resourceId/assignments', cloOrTrainer, res.assignments);

  r.use(guards.allowRoles(CLO_ROLES, 'Access denied. CLO privileges required.'));

  // Dashboard, analytics and trainers
  r.get('/dashboard', c.cloDashboard.overview);
  r.get('/analytics', c.cloDashboard.analytics);
  r.get('/trainers', c.cloTrainers.list);
  r.post('/trainers', c.cloTrainers.create);
  r.put('/trainers/:id', c.cloTrainers.update);
  r.delete('/trainers/:id', c.cloTrainers.deactivate);
  r.get('/trainers/:id/performance', c.cloTrainers.performance);
  r.post('/trainers/:id/assign-course', c.cloTrainers.assignCourse);
  r.delete('/trainers/:trainerId/courses/:courseId', c.cloTrainers.removeCourse);

  // Evaluations (read-only) and evaluation criteria
  r.get('/evaluations', c.cloEvaluations.list);
  r.get('/evaluations/stats', c.cloEvaluations.stats);
  r.get('/evaluations/group/:groupId', c.cloEvaluations.forGroup);
  r.get('/evaluations/:id', c.cloEvaluations.get);
  r.get('/evaluation-criteria', c.evaluationCriteria.list);
  r.get('/evaluation-criteria/:id', c.evaluationCriteria.get);
  r.post('/evaluation-criteria', c.evaluationCriteria.create);
  r.put('/evaluation-criteria/:id', c.evaluationCriteria.update);
  r.delete('/evaluation-criteria/:id', c.evaluationCriteria.delete);

  // WRO documents — CLO role only (admins were refused here before too)
  const cloOnly = guards.allowRoles(['clo'], 'Access denied');
  r.get('/documents/', cloOnly, c.cloDocuments.list);
  r.get('/documents/students-summary', cloOnly, c.cloDocuments.summary);
  r.get('/documents/student/:studentId', cloOnly, c.cloDocuments.forStudent);
  r.patch('/documents/:docId/status', cloOnly, c.cloDocuments.setStatus);
  r.get('/documents/:docId/download', cloOnly, c.cloDocuments.download);

  // Student projects and gallery (read-only)
  r.get('/projects/', c.cloProjects.list);
  r.get('/projects/:projectId', c.cloProjects.details);
  r.get('/gallery/', c.cloGallery.list);

  // Certificates
  r.post('/certificates/generate-group/:groupId', c.certificates.issueForGroup);
  r.delete('/certificates/group/:groupId', c.certificates.deleteForGroup);

  // Resources (course PDFs)
  r.post('/resources/upload', limiters.resourceUpload, pdf, res.upload);
  r.get('/resources/:resourceId/viewer', res.viewer);
  r.post('/resources/:resourceId/assign', res.assign);
  r.put('/resources/:resourceId/assignments', res.replaceAssignments);
  r.delete('/resources/:resourceId/assignments/:assignmentId', res.deleteAssignment);
  r.put('/resources/:resourceId', res.rename);
  r.delete('/resources/:resourceId', res.delete);

  // Courses & bundles
  r.get('/courses', c.courses.list);
  r.get('/courses/:id', c.courses.details);
  r.post('/courses', c.courses.create);
  r.put('/courses/:id', c.courses.update);
  r.delete('/courses/:id', c.courses.delete);
  r.put('/courses/:id/archive', c.courses.archive);
  r.get('/courses/:id/statistics', c.courses.statistics);
  r.get('/courses/:bundleId/sub-courses', c.courses.bundleSubCourses);
  r.post('/courses/:bundleId/sub-courses', c.courses.addSubCourse);
  r.delete('/courses/:bundleId/sub-courses/:courseId', c.courses.removeSubCourse);

  // Groups
  r.get('/groups', c.cloGroups.list);
  r.get('/groups/:id', c.cloGroups.details);
  r.post('/groups', c.cloGroups.create);
  r.put('/groups/:id', c.cloGroups.update);
  r.delete('/groups/:id', c.cloGroups.delete);
  r.put('/groups/:id/status', c.cloGroups.setStatus);
  r.post('/groups/:id/assign-trainer', c.cloGroups.assignTrainer);
  r.get('/groups/:id/students', c.cloGroups.students);
  r.post('/groups/:id/students', c.cloGroups.addStudent);
  r.delete('/groups/:id/students/:studentId', c.cloGroups.removeStudent);
  r.patch('/groups/:id/board', c.cloGroups.toggleBoard);
  r.get('/groups/:id/sessions', c.cloSessions.forGroup);

  // Sessions
  r.get('/sessions/', c.cloSessions.list);
  r.get('/sessions/:sessionId', c.cloSessions.get);
  r.post('/sessions/', c.cloSessions.create);
  r.put('/sessions/:sessionId', c.cloSessions.update);
  r.delete('/sessions/:sessionId', c.cloSessions.delete);
  r.put('/sessions/:sessionId/lesson-plan', c.cloSessions.lessonPlan);

  // Tasks (attached to sessions, possibly across groups)
  r.post('/tasks/', c.tasks.cloCreate);
  r.get('/tasks/', c.tasks.cloList);
  r.patch('/tasks/:taskId/publish', c.tasks.publish('clo'));
  r.post('/tasks/:taskId/duplicate', c.tasks.duplicate);
  r.get('/tasks/:taskId/results', c.tasks.results);
  r.get('/tasks/:taskId', c.tasks.cloDetails);
  r.put('/tasks/:taskId', c.tasks.update('clo'));
  r.delete('/tasks/:taskId', c.tasks.delete('clo'));

  // Attendance (read-only for the CLO)
  r.get('/attendance', c.attendance.list);
  r.get('/attendance/stats', c.attendance.stats);
  r.get('/attendance/course/:courseId', c.attendance.forCourse);
  r.get('/attendance/:id', c.attendance.byId);

  // Interests
  r.get('/interests', c.interests.list);
  r.get('/interests/:id', c.interests.get);
  r.post('/interests', c.interests.create);
  r.put('/interests/:id', c.interests.update);
  r.put('/interests/:id/archive', c.interests.archive);
  r.delete('/interests/:id', c.interests.delete);

  // Subscription plans
  r.get('/subscription-plans', c.subscriptionPlans.list);
  r.get('/subscription-plans/:id', c.subscriptionPlans.get);
  r.post('/subscription-plans', c.subscriptionPlans.create);
  r.put('/subscription-plans/:id', c.subscriptionPlans.update);
  r.delete('/subscription-plans/:id', c.subscriptionPlans.delete);

  // Public training page content
  const tc = c.trainingContent;
  r.get('/training-content/:lang', tc.get);
  r.put('/training-content/:lang', tc.upsert);
  r.post('/training-content/programs/:trackId/:programIndex/images', ...image, tc.addProgramImage);
  r.delete('/training-content/programs/:trackId/:programIndex/images/:publicId', tc.removeProgramImage);
  r.post('/training-content/departments/:deptIndex/cover', ...image, tc.setDepartmentCover);
  r.delete('/training-content/departments/:deptIndex/cover', tc.removeDepartmentCover);
  r.post('/training-content/departments/:deptIndex/programs/:programIndex/images', ...image, tc.addDepartmentProgramImage);
  r.delete('/training-content/departments/:deptIndex/programs/:programIndex/images/:publicId', tc.removeDepartmentProgramImage);

  return r;
}
