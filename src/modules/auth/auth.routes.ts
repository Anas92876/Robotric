import { Router } from 'express';
import type { AuthGuards } from '../../shared/auth/auth.middleware';
import type { RateLimiters } from '../../shared/http/rate-limit';
import type { AuthController } from './auth.controller';

/** Mounted at /api/auth */
export function authRoutes(c: AuthController, guards: AuthGuards, limit: RateLimiters): Router {
  const r = Router();
  const { requireAuth } = guards;

  r.post('/login', limit.auth, c.login);
  r.post('/logout', requireAuth, c.logout);
  r.get('/me', requireAuth, c.me);

  r.post('/change-password/request', requireAuth, limit.strict, c.requestPasswordChange);
  r.post('/change-password/confirm', requireAuth, limit.strict, c.confirmPasswordChange);
  r.post('/change-email/request', requireAuth, limit.strict, c.requestEmailChange);
  r.post('/change-email/confirm', requireAuth, limit.strict, c.confirmEmailChange);

  r.post('/forgot-password/request', limit.strict, c.requestForgotPassword);
  r.post('/forgot-password/confirm', limit.strict, c.confirmForgotPassword);

  return r;
}
