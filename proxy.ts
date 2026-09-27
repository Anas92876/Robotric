import { NextResponse, type NextRequest } from 'next/server';
import { LOCALES, DEFAULT_LOCALE } from './lib/i18n-config';
import { isDashboardPath } from './lib/dashboard';

// Visitors without a language in the URL are sent to /en/... or /ar/... based on their browser language.
function pickLocale(request: NextRequest) {
  const header = request.headers.get('accept-language') ?? '';
  const prefs = header.split(',').map((part) => {
    const [tag, q] = part.trim().split(';q=');
    return { lang: tag.toLowerCase().slice(0, 2), q: q ? Number(q) : 1 };
  }).sort((a, b) => b.q - a.q);
  return prefs.find((p) => (LOCALES as readonly string[]).includes(p.lang))?.lang ?? DEFAULT_LOCALE;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Dashboard paths have no language prefix; next.config.ts forwards them to the dashboard app
  if (isDashboardPath(pathname)) return;
  const hasLocale = LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return;
  request.nextUrl.pathname = `/${pickLocale(request)}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  // Skip Next internals, API routes and files with an extension (images, favicon, sitemap.xml…)
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};
