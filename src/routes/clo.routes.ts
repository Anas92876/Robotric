import { Router } from 'express';
import type { Container } from '../container';
import { createUploader, IMAGE_POLICY } from '../shared/http/upload';

export const CLO_ROLES = ['clo', 'admin', 'superadmin'] as const;

/** Mounted at /api/clo — the Chief Learning Officer's area. */
export function cloRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const image = createUploader(IMAGE_POLICY).single('image');

  r.use(guards.requireAuth, guards.allowRoles(CLO_ROLES, 'Access denied. CLO privileges required.'));

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
