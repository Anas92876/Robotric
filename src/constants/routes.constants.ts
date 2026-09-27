import React from "react";
import {
  Home,
  Package,
  ShoppingCart,
  FolderOpen,
  Trophy,
  Users,
  FileText,
  Settings as SettingsIcon,
  BookOpen,
  GraduationCap,
  Calendar,
  DollarSign,
  UserPlus,
  UserCircle,
  Briefcase,
  ClipboardCheck,
  Tag,
  CreditCard,
  Clock,
  CheckCircle,
  Mail,
  ListTodo,
  Image as ImageIcon,
  BarChart3,
  Bell,
  Star,
  Award,
  AlarmClock,
  Bus,
  FileCheck,
  Compass,
  Timer,
} from "lucide-react";
import { UserRole } from "../types/auth.types";
import type { NavItem } from "../types/common.types";

/**
 * Application route paths
 */
export const ROUTES = {
  HOME: "/",
  DASHBOARD: "/dashboard",
  LOGIN: "/wa-login-page-for-robotrick",
  REGISTER: "/register",
  INVENTORY: "/inventory",
  ORDERS: "/orders",
  PROJECTS: "/projects",
  COMPETITIONS: "/competitions",
  TEAMS: "/teams",
  POSTS: "/posts",
  SETTINGS: "/settings",
  PROFILE: "/profile",
  NOTIFICATIONS: "/notifications",
  NOT_FOUND: "/404",

  // Reception routes
  RECEPTION_SCHEDULE: "/reception/schedule",
  RECEPTION_CONTACTS: "/reception/contacts",
  RECEPTION_JOB_APPLICATIONS: "/reception/job-applications",
  RECEPTION_TRANSPORT: "/reception/transport",

  // Public pages
  ABOUT: "/about",
  SERVICES: "/services",
  BLOG: "/blog",
  JOIN_US: "/join-us",
  JOIN_US_POSITION: "/join-us/:slug",
  CONTACT: "/contact",

  // Student routes
  STUDENT_DASHBOARD: "/student",
  STUDENT_COURSES: "/student/courses",
  STUDENT_ATTENDANCE: "/student/attendance",
  STUDENT_PAYMENTS: "/student/payments",
  STUDENT_SUBSCRIPTIONS: "/student/subscriptions",
  STUDENT_MISSION_PLANNER: "/student/mission-planner",
} as const;

/**
 * Navigation items for the sidebar/menu
 * Updated to use actual Lucide React icons instead of string references
 */
export const NAV_ITEMS: NavItem[] = [
  // Regular Dashboard (Admin, Team Lead, Member)
  {
    id: "dashboard",
    title: "Dashboard",
    path: ROUTES.DASHBOARD,
    icon: React.createElement(Home, { className: "w-5 h-5" }),
    roles: [UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.TEAM_LEAD, UserRole.MEMBER, UserRole.JUDGE, UserRole.EDITOR, UserRole.ORGANIZER],
  },

  // Student Dashboard
  {
    id: "student-dashboard",
    title: "My Dashboard",
    path: ROUTES.STUDENT_DASHBOARD,
    icon: React.createElement(GraduationCap, { className: "w-5 h-5" }),
    roles: [UserRole.STUDENT],
  },
  {
    id: "student-courses",
    title: "My Courses",
    path: ROUTES.STUDENT_COURSES,
    icon: React.createElement(BookOpen, { className: "w-5 h-5" }),
    roles: [UserRole.STUDENT],
  },
  /*
  {
    id: "student-attendance",
    title: "Attendance",
    path: ROUTES.STUDENT_ATTENDANCE,
    icon: React.createElement(Calendar, { className: "w-5 h-5" }),
    roles: [UserRole.STUDENT],
  },
  */
  {
    id: "student-payments",
    title: "Payments",
    path: ROUTES.STUDENT_PAYMENTS,
    icon: React.createElement(DollarSign, { className: "w-5 h-5" }),
    roles: [UserRole.STUDENT],
  },
  {
    id: "student-subscriptions",
    title: "Subscriptions",
    path: ROUTES.STUDENT_SUBSCRIPTIONS,
    icon: React.createElement(CreditCard, { className: "w-5 h-5" }),
    roles: [UserRole.STUDENT],
  },
  {
    id: "student-tasks",
    title: "Tasks",
    path: "/student/tasks",
    icon: React.createElement(ListTodo, { className: "w-5 h-5" }),
    roles: [UserRole.STUDENT],
  },
  {
    id: "student-projects",
    title: "My Projects",
    path: "/student/projects",
    icon: React.createElement(FolderOpen, { className: "w-5 h-5" }),
    roles: [UserRole.STUDENT],
  },
  {
    id: "student-evaluations",
    title: "My Evaluations",
    path: "/student/evaluations",
    icon: React.createElement(Star, { className: "w-5 h-5" }),
    roles: [UserRole.STUDENT],
  },
  {
    id: "student-gallery",
    title: "Gallery",
    path: "/student/gallery",
    icon: React.createElement(ImageIcon, { className: "w-5 h-5" }),
    roles: [UserRole.STUDENT],
  },
  {
    id: "student-certificates",
    title: "Certificates",
    path: "/student/certificates",
    icon: React.createElement(Award, { className: "w-5 h-5" }),
    roles: [UserRole.STUDENT],
  },
  {
    id: "student-documents",
    title: "WRO Documents",
    path: "/student/documents",
    icon: React.createElement(FileCheck, { className: "w-5 h-5" }),
    roles: [UserRole.STUDENT],
  },
  {
    id: "student-mission-planner",
    title: "Mission Planner",
    path: ROUTES.STUDENT_MISSION_PLANNER,
    icon: React.createElement(Compass, { className: "w-5 h-5" }),
    roles: [UserRole.STUDENT],
    requiresWro: true,
  },

  // Trainer Dashboard
  {
    id: "trainer-dashboard",
    title: "Dashboard",
    path: "/trainer",
    icon: React.createElement(Home, { className: "w-5 h-5" }),
    roles: [UserRole.TRAINER, UserRole.TEACHER],
  },
  {
    id: "trainer-groups",
    title: "My Groups",
    path: "/trainer/groups",
    icon: React.createElement(Users, { className: "w-5 h-5" }),
    roles: [UserRole.TRAINER, UserRole.TEACHER],
  },
  {
    id: "trainer-sessions",
    title: "Sessions",
    path: "/trainer/sessions",
    icon: React.createElement(BookOpen, { className: "w-5 h-5" }),
    roles: [UserRole.TRAINER, UserRole.TEACHER],
  },
  {
    id: "trainer-schedule",
    title: "Schedule",
    path: "/trainer/schedule",
    icon: React.createElement(Calendar, { className: "w-5 h-5" }),
    roles: [UserRole.TRAINER, UserRole.TEACHER],
  },
  {
    id: "trainer-tasks",
    title: "Tasks",
    path: "/trainer/tasks",
    icon: React.createElement(ListTodo, { className: "w-5 h-5" }),
    roles: [UserRole.TRAINER, UserRole.TEACHER],
  },
  {
    id: "trainer-projects",
    title: "Student Projects",
    path: "/trainer/projects",
    icon: React.createElement(FolderOpen, { className: "w-5 h-5" }),
    roles: [UserRole.TRAINER, UserRole.TEACHER],
  },
  {
    id: "trainer-gallery",
    title: "Gallery",
    path: "/trainer/gallery",
    icon: React.createElement(ImageIcon, { className: "w-5 h-5" }),
    roles: [UserRole.TRAINER, UserRole.TEACHER],
  },
  {
    id: "trainer-resources",
    title: "Resources",
    path: "/trainer/resources",
    icon: React.createElement(FileText, { className: "w-5 h-5" }),
    roles: [UserRole.TRAINER, UserRole.TEACHER],
  },

  // Inventory (Admin and Team Lead only)
  {
    id: "inventory",
    title: "Inventory",
    path: ROUTES.INVENTORY,
    icon: React.createElement(Package, { className: "w-5 h-5" }),
    roles: [UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.TEAM_LEAD],
  },

  // Orders (Not for students)
  {
    id: "orders",
    title: "Orders",
    path: ROUTES.ORDERS,
    icon: React.createElement(ShoppingCart, { className: "w-5 h-5" }),
    roles: [UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.TEAM_LEAD, UserRole.MEMBER],
  },

  // Projects (Not for students)
  {
    id: "projects",
    title: "Projects",
    path: ROUTES.PROJECTS,
    icon: React.createElement(FolderOpen, { className: "w-5 h-5" }),
    roles: [UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.TEAM_LEAD, UserRole.MEMBER],
  },

  // Competitions (Not for students)
  {
    id: "competitions",
    title: "Competitions",
    path: ROUTES.COMPETITIONS,
    icon: React.createElement(Trophy, { className: "w-5 h-5" }),
    roles: [UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.TEAM_LEAD, UserRole.MEMBER, UserRole.JUDGE],
  },

  // Teams (Not for students)
  {
    id: "teams",
    title: "Teams",
    path: ROUTES.TEAMS,
    icon: React.createElement(Users, { className: "w-5 h-5" }),
    roles: [UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.TEAM_LEAD, UserRole.MEMBER],
  },

  // Reception Management (Reception only)
  {
    id: "reception-dashboard",
    title: "Reception",
    path: "/reception",
    icon: React.createElement(Briefcase, { className: "w-5 h-5" }),
    roles: [UserRole.RECEPTION],
  },
  {
    id: "reception-users",
    title: "User Management",
    path: "/reception/users",
    icon: React.createElement(Users, { className: "w-5 h-5" }),
    roles: [UserRole.RECEPTION],
  },
  {
    id: "reception-enrollments",
    title: "Enrollments",
    path: "/reception/enrollments",
    icon: React.createElement(BookOpen, { className: "w-5 h-5" }),
    roles: [UserRole.RECEPTION],
  },
  {
    id: "reception-leads",
    title: "Leads",
    path: "/reception/leads",
    icon: React.createElement(UserCircle, { className: "w-5 h-5" }),
    roles: [UserRole.RECEPTION],
  },
  {
    id: "reception-schedule",
    title: "Schedule",
    path: ROUTES.RECEPTION_SCHEDULE,
    icon: React.createElement(Calendar, { className: "w-5 h-5" }),
    roles: [UserRole.RECEPTION],
  },
  {
    id: "reception-subscriptions",
    title: "Subscriptions",
    path: "/reception/subscriptions",
    icon: React.createElement(CreditCard, { className: "w-5 h-5" }),
    roles: [UserRole.RECEPTION],
  },
  {
    id: "reception-session-requests",
    title: "Session Requests",
    path: "/reception/session-requests",
    icon: React.createElement(CheckCircle, { className: "w-5 h-5" }),
    roles: [UserRole.RECEPTION],
  },
  {
    id: "reception-session-reports",
    title: "Session Reports",
    path: "/reception/session-reports",
    icon: React.createElement(FileText, { className: "w-5 h-5" }),
    roles: [UserRole.RECEPTION],
  },
  {
    id: "reception-contacts",
    title: "Contact Submissions",
    path: ROUTES.RECEPTION_CONTACTS,
    icon: React.createElement(Mail, { className: "w-5 h-5" }),
    roles: [UserRole.RECEPTION],
  },
  {
    id: "reception-gallery",
    title: "Gallery",
    path: "/reception/gallery",
    icon: React.createElement(ImageIcon, { className: "w-5 h-5" }),
    roles: [UserRole.RECEPTION],
  },
  {
    id: "reception-notifications",
    title: "Notifications",
    path: "/reception/notifications",
    icon: React.createElement(Bell, { className: "w-5 h-5" }),
    roles: [UserRole.RECEPTION],
  },
  {
    id: "reception-job-applications",
    title: "Job Applications",
    path: ROUTES.RECEPTION_JOB_APPLICATIONS,
    icon: React.createElement(UserPlus, { className: "w-5 h-5" }),
    roles: [UserRole.RECEPTION],
  },
  {
    id: "reception-transport",
    title: "Transportation",
    path: ROUTES.RECEPTION_TRANSPORT,
    icon: React.createElement(Bus, { className: "w-5 h-5" }),
    roles: [UserRole.RECEPTION],
  },
  // Blog Posts (Editor, Admin, Reception, Social)
  {
    id: "reception-posts",
    title: "Blog Posts",
    path: ROUTES.POSTS,
    icon: React.createElement(FileText, { className: "w-5 h-5" }),
    roles: [UserRole.RECEPTION, UserRole.EDITOR, UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.SOCIAL],
  },

  // CLO Management (Chief Learning Officer only)
  {
    id: "clo-dashboard",
    title: "CLO Dashboard",
    path: "/clo",
    icon: React.createElement(Home, { className: "w-5 h-5" }),
    roles: [UserRole.CLO],
  },
  {
    id: "clo-trainers",
    title: "Trainers",
    path: "/clo/trainers",
    icon: React.createElement(Users, { className: "w-5 h-5" }),
    roles: [UserRole.CLO],
  },
  {
    id: "clo-courses",
    title: "Courses",
    path: "/clo/courses",
    icon: React.createElement(BookOpen, { className: "w-5 h-5" }),
    roles: [UserRole.CLO],
  },
  {
    id: "clo-evaluations",
    title: "Evaluations",
    path: "/clo/evaluations",
    icon: React.createElement(FileText, { className: "w-5 h-5" }),
    roles: [UserRole.CLO],
  },
  {
    id: "clo-evaluation-criteria",
    title: "Evaluation Criteria",
    path: "/clo/evaluation-criteria",
    icon: React.createElement(SettingsIcon, { className: "w-5 h-5" }),
    roles: [UserRole.CLO],
  },
  {
    id: "clo-attendance",
    title: "Attendance",
    path: "/clo/attendance",
    icon: React.createElement(ClipboardCheck, { className: "w-5 h-5" }),
    roles: [UserRole.CLO],
  },
  {
    id: "clo-interests",
    title: "Interests",
    path: "/clo/interests",
    icon: React.createElement(Tag, { className: "w-5 h-5" }),
    roles: [UserRole.CLO],
  },
  {
    id: "clo-resources",
    title: "Resources",
    path: "/clo/resources",
    icon: React.createElement(FileText, { className: "w-5 h-5" }),
    roles: [UserRole.CLO],
  },
  {
    id: "clo-subscription-plans",
    title: "Subscription Plans",
    path: "/clo/subscription-plans",
    icon: React.createElement(CreditCard, { className: "w-5 h-5" }),
    roles: [UserRole.CLO],
  },
  {
    id: "clo-tasks",
    title: "CLO Tasks",
    path: "/clo/tasks",
    icon: React.createElement(ListTodo, { className: "w-5 h-5" }),
    roles: [UserRole.CLO],
  },
  {
    id: "clo-gallery",
    title: "CLO Gallery",
    path: "/clo/gallery",
    icon: React.createElement(ImageIcon, { className: "w-5 h-5" }),
    roles: [UserRole.CLO],
  },
  {
    id: "clo-training-content",
    title: "Training Page Content",
    path: "/clo/training-content",
    icon: React.createElement(FileText, { className: "w-5 h-5" }),
    roles: [UserRole.CLO],
  },
  {
    id: "clo-documents",
    title: "WRO Documents",
    path: "/clo/documents",
    icon: React.createElement(FileCheck, { className: "w-5 h-5" }),
    roles: [UserRole.CLO],
  },

  // Manager (CTO) — project & task management
  {
    id: "cto-dashboard",
    title: "Manager Dashboard",
    path: "/cto-internal/dashboard",
    icon: React.createElement(Home, { className: "w-5 h-5" }),
    roles: [UserRole.CTO],
  },
  {
    id: "cto-projects",
    title: "Projects",
    path: "/cto-internal/projects",
    icon: React.createElement(FolderOpen, { className: "w-5 h-5" }),
    roles: [UserRole.CTO],
  },
  {
    id: "cto-tasks",
    title: "Task Manager",
    path: "/cto-internal/tasks",
    icon: React.createElement(ListTodo, { className: "w-5 h-5" }),
    roles: [UserRole.CTO],
  },
  {
    id: "cto-deadlines",
    title: "Deadline Warnings",
    path: "/cto-internal/deadlines",
    icon: React.createElement(AlarmClock, { className: "w-5 h-5" }),
    roles: [UserRole.CTO],
  },
  {
    id: "cto-transport",
    title: "Transport Pricing",
    path: "/cto-internal/transport",
    icon: React.createElement(Bus, { className: "w-5 h-5" }),
    roles: [UserRole.CTO],
  },
  {
    id: "cto-work-hours",
    title: "Work Hours",
    path: "/cto-internal/work-hours",
    icon: React.createElement(Timer, { className: "w-5 h-5" }),
    roles: [UserRole.CTO],
  },

  // My Tasks — visible to all staff roles that can be assigned tasks
  {
    id: "my-tasks",
    title: "My Tasks",
    path: "/my-tasks",
    icon: React.createElement(ListTodo, { className: "w-5 h-5" }),
    roles: [
      UserRole.ENGINEER,
      UserRole.TRAINER,
      UserRole.TEACHER,
      UserRole.RECEPTION,
      UserRole.CLO,
      UserRole.SOCIAL,
    ],
  },

  // My Work Hours — work clock for hourly staff (visible always; page shows a
  // friendly message if hour tracking isn't enabled for the user yet)
  {
    id: "my-hours",
    title: "My Work Hours",
    path: "/my-hours",
    icon: React.createElement(Timer, { className: "w-5 h-5" }),
    roles: [
      UserRole.ENGINEER,
      UserRole.TRAINER,
      UserRole.TEACHER,
      UserRole.RECEPTION,
      UserRole.CLO,
      UserRole.SOCIAL,
    ],
  },

  // Engineer Dashboard
  {
    id: "engineer-dashboard",
    title: "Programmer Dashboard",
    path: "/engineer/dashboard",
    icon: React.createElement(Home, { className: "w-5 h-5" }),
    roles: [UserRole.ENGINEER],
  },
  {
    id: "engineer-deadlines",
    title: "My Deadlines",
    path: "/engineer/deadlines",
    icon: React.createElement(AlarmClock, { className: "w-5 h-5" }),
    roles: [UserRole.ENGINEER],
  },

  // Client portal
  {
    id: "client-dashboard",
    title: "Dashboard",
    path: "/client/dashboard",
    icon: React.createElement(Home, { className: "w-5 h-5" }),
    roles: [UserRole.CLIENT],
  },
  {
    id: "client-tasks",
    title: "My Requests",
    path: "/client/tasks",
    icon: React.createElement(ListTodo, { className: "w-5 h-5" }),
    roles: [UserRole.CLIENT],
  },

];
