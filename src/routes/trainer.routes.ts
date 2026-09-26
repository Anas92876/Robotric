import { Router } from 'express';
import type { Container } from '../container';

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
