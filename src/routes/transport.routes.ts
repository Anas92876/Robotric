import { Router } from 'express';
import type { Container } from '../container';

/** Mounted at /api/management/transport — fares, earnings and feedback (CTO and admins). */
export function managementTransportRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const m = c.managementTransport;
  r.use(guards.requireAuth, guards.requireRoles('cto', 'superadmin', 'admin'));
  r.get('/pricing', m.pricing);
  r.post('/pricing', m.createPricing);
  r.patch('/pricing/:id', m.updatePricing);
  r.patch('/pricing/:id/activate', m.activatePricing);
  r.get('/earnings/monthly', m.earnings);
  r.get('/overview', m.overview);
  r.get('/feedback/stats', m.feedbackStats);
  r.get('/feedback/:id', m.feedbackById);
  r.get('/feedback', m.feedback);
  return r;
}

/** Mounted at /api/driver/transport — the driver's app. */
export function driverTransportRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const d = c.driverTransport;
  r.use(guards.requireAuth, guards.allowRoles(['driver', 'admin', 'superadmin'], 'Access denied. Driver privileges required.'));
  r.get('/profile', d.profile);
  r.patch('/profile', d.updateProfile);
  r.get('/my-students', d.students);
  r.get('/schedule', d.schedule);
  r.get('/map-data', d.mapData);
  r.get('/earnings/monthly', d.earnings);
  r.get('/trips/today', d.today);
  r.get('/trips/:id', d.trip);
  r.patch('/trips/:id/start', d.start);
  r.patch('/trips/:id/complete', d.complete);
  r.patch('/trips/:id/cancel', d.cancel);
  r.patch('/trips/:id/location', d.location);
  r.patch('/trips/:id/students/:studentId/status', d.studentStatus);
  return r;
}

/** Mounted at /api/student/transport. */
export function studentTransportRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();
  const s = c.studentTransport;
  r.use(guards.requireAuth, guards.requireRoles('student'));
  r.get('/status', s.status);
  r.get('/driver-info', s.driverInfo);
  r.get('/trips/history', s.history);
  r.patch('/location', s.moveHome);
  r.get('/trips/:tripId/feedback', s.feedback);
  r.post('/trips/:tripId/feedback', s.rate);
  r.post('/cost-estimate', s.estimate);
  return r;
}
