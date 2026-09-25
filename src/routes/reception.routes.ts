import { Router } from 'express';
import type { Container } from '../container';

export const RECEPTION_ROLES = ['reception', 'admin', 'superadmin'] as const;

/** Mounted at /api/reception — front-desk staff. */
export function receptionRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();

  r.use(guards.requireAuth, guards.allowRoles(RECEPTION_ROLES, 'Access denied. Reception privileges required.'));

  r.get('/interests', c.interests.list);
  r.get('/subscription-plans/active', c.subscriptionPlans.listActive);

  return r;
}
