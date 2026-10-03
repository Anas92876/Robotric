import { Suspense } from 'react';
import { resolvePage } from '@/lib/page';
import { pageMeta } from '@/lib/meta';
import { Icon } from '@/lib/icons';
import { SITE } from '@/lib/config';
import { Crumbs, PageHero } from '@/components/ui';
import ContactForm from '@/components/ContactForm';

export async function generateMetadata({ params }: PageProps<'/[lang]/contact'>) {
  const { lang, c } = await resolvePage(params);
  return pageMeta(lang, 'contact', c.site.contactPage.seoTitle, c.site.contactPage.seoDescription);
}

export default async function ContactPage({ params }: PageProps<'/[lang]/contact'>) {
  const { lang, c, base } = await resolvePage(params);
  const hc = c.home.contact, s = c.site;
  const visitLines = hc.visitLocation.split(/<br\s*\/?>/i);

  return (
    <>
      <PageHero crumbs={<Crumbs home={s.nav.home} homeHref={base} items={[{ label: s.nav.contact }]} />} badge={s.nav.contact} t={hc.title} hl={hc.titleHighlight} lead={hc.description} />

      <section className="section section--tight">
        <div className="container">
          <div className="contact-cards">
            <a className="contact-card" href={`tel:${SITE.phoneTel}`} data-track="phone_click">
              <span className="icon-dot icon-dot--ink"><Icon name="phone" /></span>
              <h3>{hc.callTitle}</h3>
              <p className="ltr">{SITE.phoneDisplay}</p>
              <small>{hc.callHours}</small>
            </a>
            <a className="contact-card" href={SITE.maps} target="_blank" rel="noopener">
              <span className="icon-dot icon-dot--ink"><Icon name="pin" /></span>
              <h3>{hc.visitTitle}</h3>
              <p>{visitLines.map((l, i) => <span key={l} style={{ display: 'block' }}>{i ? l.trim() : l}</span>)}</p>
            </a>
            <a className="contact-card" href={`mailto:${SITE.email}`} data-track="email_click">
              <span className="icon-dot icon-dot--ink"><Icon name="mail" /></span>
              <h3>{hc.emailTitle}</h3>
              <p>{SITE.email}</p>
            </a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="split split--top">
            {/* Plain wrapper so the page-reveal animation lands here, not on the late-hydrating form */}
            <div>
            <Suspense>
              <ContactForm labels={{ form: hc.form, validation: hc.validation }} apiBase={SITE.browserApiBase} waNumber={SITE.whatsapp} waHello={s.common.whatsappHello} />
            </Suspense>
            </div>
            <iframe className="map" title={hc.visitTitle} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`${SITE.mapEmbed}&hl=${lang}`} />
          </div>
        </div>
      </section>
    </>
  );
}
