import Link from 'next/link';
import { resolvePage } from '@/lib/page';
import { pageMeta } from '@/lib/meta';
import { Icon, type IconName } from '@/lib/icons';
import { getJobs, pick } from '@/lib/api';
import { Arrow, Crumbs, PageHero, SectionHead } from '@/components/ui';

export const revalidate = 300; // open positions refresh every 5 minutes

const BENEFIT_ICONS: IconName[] = ['spark', 'leaf', 'robot'];

export async function generateMetadata({ params }: PageProps<'/[lang]/join-us'>) {
  const { lang, c } = await resolvePage(params);
  return pageMeta(lang, 'join-us', c.site.join.seoTitle, c.site.join.seoDescription);
}

export default async function JoinUsPage({ params }: PageProps<'/[lang]/join-us'>) {
  const { lang, c, base } = await resolvePage(params);
  const j = c.home.joinUs, t = c.site.join, s = c.site;
  const jobs = await getJobs();

  return (
    <>
      <PageHero
        crumbs={<Crumbs home={s.nav.home} homeHref={base} items={[{ label: s.nav.joinUs }]} />}
        badge={t.badge} t={j.hero.title} lead={j.hero.subtitle}
        media={{ src: '/images/image-2.webp', alt: lang === 'ar' ? 'فريق روبوتريك' : 'Robotrick team' }}
        actions={<a className="btn btn--primary" href="#positions">{t.openTitle}</a>}
      />

      {/* Open positions — live from the dashboard */}
      <section className="section" id="positions">
        <div className="container">
          <SectionHead t={t.openTitle} lead={t.openLead} />
          <div className="jobs">
            {jobs === null ? <p className="jobs__status">{t.error}</p>
              : jobs.length === 0 ? <div className="soon" style={{ gridColumn: '1 / -1' }}><strong>{t.empty}</strong><p>{t.emptyLead}</p></div>
              : jobs.map((job) => (
                <Link className="job-card" href={`${base}/join-us/${job.slug}`} key={job._id}>
                  <div className="job-card__img" style={{ ['--img' as string]: `url('${job.imageSrc ?? ''}')`, ['--fallback' as string]: "url('/images/image-2.webp')" }}>
                    {job.badge ? <span className="tag">{t.new}</span> : null}
                  </div>
                  <div className="job-card__body">
                    <h3>{pick(job, 'title', lang)}</h3>
                    {pick(job, 'subtitle', lang) ? <span className="tag">{pick(job, 'subtitle', lang)}</span> : null}
                    <p dir="auto">{pick(job, 'description', lang)}</p>
                    <div className="job-card__foot">
                      <span className="chip chip--line">{job.whatsapp ? t.viaWhatsapp : t.viaForm}</span>
                      <span className="link-arrow">{t.openPage} <Arrow /></span>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* Why join */}
      <section className="section">
        <div className="container">
          <SectionHead t={j.benefits.title} lead={j.benefits.subtitle} />
          <div className="grid grid--3">
            {(['creativeEnvironment', 'growth', 'innovativeProjects'] as const).map((k, i) => (
              <div className="card" key={k}><span className="icon-dot"><Icon name={BENEFIT_ICONS[i]} /></span><h3>{j.benefits[k].title}</h3><p>{j.benefits[k].description}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* How to apply */}
      <section className="section">
        <div className="container">
          <SectionHead t={t.howTitle} center />
          <ol className="journey journey--3">
            {t.howSteps.map((st, i) => <li className="journey__step" key={st}><span className="journey__num">{i + 1}</span><span className="journey__text">{st}</span></li>)}
          </ol>
        </div>
      </section>
    </>
  );
}
