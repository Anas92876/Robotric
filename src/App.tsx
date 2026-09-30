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
const Posts = lazyImport(() => import("./pages/common/Posts"));
const Inventory = lazyImport(() => import("./pages/common/Inventory"));
const NotFound = lazyImport(() => import("./pages/common/NotFound"));

// Student pages
const StudentDashboard = lazyImport(() => import("./pages/student/StudentDashboard"));
const StudentCourses = lazyImport(() => import("./pages/student/StudentCourses"));
const StudentCourseDetails = lazyImport(() => import("./pages/student/StudentCourseDetails"));
const StudentSessionDetails = lazyImport(() => import("./pages/student/StudentSessionDetails"));
const StudentModuleViewer = lazyImport(() => import("./pages/student/StudentModuleViewer"));
const StudentQuiz = lazyImport(() => import("./pages/student/StudentQuiz"));
const StudentAssignment = lazyImport(() => import("./pages/student/StudentAssignment"));
const StudentAttendanceOverview = lazyImport(() => import("./pages/student/StudentAttendanceOverview"));
const StudentCourseAttendance = lazyImport(() => import("./pages/student/StudentCourseAttendance"));
const StudentPayments = lazyImport(() => import("./pages/student/StudentPayments"));
const StudentSubscriptions = lazyImport(() => import("./pages/student/StudentSubscriptions"));
const StudentGroupBoard = lazyImport(() => import("./pages/student/StudentGroupBoard"));
const StudentTasks = lazyImport(() => import("./pages/student/StudentTasks"));
const StudentTaskDetail = lazyImport(() => import("./pages/student/StudentTaskDetail"));
const StudentProjects = lazyImport(() => import("./pages/student/StudentProjects"));
const StudentProjectDetail = lazyImport(() => import("./pages/student/StudentProjectDetail"));
const StudentGallery = lazyImport(() => import("./pages/student/StudentGallery"));
const StudentEvaluations = lazyImport(() => import("./pages/student/StudentEvaluations"));
const StudentCertificates = lazyImport(() => import("./pages/student/StudentCertificates"));
const StudentDocuments = lazyImport(() => import("./pages/student/StudentDocuments"));
const StudentMissionPlanner = lazyImport(() => import("./pages/student/StudentMissionPlanner"));

// Trainer pages
const TrainerDashboard = lazyImport(() => import("./pages/trainer/TrainerDashboard"));
const TrainerSchedule = lazyImport(() => import("./pages/trainer/TrainerSchedule"));
const TrainerGroups = lazyImport(() => import("./pages/trainer/TrainerGroups"));
const TrainerGroupDetail = lazyImport(() => import("./pages/trainer/TrainerGroupDetail"));
const TrainerSessions = lazyImport(() => import("./pages/trainer/TrainerSessions"));
const TrainerCreateSession = lazyImport(() => import("./pages/trainer/TrainerCreateSession"));
const TrainerEditSession = lazyImport(() => import("./pages/trainer/TrainerEditSession"));
const TrainerSessionDetail = lazyImport(() => import("./pages/trainer/TrainerSessionDetail"));
const TrainerTakeAttendance = lazyImport(() => import("./pages/trainer/TrainerTakeAttendance"));
const TrainerSessionEvaluations = lazyImport(() => import("./pages/trainer/TrainerSessionEvaluations"));
const TrainerTasks = lazyImport(() => import("./pages/trainer/TrainerTasks"));
const TrainerTaskBuilder = lazyImport(() => import("./pages/trainer/TrainerTaskBuilder"));
const TrainerTaskSubmissions = lazyImport(() => import("./pages/trainer/TrainerTaskSubmissions"));
const TrainerProjects = lazyImport(() => import("./pages/trainer/TrainerProjects"));
const TrainerProjectDetail = lazyImport(() => import("./pages/trainer/TrainerProjectDetail"));
const TrainerGallery = lazyImport(() => import("./pages/trainer/TrainerGallery"));
const TrainerResources = lazyImport(() => import("./pages/trainer/TrainerResources"));
const TrainerGroupBoard = lazyImport(() => import("./pages/trainer/TrainerGroupBoard"));

// Reception pages
const ReceptionDashboard = lazyImport(() => import("./features/reception/overview/ReceptionOverviewPage"));
const UserManagement = lazyImport(() => import("./features/reception/users/AccountsPage"));
const EnrollmentManagement = lazyImport(() => import("./pages/reception/EnrollmentManagement"));
const LeadManagement = lazyImport(() => import("./pages/reception/LeadManagement"));
const Schedule = lazyImport(() => import("./pages/reception/Schedule"));
const ReceptionSubscriptions = lazyImport(() => import("./pages/reception/Subscriptions"));
const SessionRequests = lazyImport(() => import("./pages/reception/SessionRequests"));
const SessionReports = lazyImport(() => import("./pages/reception/SessionReports"));
const ContactManagement = lazyImport(() => import("./pages/reception/ContactManagement"));
const ReceptionGallery = lazyImport(() => import("./pages/reception/ReceptionGallery"));
const JobApplications = lazyImport(() => import("./pages/reception/JobApplications"));
const TransportManagement = lazyImport(() => import("./pages/reception/TransportManagement"));

// CLO pages
const CLODashboard = lazyImport(() => import("./pages/clo/CLODashboard"));
const CLOTrainers = lazyImport(() => import("./pages/clo/CLOTrainers"));
const CLOCourses = lazyImport(() => import("./pages/clo/CLOCourses"));
const CLOGroups = lazyImport(() => import("./pages/clo/CLOGroups"));
const CLOSessions = lazyImport(() => import("./pages/clo/CLOSessions"));
const CLOCreateSession = lazyImport(() => import("./pages/clo/CLOCreateSession"));
const CLOEditSession = lazyImport(() => import("./pages/clo/CLOEditSession"));
const CLOSessionDetail = lazyImport(() => import("./pages/clo/CLOSessionDetail"));
const CLOEvaluations = lazyImport(() => import("./pages/clo/CLOEvaluations"));
const CLOEvaluationCriteria = lazyImport(() => import("./pages/clo/CLOEvaluationCriteria"));
const CLOAttendance = lazyImport(() => import("./pages/clo/CLOAttendance"));
const CLOInterests = lazyImport(() => import("./pages/clo/CLOInterests"));
const CLOResourceManagement = lazyImport(() => import("./pages/clo/CLOResourceManagement"));
const CLOSubscriptionPlans = lazyImport(() => import("./pages/clo/CLOSubscriptionPlans"));
const CLOTasks = lazyImport(() => import("./pages/clo/CLOTasks"));
const CLOTaskBuilder = lazyImport(() => import("./pages/clo/CLOTaskBuilder"));
const CLOTaskResults = lazyImport(() => import("./pages/clo/CLOTaskResults"));
const CLOGallery = lazyImport(() => import("./pages/clo/CLOGallery"));
const CLOTrainingContent = lazyImport(() => import("./pages/clo/CLOTrainingContent"));
const CLOStudentDocuments = lazyImport(() => import("./pages/clo/CLOStudentDocuments"));

// CTO pages
const CTODashboard = lazyImport(() => import("./pages/cto/CTODashboard"));
const CTOProjects = lazyImport(() => import("./pages/cto/CTOProjects"));
const CTOProjectDetail = lazyImport(() => import("./pages/cto/CTOProjectDetail"));
const CTOTasks = lazyImport(() => import("./pages/cto/CTOTasks"));
const CTODeadlines = lazyImport(() => import("./pages/cto/CTODeadlines"));
const CTOTransport = lazyImport(() => import("./pages/cto/CTOTransport"));
const CTOWorkHours = lazyImport(() => import("./pages/cto/CTOWorkHours"));

// Engineer pages
const EngineerDashboard = lazyImport(() => import("./pages/engineer/EngineerDashboard"));
const EngineerTasks = lazyImport(() => import("./pages/engineer/EngineerTasks"));
const EngineerDeadlines = lazyImport(() => import("./pages/engineer/EngineerDeadlines"));
const MyTasks = lazyImport(() => import("./pages/common/MyTasks"));
const MyWorkHours = lazyImport(() => import("./pages/common/MyWorkHours"));

// Client pages
const ClientDashboard = lazyImport(() => import("./pages/client/ClientDashboard"));
const ClientProjectDetail = lazyImport(() => import("./pages/client/ClientProjectDetail"));
const ClientTasks = lazyImport(() => import("./pages/client/ClientTasks"));
const ClientTaskDetail = lazyImport(() => import("./pages/client/ClientTaskDetail"));

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
                <Route path="/trainer/projects/new" element={<TrainerProjectDetail />} />
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
                <Route path="/clo/courses/:courseId" element={<CLOCourses />} />
                <Route path="/clo/courses/:courseId/:groupId" element={<CLOCourses />} />
                <Route path="/clo/groups" element={<CLOGroups />} />
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
                <Route path="/engineer/tasks" element={<EngineerTasks />} />
                <Route path="/engineer/deadlines" element={<EngineerDeadlines />} />
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
