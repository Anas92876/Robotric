import type { Request } from 'express';
import type { UserRole } from '../../modules/users/users.table';
import { UnauthorizedError } from './errors';

/**
 * The authenticated caller. `id`, `_id` and `userId` are all set because the
 * old controllers (and some clients echoing them back) used all three.
 */
export interface AuthUser {
  id: string;
  _id: string;
  userId: string;
  role: UserRole;
  name: string;
  email: string;
  tokenVersion: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** For handlers behind `requireAuth`: returns the caller or throws 401. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}
