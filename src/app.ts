import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Container } from './container';
import { createCors } from './shared/http/cors';
import { createErrorHandler, notFoundHandler } from './shared/http/error-handler';
import { authRoutes } from './modules/auth/auth.routes';
import { cloRoutes } from './routes/clo.routes';
import { competitionRoutes, teamRoutes } from './routes/competition.routes';
import { clientRoutes, ctoInternalRoutes, engineerRoutes } from './routes/work.routes';
import { driverTransportRoutes, managementTransportRoutes, studentTransportRoutes } from './routes/transport.routes';
import { imageRoutes, inventoryProjectRoutes, orderRoutes, partRoutes, postRoutes, stockRoutes } from './routes/inventory.routes';
import { adminVersionRoutes, appVersionRoutes, usersRoutes } from './routes/platform.routes';
import { contactFormRoutes, jobsRoutes, publicRoutes } from './routes/public.routes';
import { receptionRoutes } from './routes/reception.routes';
import { trainerAttendanceRoutes, trainerGroupRoutes, trainerQuizRoutes, trainerSessionRoutes, trainerBoardRoutes, trainerDashboardRoutes, trainerEvaluationRoutes, trainerGalleryRoutes, trainerProjectRoutes, trainerResourceRoutes, trainerTaskRoutes } from './routes/trainer.routes';
import {
  studentAssignmentRoutes,
  studentAttendanceRoutes,
  studentModuleRoutes,
  studentPaymentRoutes,
  studentQuizRoutes,
  studentSubscriptionRoutes,
  studentTaskRoutes,
  studentResourceRoutes,
  studentSessionRoutes,
  studentCertificateRoutes,
  publicCertificateRoutes,
  studentProjectRoutes,
  studentGalleryRoutes,
  studentDocumentRoutes,
  studentBoardRoutes,
  studentCourseRoutes,
  studentDashboardRoutes,
} from './routes/student.routes';

/** Builds the Express app from a wired container. No I/O happens here. */
export function createApp(c: Container): Express {
  const app = express();
  const isProduction = c.env.NODE_ENV === 'production';

  // Behind Vercel's proxy: needed for correct client IPs in rate limiting.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(createCors(c.env.CLIENT_ORIGIN));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Liveness probe: must not touch the database.
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  app.get('/', (_req, res) => {
    res.type('text/plain').send('Robotric API');
  });

  app.use('/api', c.limiters.api);

  const { controllers: ctl, guards, limiters } = c;
  app.use('/api/auth', authRoutes(ctl.auth, guards, limiters));
  app.use('/api/public', publicRoutes(c));
  app.use('/api/contact', contactFormRoutes(c));
  app.use('/api/jobs', jobsRoutes(c));
  app.use('/api/clo', cloRoutes(c));
  app.use('/api/reception', receptionRoutes(c));
  app.use('/api/trainer/groups', trainerGroupRoutes(c));
  app.use('/api/trainer/sessions', trainerSessionRoutes(c));
  app.use('/api/trainer/attendance', trainerAttendanceRoutes(c));
  app.use('/api/student/attendance', studentAttendanceRoutes(c));
  app.use('/api/trainer/quizzes', trainerQuizRoutes(c));
  app.use('/api/student/modules', studentModuleRoutes(c));
  app.use('/api/student/quizzes', studentQuizRoutes(c));
  app.use('/api/student/assignments', studentAssignmentRoutes(c));
  app.use('/api/trainer/tasks', trainerTaskRoutes(c));
  app.use('/api/student/tasks', studentTaskRoutes(c));
  app.use('/api/trainer/resources', trainerResourceRoutes(c));
  app.use('/api/student/resources', studentResourceRoutes(c));
  app.use('/api/trainer/evaluations', trainerEvaluationRoutes(c));
  app.use('/api/student/sessions', studentSessionRoutes(c));
  app.use('/api/student/certificates', studentCertificateRoutes(c));
  app.use('/api/certificates', publicCertificateRoutes(c));
  app.use('/api/trainer/projects', trainerProjectRoutes(c));
  app.use('/api/trainer/gallery', trainerGalleryRoutes(c));
  app.use('/api/student/projects', studentProjectRoutes(c));
  app.use('/api/student/gallery', studentGalleryRoutes(c));
  app.use('/api/student/documents', studentDocumentRoutes(c));
  app.use('/api/student/board', studentBoardRoutes(c));
  app.use('/api/student/courses', studentCourseRoutes(c));
  app.use('/api/student/dashboard', studentDashboardRoutes(c));
  app.use('/api/trainer/dashboard', trainerDashboardRoutes(c));
  app.use('/api/trainer/board', trainerBoardRoutes(c));
  app.use('/api/student/payments', studentPaymentRoutes(c));
  app.use('/api/subscriptions', studentSubscriptionRoutes(c));
  app.use('/api/users', usersRoutes(c));
  app.use('/api/competitions', competitionRoutes(c));
  app.use('/api/teams', teamRoutes(c));
  app.use('/api/images', imageRoutes(c));
  app.use('/api/parts', partRoutes(c));
  app.use('/api/stock', stockRoutes(c));
  app.use('/api/orders', orderRoutes(c));
  app.use('/api/projects', inventoryProjectRoutes(c));
  app.use('/api/posts', postRoutes(c));
  app.use('/api/cto/internal', ctoInternalRoutes(c));
  app.use('/api/engineer', engineerRoutes(c));
  app.use('/api/client', clientRoutes(c));
  app.use('/api/management/transport', managementTransportRoutes(c));
  app.use('/api/driver/transport', driverTransportRoutes(c));
  app.use('/api/student/transport', studentTransportRoutes(c));
  app.use('/api/app-version', appVersionRoutes(c));
  app.use('/api/admin/settings/version', adminVersionRoutes(c));

  app.use(notFoundHandler);
  app.use(createErrorHandler(c.logger, !isProduction));

  return app;
}
