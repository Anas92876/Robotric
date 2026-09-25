import type { Env } from './config/env';
import { type AuthGuards, createAuthGuards } from './shared/auth/auth.middleware';
import { AuthCookie } from './shared/auth/auth-cookie';
import { BcryptPasswordHasher, type PasswordHasher } from './shared/auth/password-hasher';
import { JwtTokenService } from './shared/auth/token.service';
import type { Database } from './shared/db/client';
import { type EmailSender, LogOnlyEmailSender, ResendEmailSender } from './shared/email/email.sender';
import { createRateLimiters, type RateLimiters } from './shared/http/rate-limit';
import type { Logger } from './shared/logger';
import type { FileStorage } from './shared/storage/file-storage';
import { SupabaseFileStorage, UnconfiguredFileStorage } from './shared/storage/supabase.storage';
import { noEnrollmentRestriction, plainDisplayNames } from './modules/auth/auth.ports';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { OtpService } from './modules/auth/otp.service';
import { DrizzlePushTokenRepository } from './modules/push-tokens/push-tokens.repository';
import { DrizzleOtpRepository, DrizzleUserRepository } from './modules/users/users.repository';
import { CourseController } from './modules/courses/courses.controller';
import { noCourseActivity } from './modules/courses/courses.ports';
import { DrizzleCourseRepository } from './modules/courses/courses.repository';
import { CourseService } from './modules/courses/courses.service';
import { InterestController } from './modules/interests/interests.controller';
import { DrizzleInterestRepository } from './modules/interests/interests.repository';
import { InterestService } from './modules/interests/interests.service';
import { SubscriptionPlanController } from './modules/subscription-plans/subscription-plans.controller';
import { DrizzleSubscriptionPlanRepository } from './modules/subscription-plans/subscription-plans.repository';
import { noPlanUsage, SubscriptionPlanService } from './modules/subscription-plans/subscription-plans.service';
import { TrainingContentController } from './modules/training-content/training-content.controller';
import { DrizzleTrainingContentRepository } from './modules/training-content/training-content.repository';
import { TrainingContentService } from './modules/training-content/training-content.service';

/** Adapters that talk to the outside world; tests replace these with fakes. */
export interface Adapters {
  db: Database;
  email: EmailSender;
  storage: FileStorage;
  hasher: PasswordHasher;
  logger: Logger;
}

export function createAdapters(env: Env, db: Database, logger: Logger): Adapters {
  const email =
    env.RESEND_API_KEY && env.RESEND_FROM_EMAIL
      ? new ResendEmailSender(env.RESEND_API_KEY, env.RESEND_FROM_EMAIL, logger)
      : new LogOnlyEmailSender(logger);
  const storage =
    env.SUPABASE_URL && env.SUPABASE_KEY
      ? new SupabaseFileStorage(env.SUPABASE_URL, env.SUPABASE_KEY, logger)
      : new UnconfiguredFileStorage();
  return { db, email, storage, hasher: new BcryptPasswordHasher(), logger };
}

export interface Container {
  env: Env;
  logger: Logger;
  guards: AuthGuards;
  limiters: RateLimiters;
  controllers: {
    auth: AuthController;
    courses: CourseController;
    interests: InterestController;
    subscriptionPlans: SubscriptionPlanController;
    trainingContent: TrainingContentController;
  };
}

/**
 * The composition root: the ONE place that picks concrete implementations
 * and hands them to the services that need them. Nothing else calls `new`
 * on a repository or adapter.
 */
export function createContainer(env: Env, a: Adapters): Container {
  const isProduction = env.NODE_ENV === 'production';

  // Repositories
  const users = new DrizzleUserRepository(a.db);
  const otps = new DrizzleOtpRepository(a.db);
  const pushTokens = new DrizzlePushTokenRepository(a.db);

  // Shared services
  const tokens = new JwtTokenService(env.JWT_SECRET, env.JWT_EXPIRES_IN);
  const guards = createAuthGuards(tokens, users);
  const cookie = new AuthCookie({
    isProduction,
    clientOrigin: env.CLIENT_ORIGIN,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    domain: env.COOKIE_DOMAIN,
  });

  // Feature services
  const auth = new AuthService({
    users,
    pushTokens,
    otp: new OtpService(otps),
    hasher: a.hasher,
    tokens,
    email: a.email,
    displayNames: plainDisplayNames, // → leads module (phase 3)
    studentAccess: noEnrollmentRestriction, // → enrollments module (phase 4)
    logger: a.logger,
  });

  const courses = new CourseService(
    new DrizzleCourseRepository(a.db),
    users,
    noCourseActivity, // → groups & enrollments modules (phases 4–5)
  );
  const interests = new InterestService(new DrizzleInterestRepository(a.db));
  const plans = new SubscriptionPlanService(
    new DrizzleSubscriptionPlanRepository(a.db),
    noPlanUsage, // → user-subscriptions module (phase 4)
  );
  const trainingContent = new TrainingContentService(
    new DrizzleTrainingContentRepository(a.db),
    a.storage,
    env.SUPABASE_IMAGES_BUCKET,
    a.logger,
  );

  return {
    env,
    logger: a.logger,
    guards,
    limiters: createRateLimiters(isProduction),
    controllers: {
      auth: new AuthController(auth, cookie),
      courses: new CourseController(courses),
      interests: new InterestController(interests),
      subscriptionPlans: new SubscriptionPlanController(plans),
      trainingContent: new TrainingContentController(trainingContent),
    },
  };
}
