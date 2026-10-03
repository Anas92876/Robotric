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
