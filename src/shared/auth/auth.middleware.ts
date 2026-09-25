import type { Request, RequestHandler } from 'express';
import type { UserRole } from '../../modules/users/users.table';
import { ForbiddenError, UnauthorizedError } from '../http/errors';
import type { TokenService } from './token.service';

/** Reads the current session version of a user; null if the user is gone. */
export interface SessionVersionReader {
  findTokenVersion(userId: string): Promise<number | null>;
}

export interface AuthGuards {
  requireAuth: RequestHandler;
  requireRoles: (...roles: UserRole[]) => RequestHandler;
  /** Same as requireRoles, with the area-specific 403 message the old API used. */
  allowRoles: (roles: readonly UserRole[], message: string) => RequestHandler;
}

/** Web clients send the JWT as a cookie, mobile clients as a Bearer header. */
function extractToken(req: Request): string | null {
  const cookieToken: unknown = req.cookies?.token;
  if (typeof cookieToken === 'string' && cookieToken) return cookieToken;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

export function createAuthGuards(tokens: TokenService, sessions: SessionVersionReader): AuthGuards {
  const requireAuth: RequestHandler = async (req, _res, next) => {
    const token = extractToken(req);
    if (!token) throw new UnauthorizedError();

    const claims = tokens.verify(token);
    if (!claims) throw new UnauthorizedError('Invalid or expired token', 'INVALID_TOKEN');

    // A valid signature is not a valid session: the version check makes
    // password changes and logout-all revoke existing tokens immediately.
    const currentVersion = await sessions.findTokenVersion(claims.id);
    if (currentVersion === null) throw new UnauthorizedError('Account no longer exists', 'ACCOUNT_NOT_FOUND');
    if (claims.tokenVersion !== currentVersion) {
      throw new UnauthorizedError('Session has been revoked. Please sign in again.', 'TOKEN_REVOKED');
    }

    req.user = { ...claims, _id: claims.id, userId: claims.id };
    next();
  };

  const allowRoles =
    (roles: readonly UserRole[], message: string): RequestHandler =>
    (req, _res, next) => {
      if (!req.user) throw new UnauthorizedError();
      if (!roles.includes(req.user.role)) throw new ForbiddenError(message);
      next();
    };

  const requireRoles = (...roles: UserRole[]) => allowRoles(roles, 'Forbidden - Insufficient permissions');

  return { requireAuth, requireRoles, allowRoles };
}
