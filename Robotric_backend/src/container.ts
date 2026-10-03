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
import { ReceptionUsersController, UsersController } from './modules/users/users.controller';
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
import { noGroupChat } from './modules/groups/groups.ports';
import { AttendanceController } from './modules/attendance/attendance.controller';
import { DrizzleAttendanceRepository } from './modules/attendance/attendance.repository';
import { AttendanceService } from './modules/attendance/attendance.service';
import { SessionGroupActivity } from './modules/sessions/group-activity';
import { SessionController } from './modules/sessions/sessions.controller';
import { DrizzleSessionRepository } from './modules/sessions/sessions.repository';
import { SessionService, silentSessionNotifier } from './modules/sessions/sessions.service';
import { StudentAssignmentController } from './modules/assignments/assignments.controller';
import { DrizzleAssignmentRepository } from './modules/assignments/assignments.repository';
import { AssignmentService } from './modules/assignments/assignments.service';
import { StudentModuleController } from './modules/course-modules/course-modules.controller';
import { DrizzleCourseModuleRepository, DrizzleModuleProgressRepository } from './modules/course-modules/course-modules.repository';
import { CourseModuleService } from './modules/course-modules/course-modules.service';
import { StudentQuizController, TrainerQuizController } from './modules/quizzes/quizzes.controller';
import { DrizzleQuizRepository } from './modules/quizzes/quizzes.repository';
import { QuizService, silentQuizNotifier } from './modules/quizzes/quizzes.service';
import { TaskController } from './modules/tasks/tasks.controller';
import { DrizzleTaskRepository } from './modules/tasks/tasks.repository';
import { silentTaskNotifier, TaskService } from './modules/tasks/tasks.service';
import { CloResourceController, StudentResourceController, TrainerResourceController } from './modules/resources/resources.controller';
import { DrizzleResourceRepository } from './modules/resources/resources.repository';
import { ResourceService, silentResourceNotifier } from './modules/resources/resources.service';
import { CloEvaluationController, EvaluationCriteriaController, StudentEvaluationController, TrainerEvaluationController } from './modules/evaluations/evaluations.controller';
import { DrizzleEvaluationRepository } from './modules/evaluations/evaluations.repository';
import { CertificateController } from './modules/certificates/certificates.controller';
import { DrizzleCertificateRepository } from './modules/certificates/certificates.repository';
import { CertificateService } from './modules/certificates/certificates.service';
import { CloProjectController, StudentProjectController, TrainerProjectController } from './modules/student-projects/student-projects.controller';
import { DrizzleStudentProjectRepository } from './modules/student-projects/student-projects.repository';
import { silentProjectNotifier, StudentProjectService } from './modules/student-projects/student-projects.service';
import { CloGalleryController, ReceptionGalleryController, StudentGalleryController, TrainerGalleryController } from './modules/gallery/gallery.controller';
import { DrizzleGalleryRepository } from './modules/gallery/gallery.repository';
import { GalleryService } from './modules/gallery/gallery.service';
import { CloDocumentController, StudentDocumentController } from './modules/documents/documents.controller';
import { DrizzleDocumentRepository } from './modules/documents/documents.repository';
import { DocumentService } from './modules/documents/documents.service';
import { BoardController } from './modules/boards/boards.controller';
import { DrizzleBoardRepository } from './modules/boards/boards.repository';
import { BoardService } from './modules/boards/boards.service';
import { StudentCourseController } from './modules/student-courses/student-courses.controller';
import { StudentCourseService } from './modules/student-courses/student-courses.service';
import { UserAdminService } from './modules/users/user-admin.service';
import { CompetitionController, TeamController } from './modules/competitions/competitions.controller';
import { DrizzleCompetitionRepository } from './modules/competitions/competitions.repository';
import { CompetitionService } from './modules/competitions/competitions.service';
import { ImageController } from './modules/images/images.controller';
import { DrizzleImageRepository } from './modules/images/images.repository';
import { ImageService } from './modules/images/images.service';
import { InventoryProjectController, OrderController, PartController, StockController } from './modules/inventory/inventory.controller';
import { DrizzleInventoryRepository } from './modules/inventory/inventory.repository';
import { InventoryService } from './modules/inventory/inventory.service';
import { PostController } from './modules/posts/posts.controller';
import { DrizzlePostRepository } from './modules/posts/posts.repository';
import { PostService } from './modules/posts/posts.service';
import { ClientController, CtoWorkController, EngineerController } from './modules/internal-work/internal-work.controller';
import { DrizzleInternalWorkRepository } from './modules/internal-work/internal-work.repository';
import { InternalWorkService, silentWorkNotifier } from './modules/internal-work/internal-work.service';
import { CtoAnalyticsService, WorkSessionService } from './modules/internal-work/work-time.service';
import { DriverController, ManagementTransportController, ReceptionTransportController, StudentTransportController } from './modules/transport/transport.controller';
import { DrizzleTransportRepository } from './modules/transport/transport.repository';
import { DriverService, StudentTransportService } from './modules/transport/transport-riders.service';
import { silentTransportNotifier, TransportService } from './modules/transport/transport.service';
import { estimateRouter, GoogleRoadRouter } from './modules/transport/transport-math';
import { CloDashboardController, CloTrainerController, ReceptionDashboardController, StudentDashboardController, TrainerDashboardController } from './modules/dashboards/dashboards.controller';
import { DrizzleDashboardRepository } from './modules/dashboards/dashboards.repository';
import { CloDashboardService, CloTrainerService, ReceptionDashboardService, StudentDashboardService, TrainerDashboardService } from './modules/dashboards/dashboards.service';
import { EvaluationService, silentEvaluationNotifier } from './modules/evaluations/evaluations.service';
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
    trainerSessions: SessionController;
    cloSessions: SessionController;
    attendance: AttendanceController;
    studentModules: StudentModuleController;
    trainerQuizzes: TrainerQuizController;
    studentQuizzes: StudentQuizController;
    studentAssignments: StudentAssignmentController;
    tasks: TaskController;
    cloResources: CloResourceController;
    studentResources: StudentResourceController;
    trainerResources: TrainerResourceController;
    evaluationCriteria: EvaluationCriteriaController;
    trainerEvaluations: TrainerEvaluationController;
    cloEvaluations: CloEvaluationController;
    studentEvaluations: StudentEvaluationController;
    certificates: CertificateController;
    trainerProjects: TrainerProjectController;
    studentProjects: StudentProjectController;
    cloProjects: CloProjectController;
    trainerGallery: TrainerGalleryController;
    receptionGallery: ReceptionGalleryController;
    studentGallery: StudentGalleryController;
    cloGallery: CloGalleryController;
    studentDocuments: StudentDocumentController;
    cloDocuments: CloDocumentController;
    trainerBoard: BoardController;
    studentBoard: BoardController;
    studentCourses: StudentCourseController;
    receptionUsers: ReceptionUsersController;
    cloDashboard: CloDashboardController;
    cloTrainers: CloTrainerController;
    trainerDashboard: TrainerDashboardController;
    studentDashboard: StudentDashboardController;
    receptionDashboard: ReceptionDashboardController;
    competitions: CompetitionController;
    teams: TeamController;
    images: ImageController;
    parts: PartController;
    stock: StockController;
    orders: OrderController;
    inventoryProjects: InventoryProjectController;
    posts: PostController;
    ctoWork: CtoWorkController;
    engineer: EngineerController;
    client: ClientController;
    receptionTransport: ReceptionTransportController;
    managementTransport: ManagementTransportController;
    driverTransport: DriverController;
    studentTransport: StudentTransportController;
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
  const sessionRepo = new DrizzleSessionRepository(a.db);
  const attendanceRepo = new DrizzleAttendanceRepository(a.db);
  const moduleRepo = new DrizzleCourseModuleRepository(a.db);
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
    new SessionGroupActivity(sessionRepo, attendanceRepo),
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

  // Teaching: sessions and attendance
  const sessionService = new SessionService(
    sessionRepo,
    groupRepo,
    { sheetIdFor: async (sessionId) => (await attendanceRepo.findBySession(sessionId))?.id ?? null },
    silentSessionNotifier, // → notifications (phase 9)
    a.logger,
  );
  const attendanceService = new AttendanceService(attendanceRepo, sessionRepo, groupRepo, enrollmentRepo);

  // Teaching: modules, quizzes, assignments
  const courseModules = new CourseModuleService(
    moduleRepo,
    new DrizzleModuleProgressRepository(a.db),
    enrollmentRepo,
    new DrizzleUnitOfWork(a.db, (tx) => ({
      modules: new DrizzleCourseModuleRepository(tx),
      progress: new DrizzleModuleProgressRepository(tx),
      enrollments: new DrizzleEnrollmentRepository(tx),
    })),
  );
  const quizService = new QuizService(
    new DrizzleQuizRepository(a.db),
    {
      findById: async (id) => {
        const c = await courseRepo.findById(id);
        return c ? { id: c.id, instructorId: c.instructorId } : null;
      },
      idsWithInstructor: (userId) => courseRepo.idsWithInstructor(userId),
    },
    groupRepo,
    moduleRepo,
    enrollmentRepo,
    silentQuizNotifier, // → notifications (phase 9)
    a.logger,
  );
  const assignmentService = new AssignmentService(new DrizzleAssignmentRepository(a.db), enrollmentRepo, a.storage, env.SUPABASE_BUCKET);
  const taskService = new TaskService(
    new DrizzleTaskRepository(a.db),
    groupRepo,
    sessionRepo,
    a.storage,
    env.SUPABASE_BUCKET,
    silentTaskNotifier, // → notifications (phase 9)
    a.logger,
  );
  const resourceService = new ResourceService(
    new DrizzleResourceRepository(a.db),
    groupRepo,
    sessionRepo,
    courseRepo,
    a.storage,
    env.SUPABASE_BUCKET,
    silentResourceNotifier, // → notifications (phase 9)
  );
  const evaluationService = new EvaluationService(
    new DrizzleEvaluationRepository(a.db),
    groupRepo,
    sessionRepo,
    courseRepo,
    silentEvaluationNotifier, // → notifications (phase 9)
  );
  const certificateService = new CertificateService(new DrizzleCertificateRepository(a.db), groupRepo, courseRepo, leadRepo, a.pdf);
  const studentProjectRepo = new DrizzleStudentProjectRepository(a.db);
  const studentProjectService = new StudentProjectService(
    studentProjectRepo,
    groupRepo,
    a.storage,
    env.SUPABASE_BUCKET,
    silentProjectNotifier, // → notifications (phase 9)
  );
  const galleryService = new GalleryService(new DrizzleGalleryRepository(a.db), groupRepo, studentProjectRepo, a.storage, env.SUPABASE_BUCKET);
  const documentService = new DocumentService(new DrizzleDocumentRepository(a.db), a.storage, env.SUPABASE_BUCKET);
  const boardService = new BoardService(new DrizzleBoardRepository(a.db), groupRepo);
  const studentCourseService = new StudentCourseService(
    enrollmentRepo,
    groupRepo,
    sessionRepo,
    courseRepo,
    new DrizzleAttendanceRepository(a.db),
    new DrizzleCertificateRepository(a.db),
    new DrizzleEvaluationRepository(a.db),
    new DrizzleQuizRepository(a.db),
    new DrizzleResourceRepository(a.db),
    new DrizzleTaskRepository(a.db),
    env.JWT_SECRET,
  );
  // Dashboards (read-only figures across features)
  const dashboardRepo = new DrizzleDashboardRepository(a.db);
  const trainerDashboard = new TrainerDashboardService(
    groupRepo,
    sessionRepo,
    attendanceRepo,
    new DrizzleEvaluationRepository(a.db),
    new DrizzleResourceRepository(a.db),
    new SessionGroupActivity(sessionRepo, attendanceRepo),
    dashboardRepo,
  );
  const studentDashboard = new StudentDashboardService(
    enrollmentRepo,
    courseRepo,
    studentCourseService,
    new DrizzleQuizRepository(a.db),
    new DrizzleAssignmentRepository(a.db),
    receiptRepo,
  );
  const competitionService = new CompetitionService(new DrizzleCompetitionRepository(a.db), users);
  const imageService = new ImageService(new DrizzleImageRepository(a.db), a.storage, env.SUPABASE_IMAGES_BUCKET);
  const inventoryService = new InventoryService(new DrizzleInventoryRepository(a.db));
  // Internal work (CTO, engineers, clients)
  const workRepo = new DrizzleInternalWorkRepository(a.db);
  const internalWork = new InternalWorkService(
    workRepo,
    a.storage,
    env.SUPABASE_IMAGES_BUCKET,
    env.SUPABASE_CLIENT_MEDIA_BUCKET,
    silentWorkNotifier, // → notifications (phase 9)
  );
  const workHours = new WorkSessionService(workRepo);
  // Transport
  const transport = new TransportService(
    new DrizzleTransportRepository(a.db),
    new DrizzleSettingsRepository(a.db),
    env.GOOGLE_MAPS_API_KEY ? new GoogleRoadRouter(env.GOOGLE_MAPS_API_KEY) : estimateRouter,
    a.hasher,
    silentTransportNotifier, // → notifications (phase 9)
  );

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
      courses: new CourseController(courses, moduleRepo),
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
      trainerSessions: new SessionController(sessionService, groupRepo, 'trainer'),
      cloSessions: new SessionController(sessionService, groupRepo, 'clo'),
      attendance: new AttendanceController(attendanceService),
      studentModules: new StudentModuleController(courseModules),
      trainerQuizzes: new TrainerQuizController(quizService),
      studentQuizzes: new StudentQuizController(quizService),
      studentAssignments: new StudentAssignmentController(assignmentService),
      tasks: new TaskController(taskService),
      cloResources: new CloResourceController(resourceService),
      studentResources: new StudentResourceController(resourceService),
      trainerResources: new TrainerResourceController(resourceService),
      evaluationCriteria: new EvaluationCriteriaController(evaluationService),
      trainerEvaluations: new TrainerEvaluationController(evaluationService),
      cloEvaluations: new CloEvaluationController(evaluationService),
      studentEvaluations: new StudentEvaluationController(evaluationService),
      certificates: new CertificateController(certificateService),
      trainerProjects: new TrainerProjectController(studentProjectService),
      studentProjects: new StudentProjectController(studentProjectService),
      cloProjects: new CloProjectController(studentProjectService),
      trainerGallery: new TrainerGalleryController(galleryService),
      receptionGallery: new ReceptionGalleryController(galleryService),
      studentGallery: new StudentGalleryController(galleryService),
      cloGallery: new CloGalleryController(galleryService),
      studentDocuments: new StudentDocumentController(documentService),
      cloDocuments: new CloDocumentController(documentService),
      trainerBoard: new BoardController(boardService, 'trainer'),
      studentBoard: new BoardController(boardService, 'member'),
      studentCourses: new StudentCourseController(studentCourseService, env.BACKEND_URL, env.CLIENT_ORIGIN),
      receptionUsers: new ReceptionUsersController(new UserAdminService(users, a.hasher)),
      cloDashboard: new CloDashboardController(new CloDashboardService(dashboardRepo, groupRepo, courseRepo)),
      cloTrainers: new CloTrainerController(new CloTrainerService(dashboardRepo, users, groupRepo, courseRepo, a.hasher)),
      trainerDashboard: new TrainerDashboardController(trainerDashboard),
      studentDashboard: new StudentDashboardController(studentDashboard),
      receptionDashboard: new ReceptionDashboardController(new ReceptionDashboardService(dashboardRepo)),
      competitions: new CompetitionController(competitionService),
      teams: new TeamController(competitionService),
      images: new ImageController(imageService),
      parts: new PartController(inventoryService, imageService),
      stock: new StockController(inventoryService),
      orders: new OrderController(inventoryService),
      inventoryProjects: new InventoryProjectController(inventoryService),
      posts: new PostController(new PostService(new DrizzlePostRepository(a.db))),
      ctoWork: new CtoWorkController(internalWork, workHours, new CtoAnalyticsService(workRepo)),
      engineer: new EngineerController(internalWork, workHours),
      client: new ClientController(internalWork),
      receptionTransport: new ReceptionTransportController(transport),
      managementTransport: new ManagementTransportController(transport),
      driverTransport: new DriverController(new DriverService(transport)),
      studentTransport: new StudentTransportController(new StudentTransportService(transport)),
    },
  };
}
