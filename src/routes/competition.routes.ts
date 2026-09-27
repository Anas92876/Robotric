import { Router } from 'express';
import type { Container } from '../container';

/** Mounted at /api/competitions. Judges are limited to their assigned competition. */
export function competitionRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const k = c.competitions;
  const organizers = guards.requireRoles('organizer', 'superadmin', 'admin');
  r.use(guards.requireAuth);
  r.get('/', k.list);
  r.post('/', organizers, k.create);
  r.put('/:id', organizers, k.update);
  r.delete('/:id', organizers, k.delete);
  r.post('/:id/evaluations', guards.requireRoles('judge'), k.evaluate);
  r.get('/:id/rankings', k.rankings);
  return r;
}

/** Mounted at /api/teams — any signed-in user can enter a team; only its coach edits it. */
export function teamRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const t = c.teams;
  r.use(guards.requireAuth);
  r.get('/', t.list);
  r.get('/:id', t.get);
  r.post('/', t.create);
  r.put('/:id', t.update);
  r.delete('/:id', t.delete);
  return r;
}
