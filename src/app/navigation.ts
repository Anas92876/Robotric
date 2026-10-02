import type { LucideIcon } from 'lucide-react';
import {
  Award, BookOpen, Briefcase, Bus, Calendar, CalendarClock, ClipboardCheck, ClipboardList, Compass,
  CreditCard, FileCheck, FileText, FolderKanban, FolderOpen, GraduationCap, Home, Image, Inbox, Layers, LayoutDashboard,
  ListTodo, Mail, Package, Shield, ShoppingCart, Sparkles, Star, Tag, Timer, Trophy, UserCog, UserPlus, Users, Wrench,
} from 'lucide-react';

/**
 * The single source of truth for the dashboard menu: which pages each role sees,
 * grouped into sections. Labels are translated with `dashboardNav:<id>` (the
 * `label` is the English fallback); section titles with `dashboardNav:section.<id>`.
 */
export interface NavLink {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  /** Students only see it when they have WRO access. */
  requiresWro?: boolean;
}

export interface NavSection {
  id: string;
  label: string;
  items: NavLink[];
  /** Admin department groups start collapsed unless the current page is inside. */
  collapsible?: boolean;
}

// ---- Links, defined once and reused across roles ---------------------------
const L = {
  dashboard: { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: Home },
  adminPanel: { id: 'admin-panel', label: 'Admin Panel', path: '/admin', icon: Shield },
  users: { id: 'reception-users', label: 'User Management', path: '/reception/users', icon: UserCog },

  receptionHome: { id: 'reception-dashboard', label: 'Overview', path: '/reception', icon: LayoutDashboard },
  enrollments: { id: 'reception-enrollments', label: 'Enrollments', path: '/reception/enrollments', icon: ClipboardCheck },
  leads: { id: 'reception-leads', label: 'Leads', path: '/reception/leads', icon: UserPlus },
  receptionSchedule: { id: 'reception-schedule', label: 'Schedule', path: '/reception/schedule', icon: Calendar },
  subscriptions: { id: 'reception-subscriptions', label: 'Subscriptions', path: '/reception/subscriptions', icon: CreditCard },
  sessionRequests: { id: 'reception-session-requests', label: 'Session Requests', path: '/reception/session-requests', icon: Inbox },
  sessionReports: { id: 'reception-session-reports', label: 'Session Reports', path: '/reception/session-reports', icon: FileText },
  transport: { id: 'reception-transport', label: 'Transport', path: '/reception/transport', icon: Bus },
  contacts: { id: 'reception-contacts', label: 'Contact Messages', path: '/reception/contacts', icon: Mail },
  jobApplications: { id: 'reception-job-applications', label: 'Job Applications', path: '/reception/job-applications', icon: Briefcase },
  receptionGallery: { id: 'reception-gallery', label: 'Gallery', path: '/reception/gallery', icon: Image },
  posts: { id: 'reception-posts', label: 'Blog Posts', path: '/posts', icon: FileText },

  cloHome: { id: 'clo-dashboard', label: 'Overview', path: '/clo', icon: LayoutDashboard },
  courses: { id: 'clo-courses', label: 'Courses', path: '/clo/courses', icon: BookOpen },
  groups: { id: 'clo-groups', label: 'Groups', path: '/clo/groups', icon: Users },
  cloSessions: { id: 'clo-sessions', label: 'Sessions', path: '/clo/sessions', icon: CalendarClock },
  trainers: { id: 'clo-trainers', label: 'Trainers', path: '/clo/trainers', icon: GraduationCap },
  evaluations: { id: 'clo-evaluations', label: 'Evaluations', path: '/clo/evaluations', icon: Star },
  criteria: { id: 'clo-evaluation-criteria', label: 'Evaluation Criteria', path: '/clo/evaluation-criteria', icon: ClipboardList },
  attendance: { id: 'clo-attendance', label: 'Attendance', path: '/clo/attendance', icon: ClipboardCheck },
  resources: { id: 'clo-resources', label: 'Resources', path: '/clo/resources', icon: FolderOpen },
  cloTasks: { id: 'clo-tasks', label: 'Tasks', path: '/clo/tasks', icon: ListTodo },
  trainingContent: { id: 'clo-training-content', label: 'Training Page Content', path: '/clo/training-content', icon: Layers },
  cloGallery: { id: 'clo-gallery', label: 'Gallery', path: '/clo/gallery', icon: Image },
  wroDocuments: { id: 'clo-documents', label: 'WRO Documents', path: '/clo/documents', icon: FileCheck },
  interests: { id: 'clo-interests', label: 'Interests', path: '/clo/interests', icon: Tag },
  plans: { id: 'clo-subscription-plans', label: 'Subscription Plans', path: '/clo/subscription-plans', icon: CreditCard },

  ctoHome: { id: 'cto-dashboard', label: 'Overview', path: '/cto-internal/dashboard', icon: LayoutDashboard },
  ctoProjects: { id: 'cto-projects', label: 'Projects', path: '/cto-internal/projects', icon: FolderKanban },
  ctoTasks: { id: 'cto-tasks', label: 'Tasks', path: '/cto-internal/tasks', icon: ListTodo },
  deadlines: { id: 'cto-deadlines', label: 'Deadlines', path: '/cto-internal/deadlines', icon: CalendarClock },
  ctoTransport: { id: 'cto-transport', label: 'Transport', path: '/cto-internal/transport', icon: Bus },
  workHours: { id: 'cto-work-hours', label: 'Work Hours', path: '/cto-internal/work-hours', icon: Timer },

  inventory: { id: 'inventory', label: 'Inventory', path: '/inventory', icon: Package },
  orders: { id: 'orders', label: 'Orders', path: '/orders', icon: ShoppingCart },
  projects: { id: 'projects', label: 'Projects', path: '/projects', icon: Wrench },
  competitions: { id: 'competitions', label: 'Competitions', path: '/competitions', icon: Trophy },
  teams: { id: 'teams', label: 'Teams', path: '/teams', icon: Users },

  myTasks: { id: 'my-tasks', label: 'My Tasks', path: '/my-tasks', icon: ListTodo },
  myHours: { id: 'my-hours', label: 'My Work Hours', path: '/my-hours', icon: Timer },

  studentHome: { id: 'student-dashboard', label: 'My Dashboard', path: '/student', icon: Home },
  studentCourses: { id: 'student-courses', label: 'My Courses', path: '/student/courses', icon: BookOpen },
  studentTasks: { id: 'student-tasks', label: 'Tasks', path: '/student/tasks', icon: ListTodo },
  studentProjects: { id: 'student-projects', label: 'My Projects', path: '/student/projects', icon: FolderOpen },
  studentEvaluations: { id: 'student-evaluations', label: 'My Evaluations', path: '/student/evaluations', icon: Star },
  certificates: { id: 'student-certificates', label: 'Certificates', path: '/student/certificates', icon: Award },
  studentPayments: { id: 'student-payments', label: 'Payments', path: '/student/payments', icon: CreditCard },
  studentSubscriptions: { id: 'student-subscriptions', label: 'Subscriptions', path: '/student/subscriptions', icon: Sparkles },
  studentGallery: { id: 'student-gallery', label: 'Gallery', path: '/student/gallery', icon: Image },
  studentDocuments: { id: 'student-documents', label: 'WRO Documents', path: '/student/documents', icon: FileCheck, requiresWro: true },
  missionPlanner: { id: 'student-mission-planner', label: 'Mission Planner', path: '/student/mission-planner', icon: Compass },

  trainerHome: { id: 'trainer-dashboard', label: 'Dashboard', path: '/trainer', icon: Home },
  trainerSchedule: { id: 'trainer-schedule', label: 'Schedule', path: '/trainer/schedule', icon: Calendar },
  trainerGroups: { id: 'trainer-groups', label: 'My Groups', path: '/trainer/groups', icon: Users },
  trainerSessions: { id: 'trainer-sessions', label: 'Sessions', path: '/trainer/sessions', icon: CalendarClock },
  trainerTasks: { id: 'trainer-tasks', label: 'Tasks', path: '/trainer/tasks', icon: ListTodo },
  trainerProjects: { id: 'trainer-projects', label: 'Student Projects', path: '/trainer/projects', icon: FolderOpen },
  trainerResources: { id: 'trainer-resources', label: 'Resources', path: '/trainer/resources', icon: BookOpen },
  trainerGallery: { id: 'trainer-gallery', label: 'Gallery', path: '/trainer/gallery', icon: Image },

  engineerHome: { id: 'engineer-dashboard', label: 'Dashboard', path: '/engineer/dashboard', icon: Home },
  engineerTasks: { id: 'engineer-tasks', label: 'Tasks', path: '/engineer/tasks', icon: ListTodo },
  engineerDeadlines: { id: 'engineer-deadlines', label: 'Deadlines', path: '/engineer/deadlines', icon: CalendarClock },

  clientHome: { id: 'client-dashboard', label: 'Dashboard', path: '/client/dashboard', icon: Home },
  clientTasks: { id: 'client-tasks', label: 'My Requests', path: '/client/tasks', icon: ClipboardList },
} satisfies Record<string, NavLink>;

const section = (id: string, label: string, items: NavLink[], collapsible = false): NavSection => ({ id, label, items, collapsible });

// ---- Sections per role --------------------------------------------------------
const reception: NavSection[] = [
  section('overview', 'Overview', [L.receptionHome]),
  section('people', 'Students & people', [L.users, L.enrollments, L.leads]),
  section('scheduling', 'Scheduling', [L.receptionSchedule, L.subscriptions, L.sessionRequests, L.sessionReports]),
  section('operations', 'Operations', [L.transport]),
  section('communication', 'Communication', [L.contacts, L.jobApplications, L.receptionGallery, L.posts]),
  section('my-work', 'My work', [L.myTasks, L.myHours]),
];

const clo: NavSection[] = [
  section('overview', 'Overview', [L.cloHome]),
  section('teaching', 'Teaching', [L.courses, L.groups, L.cloSessions, L.trainers]),
  section('quality', 'Quality', [L.evaluations, L.criteria, L.attendance]),
  section('content', 'Content', [L.resources, L.cloTasks, L.trainingContent, L.cloGallery, L.wroDocuments]),
  section('settings', 'Settings', [L.interests, L.plans]),
  section('my-work', 'My work', [L.myTasks, L.myHours]),
];

const cto: NavSection[] = [
  section('overview', 'Overview', [L.ctoHome]),
  section('work', 'Work', [L.ctoProjects, L.ctoTasks, L.deadlines]),
  section('operations', 'Operations', [L.ctoTransport, L.workHours]),
];

const operations = section('operations', 'Operations', [L.inventory, L.orders, L.projects, L.competitions, L.teams, L.posts]);

const admin: NavSection[] = [
  section('overview', 'Overview', [L.dashboard, L.adminPanel]),
  section('administration', 'Administration', [L.users]),
  section('dept-reception', 'Reception', reception.flatMap((s) => s.items).filter((i) => i !== L.users && i !== L.posts && i !== L.myTasks && i !== L.myHours), true),
  section('dept-learning', 'Learning (CLO)', clo.flatMap((s) => s.items).filter((i) => i !== L.myTasks && i !== L.myHours), true),
  section('dept-technical', 'Technical (CTO)', cto.flatMap((s) => s.items), true),
  operations,
];

const trainer: NavSection[] = [
  section('overview', 'Overview', [L.trainerHome, L.trainerSchedule]),
  section('teaching', 'Teaching', [L.trainerGroups, L.trainerSessions, L.trainerTasks, L.trainerProjects, L.trainerResources, L.trainerGallery]),
  section('my-work', 'My work', [L.myTasks, L.myHours]),
];

export const NAVIGATION: Record<string, NavSection[]> = {
  admin,
  superadmin: admin,
  reception,
  clo,
  cto,
  trainer,
  teacher: trainer,
  student: [
    section('overview', 'Overview', [L.studentHome]),
    section('learning', 'Learning', [L.studentCourses, L.studentTasks, L.studentProjects, L.studentEvaluations, L.certificates]),
    section('account', 'Account', [L.studentPayments, L.studentSubscriptions]),
    section('more', 'More', [L.studentGallery, L.studentDocuments, L.missionPlanner]),
  ],
  engineer: [
    section('overview', 'Overview', [L.engineerHome]),
    section('my-work', 'My work', [L.myTasks, L.myHours]),
  ],
  client: [section('overview', 'Overview', [L.clientHome, L.clientTasks])],
  social: [section('content', 'Content', [L.posts]), section('my-work', 'My work', [L.myTasks, L.myHours])],
  judge: [section('overview', 'Overview', [L.dashboard, L.competitions])],
  editor: [section('overview', 'Overview', [L.dashboard, L.posts])],
  organizer: [section('overview', 'Overview', [L.dashboard, L.competitions])],
  team_lead: [section('overview', 'Overview', [L.dashboard]), operations],
  member: [section('overview', 'Overview', [L.dashboard, L.orders, L.projects, L.competitions, L.teams])],
};

/** English role names; translated with `dashboardNav:role.<role>`. */
export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', superadmin: 'Super Admin', reception: 'Reception', clo: 'CLO', cto: 'CTO', trainer: 'Trainer', teacher: 'Teacher',
  student: 'Student', engineer: 'Programmer', client: 'Client', social: 'Social', judge: 'Judge', editor: 'Editor',
  organizer: 'Organizer', driver: 'Driver', team_lead: 'Team Lead', member: 'Member',
};

/** Menu for a role; students without WRO access don't see WRO-only links. */
export function navigationFor(role: string | undefined, opts: { wroAccess?: boolean } = {}): NavSection[] {
  const sections = (role && NAVIGATION[role]) || [];
  return sections
    .map((s) => ({ ...s, items: s.items.filter((i) => !i.requiresWro || opts.wroAccess) }))
    .filter((s) => s.items.length > 0);
}

/** The longest menu path that the current URL is inside (so /reception/users doesn't also light up /reception). */
/** Pages that sit outside their menu item's path, mapped to the item that should stay highlighted. */
const PARENT: [prefix: string, item: string][] = [
  ['/student/sessions', '/student/courses'],
  ['/student/modules', '/student/courses'],
  ['/student/quizzes', '/student/courses'],
  ['/student/assignments', '/student/courses'],
  ['/student/groups', '/student/courses'],
  ['/student/attendance', '/student/courses'],
  ['/trainer/session/', '/trainer/sessions'],
  ['/trainer/attendance', '/trainer/sessions'],
];

export function activePath(pathname: string, sections: NavSection[]): string | undefined {
  const parent = PARENT.find(([p]) => pathname.startsWith(p))?.[1];
  if (parent && sections.some((s) => s.items.some((i) => i.path === parent))) pathname = parent;
  return sections
    .flatMap((s) => s.items.map((i) => i.path))
    .filter((p) => pathname === p || pathname.startsWith(p + '/'))
    .sort((a, b) => b.length - a.length)[0];
}
