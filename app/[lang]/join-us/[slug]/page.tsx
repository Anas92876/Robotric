import Link from 'next/link';
import { notFound } from 'next/navigation';
import { hasLocale } from '@/lib/i18n-config';
import { resolvePage } from '@/lib/page';
import { pageMeta } from '@/lib/meta';
import { getContent } from '@/lib/content';
import { Icon, type IconName } from '@/lib/icons';
import { getJob, pick } from '@/lib/api';
import { SITE, wa } from '@/lib/config';
import { Crumbs } from '@/components/ui';
import JobApplyForm from '@/components/JobApplyForm';

export const revalidate = 300;

// Icon names used by the dashboard → our icon set
const ICON_MAP: Record<string, IconName> = { CheckSquare: 'checkSquare', Lightbulb: 'lightbulb', Heart: 'heart', Bot: 'bot', Award: 'award', Clock: 'clock', MapPin: 'pin' };
const icon = (name?: string): IconName => ICON_MAP[name ?? ''] ?? 'checkSquare';

export async function generateMetadata({ params }: PageProps<'/[lang]/join-us/[slug]'>) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const job = await getJob(slug);
  const s = getContent(lang).site;
  if (!job || job === 'error') return pageMeta(lang, `join-us/${slug}`, s.job.seoTitle, s.join.seoDescription);
  return pageMeta(lang, `join-us/${slug}`, `${pick(job, 'title', lang)} | Robotrick`, pick(job, 'description', lang).slice(0, 160));
}

export default async function JobPage({ params }: PageProps<'/[lang]/join-us/[slug]'>) {
  const { slug } = await params;
  const { lang, c, base } = await resolvePage(params);
  const s = c.site, t = s.job;
  const job = await getJob(slug);
  if (job === null) notFound(); // unknown or removed role → real 404

  const crumbs = (label: string) => <Crumbs home={s.nav.home} homeHref={base} items={[{ label: s.nav.joinUs, href: `${base}/join-us` }, { label }]} />;

  if (job === 'error') {
    return (
      <>
        <section className="page-hero"><div className="container">{crumbs(t.positionPage)}</div></section>
        <section className="section section--tight">
          <div className="container">
            <div className="soon">
              <strong>{s.join.error}</strong>
              <Link className="btn btn--primary" href={`${base}/join-us`}>{t.allPositions}</Link>
            </div>
          </div>
        </section>
      </>
    );
  }

  const title = pick(job, 'title', lang);
  const subtitle = pick(job, 'subtitle', lang);
  const duties = (job.duties ?? []).map((x) => ({ icon: x.icon, title: pick(x, 'title', lang), text: pick(x, 'text', lang) })).filter((x) => x.title || x.text);
  const reqs = (job.requirements ?? []).map((x) => pick(x, 'text', lang)).filter(Boolean);
  const perks = (job.perks ?? []).map((x) => pick(x, 'text', lang)).filter(Boolean);
  const details = (job.workDetails ?? []).map((x) => ({ label: pick(x, 'label', lang), value: pick(x, 'value', lang) })).filter((x) => x.value);

  return (
    <>
      <section className="page-hero"><div className="container">{crumbs(title)}</div></section>
      <section className="section section--tight">
        <div className="container">
          <div className="job-detail">
            <div className="job-detail__main">
              <div className="job-detail__title">
                {job.badge ? <span className="tag">{s.join.new}</span> : null}
                <h1>{title}</h1>
                {subtitle ? <p className="job-detail__subtitle">{subtitle}</p> : null}
              </div>
              <p className="prose prose--lg" dir="auto">{pick(job, 'description', lang)}</p>
              {duties.length ? (
                <div className="job-block">
                  <h2>{t.duties}</h2>
                  {duties.map((d, i) => (
                    <div className="job-duty" key={i}>
                      <span className="icon-dot"><Icon name={icon(d.icon)} /></span>
                      <div>{d.title ? <h3 dir="auto">{d.title}</h3> : null}{d.text ? <p dir="auto">{d.text}</p> : null}</div>
                    </div>
                  ))}
                </div>
              ) : null}
              {reqs.length ? <div className="job-block"><h2>{t.requirements}</h2><ul className="checks">{reqs.map((r) => <li key={r} dir="auto"><Icon name="check" className="checks__icon" /><span>{r}</span></li>)}</ul></div> : null}
              {perks.length ? <div className="job-block"><h2>{t.perks}</h2><ul className="checks">{perks.map((r) => <li key={r} dir="auto"><Icon name="check" className="checks__icon" /><span>{r}</span></li>)}</ul></div> : null}
            </div>
            <aside className="job-detail__side">
              {job.imageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote dashboard image; plain <img> keeps working even if the image host is slow
                <div className="job-detail__img"><img src={job.imageSrc} alt={title} loading="lazy" /></div>
              ) : null}
              <div className="card">
                {details.length ? <><h2 className="form__title">{t.details}</h2><dl>{details.map((d) => <div key={d.label}><dt>{d.label}</dt><dd>{d.value}</dd></div>)}</dl></> : null}
                <div className="btn-row">
                  {job.whatsapp ? null : <a className="btn btn--primary" href="#apply">{t.applyNow}</a>}
                  <a className={`btn ${job.whatsapp ? 'btn--primary' : 'btn--outline'}`} href={wa(`${t.whatsappMessage} ${title}`)} target="_blank" rel="noopener" data-track="job_whatsapp" data-track-label={job.slug}>{t.applyWhatsapp}</a>
                </div>
              </div>
            </aside>
          </div>
          {job.whatsapp ? null : <JobApplyForm labels={t.form} apiBase={SITE.browserApiBase} position={job.titleEn || title} />}
        </div>
      </section>
    </>
  );
}
