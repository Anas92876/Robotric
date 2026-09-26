import { Router } from 'express';
import type { Container } from '../container';
import { createUploader, PDF_POLICY } from '../shared/http/upload';

/** Mounted at /api/public — website content, no login required. */
export function publicRoutes({ controllers: c }: Container): Router {
  const r = Router();
  r.get('/training-content', c.trainingContent.getPublic);
  return r;
}

/** Mounted at /api/contact — the website contact form. */
export function contactFormRoutes({ controllers: c }: Container): Router {
  const r = Router();
  r.post('/', c.contacts.submit);
  return r;
}

/** Mounted at /api/jobs — the careers form; the CV (field "cv") is an optional PDF. */
export function jobsRoutes({ controllers: c }: Container): Router {
  const r = Router();
  r.post('/apply', ...createUploader(PDF_POLICY).single('cv'), c.jobApplications.apply);
  return r;
}
