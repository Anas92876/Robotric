import jwt, { type SignOptions } from 'jsonwebtoken';
import type { UserRole } from '../../modules/users/users.table';

/** What the JWT carries. Shape is unchanged from the old backend. */
export interface TokenClaims {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  tokenVersion: number;
}

export interface TokenService {
  sign(claims: TokenClaims): string;
  /** Returns the claims, or null when the token is invalid or expired. */
  verify(token: string): TokenClaims | null;
}

export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string,
  ) {}

  sign(claims: TokenClaims): string {
    return jwt.sign(claims, this.secret, { expiresIn: this.expiresIn as SignOptions['expiresIn'] });
  }

  verify(token: string): TokenClaims | null {
    try {
      const decoded = jwt.verify(token, this.secret);
      if (typeof decoded !== 'object' || decoded === null) return null;
      const d = decoded as Partial<TokenClaims> & { _id?: string };
      const id = d.id ?? d._id;
      if (!id || !d.role) return null;
      return {
        id,
        role: d.role,
        name: d.name ?? '',
        email: d.email ?? '',
        tokenVersion: d.tokenVersion ?? 0,
      };
    } catch {
      return null;
    }
  }
}
