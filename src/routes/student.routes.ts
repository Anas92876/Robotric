import { Router } from 'express';
import type { Container } from '../container';

/** Mounted at /api/student/payments — the signed-in student's own payments (read-only). */
export function studentPaymentRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  r.use(guards.requireAuth);
  r.get('/', c.studentPayments.all);
  r.get('/summary', c.studentPayments.summary);
  r.get('/courses/:courseId', c.studentPayments.forCourse);
  r.get('/:paymentId/receipt', c.studentPayments.receipt);
  // Payments are recorded at the company; these two now always refuse.
  r.post('/initiate', c.studentPayments.disabled);
  r.post('/:paymentId/confirm', c.studentPayments.disabled);
  return r;
}

/** Mounted at /api/subscriptions — the signed-in student's hour package and private sessions. */
export function studentSubscriptionRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const s = c.studentSubscriptions;
  r.use(guards.requireAuth);
  r.get('/plans', c.subscriptionPlans.listActive);
  r.get('/me', s.me);
  r.get('/my-requests', s.myRequests);
  r.get('/my-reports', s.myReports);
  r.get('/session-requests/:id/report', s.report);
  r.post('/session-requests', s.requireActive, s.createRequest);
  r.post('/session-requests/:id/cancel', s.requireActive, s.cancelRequest);
  return r;
}
