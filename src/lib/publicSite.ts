import i18n from '../i18n';

/**
 * The public website (home, services, login…) is a separate Next.js app served
 * on the same domain. The dashboard only links to it with full page loads —
 * never with the router, because those pages don't exist in this app.
 */
const PUBLIC_LANGS = ['en', 'ar'] as const;

const currentLang = (): string => {
  const lang = (i18n.language || 'en').slice(0, 2);
  return (PUBLIC_LANGS as readonly string[]).includes(lang) ? lang : 'en';
};

export const publicSite = {
  home: () => `/${currentLang()}`,
  login: () => `/${currentLang()}/login`,
  verifyCertificate: (certNumber: string) => `/${currentLang()}/verify/${encodeURIComponent(certNumber)}`,
};

/** Leaves the dashboard for the public login page. */
export const redirectToLogin = (): void => {
  if (typeof window !== 'undefined') window.location.replace(publicSite.login());
};

/** Leaves the dashboard for the public home page. */
export const redirectToPublicHome = (): void => {
  if (typeof window !== 'undefined') window.location.assign(publicSite.home());
};
