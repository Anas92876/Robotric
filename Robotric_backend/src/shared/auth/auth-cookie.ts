import type { CookieOptions, Request, Response } from 'express';

export interface CookieSettings {
  isProduction: boolean;
  clientOrigin: string;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  domain: string | undefined;
}

const SEVEN_DAYS_MS = 7 * 24 * 3600 * 1000;

/**
 * Web clients authenticate with an httpOnly cookie; mobile clients (header
 * `x-platform: mobile`) use the Bearer token from the response body instead.
 */
export class AuthCookie {
  constructor(private readonly s: CookieSettings) {}

  private options(): CookieOptions {
    const crossSite = this.s.clientOrigin !== 'http://localhost:5173';
    return {
      httpOnly: true,
      sameSite: this.s.isProduction || crossSite ? 'none' : this.s.sameSite,
      secure: this.s.secure || this.s.isProduction || crossSite,
      maxAge: SEVEN_DAYS_MS,
      domain: this.s.domain || undefined,
      path: '/',
    };
  }

  set(req: Request, res: Response, token: string): void {
    if (req.headers['x-platform'] === 'mobile') return;
    res.cookie('token', token, this.options());
  }

  clear(res: Response): void {
    const { maxAge: _ignored, ...opts } = this.options();
    res.clearCookie('token', opts);
  }
}
