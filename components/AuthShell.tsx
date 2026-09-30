import type { ReactNode } from 'react';
import { SITE } from '@/lib/config';
import type { Content } from '@/lib/content';
import Lori from '@/components/Lori';

// Split auth layout: brand panel (premium dark register + Lori + real figures) beside the form card
export default function AuthShell({ lang, c, children }: { lang: 'en' | 'ar'; c: Content; children: ReactNode }) {
  const t = c.site.auth;
  const stats = c.site.home.stats;
  return (
    <section className="auth">
      <div className="container auth__inner">
        <aside className="auth__panel" aria-hidden="false">
          <span className="orb orb--c" aria-hidden="true" />
          <span className={`brand-logo brand-logo--${lang} brand-logo--gold`} style={{ ['--logo' as string]: `url(/images/logo-${lang}.png)` }} role="img" aria-label="Robotrick" />
          <div className="auth__copy">
            <span className="pill">{t.panelBadge}</span>
            <h2>{t.panelTitle}</h2>
            <p>{t.panelText}</p>
          </div>
          <dl className="auth__stats">
            <div><dt>{t.statHours}</dt><dd className="ltr">{stats[0].value}</dd></div>
            <div><dt>{t.statPrograms}</dt><dd className="ltr">{c.site.trainingStats[0].value}</dd></div>
            <div><dt>{t.statSince}</dt><dd className="ltr">{SITE.founded}</dd></div>
          </dl>
          <Lori className="auth__lori" helloDelay={1200} />
        </aside>
        <div className="auth__main">
          <div className="auth__card">{children}</div>
        </div>
      </div>
    </section>
  );
}
