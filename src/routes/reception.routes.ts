import { Router } from 'express';
import type { Container } from '../container';
import { createUploader, PDF_POLICY } from '../shared/http/upload';

export const RECEPTION_ROLES = ['reception', 'admin', 'superadmin'] as const;

/** Mounted at /api/reception — front-desk staff. */
export function receptionRoutes({ guards, controllers: c }: Container): Router {
  const r = Router();

  r.use(guards.requireAuth, guards.allowRoles(RECEPTION_ROLES, 'Access denied. Reception privileges required.'));

  r.get('/interests', c.interests.list);
  r.get('/subscription-plans/active', c.subscriptionPlans.listActive);

  // Leads — fixed paths before /leads/:id
  r.get('/leads/stats', c.leads.stats);
  r.get('/leads/waiting', c.leads.waiting);
  r.get('/leads', c.leads.list);
  r.post('/leads', c.leads.create);
  r.get('/leads/:id', c.leads.get);
  r.put('/leads/:id', c.leads.update);
  r.delete('/leads/:id', c.leads.delete);
  r.post('/leads/:id/convert', c.leads.convert);
  r.post('/leads/:id/follow-up', c.leads.addFollowUp);
  r.post('/leads/:id/change-status', c.leads.changeStatus);
  r.post('/leads/:id/set-waiting', c.leads.setWaiting);

  // Contact history (each entry also creates a calendar event)
  r.get('/contact-history/stats', c.contactHistory.stats);
  r.get('/leads/:leadId/contact-history', c.contactHistory.listByLead);
  r.post('/leads/:leadId/contact-history', c.contactHistory.create);
  r.put('/contact-history/:id', c.contactHistory.update);
  r.delete('/contact-history/:id', c.contactHistory.delete);

  // Calendar
  r.get('/events', c.events.list);
  r.post('/events', c.events.create);
  r.put('/events/:id', c.events.update);
  r.delete('/events/:id', c.events.delete);

  // Website contact-form messages
  r.get('/contacts', c.contacts.list);
  r.get('/contacts/:id', c.contacts.get);
  r.put('/contacts/:id', c.contacts.update);
  r.delete('/contacts/:id', c.contacts.delete);

  // Enrollments — fixed paths before /enrollments/:id
  r.get('/recent-enrollments', c.enrollments.recent);
  r.get('/enrollments/available-courses', c.enrollmentForm.availableCourses);
  r.get('/enrollments/available-groups/:courseId', c.enrollmentForm.availableGroups);
  r.get('/enrollments/available-students', c.enrollmentForm.availableStudents);
  r.get('/enrollments/check', c.enrollments.check);
  r.post('/enrollments/from-waiting', c.enrollments.fromWaiting);
  r.post('/enrollments/bundle', c.enrollments.bundle);
  r.post('/enrollments/mark-overdue-transportation', c.enrollments.markOverdueTransport);
  r.get('/enrollments/:enrollmentId/sub-enrollments', c.enrollments.subEnrollments);
  r.get('/enrollments', c.enrollments.list);
  r.post('/enrollments', c.enrollments.create);
  r.get('/enrollments/:id', c.enrollments.get);
  r.put('/enrollments/:id', c.enrollments.update);
  r.delete('/enrollments/:id', c.enrollments.delete);
  r.put('/enrollments/:id/status', c.enrollments.setStatus);
  r.post('/enrollments/:id/payment', c.enrollments.recordPayment);
  r.post('/enrollments/:id/transportation-payment', c.enrollments.recordTransportPayment);
  r.get('/enrollments/:id/transportation-receipts', c.receipts.transportForEnrollment);
  r.delete('/enrollments/:id/transportation', c.enrollments.deleteTransportation);

  // Receipts (PDFs are rendered on download)
  r.get('/receipts/enrollment/:enrollmentId', c.receipts.forEnrollment);
  r.post('/receipts', c.receipts.create);
  r.get('/receipts/:id', c.receipts.get);
  r.get('/receipts/:id/download', c.receipts.download);

  // Hour packages and private session requests
  r.get('/user-subscriptions', c.receptionSubscriptions.list);
  r.post('/user-subscriptions', c.receptionSubscriptions.assign);
  r.put('/user-subscriptions/:id', c.receptionSubscriptions.update);
  r.post('/user-subscriptions/:id/cancel', c.receptionSubscriptions.cancel);
  r.get('/session-requests', c.receptionSubscriptions.requests);
  r.post('/session-requests/:id/approve', c.receptionSubscriptions.approve);
  r.post('/session-requests/:id/decline', c.receptionSubscriptions.decline);
  r.post('/session-requests/:id/report', ...createUploader(PDF_POLICY).single('pdf'), c.receptionSubscriptions.report);
  r.get('/session-reports', c.receptionSubscriptions.reports);

  r.get('/settings/exchange-rate', c.settings.getExchangeRate);
  r.put('/settings/exchange-rate', c.settings.setExchangeRate);

  return r;
}
