// The private dashboard is a separate app (Vite) served on the same domain: this site
// is the front door and forwards the dashboard's paths to it (see next.config.ts).
// Keep DASHBOARD_PATHS in sync with DASHBOARD_PATHS in the dashboard's vite.config.ts.

export const DASHBOARD_PATHS = [
  'dashboard', 'student', 'trainer', 'reception', 'clo', 'cto-internal', 'engineer', 'client', 'admin',
  'orders', 'projects', 'competitions', 'teams', 'posts', 'inventory', 'my-tasks', 'my-hours',
  'settings', 'profile', 'notifications',
  'dash-assets', // the dashboard's built files and images
  'odom-map', // the standalone field map tool
] as const;

// Only in development: the Vite dev server's own paths (modules, live reload client…)
export const DASHBOARD_DEV_PATHS = ['src', 'node_modules', '@vite', '@id', '@fs', '@react-refresh'] as const;

const isDev = process.env.NODE_ENV === 'development';

/**
 * Where the dashboard app runs. Production: the dashboard deployment's URL
 * (DASHBOARD_ORIGIN, e.g. https://robotrick-dashboard.vercel.app). Development: the
 * Vite dev server. Empty = no forwarding (the dashboard paths then 404 here).
 */
export const DASHBOARD_ORIGIN = (process.env.DASHBOARD_ORIGIN?.trim() || (isDev ? 'http://localhost:5173' : '')).replace(/\/$/, '');

const firstSegments = new Set<string>([...DASHBOARD_PATHS, ...(isDev ? DASHBOARD_DEV_PATHS : [])]);

/** True for paths that belong to the dashboard, e.g. /student/courses or /dash-assets/logo.png. */
export function isDashboardPath(pathname: string): boolean {
  return firstSegments.has(pathname.split('/')[1] ?? '');
}

/** Rewrites that forward every dashboard path (and its sub-paths) to the dashboard app. */
export function dashboardRewrites() {
  if (!DASHBOARD_ORIGIN) return [];
  return [...firstSegments].flatMap((p) => [
    { source: `/${p}`, destination: `${DASHBOARD_ORIGIN}/${p}` },
    { source: `/${p}/:path*`, destination: `${DASHBOARD_ORIGIN}/${p}/:path*` },
  ]);
}
