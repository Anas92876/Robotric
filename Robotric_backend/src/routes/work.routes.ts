import { Router } from 'express';
import type { Container } from '../container';
import { CLIENT_MEDIA_POLICY, createUploader, IMAGE_POLICY } from '../shared/http/upload';

const images = () => createUploader({ ...IMAGE_POLICY, maxFiles: 10 }).array('images', 10);

/** Mounted at /api/cto/internal — the CTO's internal work system. */
export function ctoInternalRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const k = c.ctoWork;
  r.use(guards.requireAuth, guards.requireRoles('cto', 'admin', 'superadmin'));
  r.get('/engineers', k.engineers);
  r.get('/clients', k.clients);
  r.get('/analytics', k.getAnalytics);
  r.post('/analytics/employee-of-month', k.setEmployeeOfMonth);
  r.delete('/analytics/employee-of-month', k.clearEmployeeOfMonth);
  r.post('/projects', k.createProject);
  r.get('/projects', k.projects);
  r.get('/projects/:id', k.project);
  r.get('/projects/:id/sub-projects', k.subProjects);
  r.post('/projects/:id/move', k.moveProject);
  r.put('/projects/:id', k.updateProject);
  r.delete('/projects/:id', k.deleteProject);
  r.post('/tasks', k.createTask);
  r.get('/tasks', k.listTasks);
  r.get('/tasks/:id', k.task);
  r.put('/tasks/:id', k.updateTask);
  r.delete('/tasks/:id', k.deleteTask);
  r.patch('/tasks/:id/decline', k.declineTask);
  r.get('/tasks/:id/client-media', k.clientMedia);
  r.post('/tasks/:id/attachments', images(), k.addAttachments);
  r.delete('/tasks/:id/attachments/:publicId', k.deleteAttachment);
  r.get('/tasks/:taskId/subtasks', k.subTasks);
  r.delete('/subtasks/:id', k.deleteSubTask);
  r.get('/work/staff', k.staff);
  r.patch('/work/staff/:id/hourly', k.setHourly);
  r.get('/work/sessions', k.sessions);
  r.put('/work/sessions/:id', k.editSession);
  r.delete('/work/sessions/:id', k.deleteSession);
  r.get('/extension-requests', k.extensions);
  r.patch('/extension-requests/:id/review', k.reviewExtension);
  return r;
}

/** Mounted at /api/engineer — any signed-in staff member (as before). */
export function engineerRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const e = c.engineer;
  r.use(guards.requireAuth);
  r.get('/projects', e.projects);
  r.get('/projects/:id', e.project);
  r.get('/tasks', e.tasks);
  r.patch('/tasks/:id/status', e.setStatus);
  r.get('/tasks/:id/client-media', e.clientMedia);
  r.post('/tasks/:id/submission/images', images(), e.addSubmissionImages);
  r.delete('/tasks/:id/submission/images/:publicId', e.deleteSubmissionImage);
  r.patch('/tasks/:id/submission/links', e.setSubmission);
  r.get('/tasks/:taskId/subtasks', e.subTasks);
  r.post('/tasks/:taskId/subtasks', e.createSubTask);
  r.patch('/subtasks/:id/toggle', e.toggleSubTask);
  r.delete('/subtasks/:id', e.deleteSubTask);
  r.get('/work/status', e.workStatus);
  r.post('/work/start', e.startWork);
  r.post('/work/stop', e.stopWork);
  r.get('/work/sessions', e.mySessions);
  r.post('/tasks/:taskId/extension-requests', e.requestExtension);
  r.get('/tasks/:taskId/extension-requests', e.myExtensions);
  r.delete('/extension-requests/:id', e.cancelExtension);
  return r;
}

/** Mounted at /api/client — client accounts only. */
export function clientRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const k = c.client;
  r.use(guards.requireAuth, guards.requireRoles('client'));
  r.get('/projects', k.projects);
  r.get('/projects/:id', k.project);
  r.get('/tasks', k.tasks);
  r.get('/tasks/:id', k.task);
  r.post('/tasks', k.createTask);
  r.post('/tasks/:id/media', createUploader(CLIENT_MEDIA_POLICY).single('file'), k.addMedia);
  r.get('/tasks/:id/media', k.media);
  r.delete('/tasks/:id/media/:mediaId', k.deleteMedia);
  return r;
}
