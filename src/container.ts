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
import { type PdfRenderer, PuppeteerPdfRenderer } from './shared/pdf/pdf-renderer';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { OtpService } from './modules/auth/otp.service';
import { DrizzlePushTokenRepository } from './modules/push-tokens/push-tokens.repository';
import { DrizzleOtpRepository, DrizzleUserRepository } from './modules/users/users.repository';
import { CourseController } from './modules/courses/courses.controller';
import { GroupEnrollmentCourseActivity } from './modules/courses/course-activity';
import { DrizzleCourseRepository } from './modules/courses/courses.repository';
import { CourseService } from './modules/courses/courses.service';
import { InterestController } from './modules/interests/interests.controller';
import { DrizzleInterestRepository } from './modules/interests/interests.repository';
import { InterestService } from './modules/interests/interests.service';
import { SubscriptionPlanController } from './modules/subscription-plans/subscription-plans.controller';
import { DrizzleSubscriptionPlanRepository } from './modules/subscription-plans/subscription-plans.repository';
import { SubscriptionPlanService } from './modules/subscription-plans/subscription-plans.service';
import { TrainingContentController } from './modules/training-content/training-content.controller';
import { DrizzleTrainingContentRepository } from './modules/training-content/training-content.repository';
import { TrainingContentService } from './modules/training-content/training-content.service';
import { SettingsController } from './modules/settings/settings.controller';
import { DrizzleSettingsRepository } from './modules/settings/settings.repository';
import { SettingsService } from './modules/settings/settings.service';
import { UsersController } from './modules/users/users.controller';
import { DrizzleUnitOfWork } from './shared/db/unit-of-work';
import { ContactHistoryController } from './modules/contact-history/contact-history.controller';
import { DrizzleContactHistoryRepository } from './modules/contact-history/contact-history.repository';
import { ContactHistoryService } from './modules/contact-history/contact-history.service';
import { ContactController } from './modules/contacts/contacts.controller';
import { DrizzleContactRepository } from './modules/contacts/contacts.repository';
import { EventController } from './modules/events/events.controller';
import { DrizzleEventRepository } from './modules/events/events.repository';
import { EventService } from './modules/events/events.service';
import { JobApplicationController } from './modules/job-applications/job-applications.controller';
import { DrizzleJobApplicationRepository } from './modules/job-applications/job-applications.repository';
import { JobApplicationService } from './modules/job-applications/job-applications.service';
import { LeadDisplayNameResolver } from './modules/leads/lead-display-names';
import { LeadController } from './modules/leads/leads.controller';
import { DrizzleLeadRepository } from './modules/leads/leads.repository';
import { LeadService } from './modules/leads/leads.service';
import { CloGroupController, TrainerGroupController } from './modules/groups/groups.controller';
import { noGroupActivity, noGroupChat } from './modules/groups/groups.ports';
import { DrizzleGroupRepository } from './modules/groups/groups.repository';
import { GroupService } from './modules/groups/groups.service';
import { EnrollmentPaymentService } from './modules/enrollments/enrollment-payments.service';
import { EnrollmentFormController } from './modules/enrollments/enrollment-form.controller';
import { EnrollmentController } from './modules/enrollments/enrollments.controller';
import { silentNotifier } from './modules/enrollments/enrollments.ports';
import { DrizzleEnrollmentRepository } from './modules/enrollments/enrollments.repository';
import { EnrollmentService } from './modules/enrollments/enrollments.service';
import { ReceiptController, StudentPaymentController } from './modules/receipts/receipts.controller';
import { DrizzleReceiptRepository } from './modules/receipts/receipts.repository';
import { ReceiptService } from './modules/receipts/receipts.service';
import { ReceptionSubscriptionController, StudentSubscriptionController } from './modules/subscriptions/subscriptions.controller';
import { DrizzleSessionRequestRepository, DrizzleUserSubscriptionRepository } from './modules/subscriptions/subscriptions.repository';
import { SessionRequestService, UserSubscriptionService } from './modules/subscriptions/subscriptions.service';

/** Adapters that talk to the outside world; tests replace these with fakes. */
export interface Adapters {
  db: Database;
  email: EmailSender;
  storage: FileStorage;
  hasher: PasswordHasher;
  pdf: PdfRenderer;
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
  return { db, email, storage, hasher: new BcryptPasswordHasher(), pdf: new PuppeteerPdfRenderer(logger, env.CHROME_BIN), logger };
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
    settings: SettingsController;
    users: UsersController;
    leads: LeadController;
    events: EventController;
    contactHistory: ContactHistoryController;
    contacts: ContactController;
    jobApplications: JobApplicationController;
    cloGroups: CloGroupController;
    trainerGroups: TrainerGroupController;
    enrollments: EnrollmentController;
    enrollmentForm: EnrollmentFormController;
    receipts: ReceiptController;
    studentPayments: StudentPaymentController;
    receptionSubscriptions: ReceptionSubscriptionController;
    studentSubscriptions: StudentSubscriptionController;
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
  const leadRepo = new DrizzleLeadRepository(a.db);
  const eventRepo = new DrizzleEventRepository(a.db);
  const courseRepo = new DrizzleCourseRepository(a.db);
  const groupRepo = new DrizzleGroupRepository(a.db);
  const enrollmentRepo = new DrizzleEnrollmentRepository(a.db);
  const receiptRepo = new DrizzleReceiptRepository(a.db);
  const userSubscriptionRepo = new DrizzleUserSubscriptionRepository(a.db);
  const sessionRequestRepo = new DrizzleSessionRequestRepository(a.db);
  const planRepo = new DrizzleSubscriptionPlanRepository(a.db);
  /** Repositories bound to one transaction, for multi-table enrollment changes. */
  const enrollmentUow = new DrizzleUnitOfWork(a.db, (tx) => ({
    enrollments: new DrizzleEnrollmentRepository(tx),
    groups: new DrizzleGroupRepository(tx),
    receipts: new DrizzleReceiptRepository(tx),
    leads: new DrizzleLeadRepository(tx),
  }));

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
  const displayNames = new LeadDisplayNameResolver(leadRepo);
  const enrollmentService = new EnrollmentService(
    enrollmentRepo,
    groupRepo,
    leadRepo,
    enrollmentUow,
    { findById: (id) => courseRepo.findById(id), subCoursesOf: (ids) => courseRepo.subCoursesOf(ids) },
    users,
    silentNotifier, // → notifications (phase 9)
    a.logger,
  );
  const auth = new AuthService({
    users,
    pushTokens,
    otp: new OtpService(otps),
    hasher: a.hasher,
    tokens,
    email: a.email,
    displayNames,
    studentAccess: enrollmentService,
    logger: a.logger,
  });

  const courses = new CourseService(
    courseRepo,
    users,
    new GroupEnrollmentCourseActivity(groupRepo, enrollmentRepo),
  );
  const interests = new InterestService(new DrizzleInterestRepository(a.db));
  const plans = new SubscriptionPlanService(
    planRepo,
    { countActiveSubscriptions: (planId) => userSubscriptionRepo.countActiveForPlan(planId) },
  );
  const trainingContent = new TrainingContentService(
    new DrizzleTrainingContentRepository(a.db),
    a.storage,
    env.SUPABASE_IMAGES_BUCKET,
    a.logger,
  );

  // CRM
  const leads = new LeadService(
    leadRepo,
    new DrizzleUnitOfWork(a.db, (tx) => ({ leads: new DrizzleLeadRepository(tx), users: new DrizzleUserRepository(tx) })),
    courseRepo,
    a.hasher,
  );
  const events = new EventService(eventRepo, new DrizzleUnitOfWork(a.db, (tx) => ({ events: new DrizzleEventRepository(tx) })));
  const contactHistory = new ContactHistoryService(
    { history: new DrizzleContactHistoryRepository(a.db), events: eventRepo, leads: leadRepo },
    new DrizzleUnitOfWork(a.db, (tx) => ({
      history: new DrizzleContactHistoryRepository(tx),
      events: new DrizzleEventRepository(tx),
      leads: new DrizzleLeadRepository(tx),
    })),
  );
  const jobApplications = new JobApplicationService(new DrizzleJobApplicationRepository(a.db), a.storage, env.SUPABASE_BUCKET);

  // Groups
  const groupService = new GroupService(
    groupRepo,
    courseRepo,
    users,
    noGroupActivity, // → sessions & attendance (phase 5)
    {
      forStudentsInCourse: async (studentIds, courseId) => {
        const rows = await enrollmentRepo.forStudentsInCourse(studentIds, courseId);
        return new Map(
          rows.map((e) => [e.studentId, { id: e.id, studentId: e.studentId, status: e.status, enrolledAt: e.enrolledAt, progress: e.percentageComplete }]),
        );
      },
    },
    noGroupChat, // → chat (phase 9)
    a.logger,
  );

  // Money
  const enrollmentPayments = new EnrollmentPaymentService(enrollmentRepo, enrollmentUow, silentNotifier, a.logger);
  const receipts = new ReceiptService(receiptRepo, a.pdf, displayNames);

  // Hour packages and private sessions
  const subscriptionUow = new DrizzleUnitOfWork(a.db, (tx) => ({
    subscriptions: new DrizzleUserSubscriptionRepository(tx),
    requests: new DrizzleSessionRequestRepository(tx),
  }));
  const userSubscriptions = new UserSubscriptionService(userSubscriptionRepo, subscriptionUow, planRepo, users);
  const sessionRequests = new SessionRequestService(userSubscriptionRepo, sessionRequestRepo, subscriptionUow, a.storage, env.SUPABASE_BUCKET, a.logger);
  const publishedCourses = {
    published: async () => courseRepo.list({ status: 'published', includeSubCourses: true, sortBy: 'createdAt' as const, order: 'desc' as const }),
  };

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
      settings: new SettingsController(new SettingsService(new DrizzleSettingsRepository(a.db))),
      users: new UsersController(users),
      leads: new LeadController(leads),
      events: new EventController(events),
      contactHistory: new ContactHistoryController(contactHistory),
      contacts: new ContactController(new DrizzleContactRepository(a.db)),
      jobApplications: new JobApplicationController(jobApplications),
      cloGroups: new CloGroupController(groupService),
      trainerGroups: new TrainerGroupController(groupService, publishedCourses),
      enrollments: new EnrollmentController(enrollmentService, enrollmentPayments),
      enrollmentForm: new EnrollmentFormController(courseRepo, groupRepo, enrollmentRepo, users),
      receipts: new ReceiptController(receipts, enrollmentRepo),
      studentPayments: new StudentPaymentController(receipts, enrollmentRepo),
      receptionSubscriptions: new ReceptionSubscriptionController(userSubscriptions, sessionRequests),
      studentSubscriptions: new StudentSubscriptionController(userSubscriptions, sessionRequests),
    },
  };
}
