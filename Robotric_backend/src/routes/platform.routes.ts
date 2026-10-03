import { Router } from 'express';
import type { Container } from '../container';

/** Mounted at /api/app-version — public; the mobile app checks it before login. */
export function appVersionRoutes({ controllers: c }: Container): Router {
  const r = Router();
  r.get('/', c.settings.getAppVersion);
  return r;
}

/** Mounted at /api/admin/settings/version */
export function adminVersionRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  r.use(guards.requireAuth, guards.requireRoles('admin', 'superadmin', 'cto'));
  r.put('/', c.settings.setAppVersion);
  return r;
}

/** Mounted at /api/users */
export function usersRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  r.put('/:id/assigned-competition', guards.requireAuth, guards.requireRoles('superadmin'), c.users.assignCompetition);
  return r;
}
