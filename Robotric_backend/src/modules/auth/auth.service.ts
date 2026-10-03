import type { PasswordHasher } from '../../shared/auth/password-hasher';
import type { TokenService } from '../../shared/auth/token.service';
import type { EmailSender } from '../../shared/email/email.sender';
import { NotFoundError, UnauthorizedError, ValidationError } from '../../shared/http/errors';
import type { Logger } from '../../shared/logger';
import type { PushTokenRepository } from '../push-tokens/push-tokens.repository';
import type { User, UserRepository } from '../users/users.repository';
import type { DisplayNameResolver, StudentAccessChecker } from './auth.ports';
import type { OtpService } from './otp.service';

/** The user payload returned by login and /me. Shape unchanged from the old API. */
export interface SessionUser {
  _id: string;
  id: string;
  email: string;
  role: User['role'];
  name: string;
  nameAr: string | null;
  assignedCompetitionId: string | null;
}

export interface AuthServiceDeps {
  users: UserRepository;
  pushTokens: PushTokenRepository;
  otp: OtpService;
  hasher: PasswordHasher;
  tokens: TokenService;
  email: EmailSender;
  displayNames: DisplayNameResolver;
  studentAccess: StudentAccessChecker;
  logger: Logger;
}

const INVALID_CREDENTIALS = () => new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');

export const EMAIL_CHANGE_GENERIC = 'If that address is available, a verification code has been sent to it';
export const FORGOT_PASSWORD_GENERIC = 'If that email is registered, a verification code has been sent to it.';

export class AuthService {
  constructor(private readonly d: AuthServiceDeps) {}

  private async toSessionUser(user: User): Promise<SessionUser> {
    const { name, nameAr } = await this.d.displayNames.resolve(user);
    return {
      _id: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      name,
      nameAr,
      assignedCompetitionId: user.assignedCompetitionId,
    };
  }

  private issueToken(user: SessionUser, tokenVersion: number): string {
    return this.d.tokens.sign({ id: user.id, role: user.role, name: user.name, email: user.email, tokenVersion });
  }

  async login(email: string, password: string): Promise<SessionUser & { token: string }> {
    const found = await this.d.users.findByEmailWithPassword(email);
    if (!found) {
      this.d.logger.info({ email, reason: 'user_not_found' }, 'login_failed');
      throw INVALID_CREDENTIALS();
    }
    const { passwordHash, ...user } = found;

    if (user.profile?.status === 'inactive') {
      throw new UnauthorizedError('Account has been deactivated. Please contact support.', 'ACCOUNT_DEACTIVATED');
    }
    if (user.role === 'student' && (await this.d.studentAccess.allEnrollmentsInactive(user.id))) {
      throw new UnauthorizedError('Your account has been deactivated. Please contact reception.', 'ENROLLMENT_INACTIVE');
    }
    if (!(await this.d.hasher.verify(password, passwordHash))) {
      this.d.logger.info({ email, userId: user.id, reason: 'wrong_password' }, 'login_failed');
      throw INVALID_CREDENTIALS();
    }

    const sessionUser = await this.toSessionUser(user);
    return { ...sessionUser, token: this.issueToken(sessionUser, user.tokenVersion) };
  }

  async logout(userId: string): Promise<void> {
    try {
      const count = await this.d.pushTokens.deactivateAllForUser(userId);
      if (count > 0) this.d.logger.info({ userId, count }, 'Push tokens deactivated on logout');
    } catch (err) {
      // Logout must succeed even if push-token cleanup fails.
      this.d.logger.error({ err, userId }, 'Failed to deactivate push tokens on logout');
    }
  }

  async me(userId: string): Promise<SessionUser> {
    const user = await this.d.users.findById(userId);
    if (!user) throw new NotFoundError('User');
    return this.toSessionUser(user);
  }

  // ─── Change password (authenticated) ─────────────────────────────────────

  async requestPasswordChange(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.d.users.findByIdWithPassword(userId);
    if (!user) throw new NotFoundError('User');
    if (!(await this.d.hasher.verify(currentPassword, user.passwordHash))) {
      throw new UnauthorizedError('Current password is incorrect', 'WRONG_PASSWORD');
    }
    const pendingHash = await this.d.hasher.hash(newPassword);
    const code = await this.d.otp.issue(userId, 'password_change', pendingHash);
    await this.d.email.sendOtp(user.email, code, 'passwordChange');
  }

  /** Applies the new password, revokes all sessions, and returns a fresh token for the caller. */
  async confirmPasswordChange(userId: string, code: string): Promise<{ token: string }> {
    const user = await this.d.users.findById(userId);
    if (!user) throw new NotFoundError('User');

    const pendingHash = await this.d.otp.consume(userId, 'password_change', code, {
      missing: 'No pending password change. Please request a new code.',
      expired: 'OTP has expired. Please request a new code.',
      wrong: 'Invalid OTP',
    });
    if (!pendingHash) throw new ValidationError('No pending password change. Please request a new code.');

    const tokenVersion = await this.d.users.replacePassword(userId, pendingHash);
    const sessionUser = await this.toSessionUser(user);
    return { token: this.issueToken(sessionUser, tokenVersion) };
  }

  // ─── Change email (authenticated) ────────────────────────────────────────

  /** Always answers the same way whether or not the address is taken, so it can't be used to probe accounts. */
  async requestEmailChange(userId: string, newEmail: string): Promise<void> {
    const user = await this.d.users.findById(userId);
    if (!user) throw new NotFoundError('User');
    if (await this.d.users.emailExists(newEmail)) {
      this.d.logger.info({ userId }, 'change_email_duplicate_silenced');
      return;
    }
    const code = await this.d.otp.issue(userId, 'email_change', newEmail);
    await this.d.email.sendOtp(newEmail, code, 'emailChange');
  }

  async confirmEmailChange(userId: string, code: string): Promise<{ email: string }> {
    const user = await this.d.users.findById(userId);
    if (!user) throw new NotFoundError('User');

    const pendingEmail = await this.d.otp.consume(userId, 'email_change', code, {
      missing: 'No pending email change. Please request a new code.',
      expired: 'OTP has expired. Please request a new code.',
      wrong: 'Invalid OTP',
    });
    if (!pendingEmail) throw new ValidationError('No pending email change. Please request a new code.');
    if (await this.d.users.emailExists(pendingEmail)) {
      throw new ValidationError('That email address is no longer available. Please request a new change.');
    }

    await this.d.users.updateEmail(userId, pendingEmail);
    return { email: pendingEmail.trim().toLowerCase() };
  }

  // ─── Forgot password (public) ────────────────────────────────────────────

  async requestForgotPassword(email: string): Promise<void> {
    const user = await this.d.users.findByEmailWithPassword(email);
    if (!user) {
      this.d.logger.info({ email }, 'forgot_password_email_not_found');
      return;
    }
    const code = await this.d.otp.issue(user.id, 'forgot_password');
    await this.d.email.sendOtp(user.email, code, 'passwordChange');
  }

  async confirmForgotPassword(email: string, code: string, newPassword: string): Promise<void> {
    const user = await this.d.users.findByEmailWithPassword(email);
    if (!user) throw new ValidationError('Invalid or expired code. Please request a new one.');

    await this.d.otp.consume(user.id, 'forgot_password', code, {
      missing: 'No pending reset request. Please request a new code.',
      expired: 'Code has expired. Please request a new one.',
      wrong: 'Invalid code. Please try again.',
    });
    // Replacing the password bumps tokenVersion, ending any session an attacker may hold.
    await this.d.users.replacePassword(user.id, await this.d.hasher.hash(newPassword));
  }
}
