import Link from 'next/link';
import { resolvePage } from '@/lib/page';
import { pageMeta } from '@/lib/meta';
import { Icon, type IconName } from '@/lib/icons';
import { wa } from '@/lib/config';
import { Closer, Crumbs, PageHero, SectionHead } from '@/components/ui';

const STEP_ICONS: IconName[] = ['search', 'compass', 'chip', 'users'];
const STEP_TINTS = ['sage', 'cream', 'khaki', 'leaf'];
const WHY_ICONS: IconName[] = ['target', 'award', 'leaf'];

export async function generateMetadata({ params }: PageProps<'/[lang]/stem-lab-setup'>) {
  const { lang, c } = await resolvePage(params);
  return pageMeta(lang, 'stem-lab-setup', `${c.stem.seo.title} | Robotrick`, c.stem.seo.description);
}

export default async function StemLabPage({ params }: PageProps<'/[lang]/stem-lab-setup'>) {
  const { c, base } = await resolvePage(params);
  const p = c.stem, s = c.site;

  return (
    <>
      <PageHero
        crumbs={<Crumbs home={s.nav.home} homeHref={base} items={[{ label: s.nav.services }, { label: c.home.navigation.servicesDropdown.stemLabSetup }]} />}
        badge={p.hero.badge} t={p.hero.headline} hl={p.hero.headlineHighlight} lead={p.hero.description}
        actions={<Link className="btn btn--primary" href={`${base}/contact?subject=partnership`} data-track="cta_click" data-track-label="stem_hero">{p.cta.button}</Link>}
      />

      <section className="section">
        <div className="container">
          <SectionHead badge={p.process.badge} t={p.process.title} hl={p.process.titleHighlight} lead={p.process.subtitle} />
          <ol className="lab-steps">
            {p.process.steps.map((st, i) => (
              <li className={`lab-step lab-step--${STEP_TINTS[i]}`} key={st.title}>
                <div className="lab-step__num"><span>{i + 1}</span><span className="icon-dot icon-dot--ink"><Icon name={STEP_ICONS[i]} /></span></div>
                <div className="lab-step__body">
                  <h3>{st.title}</h3>
                  <p className="lab-step__intro">{st.description}</p>
                  <ul className="checks">
                    {st.items.map((x) => {
                      const at = x.indexOf(':');
                      return <li key={x}><Icon name="check" className="checks__icon" />{at > 0 ? <span><strong>{x.slice(0, at).trim()}</strong>{x.slice(at)}</span> : <span>{x}</span>}</li>;
                    })}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead t={p.whyChoose.title} hl={p.whyChoose.titleHighlight} />
          <div className="grid grid--3">
            {p.whyChoose.items.map((it, i) => <div className="card" key={it.title}><span className="icon-dot"><Icon name={WHY_ICONS[i]} /></span><h3>{it.title}</h3><p>{it.description}</p></div>)}
          </div>
        </div>
      </section>

      <Closer t={p.cta.title} lead={p.cta.description}>
        <Link className="btn btn--gold btn--lg" href={`${base}/contact?subject=partnership`} data-track="cta_click" data-track-label="stem_closer">{p.cta.button}</Link>
        <a className="btn btn--ghost-gold btn--lg" href={wa(p.cta.title)} target="_blank" rel="noopener"><Icon name="whatsapp" /> {s.common.chatWhatsapp}</a>
      </Closer>
    </>
  );
}
