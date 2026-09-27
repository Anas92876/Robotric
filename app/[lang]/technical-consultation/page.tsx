import { Suspense } from 'react';
import { resolvePage } from '@/lib/page';
import { pageMeta } from '@/lib/meta';
import { Icon } from '@/lib/icons';
import { SITE, wa } from '@/lib/config';
import { Closer, Crumbs, Title } from '@/components/ui';
import ContactForm from '@/components/ContactForm';

export async function generateMetadata({ params }: PageProps<'/[lang]/technical-consultation'>) {
  const { lang, c } = await resolvePage(params);
  return pageMeta(lang, 'technical-consultation', `${c.consultation.seo.title} | Robotrick`, c.consultation.seo.description);
}

// The live page is short (hero + CTA), so this page is built around booking
export default async function ConsultationPage({ params }: PageProps<'/[lang]/technical-consultation'>) {
  const { c, base } = await resolvePage(params);
  const p = c.consultation, s = c.site, hc = c.home.contact;

  return (
    <>
      <section className="page-hero page-hero--form">
        <span className="gear-deco gear-deco--1" aria-hidden="true"><Icon name="gear" /></span>
        <div className="container">
          <div className="consult">
            <div className="consult__intro">
              <Crumbs home={s.nav.home} homeHref={base} items={[{ label: s.nav.services }, { label: c.home.navigation.servicesDropdown.consultation }]} />
              <span className="pill pill--plain">{p.hero.badge}</span>
              <Title as="h1" t={p.hero.headline} hl={p.hero.headlineHighlight} />
              <p className="hero__lead">{p.hero.description}</p>
              <ul className="consult__channels">
                <li><a href={`tel:${SITE.phoneTel}`} data-track="phone_click"><span className="icon-dot"><Icon name="phone" /></span><span><strong>{hc.callTitle}</strong><span className="ltr">{SITE.phoneDisplay}</span></span></a></li>
                <li><a href={wa(p.heroCta.bookConsultation)} target="_blank" rel="noopener" data-track="whatsapp_click" data-track-label="consult_channel"><span className="icon-dot"><Icon name="whatsapp" /></span><span><strong>WhatsApp</strong><span className="ltr">{SITE.phoneDisplay}</span></span></a></li>
              </ul>
            </div>
            <Suspense>
              <ContactForm labels={{ form: hc.form, validation: hc.validation }} apiBase={SITE.browserApiBase} waNumber={SITE.whatsapp} waHello={s.common.whatsappHello}
                heading={p.heroCta.bookConsultation} submitLabel={p.heroCta.bookConsultation} defaultSubject="consultation" idPrefix="tc" />
            </Suspense>
          </div>
        </div>
      </section>

      <Closer t={p.cta.title} lead={p.cta.description}>
        <a className="btn btn--gold btn--lg" href={wa(p.cta.button)} target="_blank" rel="noopener" data-track="whatsapp_click" data-track-label="consult_closer"><Icon name="whatsapp" /> {p.cta.button}</a>
      </Closer>
    </>
  );
}
