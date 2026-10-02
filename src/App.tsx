import { Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import { Suspense, useEffect } from "react";
import { ErrorBoundary } from "./components/error/ErrorBoundary";
import { useAuth } from "./providers/AuthProvider";
import { ROUTES } from "./constants/routes.constants";
import { UserRole } from "./types/auth.types";
import MainLayout from "./layouts/MainLayout";
import { ScrollToTop } from "./components/layout/ScrollToTop";
import { lazyImport } from "./utils/lazyImport";
import { ToastProvider } from "./components/ui/Toast";
import { loadDashboardTranslations } from "./i18n";
import { ExternalRedirect } from "./components/auth/ExternalRedirect";
import { publicSite } from "./lib/publicSite";

/**
 * Layout for signed-in users. Also lazy-loads dashboard translations, since only
 * signed-in users need them. (Chat and live updates return with the mobile phase.)
 */
const DashboardLayout = () => {
  useEffect(() => {
    loadDashboardTranslations();
  }, []);

  return <MainLayout />;
};

// Common (shared authenticated) pages
const Dashboard = lazyImport(() => import("./pages/common/Dashboard"));
const Orders = lazyImport(() => import("./pages/common/Orders"));
const Projects = lazyImport(() => import("./pages/common/Projects"));
const Competitions = lazyImport(() => import("./pages/common/Competitions"));
const Teams = lazyImport(() => import("./pages/common/Teams"));
const Posts = lazyImport(() => import("./features/common/posts/PostsPage"));
const Inventory = lazyImport(() => import("./pages/common/Inventory"));
const NotFound = lazyImport(() => import("./pages/common/NotFound"));

// Student pages
const StudentDashboard = lazyImport(() => import("./features/student/overview/StudentOverviewPage"));
const StudentCourses = lazyImport(() => import("./features/student/courses/CoursesPage"));
const StudentCourseDetails = lazyImport(() => import("./features/student/courses/CoursePage"));
const StudentSessionDetails = lazyImport(() => import("./features/student/sessions/SessionPage"));
const StudentModuleViewer = lazyImport(() => import("./features/student/modules/ModulePage"));
const StudentQuiz = lazyImport(() => import("./features/student/quizzes/QuizPage"));
const StudentAssignment = lazyImport(() => import("./features/student/modules/AssignmentPage"));
const StudentAttendanceOverview = lazyImport(() => import("./features/student/attendance/AttendancePage"));
const StudentCourseAttendance = lazyImport(() => import("./features/student/attendance/CourseAttendancePage"));
const StudentPayments = lazyImport(() => import("./features/student/payments/PaymentsPage"));
const StudentSubscriptions = lazyImport(() => import("./features/student/subscriptions/SubscriptionsPage"));
const StudentGroupBoard = lazyImport(() => import("./features/student/board/BoardPage"));
const StudentTasks = lazyImport(() => import("./features/student/tasks/TasksPage"));
const StudentTaskDetail = lazyImport(() => import("./features/student/tasks/TaskPage"));
const StudentProjects = lazyImport(() => import("./features/student/projects/ProjectsPage"));
const StudentProjectDetail = lazyImport(() => import("./features/student/projects/ProjectPage"));
const StudentGallery = lazyImport(() => import("./features/student/gallery/GalleryPage"));
const StudentEvaluations = lazyImport(() => import("./features/student/evaluations/EvaluationsPage"));
const StudentCertificates = lazyImport(() => import("./features/student/certificates/CertificatesPage"));
const StudentDocuments = lazyImport(() => import("./features/student/documents/DocumentsPage"));
const StudentMissionPlanner = lazyImport(() => import("./features/student/mission/MissionPlannerPage"));

// Trainer pages
const TrainerDashboard = lazyImport(() => import("./features/trainer/overview/TrainerOverviewPage"));
const TrainerSchedule = lazyImport(() => import("./features/trainer/schedule/SchedulePage"));
const TrainerGroups = lazyImport(() => import("./features/trainer/groups/GroupsPage"));
const TrainerGroupDetail = lazyImport(() => import("./features/trainer/groups/GroupPage"));
const TrainerSessions = lazyImport(() => import("./features/trainer/sessions/SessionsPage"));
const TrainerCreateSession = lazyImport(() => import("./features/trainer/sessions/SessionFormPage"));
const TrainerEditSession = lazyImport(() => import("./features/trainer/sessions/SessionFormPage"));
const TrainerSessionDetail = lazyImport(() => import("./features/trainer/sessions/SessionPage"));
const TrainerTakeAttendance = lazyImport(() => import("./features/trainer/attendance/AttendancePage"));
const TrainerSessionEvaluations = lazyImport(() => import("./features/trainer/evaluations/SessionEvaluationsPage"));
const TrainerTasks = lazyImport(() => import("./features/trainer/tasks/TasksPage"));
const TrainerTaskBuilder = lazyImport(() => import("./features/trainer/tasks/TaskBuilderPage"));
const TrainerTaskSubmissions = lazyImport(() => import("./features/trainer/tasks/TaskSubmissionsPage"));
const TrainerProjects = lazyImport(() => import("./features/trainer/projects/ProjectsPage"));
const TrainerProjectDetail = lazyImport(() => import("./features/trainer/projects/ProjectPage"));
const TrainerProjectForm = lazyImport(() => import("./features/trainer/projects/ProjectFormPage"));
const TrainerGallery = lazyImport(() => import("./features/trainer/gallery/GalleryPage"));
const TrainerResources = lazyImport(() => import("./features/trainer/resources/ResourcesPage"));
const TrainerGroupBoard = lazyImport(() => import("./features/trainer/board/BoardPage"));

// Reception pages
const ReceptionDashboard = lazyImport(() => import("./features/reception/overview/ReceptionOverviewPage"));
const UserManagement = lazyImport(() => import("./features/reception/users/AccountsPage"));
const EnrollmentManagement = lazyImport(() => import("./features/reception/enrollments/EnrollmentsPage"));
const LeadManagement = lazyImport(() => import("./features/reception/leads/LeadsPage"));
const Schedule = lazyImport(() => import("./features/reception/schedule/SchedulePage"));
const ReceptionSubscriptions = lazyImport(() => import("./features/reception/subscriptions/SubscriptionsPage"));
const SessionRequests = lazyImport(() => import("./features/reception/sessions/SessionRequestsPage"));
const SessionReports = lazyImport(() => import("./features/reception/sessions/SessionReportsPage"));
const ContactManagement = lazyImport(() => import("./features/reception/contacts/ContactsPage"));
const ReceptionGallery = lazyImport(() => import("./features/reception/gallery/GalleryPage"));
const JobApplications = lazyImport(() => import("./features/reception/jobs/JobApplicationsPage"));
const TransportManagement = lazyImport(() => import("./features/reception/transport/TransportPage"));

// CLO pages
const CLODashboard = lazyImport(() => import("./features/clo/overview/CloOverviewPage"));
const CLOTrainers = lazyImport(() => import("./features/clo/trainers/TrainersPage"));
const CLOCourses = lazyImport(() => import("./features/clo/courses/CoursesPage"));
const CLOCoursePage = lazyImport(() => import("./features/clo/courses/CoursePage"));
const CLOCourseGroupRedirect = lazyImport(() => import("./features/clo/courses/CourseGroupRedirect"));
const CLOGroups = lazyImport(() => import("./features/clo/groups/GroupsPage"));
const CLOGroupPage = lazyImport(() => import("./features/clo/groups/GroupPage"));
const CLOSessions = lazyImport(() => import("./features/trainer/sessions/SessionsPage"));
const CLOCreateSession = lazyImport(() => import("./features/trainer/sessions/SessionFormPage"));
const CLOEditSession = lazyImport(() => import("./features/trainer/sessions/SessionFormPage"));
const CLOSessionDetail = lazyImport(() => import("./features/trainer/sessions/SessionPage"));
const CLOEvaluations = lazyImport(() => import("./features/clo/evaluations/EvaluationsPage"));
const CLOEvaluationCriteria = lazyImport(() => import("./features/clo/criteria/CriteriaPage"));
const CLOAttendance = lazyImport(() => import("./features/clo/attendance/AttendancePage"));
const CLOInterests = lazyImport(() => import("./features/clo/interests/InterestsPage"));
const CLOResourceManagement = lazyImport(() => import("./features/clo/resources/ResourcesPage"));
const CLOSubscriptionPlans = lazyImport(() => import("./features/clo/plans/PlansPage"));
const CLOTasks = lazyImport(() => import("./features/clo/tasks/CloTasksPage"));
const CLOTaskBuilder = lazyImport(() => import("./features/trainer/tasks/TaskBuilderPage"));
const CLOTaskResults = lazyImport(() => import("./features/trainer/tasks/TaskSubmissionsPage"));
const CLOGallery = lazyImport(() => import("./features/clo/gallery/GalleryPage"));
const CLOTrainingContent = lazyImport(() => import("./pages/clo/CLOTrainingContent"));
const CLOStudentDocuments = lazyImport(() => import("./features/clo/documents/DocumentsPage"));

// CTO pages
const CTODashboard = lazyImport(() => import("./features/cto/CtoOverviewPage"));
const CTOProjects = lazyImport(() => import("./features/cto/ProjectsPages"));
const CTOProjectDetail = lazyImport(() => import("./features/cto/CtoProjectPage"));
const CTOTasks = lazyImport(() => import("./features/cto/TasksPages"));
const CTODeadlines = lazyImport(() => import("./features/cto/CtoDeadlinesPage"));
const CTOTransport = lazyImport(() => import("./pages/cto/CTOTransport"));
const CTOWorkHours = lazyImport(() => import("./features/cto/WorkHoursPage"));

// Engineer pages
const EngineerDashboard = lazyImport(() => import("./features/engineer/EngineerOverviewPage"));
const MyTasks = lazyImport(() => import("./features/common/tasks/MyTasksPage"));
const MyWorkHours = lazyImport(() => import("./features/common/hours/MyHoursPage"));

// Client pages
const ClientDashboard = lazyImport(() => import("./features/client/ClientPages"));
const ClientProjectDetail = lazyImport(() => import("./features/client/ClientProjectPage"));
const ClientTasks = lazyImport(() => import("./features/client/ClientRequestsPage"));
const ClientTaskDetail = lazyImport(() => import("./features/client/ClientRequestPage"));

// Admin pages
const AdminDashboard = lazyImport(() => import("./pages/admin/AdminDashboard"));

/**
 * Component to show while loading a page
 */
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    {/* Loading... */}
  </div>
);

/**
 * Component to protect admin routes
 */
const AdminRoute = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user || user.role !== UserRole.ADMIN) {
    return (
      <Navigate to={ROUTES.DASHBOARD} state={{ from: location }} replace />
    );
  }

  return <Outlet />;
};

/**
 * Component to protect authenticated routes
 */
const ProtectedRoute = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <ExternalRedirect to={publicSite.login()} />;
  }

  // Redirect students to student dashboard if they try to access regular dashboard
  if (user?.role === UserRole.STUDENT && location.pathname === ROUTES.DASHBOARD) {
    return <Navigate to="/student" replace />;
  }

  // Redirect trainers/teachers to trainer dashboard if they try to access regular dashboard
  if ((user?.role === UserRole.TRAINER || user?.role === UserRole.TEACHER) && location.pathname === ROUTES.DASHBOARD) {
    return <Navigate to="/trainer" replace />;
  }

  // Redirect reception to reception dashboard if they try to access regular dashboard
  if (user?.role === UserRole.RECEPTION && location.pathname === ROUTES.DASHBOARD) {
    return <Navigate to="/reception" replace />;
  }

  // Redirect CLO to CLO dashboard if they try to access regular dashboard
  if (user?.role === UserRole.CLO && location.pathname === ROUTES.DASHBOARD) {
    return <Navigate to="/clo" replace />;
  }

  // Redirect social role to posts page if they try to access regular dashboard
  if (user?.role === UserRole.SOCIAL && location.pathname === ROUTES.DASHBOARD) {
    return <Navigate to="/posts" replace />;
  }

  // Redirect CTO to CTO dashboard if they try to access regular dashboard
  if (user?.role === UserRole.CTO && location.pathname === ROUTES.DASHBOARD) {
    return <Navigate to="/cto-internal/dashboard" replace />;
  }

  // Redirect Engineer to engineer dashboard if they try to access regular dashboard
  if (user?.role === UserRole.ENGINEER && location.pathname === ROUTES.DASHBOARD) {
    return <Navigate to="/engineer/dashboard" replace />;
  }

  // Redirect Client to client dashboard if they try to access regular dashboard
  if (user?.role === UserRole.CLIENT && location.pathname === ROUTES.DASHBOARD) {
    return <Navigate to="/client/dashboard" replace />;
  }

  // Prevent students from accessing non-student routes
  if (user?.role === UserRole.STUDENT) {
    const studentRoutes = ['/student', '/posts', '/profile', '/notifications', '/settings'];
    const isStudentRoute = studentRoutes.some(route => location.pathname.startsWith(route));

    if (!isStudentRoute) {
      return <Navigate to="/student" replace />;
    }
  }

  // Prevent trainers from accessing non-trainer routes (except common routes)
  if (user?.role === UserRole.TRAINER || user?.role === UserRole.TEACHER) {
    const trainerRoutes = ['/trainer', '/posts', '/profile', '/notifications', '/settings', '/my-tasks', '/my-hours'];
    const isTrainerRoute = trainerRoutes.some(route => location.pathname.startsWith(route));

    if (!isTrainerRoute) {
      return <Navigate to="/trainer" replace />;
    }
  }

  // Prevent reception from accessing non-reception routes (except common routes)
  if (user?.role === UserRole.RECEPTION) {
    const receptionRoutes = ['/reception', '/posts', '/profile', '/notifications', '/settings', '/my-tasks', '/my-hours'];
    const isReceptionRoute = receptionRoutes.some(route => location.pathname.startsWith(route));

    if (!isReceptionRoute) {
      return <Navigate to="/reception" replace />;
    }
  }

  // Prevent CLO from accessing non-CLO routes (except common routes)
  if (user?.role === UserRole.CLO) {
    const cloRoutes = ['/clo', '/posts', '/profile', '/notifications', '/settings', '/my-tasks', '/my-hours'];
    const isCLORoute = cloRoutes.some(route => location.pathname.startsWith(route));

    if (!isCLORoute) {
      return <Navigate to="/clo" replace />;
    }
  }

  // Prevent social role from accessing non-posts routes (except common routes)
  if (user?.role === UserRole.SOCIAL) {
    const socialRoutes = ['/posts', '/profile', '/notifications', '/settings', '/my-tasks', '/my-hours'];
    const isSocialRoute = socialRoutes.some(route => location.pathname.startsWith(route));

    if (!isSocialRoute) {
      return <Navigate to="/posts" replace />;
    }
  }

  // Prevent CTO from accessing non-CTO routes (except common routes)
  if (user?.role === UserRole.CTO) {
    const ctoRoutes = ['/cto-internal', '/posts', '/profile', '/notifications', '/settings'];
    const isCTORoute = ctoRoutes.some(route => location.pathname.startsWith(route));

    if (!isCTORoute) {
      return <Navigate to="/cto-internal/dashboard" replace />;
    }
  }

  // Prevent Engineer from accessing non-engineer routes (except common routes)
  if (user?.role === UserRole.ENGINEER) {
    const engineerRoutes = ['/engineer', '/my-tasks', '/my-hours', '/posts', '/profile', '/notifications', '/settings'];
    const isEngineerRoute = engineerRoutes.some(route => location.pathname.startsWith(route));

    if (!isEngineerRoute) {
      return <Navigate to="/engineer/dashboard" replace />;
    }
  }

  // Prevent Client from accessing anything but their own portal — no /posts,
  // no internal blog/CMS access, this is an external account.
  if (user?.role === UserRole.CLIENT) {
    const clientRoutes = ['/client', '/profile', '/notifications', '/settings'];
    const isClientRoute = clientRoutes.some(route => location.pathname.startsWith(route));

    if (!isClientRoute) {
      return <Navigate to="/client/dashboard" replace />;
    }
  }

  return <Outlet />;
};

/**
 * Component to protect student routes
 */
const StudentRoute = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (user?.role !== UserRole.STUDENT) {
    return <Navigate to={ROUTES.DASHBOARD} state={{ from: location }} replace />;
  }

  return <Outlet />;
};

/**
 * Component to protect trainer routes
 */
const TrainerRoute = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  // Accept both 'trainer' and 'teacher' roles
  if (user?.role !== UserRole.TRAINER && user?.role !== UserRole.TEACHER) {
    return <Navigate to={ROUTES.DASHBOARD} state={{ from: location }} replace />;
  }

  return <Outlet />;
};

/**
 * Component to protect reception routes
 * Reception staff can manage accounts, enrollments, and schedules
 */
const ReceptionRoute = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  // Accept 'reception', 'admin', and 'superadmin' roles
  if (user?.role !== UserRole.RECEPTION && user?.role !== UserRole.ADMIN && user?.role !== UserRole.SUPERADMIN) {
    return <Navigate to={ROUTES.DASHBOARD} state={{ from: location }} replace />;
  }

  return <Outlet />;
};

/**
 * Component to protect CLO routes
 * CLO (Chief Learning Officer) manages trainers, courses, groups, and analytics
 */
const CLORoute = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  // Accept 'clo', 'admin', and 'superadmin' roles
  if (user?.role !== UserRole.CLO && user?.role !== UserRole.ADMIN && user?.role !== UserRole.SUPERADMIN) {
    return <Navigate to={ROUTES.DASHBOARD} state={{ from: location }} replace />;
  }

  return <Outlet />;
};

/**
 * Component to protect CTO routes
 */
const CTORoute = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (user?.role !== UserRole.CTO && user?.role !== UserRole.ADMIN && user?.role !== UserRole.SUPERADMIN) {
    return <Navigate to={ROUTES.DASHBOARD} state={{ from: location }} replace />;
  }

  return <Outlet />;
};

/**
 * Component to protect Engineer routes
 */
const EngineerRoute = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (user?.role !== UserRole.ENGINEER && user?.role !== UserRole.ADMIN && user?.role !== UserRole.SUPERADMIN) {
    return <Navigate to={ROUTES.DASHBOARD} state={{ from: location }} replace />;
  }

  return <Outlet />;
};

/**
 * Component to protect Client routes — external accounts only, no staff bypass
 */
const ClientRoute = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (user?.role !== UserRole.CLIENT) {
    return <Navigate to={ROUTES.DASHBOARD} state={{ from: location }} replace />;
  }

  return <Outlet />;
};

/**
 * Main App component that sets up routing
 */
const App = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ScrollToTop />
        <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* The public site (home, services, login…) is the Next.js app on the same domain */}
          <Route path="/" element={<ExternalRedirect to={publicSite.home()} />} />

          {/* Protected routes - WITH MainLayout (includes sidebar/navbar) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              {/* Regular Dashboard (Non-students) */}
              <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
              <Route path={ROUTES.ORDERS} element={<Orders />} />
              <Route path={ROUTES.PROJECTS} element={<Projects />} />
              <Route path={ROUTES.COMPETITIONS} element={<Competitions />} />
              <Route path={ROUTES.TEAMS} element={<Teams />} />
              <Route path={ROUTES.POSTS} element={<Posts />} />
              <Route path={ROUTES.INVENTORY} element={<Inventory />} />

              {/* Student Dashboard routes (Student role only) */}
              <Route element={<StudentRoute />}>
                <Route path="/student" element={<StudentDashboard />} />
                <Route path="/student/courses" element={<StudentCourses />} />
                <Route path="/student/courses/:courseId" element={<StudentCourseDetails />} />
                <Route path="/student/sessions/:sessionId" element={<StudentSessionDetails />} />
                <Route path="/student/modules/:moduleId" element={<StudentModuleViewer />} />
                <Route path="/student/quizzes/:quizId" element={<StudentQuiz />} />
                <Route path="/student/assignments/:assignmentId" element={<StudentAssignment />} />
                <Route path="/student/tasks" element={<StudentTasks />} />
                <Route path="/student/tasks/:taskId" element={<StudentTaskDetail />} />
                <Route path="/student/projects" element={<StudentProjects />} />
                <Route path="/student/projects/:projectId" element={<StudentProjectDetail />} />
                <Route path="/student/gallery" element={<StudentGallery />} />
                <Route path="/student/evaluations" element={<StudentEvaluations />} />
                {/* Student attendance pages were switched off before the redesign; the new ones are ready in features/student/attendance */}
                {/* <Route path="/student/attendance" element={<StudentAttendanceOverview />} /> */}
                {/* <Route path="/student/attendance/:courseId" element={<StudentCourseAttendance />} /> */}
                <Route path="/student/payments" element={<StudentPayments />} />
                <Route path="/student/payments/:courseId" element={<StudentPayments />} />
                <Route path="/student/subscriptions" element={<StudentSubscriptions />} />
                <Route path="/student/certificates" element={<StudentCertificates />} />
                <Route path="/student/documents" element={<StudentDocuments />} />
                <Route path="/student/mission-planner" element={<StudentMissionPlanner />} />
                <Route path="/student/groups/:groupId/board" element={<StudentGroupBoard />} />
              </Route>

              {/* Trainer Dashboard routes (Trainer role only) */}
              <Route element={<TrainerRoute />}>
                <Route path="/trainer" element={<TrainerDashboard />} />
                <Route path="/trainer/schedule" element={<TrainerSchedule />} />
                <Route path="/trainer/groups" element={<TrainerGroups />} />
                {/* Group creation removed - now CLO only */}
                <Route path="/trainer/groups/:groupId" element={<TrainerGroupDetail />} />
                <Route path="/trainer/sessions" element={<TrainerSessions />} />
                <Route path="/trainer/sessions/new" element={<TrainerCreateSession />} />
                <Route path="/trainer/sessions/:sessionId/edit" element={<TrainerEditSession />} />
                <Route path="/trainer/sessions/:sessionId" element={<TrainerSessionDetail />} />
                <Route path="/trainer/attendance" element={<TrainerTakeAttendance />} />
                <Route path="/trainer/session/:sessionId/evaluations" element={<TrainerSessionEvaluations />} />
                <Route path="/trainer/tasks" element={<TrainerTasks />} />
                <Route path="/trainer/tasks/new" element={<TrainerTaskBuilder />} />
                <Route path="/trainer/tasks/:taskId/edit" element={<TrainerTaskBuilder />} />
                <Route path="/trainer/tasks/:taskId/submissions" element={<TrainerTaskSubmissions />} />
                <Route path="/trainer/projects" element={<TrainerProjects />} />
                <Route path="/trainer/projects/new" element={<TrainerProjectForm />} />
                <Route path="/trainer/projects/:projectId/edit" element={<TrainerProjectForm />} />
                <Route path="/trainer/projects/:projectId" element={<TrainerProjectDetail />} />
                <Route path="/trainer/gallery" element={<TrainerGallery />} />
                <Route path="/trainer/resources" element={<TrainerResources />} />
                <Route path="/trainer/groups/:groupId/board" element={<TrainerGroupBoard />} />
              </Route>

              {/* Reception Dashboard routes (Reception role only) */}
              <Route element={<ReceptionRoute />}>
                <Route path="/reception" element={<ReceptionDashboard />} />
                <Route path="/reception/users" element={<UserManagement />} />
                <Route path="/reception/enrollments" element={<EnrollmentManagement />} />
                <Route path="/reception/leads" element={<LeadManagement />} />
                <Route path="/reception/schedule" element={<Schedule />} />
                <Route path="/reception/subscriptions" element={<ReceptionSubscriptions />} />
                <Route path="/reception/session-requests" element={<SessionRequests />} />
                <Route path="/reception/session-reports" element={<SessionReports />} />
                <Route path="/reception/contacts" element={<ContactManagement />} />
                <Route path="/reception/gallery" element={<ReceptionGallery />} />
                <Route path="/reception/job-applications" element={<JobApplications />} />
                <Route path="/reception/transport" element={<TransportManagement />} />
              </Route>

              {/* CLO routes (Chief Learning Officer role only) */}
              <Route element={<CLORoute />}>
                <Route path="/clo" element={<CLODashboard />} />
                <Route path="/clo/trainers" element={<CLOTrainers />} />
                <Route path="/clo/courses" element={<CLOCourses />} />
                <Route path="/clo/courses/:courseId" element={<CLOCoursePage />} />
                <Route path="/clo/courses/:courseId/:groupId" element={<CLOCourseGroupRedirect />} />
                <Route path="/clo/groups" element={<CLOGroups />} />
                <Route path="/clo/groups/:groupId" element={<CLOGroupPage />} />
                <Route path="/clo/sessions" element={<CLOSessions />} />
                <Route path="/clo/sessions/new" element={<CLOCreateSession />} />
                <Route path="/clo/sessions/:sessionId/edit" element={<CLOEditSession />} />
                <Route path="/clo/sessions/:sessionId" element={<CLOSessionDetail />} />
                <Route path="/clo/evaluations" element={<CLOEvaluations />} />
                <Route path="/clo/evaluation-criteria" element={<CLOEvaluationCriteria />} />
                <Route path="/clo/attendance" element={<CLOAttendance />} />
                <Route path="/clo/interests" element={<CLOInterests />} />
                <Route path="/clo/resources" element={<CLOResourceManagement />} />
                <Route path="/clo/subscription-plans" element={<CLOSubscriptionPlans />} />
                <Route path="/clo/tasks" element={<CLOTasks />} />
                <Route path="/clo/tasks/new" element={<CLOTaskBuilder />} />
                <Route path="/clo/tasks/:taskId/edit" element={<CLOTaskBuilder />} />
                <Route path="/clo/tasks/:taskId/results" element={<CLOTaskResults />} />
                <Route path="/clo/gallery" element={<CLOGallery />} />
                <Route path="/clo/training-content" element={<CLOTrainingContent />} />
                <Route path="/clo/documents" element={<CLOStudentDocuments />} />
              </Route>

              {/* CTO routes */}
              <Route element={<CTORoute />}>
                <Route path="/cto-internal/dashboard" element={<CTODashboard />} />
                <Route path="/cto-internal/projects" element={<CTOProjects />} />
                <Route path="/cto-internal/projects/new" element={<CTOProjects />} />
                <Route path="/cto-internal/projects/:id" element={<CTOProjectDetail />} />
                <Route path="/cto-internal/projects/:parentId/sub/:id" element={<CTOProjectDetail />} />
                <Route path="/cto-internal/tasks" element={<CTOTasks />} />
                <Route path="/cto-internal/deadlines" element={<CTODeadlines />} />
                <Route path="/cto-internal/transport" element={<CTOTransport />} />
                <Route path="/cto-internal/work-hours" element={<CTOWorkHours />} />
              </Route>

              {/* My Tasks — accessible to all assignable staff roles */}
              <Route path="/my-tasks" element={<MyTasks />} />

              {/* My Work Hours — accessible to all assignable staff roles */}
              <Route path="/my-hours" element={<MyWorkHours />} />

              {/* Engineer routes */}
              <Route element={<EngineerRoute />}>
                <Route path="/engineer/dashboard" element={<EngineerDashboard />} />
                {/* Tasks and deadlines live on the shared My tasks page */}
                <Route path="/engineer/tasks" element={<Navigate to="/my-tasks" replace />} />
                <Route path="/engineer/deadlines" element={<Navigate to="/my-tasks" replace />} />
              </Route>

              {/* Client routes */}
              <Route element={<ClientRoute />}>
                <Route path="/client/dashboard" element={<ClientDashboard />} />
                <Route path="/client/projects/:id" element={<ClientProjectDetail />} />
                <Route path="/client/tasks" element={<ClientTasks />} />
                <Route path="/client/tasks/:id" element={<ClientTaskDetail />} />
              </Route>

              {/* Admin-only routes */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>
            </Route>
          </Route>

          {/* 404 - Not Found */}
          <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
