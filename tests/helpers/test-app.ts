import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import type { Express } from 'express';
import { env } from '../../src/config/env';
import { createApp } from '../../src/app';
import { type Adapters, createContainer } from '../../src/container';
import type { PasswordHasher } from '../../src/shared/auth/password-hasher';
import type { Database } from '../../src/shared/db/client';
import * as schema from '../../src/shared/db/schema';
import type { EmailSender } from '../../src/shared/email/email.sender';
import type { OtpEmailKind } from '../../src/shared/email/otp-email.template';
import { logger } from '../../src/shared/logger';
import type { FileStorage, StoredFile, UploadInput } from '../../src/shared/storage/file-storage';

/** Captures outgoing emails so tests can read the OTP that was "sent". */
export class FakeEmailSender implements EmailSender {
  readonly sent: { to: string; otp: string; kind: OtpEmailKind }[] = [];

  async sendOtp(to: string, otp: string, kind: OtpEmailKind): Promise<void> {
    this.sent.push({ to, otp, kind });
  }

  lastOtpTo(to: string): string {
    const found = [...this.sent].reverse().find((m) => m.to === to);
    if (!found) throw new Error(`No email sent to ${to}`);
    return found.otp;
  }
}

/** Keeps uploaded files in memory. */
export class MemoryFileStorage implements FileStorage {
  readonly files = new Map<string, Buffer>();
  private key = (f: StoredFile) => `${f.bucket}/${f.path}`;

  async upload({ bucket, path, body }: UploadInput): Promise<StoredFile> {
    this.files.set(this.key({ bucket, path }), body);
    return { bucket, path };
  }
  publicUrl(f: StoredFile): string {
    return `https://storage.test/${this.key(f)}`;
  }
  async signedUrl(f: StoredFile): Promise<string> {
    return `https://storage.test/signed/${this.key(f)}`;
  }
  async remove(f: StoredFile): Promise<void> {
    this.files.delete(this.key(f));
  }
}

/** Reversible "hash" so tests don't pay bcrypt's cost on every call. */
export const fastHasher: PasswordHasher = {
  hash: async (plain) => `hashed:${plain}`,
  verify: async (plain, hash) => hash === `hashed:${plain}`,
};

export interface TestContext {
  app: Express;
  db: Database;
  email: FakeEmailSender;
  storage: MemoryFileStorage;
  close: () => Promise<void>;
}

/** A fully wired app on a fresh in-memory Postgres with all migrations applied. */
export async function createTestApp(): Promise<TestContext> {
  const client = new PGlite();
  const pg = drizzle(client, { schema });
  await migrate(pg, { migrationsFolder: 'drizzle' });
  const db = pg as unknown as Database;

  const email = new FakeEmailSender();
  const storage = new MemoryFileStorage();
  const adapters: Adapters = { db, email, storage, hasher: fastHasher, logger };
  const app = createApp(createContainer(env, adapters));

  return { app, db, email, storage, close: () => client.close() };
}
