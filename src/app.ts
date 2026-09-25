import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Container } from './container';
import { createCors } from './shared/http/cors';
import { createErrorHandler, notFoundHandler } from './shared/http/error-handler';
import { authRoutes } from './modules/auth/auth.routes';
import { cloRoutes } from './routes/clo.routes';
import { publicRoutes } from './routes/public.routes';
import { receptionRoutes } from './routes/reception.routes';

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
  app.use('/api/clo', cloRoutes(c));
  app.use('/api/reception', receptionRoutes(c));

  app.use(notFoundHandler);
  app.use(createErrorHandler(c.logger, !isProduction));

  return app;
}
