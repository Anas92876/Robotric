import type { Certificate } from '@/lib/api';
import type { Content } from '@/lib/content';
import { Crumbs, PageHero } from './ui';
import VerifyForm from './VerifyForm';

// Shared by /verify and /verify/[cert]: search box + (optional) server-checked result
export default function VerifyView({ lang, c, number, result }: {
  lang: 'en' | 'ar'; c: Content; number?: string; result?: Certificate | null | 'error';
}) {
  const v = c.site.verify;
  const fmtDate = (d: string) => { const x = new Date(d); return isNaN(+x) ? d : x.toLocaleDateString(lang === 'ar' ? 'ar-SY' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' }); };

  return (
    <>
      <PageHero crumbs={<Crumbs home={c.site.nav.home} homeHref={`/${lang}`} items={[{ label: v.badge }]} />} badge={v.badge} t={v.title} hl={v.titleHighlight} lead={v.lead} />
      <section className="section section--tight">
        <div className="container container--narrow">
          <VerifyForm lang={lang} label={v.label} placeholder={v.placeholder} button={v.button} initial={number} />

          {number && result === 'error' ? <div className="form__status is-err" role="status" style={{ marginTop: 16 }}>{v.error}</div> : null}
          {number && result === null ? (
            <div className="form__status is-err" role="status" style={{ marginTop: 16 }}>
              <strong>{v.notFound}</strong> — {v.idPrefix} <span className="ltr">{number}</span> {v.notFoundLead}
            </div>
          ) : null}
          {number && result && result !== 'error' ? (
            <div className="certificate is-visible" aria-live="polite">
              <span className="tag" style={{ justifySelf: 'center' }}>{v.verified}</span>
              <h3>{result.displayName || result.studentName}</h3>
              <p style={{ color: 'var(--color-text-2)' }}>
                {v.completed} <strong>{result.courseName}{result.courseLevel ? ` — ${result.courseLevel}` : ''}</strong> {v.course}
                {result.trainingHours ? <>, {v.totaling} <strong className="ltr">{result.trainingHours}</strong> {v.hours}</> : null}.
              </p>
              <dl>
                <div><dt>{v.number}</dt><dd className="ltr">{result.certificateNumber || number}</dd></div>
                {result.issuedAt ? <div><dt>{v.issued}</dt><dd>{fmtDate(result.issuedAt)}</dd></div> : null}
                <div><dt>{v.issuer}</dt><dd>{v.issuerName}</dd></div>
              </dl>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
