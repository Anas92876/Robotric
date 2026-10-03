import { resolvePage } from '@/lib/page';
import { pageMeta } from '@/lib/meta';
import { Icon, type IconName } from '@/lib/icons';
import { Crumbs, PageHero, Photo, SectionHead } from '@/components/ui';
import SpaceCarousel from '@/components/SpaceCarousel';

const VALUE_ICONS: IconName[] = ['heart', 'users', 'leaf', 'trophy', 'target'];

export async function generateMetadata({ params }: PageProps<'/[lang]/about'>) {
  const { lang, c } = await resolvePage(params);
  return pageMeta(lang, 'about', c.site.about.seoTitle, c.site.about.seoDescription);
}

export default async function AboutPage({ params }: PageProps<'/[lang]/about'>) {
  const { c, base, isAr } = await resolvePage(params);
  const a = c.site.about;
  const years = [...new Set(a.achievements.map((x) => x.year))];

  return (
    <>
      <PageHero crumbs={<Crumbs home={c.site.nav.home} homeHref={base} items={[{ label: a.badge }]} />} badge={a.badge} t={a.storyTitle} />

      {/* Story */}
      <section className="section section--tight">
        <div className="container">
          <div className="story">
            <Photo src="/images/about/image_2026-02-24_04-37-12.webp" className="photo--tall story__photo" label={a.buildingAlt} />
            <div className="story__text prose prose--lg">
              <span className="story__year" aria-hidden="true">2022</span>
              {a.story.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
            </div>
          </div>
        </div>
      </section>

      {/* Vision & mission */}
      <section className="section">
        <div className="container">
          <SectionHead t={a.vmTitle} />
          <div className="vm">
            <article className="vm__card vm__card--dark">
              <span className="icon-dot icon-dot--gold"><Icon name="target" /></span>
              <span className="label">{a.visionTitle}</span>
              <p className="vm__text">{a.vision}</p>
            </article>
            <article className="vm__card">
              <span className="icon-dot"><Icon name="spark" /></span>
              <span className="label">{a.missionTitle}</span>
              <p className="vm__text">{a.mission}</p>
            </article>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section">
        <div className="container">
          <SectionHead t={a.valuesTitle} />
          <ul className="values">
            {a.values.map((v, i) => (
              <li className="values__item" key={v}>
                <span className="values__num">0{i + 1}</span>
                <span className="icon-dot"><Icon name={VALUE_ICONS[i]} /></span>
                <span className="values__word">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Achievements timeline */}
      <section className="section">
        <div className="container">
          <SectionHead badge={a.achievementsBadge} t={a.achievementsTitle} lead={a.achievementsLead} />
          <div className="timeline">
            {years.map((y) => (
              <div className="timeline__year" key={y}>
                <div className="timeline__label"><span>{y}</span></div>
                <div className="timeline__items">
                  {a.achievements.filter((x) => x.year === y).map((x) => (
                    <article className="proof" key={x.title + x.event}>
                      <div className="proof__head">
                        <span className="proof__medal"><Icon name="medal" /></span>
                        <div><strong>{x.title}</strong><span>{x.event}</span></div>
                      </div>
                      <div className="proof__stat"><span className="ltr">{x.stat}</span></div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our space */}
      <section className="section">
        <div className="container">
          <SectionHead t={a.spaceTitle} />
          <SpaceCarousel slides={a.space} isAr={isAr} dotLabel={isAr ? 'الانتقال إلى الشريحة' : 'Go to slide'} />
        </div>
      </section>
    </>
  );
}
