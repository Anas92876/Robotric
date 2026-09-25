import { Router } from 'express';
import type { Container } from '../container';

/** Mounted at /api/public — website content, no login required. */
export function publicRoutes({ controllers: c }: Container): Router {
  const r = Router();
  r.get('/training-content', c.trainingContent.getPublic);
  return r;
}
