import { Suspense } from 'react';
import { resolvePage } from '@/lib/page';
import { pageMeta } from '@/lib/meta';
import { SITE } from '@/lib/config';
import AuthShell from '@/components/AuthShell';
import { LoginForm } from '@/components/AuthForms';

export async function generateMetadata({ params }: PageProps<'/[lang]/login'>) {
  const { lang, c } = await resolvePage(params);
  return { ...pageMeta(lang, 'login', c.site.auth.seoLoginTitle, c.site.auth.seoDescription), robots: { index: false } };
}

// Sign in with the existing Robotrick account system (same backend and session storage as the dashboard)
export default async function LoginPage({ params }: PageProps<'/[lang]/login'>) {
  const { lang, c } = await resolvePage(params);
  const { strength, ...text } = c.site.auth;
  void strength;
  return (
    <AuthShell lang={lang} c={c}>
      <Suspense>
        <LoginForm t={text} lang={lang} apiBase={SITE.browserApiBase} dashboardUrl={SITE.dashboardUrl} />
      </Suspense>
    </AuthShell>
  );
}
