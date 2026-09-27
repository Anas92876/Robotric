import { Router } from 'express';
import type { Container } from '../container';
import { createUploader, IMAGE_POLICY } from '../shared/http/upload';

/**
 * Mounted at /api/trainer/groups. As before, any signed-in user may call
 * these, but every query is limited to groups the caller trains, so other
 * roles simply see nothing.
 */
export function trainerGroupRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  r.use(guards.requireAuth);
  r.get('/', c.trainerGroups.list);
  r.get('/courses/all', c.trainerGroups.publishedCourses);
  r.get('/:groupId', c.trainerGroups.get);
  r.post('/:groupId/students', c.trainerGroups.addStudent);
  r.delete('/:groupId/students/:studentId', c.trainerGroups.removeStudent);
  r.get('/:groupId/stats', c.trainerGroups.stats);
  r.get('/:groupId/students', c.trainerGroups.students);
  return r;
}

/** Mounted at /api/trainer/sessions — any signed-in user, limited to groups they train (as before). */
export function trainerSessionRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const s = c.trainerSessions;
  r.use(guards.requireAuth);
  r.get('/calendar', s.calendar);
  r.get('/', s.list);
  r.get('/:sessionId', s.get);
  r.post('/', s.create);
  r.put('/:sessionId', s.update);
  r.delete('/:sessionId', s.delete);
  r.post('/:sessionId/start', s.start);
  r.post('/:sessionId/end', s.end);
  r.put('/:sessionId/lesson-plan', s.lessonPlan);
  return r;
}

export const TRAINER_ROLES = ['trainer', 'admin', 'superadmin'] as const;

/** Mounted at /api/trainer/attendance */
export function trainerAttendanceRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  r.use(guards.requireAuth, guards.allowRoles(TRAINER_ROLES, 'Access denied. Trainer privileges required.'));
  r.post('/', c.attendance.save);
  r.get('/', c.attendance.forTrainer);
  r.get('/session/:sessionId', c.attendance.forSession);
  return r;
}

/** Mounted at /api/trainer/quizzes */
export function trainerQuizRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const q = c.trainerQuizzes;
  r.use(guards.requireAuth, guards.allowRoles(TRAINER_ROLES, 'Access denied. Trainer privileges required.'));
  r.get('/', q.list);
  r.get('/course/:courseId', q.forCourse);
  r.post('/', q.create);
  r.get('/:id', q.get);
  r.put('/:id', q.update);
  r.delete('/:id', q.delete);
  r.post('/:id/duplicate', q.duplicate);
  return r;
}

/** Mounted at /api/trainer/tasks — trainers only (as before), limited to their own groups. */
export function trainerTaskRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const t = c.tasks;
  r.use(guards.requireAuth, guards.requireRoles('trainer'));
  r.post('/', t.trainerCreate);
  r.get('/group/:groupId', t.groupTasks);
  r.patch('/:taskId/publish', t.publish('trainer'));
  r.get('/:taskId/submissions', t.trainerSubmissions);
  r.post('/:taskId/submissions/:submissionId/grade', t.grade);
  r.get('/:taskId/submissions/:submissionId/files/:fileId', t.fileLink);
  r.get('/:taskId', t.trainerDetails);
  r.put('/:taskId', t.update('trainer'));
  r.delete('/:taskId', t.delete('trainer'));
  return r;
}

/** Mounted at /api/trainer/resources — resources assigned to the trainer's groups (auth only, as before). */
export function trainerResourceRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  r.use(guards.requireAuth);
  r.get('/groups', c.trainerResources.groups);
  r.get('/', c.trainerResources.list);
  return r;
}

/**
 * Mounted at /api/trainer/evaluations — student evaluations. The old router let any
 * signed-in user in (students included); it is now limited to staff.
 */
export function trainerEvaluationRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const e = c.trainerEvaluations;
  r.use(guards.requireAuth, guards.requireRoles('trainer', 'teacher', 'clo', 'admin', 'superadmin'));
  r.get('/stats', e.stats);
  r.get('/flagged', e.flagged);
  r.post('/bulk', e.bulk);
  r.get('/session/:sessionId', e.forSession);
  r.get('/student/:studentId', e.forStudent);
  r.get('/criteria/group/:groupId', c.evaluationCriteria.forGroup);
  r.post('/', e.create);
  r.get('/', e.list);
  r.get('/:id', e.get);
  r.put('/:id', e.update);
  r.delete('/:id', e.delete);
  r.post('/:id/share', e.share);
  return r;
}

/** Mounted at /api/trainer/projects — student projects in the trainer's own groups. */
export function trainerProjectRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const p = c.trainerProjects;
  const images = createUploader({ ...IMAGE_POLICY, maxFiles: 20 }).array('images', 20);
  r.use(guards.requireAuth, guards.requireRoles('trainer'));
  r.post('/', p.create);
  r.get('/group/:groupId', p.forGroup);
  r.get('/:projectId', p.details);
  r.put('/:projectId', p.update);
  r.post('/:projectId/images', images, p.addImages);
  r.delete('/:projectId/images/:imageIndex', p.removeImage);
  r.patch('/:projectId/status', p.setStatus);
  r.post('/:projectId/grade', p.grade);
  r.delete('/:projectId', p.delete);
  return r;
}

/** Mounted at /api/trainer/gallery — photos for the trainer's own groups. */
export function trainerGalleryRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const g = c.trainerGallery;
  const image = createUploader(IMAGE_POLICY).single('image');
  r.use(guards.requireAuth, guards.requireRoles('trainer'));
  r.post('/moments', image, g.moment);
  r.post('/projects', image, g.project);
  r.get('/group/:groupId', g.group);
  r.delete('/:imageId', g.delete);
  return r;
}

/** Mounted at /api/trainer/board — the board of a group the trainer owns. */
export function trainerBoardRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const b = c.trainerBoard;
  r.use(guards.requireAuth, guards.requireRoles('trainer', 'teacher'));
  r.get('/:groupId', b.get);
  r.post('/:groupId/notes', b.createNote);
  r.patch('/:groupId/notes/:noteId', b.updateNote);
  r.delete('/:groupId/notes/:noteId', b.deleteNote);
  r.post('/:groupId/tasks', b.createTask);
  r.patch('/:groupId/tasks/:taskId', b.updateTask);
  r.delete('/:groupId/tasks/:taskId', b.deleteTask);
  return r;
}

/** Mounted at /api/trainer/dashboard — the signed-in user's teaching overview (auth only, as before). */
export function trainerDashboardRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const d = c.trainerDashboard;
  r.use(guards.requireAuth);
  r.get('/stats', d.stats);
  r.get('/schedule', d.schedule);
  r.get('/activities', d.activities);
  r.get('/notifications', d.notifications);
  r.get('/overview', d.overview);
  return r;
}
