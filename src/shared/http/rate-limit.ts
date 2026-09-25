import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

function limiter(
  max: number,
  message: string,
  { windowMs = FIFTEEN_MINUTES, skipSuccessfulRequests = false } = {},
): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (_req, res) => {
      res.status(429).json({ success: false, message, code: 'RATE_LIMIT_EXCEEDED' });
    },
  });
}

export interface RateLimiters {
  api: RateLimitRequestHandler;
  /** Login: only failed attempts count. */
  auth: RateLimitRequestHandler;
  /** OTP and password flows: 3 per hour in production. */
  strict: RateLimitRequestHandler;
}

export function createRateLimiters(isProduction: boolean): RateLimiters {
  return {
    api: limiter(1000, 'Too many requests. Please try again in 15 minutes.'),
    auth: limiter(
      isProduction ? 10 : 100,
      'Too many failed authentication attempts. Please try again in 15 minutes.',
      { skipSuccessfulRequests: true },
    ),
    strict: limiter(isProduction ? 3 : 50, 'Too many attempts for this sensitive operation. Please try again in 1 hour.', {
      windowMs: ONE_HOUR,
    }),
  };
}
