// Business details and service endpoints. Values can be overridden with environment variables (see .env.example).

// An environment variable that is missing, empty or only spaces counts as "not set" (hosting dashboards often save empty values)
const env = (value: string | undefined, fallback: string) => (value && value.trim() ? value.trim() : fallback);

// Absolute URL with protocol and no trailing slash; "robotrick.net" becomes "https://robotrick.net"; invalid values use the fallback
const absoluteUrl = (value: string | undefined, fallback: string) => {
  const raw = env(value, fallback);
  try { return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).toString().replace(/\/$/, ''); }
  catch { return fallback; }
};

export const SITE = {
  url: absoluteUrl(process.env.NEXT_PUBLIC_SITE_URL, 'https://www.robotrick.net'),
  // The backend robotrick.net uses today. Paths below are relative to it (it already ends in /api).
  apiBase: absoluteUrl(process.env.NEXT_PUBLIC_API_BASE, 'https://robotrick-backend-production.up.railway.app/api'),
  // What the browser calls: same domain, so no CORS and the dashboard shares the session.
  // next.config.ts rewrites /api/* to apiBase (in development the dashboard's dev server does too).
  browserApiBase: '/api',
  // Where the existing dashboard app lives ('' = same domain). After sign-in, students go to /student, staff to /dashboard.
  dashboardUrl: env(process.env.NEXT_PUBLIC_DASHBOARD_URL, '').replace(/\/$/, ''),
  // Google Analytics 4 — the owner confirmed reusing the old site's property (2026-09-28).
  // On by default only in production builds, so local testing never counts as visitors.
  // NEXT_PUBLIC_GA_ID overrides it; NEXT_PUBLIC_GA_ID=off turns it off.
  gaId: ((id) => (id === 'off' ? '' : id))(env(process.env.NEXT_PUBLIC_GA_ID, process.env.NODE_ENV === 'production' ? 'G-JZZ5RPMDBG' : '')),
  phoneDisplay: '+963 942 060 440',
  phoneTel: '+963942060440',
  whatsapp: '963942060440',
  email: 'robotrick.co@gmail.com',
  maps: 'https://maps.app.goo.gl/hiXH455azQDmafsp8',
  mapEmbed: 'https://maps.google.com/maps?q=36.2137733,37.151768&z=16&output=embed',
  facebook: 'https://www.facebook.com/profile.php?id=61561504957102',
  instagram: 'https://www.instagram.com/robo_trick01/',
  linkedin: 'https://www.linkedin.com/company/robotrick-co/',
  founded: 2022,
} as const;

export const wa = (text?: string) => `https://wa.me/${SITE.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
