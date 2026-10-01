import { Router } from 'express';
import type { Container } from '../container';
import { createUploader, IMAGE_POLICY } from '../shared/http/upload';

const ADMINS = ['admin', 'superadmin'] as const;

/** Mounted at /api/images — public reads, admin uploads. */
export function imageRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const i = c.images;
  r.get('/:id', i.get);
  r.get('/:id/thumbnail', i.get);
  r.get('/by/:imageType/:associatedId', i.byAssociation);
  r.get('/by/:imageType/:associatedId/thumbnail', i.byAssociation);
  r.post('/upload', guards.requireAuth, guards.requireRoles(...ADMINS), createUploader(IMAGE_POLICY).single('image'), i.upload);
  return r;
}

/** Mounted at /api/parts — anyone can browse; admins edit. */
export function partRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const p = c.parts;
  const admin = [guards.requireAuth, guards.requireRoles(...ADMINS)];
  r.get('/', p.list);
  r.get('/:id', p.get);
  r.post('/', ...admin, p.create);
  r.put('/:id', ...admin, p.update);
  r.delete('/:id', ...admin, p.delete);
  return r;
}

/** Mounted at /api/stock. */
export function stockRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const s = c.stock;
  r.use(guards.requireAuth);
  r.get('/levels', s.levels);
  r.get('/stats', s.stats);
  r.get('/categories', s.categories);
  r.get('/recent-movements', s.recent);
  r.get('/history', s.history);
  r.post('/adjust', guards.requireRoles(...ADMINS), s.adjust);
  return r;
}

/** Mounted at /api/orders — anyone signed in orders parts; admins process orders. */
export function orderRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const o = c.orders;
  const admin = guards.requireRoles(...ADMINS);
  r.use(guards.requireAuth);
  r.get('/', o.list);
  r.post('/', o.create);
  r.post('/:id/approve', admin, o.approve);
  r.post('/:id/reject', admin, o.reject);
  r.post('/:id/fulfill', admin, o.fulfill);
  r.post('/:id/cancel', o.cancel);
  return r;
}

/** Mounted at /api/projects — the caller's own build projects (admins see all). */
export function inventoryProjectRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const p = c.inventoryProjects;
  r.use(guards.requireAuth);
  r.get('/', p.list);
  r.post('/', p.create);
  r.put('/:id', p.update);
  r.delete('/:id', p.delete);
  r.put('/:id/parts', p.setParts);
  return r;
}

/** Mounted at /api/posts — published posts are public; staff write them. */
export function postRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const p = c.posts;
  const writers = [guards.requireAuth, guards.requireRoles('editor', 'admin', 'superadmin', 'reception', 'social')];
  r.get('/', p.list);
  // Staff see drafts too (the public list above is published only)
  r.get('/manage', ...writers, p.manage);
  r.get('/manage/:id', ...writers, p.manageOne);
  r.get('/slug/:slug', p.bySlug);
  r.get('/:id', p.get);
  r.post('/', ...writers, p.create);
  r.put('/:id', ...writers, p.update);
  r.delete('/:id', ...writers, p.delete);
  return r;
}
