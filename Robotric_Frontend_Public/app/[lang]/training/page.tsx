import Link from 'next/link';
import { resolvePage } from '@/lib/page';
import { pageMeta } from '@/lib/meta';
import { Icon } from '@/lib/icons';
import { SITE, wa } from '@/lib/config';
import { Arrow, Closer, Crumbs, PageHero, SectionHead, Title, YearsSince } from '@/components/ui';
import TrainingMap from '@/components/TrainingMap';

export async function generateMetadata({ params }: PageProps<'/[lang]/training'>) {
  const { lang, c } = await resolvePage(params);
  return pageMeta(lang, 'training', `${c.trainingIntro.seo.title} | Robotrick`, c.trainingIntro.seo.description);
}

export default async function TrainingPage({ params }: PageProps<'/[lang]/training'>) {
  const { c, base, isAr } = await resolvePage(params);
  const { trainingIntro: intro, trainingMap: map, site: s, home } = c;
  const t = s.training;
  const tracks = Object.values(map.tracks);
  const yearRound = map.tracks.yearRound;

  return (
    <>
      <PageHero
        crumbs={<Crumbs home={s.nav.home} homeHref={base} items={[{ label: intro.breadcrumb.services }, { label: intro.breadcrumb.training }]} />}
        badge={intro.hero.badge} t={intro.hero.headline} hl={intro.hero.headlineHighlight} lead={intro.hero.description}
        actions={<>
          <a className="btn btn--primary" href="#map">{map.openLabel} <Arrow /></a>
          <a className="btn btn--outline" href={wa(t.enrollMessage)} target="_blank" rel="noopener" data-track="whatsapp_click" data-track-label="training_hero"><Icon name="whatsapp" /> {s.common.chatWhatsapp}</a>
        </>}
        extra={
          <div className="stats stats--3 page-hero__stats">
            <div className="stat"><b>{s.trainingStats[0].value}</b><span>{intro.stats.programTracks}</span></div>
            <div className="stat"><YearsSince from={SITE.founded} /><span>{intro.stats.yearsExperience}</span></div>
            <div className="stat"><b>{s.trainingStats[1].value}</b><span>{intro.stats.handsOnLearning}</span></div>
          </div>
        }
      />

      {/* Program map */}
      <section className="section" id="map">
        <div className="container">
          <SectionHead t={map.title} hl={map.titleHighlight} lead={map.subtitle} />
          <TrainingMap
            isAr={isAr}
            waNumber={SITE.whatsapp}
            map={map}
            tracks={tracks}
            labels={{ whatYouLearn: t.whatYouLearn, prerequisite: t.prerequisite, hoursPerLevel: t.hoursPerLevel, program: t.program, programs: t.programs }}
            departmentImages={t.departmentImages}
          />
        </div>
      </section>

      {/* Learning journey */}
      <section className="section">
        <div className="container">
          <SectionHead t={home.progressSteps.title} center />
          <ol className="journey">
            {home.progressSteps.steps.map((st, i) => (
              <li className="journey__step" key={st}><span className="journey__num">{i + 1}</span><span className="journey__text">{st}</span></li>
            ))}
          </ol>
        </div>
      </section>

      {/* Year-round FAQ */}
      <section className="section">
        <div className="container">
          <div className="split split--top">
            <div className="section-head__main">
              <span className="pill pill--plain">{yearRound.title}</span>
              <Title t={t.faqTitle} className="h-section" />
              <Link className="link-arrow" href={`${base}/verify`}>{s.footer.verify} <Arrow /></Link>
            </div>
            <div className="faq">
              {yearRound.faq.map((q, i) => <details key={q.question} open={i === 0}><summary>{q.question}<Icon name="plus" className="faq__icon" /></summary><p>{q.answer}</p></details>)}
            </div>
          </div>
        </div>
      </section>

      <Closer t={intro.cta.title} lead={t.fixCtaDescription}>
        <a className="btn btn--gold btn--lg" href={wa(t.enrollMessage)} target="_blank" rel="noopener" data-track="whatsapp_click" data-track-label="training_closer">
          <Icon name="whatsapp" /> {intro.cta.button}
        </a>
      </Closer>
    </>
  );
}
