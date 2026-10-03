import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { ValidationError } from '../../shared/http/errors';
import type { OtpPurpose } from '../users/users.table';
import type { OtpRepository } from '../users/users.repository';

const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export interface OtpMessages {
  missing: string;
  expired: string;
  wrong: string;
}

const hash = (code: string): string => createHash('sha256').update(code).digest('hex');

function sameHash(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Issues and checks 6-digit one-time codes: 10-minute lifetime, at most five
 * wrong guesses, then the code is burned. Codes are stored as SHA-256 hashes.
 */
export class OtpService {
  constructor(
    private readonly otps: OtpRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Creates a fresh code (replacing any pending one) and returns it in plain text. */
  async issue(userId: string, purpose: OtpPurpose, pendingValue: string | null = null): Promise<string> {
    const code = randomInt(100000, 1000000).toString();
    await this.otps.save(userId, purpose, {
      codeHash: hash(code),
      expiresAt: new Date(this.now().getTime() + TTL_MS),
      pendingValue,
    });
    return code;
  }

  /**
   * Verifies a code. On success the code is consumed and its pending value
   * (new email / new password hash) returned. Every failure throws a 400.
   */
  async consume(userId: string, purpose: OtpPurpose, code: string, messages: OtpMessages): Promise<string | null> {
    const record = await this.otps.find(userId, purpose);
    if (!record) throw new ValidationError(messages.missing);

    if (this.now() > record.expiresAt) {
      await this.otps.delete(userId, purpose);
      throw new ValidationError(messages.expired);
    }

    if (!sameHash(record.codeHash, hash(code.trim()))) {
      const attempts = record.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await this.otps.delete(userId, purpose);
        throw new ValidationError('Too many incorrect attempts. Please request a new code.');
      }
      await this.otps.setAttempts(userId, purpose, attempts);
      throw new ValidationError(messages.wrong);
    }

    await this.otps.delete(userId, purpose);
    return record.pendingValue;
  }

  async cancel(userId: string, purpose: OtpPurpose): Promise<void> {
    await this.otps.delete(userId, purpose);
  }
}
