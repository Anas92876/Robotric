import cors from 'cors';
import type { RequestHandler } from 'express';

const PRODUCTION_ORIGINS = [
  'https://robotrick-main.vercel.app',
  'https://robotric-main.onrender.com',
  'https://www.robotrick.net',
  'https://robotrick.net',
];

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
// Expo / React Native dev servers on the local network.
const LAN_EXPO_ORIGIN = /^(http|exp):\/\/192\.168\.\d+\.\d+:(8081|19000|19001|19006)$/;

export function isAllowedOrigin(origin: string, clientOrigin: string): boolean {
  const o = origin.replace(/\/$/, '');
  return o === clientOrigin.replace(/\/$/, '') || PRODUCTION_ORIGINS.includes(o) || LOCAL_ORIGIN.test(o) || LAN_EXPO_ORIGIN.test(o);
}

/**
 * Browsers always send Origin on cross-site requests; mobile apps, curl and
 * server-to-server calls usually don't, and CORS does not apply to them.
 */
export function createCors(clientOrigin: string): RequestHandler {
  return cors({
    origin: (origin, done) => done(null, !origin || isAllowedOrigin(origin, clientOrigin)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Platform', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Authorization'],
  });
}
