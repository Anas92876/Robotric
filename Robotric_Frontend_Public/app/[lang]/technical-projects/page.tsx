import Link from 'next/link';
import { resolvePage } from '@/lib/page';
import { pageMeta } from '@/lib/meta';
import { Icon, type IconName } from '@/lib/icons';
import { wa } from '@/lib/config';
import { Arrow, Closer, Crumbs, PageHero, Photo, SectionHead } from '@/components/ui';

const CAP_ICONS: IconName[] = ['robot', 'gear', 'chip'];
const EXAMPLE_ICONS: IconName[] = ['layers', 'leaf', 'school'];
const FEATURE_ICONS: IconName[] = ['spark', 'doc', 'shield', 'lock'];

export async function generateMetadata({ params }: PageProps<'/[lang]/technical-projects'>) {
  const { lang, c } = await resolvePage(params);
  return pageMeta(lang, 'technical-projects', `${c.projects.seo.title} | Robotrick`, c.projects.seo.description);
}

export default async function TechnicalProjectsPage({ params }: PageProps<'/[lang]/technical-projects'>) {
  const { c, base } = await resolvePage(params);
  const p = c.projects, s = c.site;

  return (
    <>
      <PageHero
        crumbs={<Crumbs home={s.nav.home} homeHref={base} items={[{ label: s.nav.services }, { label: c.home.navigation.servicesDropdown.projects }]} />}
        badge={p.hero.badge} t={p.hero.headline} hl={p.hero.headlineHighlight || undefined} lead={p.hero.description}
        actions={<>
          <Link className="btn btn--primary" href={`${base}/contact?subject=partnership`} data-track="cta_click" data-track-label="projects_start">{p.heroCta.startProject}</Link>
          <Link className="btn btn--outline" href={`${base}/gallery#projects`}>{p.heroCta.viewWork} <Arrow /></Link>
        </>}
      />

      {/* Capabilities */}
      <section className="section section--tight">
        <div className="container">
          <div className="cap">
            <Photo src="/images/services/tech.webp" className="cap__photo" label={`${p.capabilities.title} ${p.capabilities.titleHighlight}`} />
            <div className="cap__body">
              <SectionHead badge={p.capabilities.badge} t={p.capabilities.title} hl={p.capabilities.titleHighlight} lead={p.capabilities.description} />
              <ul className="cap__list">
                {p.capabilities.items.map((it, i) => (
                  <li key={it.title}><span className="icon-dot icon-dot--ink"><Icon name={CAP_ICONS[i]} /></span><div><h3>{it.title}</h3><p>{it.description}</p></div></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Project examples */}
      <section className="section">
        <div className="container">
          <SectionHead t={p.projects.title} hl={p.projects.titleHighlight} lead={p.projects.description} />
          <div className="grid grid--3">
            {p.projects.items.map((it, i) => (
              <article className={`feature feature--${['khaki', 'leaf', 'sage'][i]}`} key={it.title}>
                <span className="feature__num">0{i + 1}</span>
                <span className="icon-dot"><Icon name={EXAMPLE_ICONS[i]} /></span>
                <h3>{it.title}</h3>
                <p>{it.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Journey timeline */}
      <section className="section">
        <div className="container">
          <SectionHead badge={p.journey.badge} t={p.journey.title} hl={p.journey.titleHighlight} lead={p.journey.description} />
          <ol className="vtimeline">
            {p.journey.steps.map((st, i) => (
              <li className="vtimeline__step" key={st.title}>
                <span className="vtimeline__dot">{i + 1}</span>
                <div className="vtimeline__card">
                  <span className="label">{st.subtitle}</span>
                  <h3>{st.title}</h3>
                  <ul className="vtimeline__items">
                    {st.items.map((x) => {
                      const at = x.indexOf(':');
                      return <li key={x}>{at > 0 ? <><strong>{x.slice(0, at)}:</strong>{x.slice(at + 1)}</> : x}</li>;
                    })}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* What distinguishes us */}
      <section className="section">
        <div className="container">
          <SectionHead t={p.features.title} />
          <div className="grid grid--2">
            {p.features.items.map((it, i) => (
              <div className="card card--row" key={it.title}><span className="icon-dot"><Icon name={FEATURE_ICONS[i]} /></span><div><h3>{it.title}</h3><p>{it.description}</p></div></div>
            ))}
          </div>
        </div>
      </section>

      <Closer t={p.cta.title} lead={p.cta.description}>
        <Link className="btn btn--gold btn--lg" href={`${base}/contact?subject=partnership`} data-track="cta_click" data-track-label="projects_closer">{p.cta.button}</Link>
        <a className="btn btn--ghost-gold btn--lg" href={wa(p.cta.title)} target="_blank" rel="noopener"><Icon name="whatsapp" /> {s.common.chatWhatsapp}</a>
      </Closer>
    </>
  );
}
