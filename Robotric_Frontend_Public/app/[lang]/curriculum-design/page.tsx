import Link from 'next/link';
import { Fragment } from 'react';
import { resolvePage } from '@/lib/page';
import { pageMeta } from '@/lib/meta';
import { Icon, type IconName } from '@/lib/icons';
import { wa } from '@/lib/config';
import { Arrow, Closer, Crumbs, PageHero, SectionHead, Title } from '@/components/ui';

const WHY_ICONS: IconName[] = ['book', 'users', 'tool'];
const STAFF_ICONS: IconName[] = ['school', 'users'];

export async function generateMetadata({ params }: PageProps<'/[lang]/curriculum-design'>) {
  const { lang, c } = await resolvePage(params);
  return pageMeta(lang, 'curriculum-design', `${c.curriculum.seo.title} | Robotrick`, c.curriculum.seo.description);
}

export default async function CurriculumPage({ params }: PageProps<'/[lang]/curriculum-design'>) {
  const { c, base } = await resolvePage(params);
  const p = c.curriculum, s = c.site;

  return (
    <>
      <PageHero
        crumbs={<Crumbs home={s.nav.home} homeHref={base} items={[{ label: s.nav.services }, { label: c.home.navigation.servicesDropdown.curriculumDesign }]} />}
        badge={p.hero.badge} t={p.hero.headline} hl={p.hero.headlineHighlight} lead={p.hero.description}
        actions={<Link className="btn btn--primary" href={`${base}/contact?subject=partnership`} data-track="cta_click" data-track-label="curriculum_hero">{p.heroCta.bookConsultation}</Link>}
        extra={<blockquote className="pullquote"><span aria-hidden="true">“</span>{p.hero.tagline}</blockquote>}
      />

      <section className="section">
        <div className="container">
          <SectionHead badge={p.why.badge} t={p.why.title} hl={p.why.titleHighlight} />
          <div className="grid grid--3">
            {p.why.items.map((it, i) => (
              <article className={`feature feature--${['moss', 'leaf', 'khaki'][i]}`} key={it.title}><span className="icon-dot"><Icon name={WHY_ICONS[i]} /></span><h3>{it.title}</h3><p>{it.description}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead badge={p.methodology.badge} t={p.methodology.title} lead={p.methodology.description} />
          <ol className="phases">
            {p.methodology.steps.map((st, i) => <li className="phase" key={st.title}><span className="phase__num">{i + 1}</span><h3>{st.title}</h3><p>{st.description}</p></li>)}
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead badge={p.staff.badge} t={p.staff.title} hl={p.staff.titleHighlight} lead={p.staff.description} />
          <div className="options">
            {p.staff.items.map((it, i) => (
              <Fragment key={it.title}>
                {i > 0 ? <span className="options__or" aria-hidden="true">/</span> : null}
                <article className={`option option--${i === 0 ? 'a' : 'b'}`}>
                  <span className="option__letter" aria-hidden="true">{i === 0 ? 'A' : 'B'}</span>
                  <span className="icon-dot"><Icon name={STAFF_ICONS[i]} /></span>
                  <h3>{it.title}</h3>
                  <p>{it.description}</p>
                </article>
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="results">
            <div>
              <span className="pill">{p.results.badge} <span className="pill__arrow"><Arrow /></span></span>
              <Title t={p.results.title} hl={p.results.titleHighlight} />
            </div>
            <ol className="results__list">
              {p.results.items.map((r, i) => <li key={r}><span>0{i + 1}</span><p>{r}</p></li>)}
            </ol>
          </div>
        </div>
      </section>

      <Closer t={p.cta.title} lead={p.cta.description}>
        <Link className="btn btn--gold btn--lg" href={`${base}/contact?subject=partnership`} data-track="cta_click" data-track-label="curriculum_closer">{p.cta.button}</Link>
        <a className="btn btn--ghost-gold btn--lg" href={wa(p.cta.title)} target="_blank" rel="noopener"><Icon name="whatsapp" /> {s.common.chatWhatsapp}</a>
      </Closer>
    </>
  );
}
