import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { hasLocale } from '@/lib/i18n-config';
import { getContent } from '@/lib/content';
import { pageMeta } from '@/lib/meta';
import { SERVICES } from '@/lib/services';
import { SITE, wa } from '@/lib/config';
import { Icon, type IconName } from '@/lib/icons';
import { Arrow, Closer, Photo, SectionHead, Title, YearsSince } from '@/components/ui';
import Rotator from '@/components/Rotator';
import Lori from '@/components/Lori';

const CATEGORY_ICONS: Record<string, IconName> = { Robotics: 'robot', AI: 'ai', VR: 'vr', '3D Printing': 'cube', Drones: 'drone', 'Web Dev': 'code', Competitions: 'trophy', EngineeringDesign: 'compass' };
const TINTS = ['leaf', 'khaki', 'sand', 'cream', 'sage', 'straw', 'moss', 'fern'];
// Service-card features quoting an unconfirmed number (e.g. "2200+ Students Trained") are left out
const hasNumber = (f: string) => /\d/.test(f);

export async function generateMetadata({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return lang === 'ar'
    ? pageMeta(lang, '', 'روبوتريك | شركة روبوتيك وتكنولوجيا في سوريا', 'روبوتريك شركة متخصصة في الروبوتات والتكنولوجيا في حلب، سوريا. نقدم برامج تدريبية، مشاريع تقنية، طباعة ثلاثية الأبعاد وحلول STEM احترافية.')
    : pageMeta(lang, '', 'Robotrick | Robotics & Technology Company in Syria', 'Robotrick is a professional robotics and technology company in Aleppo, Syria. We offer training programs, custom technical projects, 3D printing, and STEM solutions.');
}

export default async function HomePage({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const { home: h, site: s, trainingIntro } = getContent(lang);
  const base = `/${lang}`;
  const dd = h.navigation.servicesDropdown;
  const fix = s.home.fixFaq as Record<string, { question?: string; answer?: string }>;
  const faq = h.faq.items.map((q, i) => ({ ...q, ...(fix[i] ?? {}) }));
  const gallery = s.home.galleryIds.map((id) => s.gallery.items.find((g) => g.id === id)!);

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <span className="gear-deco gear-deco--1" aria-hidden="true"><Icon name="gear" /></span>
        <span className="gear-deco gear-deco--2" aria-hidden="true"><Icon name="gear" /></span>
        <div className="container">
          <div className="hero__split">
            <div className="hero__main">
              <Link className="pill" href={`${base}/about`}>{h.hero.badge} <span className="pill__arrow"><Arrow /></span></Link>
              <Title as="h1" t={h.hero.headline} hl={h.hero.headlineHighlight} />
              <div className="btn-row">
                <Link className="btn btn--primary btn--lg" href={`${base}/technical-consultation`} data-track="cta_click" data-track-label="hero_consultation">{h.hero.ctaExplore}</Link>
                <Link className="btn btn--outline btn--lg" href={`${base}/training`}>{dd.training} <Arrow /></Link>
              </div>
            </div>
            <div className="hero__side">
              <Rotator items={h.hero.typingSentences} />
              <p className="hero__lead">{h.hero.description}</p>
            </div>
          </div>

          <div className="halo">
            <span className="orb orb--a" aria-hidden="true" /><span className="orb orb--b" aria-hidden="true" />
            <Lori />
            <div className="device">
              <div className="device__bar"><i /><i /><i /><span className="device__url">robotrick.net</span></div>
              <div className="device__photo">
                <Image src="/images/about/image_2026-02-24_03-11-56.webp" alt={s.about.buildingAlt} fill sizes="(max-width: 760px) 100vw, 980px" quality={80} loading="eager" fetchPriority="high" />
                <div className="device__chips">
                  <Link className="chip chip--solid" href={`${base}/training`}><Icon name="robot" /> {h.hero.training}</Link>
                  <Link className="chip chip--solid" href={`${base}/technical-projects`}><Icon name="gear" /> {h.hero.projects}</Link>
                  <Link className="chip chip--solid" href={`${base}/3d-printing`}><Icon name="printer" /> {h.hero.printing}</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Numbers */}
      <section className="section section--tight">
        <div className="container">
          <div className="stats stats--4">
            <div className="stat"><YearsSince from={SITE.founded} /><span>{h.socialProof.yearsExperience}</span></div>
            {s.home.stats.map((x) => (
              <div className="stat" key={x.key}><b>{x.value}</b><span>{h.socialProof[x.key as keyof typeof h.socialProof]}</span></div>
            ))}
          </div>
        </div>
      </section>

      {/* About teaser */}
      <section className="section">
        <div className="container">
          <SectionHead badge={h.about.badge} t={h.about.title} hl={h.about.titleHighlight} lead={h.about.additionalDescription}
            side={<Link className="link-arrow" href={`${base}/about`}>{s.common.learnMore}<span className="sr-only"> — {s.nav.about}</span> <Arrow /></Link>} />
        </div>
      </section>

      {/* Services */}
      <section className="section" id="services">
        <div className="container">
          <SectionHead badge={h.services.badge} t={h.services.title} hl={h.services.titleHighlight} lead={h.services.description} />
          <div className="grid grid--3">
            {SERVICES.map((x) => {
              const sv = h.services[x.key];
              return (
                <Link className={`feature feature--${x.tint}`} href={`${base}/${x.slug}`} key={x.slug}>
                  <span className="icon-dot"><Icon name={x.icon} /></span>
                  <h3>{sv.title}</h3>
                  <p>{sv.description}</p>
                  <div className="feature__meta">{sv.features.filter((f) => !hasNumber(f)).map((f) => <span className="chip" key={f}>{f}</span>)}</div>
                  <span className="feature__foot link-arrow">{sv.cta} <Arrow /></span>
                </Link>
              );
            })}
          </div>
          <div className="card card--flat band">
            <h3>{h.services.ctaText}</h3>
            <Link className="btn btn--primary" href={`${base}/contact`}>{h.services.ctaButton} <Arrow /></Link>
          </div>
        </div>
      </section>

      {/* Why choose */}
      <section className="section">
        <div className="container">
          <SectionHead badge={h.whyChooseUs.badge} t={h.whyChooseUs.title} hl={h.whyChooseUs.titleHighlight} lead={h.whyChooseUs.description} />
          <div className="grid grid--4">
            {([['excellence', 'trophy'], ['team', 'users'], ['technology', 'chip'], ['results', 'target']] as const).map(([k, ic]) => (
              <div className="card" key={k}>
                <span className="icon-dot"><Icon name={ic} /></span>
                <h3>{h.whyChooseUs[k].title}</h3>
                <p>{k === 'excellence' ? s.home.fixExcellence : h.whyChooseUs[k].description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Program categories */}
      <section className="section">
        <div className="container">
          <SectionHead badge={trainingIntro.hero.badge} t={h.programs.title} hl={h.programs.titleHighlight} lead={h.programs.description}
            side={<Link className="link-arrow" href={`${base}/training`}>{s.common.learnMore}<span className="sr-only"> — {h.programs.title} {h.programs.titleHighlight}</span> <Arrow /></Link>} />
          <div className="grid grid--4">
            {Object.entries(h.programs.categoryCards).map(([k, card], i) => (
              <Link className={`feature feature--${TINTS[i % TINTS.length]} feature--compact`} href={`${base}/training#map`} key={k}>
                <span className="icon-dot"><Icon name={CATEGORY_ICONS[k] ?? 'robot'} /></span>
                <h3>{h.programs.categories[k as keyof typeof h.programs.categories]}</h3>
                <p>{card.shortDesc}</p>
                <div className="feature__meta"><span className="chip"><Icon name="users" /> {card.ageGroup}</span></div>
              </Link>
            ))}
          </div>
          <div className="card card--flat band">
            <h3>{h.programs.cta.question}</h3>
            <Link className="btn btn--outline" href={`${base}/contact?subject=inquiry`}>{h.programs.cta.button} <Arrow /></Link>
          </div>
        </div>
      </section>

      {/* Gallery teaser */}
      <section className="section">
        <div className="container">
          <SectionHead badge={h.gallery.badge} t={h.gallery.title} hl={h.gallery.titleHighlight} lead={h.gallery.description}
            side={<Link className="link-arrow" href={`${base}/gallery`}>{h.gallery.cta} <Arrow /></Link>} />
          <div className="mosaic">
            {gallery.map((g) => <Photo key={g.id} src={`/images/image-${g.id}.webp`} href={`${base}/gallery`} label={g.title} />)}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <div className="container">
          <div className="split split--top">
            <div className="section-head__main">
              <span className="pill pill--plain">{h.navigation.faq}</span>
              <Title t={h.faq.title} hl={h.faq.titleHighlight} className="h-section" />
              <a className="btn btn--outline" href={wa(s.common.whatsappHello)} target="_blank" rel="noopener"><Icon name="whatsapp" /> {s.common.chatWhatsapp}</a>
            </div>
            <div className="faq">
              {faq.map((q, i) => <details key={q.question} open={i === 0}><summary>{q.question}<Icon name="plus" className="faq__icon" /></summary><p>{q.answer}</p></details>)}
            </div>
          </div>
        </div>
      </section>

      <Closer badge={h.contactCTA.title2} t={h.contactCTA.title1}>
        <Link className="btn btn--gold btn--lg" href={`${base}/contact`} data-track="cta_click" data-track-label="home_closer">{h.contactCTA.contactBtn}</Link>
        <a className="btn btn--ghost-gold btn--lg" href={wa(h.contactCTA.profileBtn)} target="_blank" rel="noopener">{h.contactCTA.profileBtn} <Arrow /></a>
      </Closer>
    </>
  );
}
