import Link from 'next/link';
import { resolvePage } from '@/lib/page';
import { pageMeta } from '@/lib/meta';
import { Icon, type IconName } from '@/lib/icons';
import { wa } from '@/lib/config';
import { Arrow, Closer, Crumbs, PageHero, SectionHead, Title } from '@/components/ui';

const DESIGN_ICONS: IconName[] = ['compass', 'tool', 'layers'];
const SWATCHES = [
  ['#cccc99', '#9dbb86', '#ffffcc', '#2a4e1c'], // PLA — "various colors"
  ['#003300', '#5f6e5b'],                       // PETG / ABS
  ['#475a47'],                                   // TPU
];
const PROJECT_ICONS: IconName[] = ['lightbulb', 'layers', 'award'];
const FEATURE_ICONS: IconName[] = ['chat', 'brush', 'doc', 'scale', 'bolt'];

export async function generateMetadata({ params }: PageProps<'/[lang]/3d-printing'>) {
  const { lang, c } = await resolvePage(params);
  return pageMeta(lang, '3d-printing', `${c.printing.seo.title} | Robotrick`, c.printing.seo.description);
}

export default async function PrintingPage({ params }: PageProps<'/[lang]/3d-printing'>) {
  const { c, base } = await resolvePage(params);
  const p = c.printing, s = c.site;
  const quote = wa(`${p.cta.title} — ${p.hero.headline}`);

  return (
    <>
      <PageHero
        crumbs={<Crumbs home={s.nav.home} homeHref={base} items={[{ label: s.nav.services }, { label: c.home.navigation.servicesDropdown.printing }]} />}
        badge={p.hero.badge} t={p.hero.headline} hl={p.hero.headlineHighlight || undefined}
        media={{ src: '/images/services/3d-printing.webp', alt: p.hero.headline }}
        lead={p.hero.description}
        actions={<a className="btn btn--primary" href={quote} target="_blank" rel="noopener" data-track="whatsapp_click" data-track-label="print_hero"><Icon name="whatsapp" /> {p.cta.button}</a>}
      />

      <section className="section">
        <div className="container">
          <SectionHead badge={p.design.badge} t={p.design.title} hl={p.design.titleHighlight} />
          <div className="steps steps--3">
            {p.design.items.map((it, i) => <div className="step" key={it.title}><span className="icon-dot"><Icon name={DESIGN_ICONS[i]} /></span><h3>{it.title}</h3><p>{it.description}</p></div>)}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead badge={p.materials.badge} t={p.materials.title} hl={p.materials.titleHighlight} />
          <div className="materials">
            {p.materials.items.map((m, i) => (
              <article className="material" key={m.name}>
                <div className="material__spool" aria-hidden="true">{SWATCHES[i].map((col) => <span key={col} style={{ background: col }} />)}</div>
                <h3 className="ltr">{m.name}</h3>
                <p>{m.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead badge={p.projects.badge} t={p.projects.title} hl={p.projects.titleHighlight} />
          <div className="grid grid--3">
            {p.projects.items.map((it, i) => (
              <article className={`feature feature--${['cream', 'straw', 'sand'][i]}`} key={it.title}><span className="icon-dot"><Icon name={PROJECT_ICONS[i]} /></span><h3>{it.title}</h3><p>{it.description}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="split split--top">
            <div className="section-head__main">
              <span className="pill pill--plain">{p.features.badge}</span>
              <Title t={p.features.title} className="h-section" />
            </div>
            <ul className="feature-list">
              {p.features.items.map((it, i) => (
                <li key={it.title}><span className="icon-dot icon-dot--ink"><Icon name={FEATURE_ICONS[i]} /></span><div><h3>{it.title}</h3><p>{it.description}</p></div></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <Closer t={p.cta.title} lead={p.cta.description}>
        <a className="btn btn--gold btn--lg" href={quote} target="_blank" rel="noopener" data-track="whatsapp_click" data-track-label="print_closer"><Icon name="whatsapp" /> {p.cta.button}</a>
        <Link className="btn btn--ghost-gold btn--lg" href={`${base}/contact?subject=general`}>{s.nav.contact} <Arrow /></Link>
      </Closer>
    </>
  );
}
