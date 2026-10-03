// Technical Consultation — content: content/<lang>/technical-consultation.json
// The live page is intentionally short (hero + CTA); here it is built around the booking form.
import { contactForm } from './contact.mjs';

export const file = 'technical-consultation.html';

export function render(ctx) {
  const { c, s, cfg, esc, icon, wa, title } = ctx;
  const p = c['technical-consultation'];
  const dd = c.home.navigation.servicesDropdown;
  const hc = c.home.contact;

  const body = `
    <section class="page-hero page-hero--form">
      <div class="container">
        <div class="consult">
          <div class="consult__intro">
            <nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">${esc(s.nav.home)}</a><span>/</span><span>${esc(s.nav.services)}</span><span>/</span><span>${esc(dd.consultation)}</span></nav>
            <span class="pill pill--plain">${esc(p.hero.badge)}</span>
            <h1>${title(p.hero.headline, p.hero.headlineHighlight)}</h1>
            <p class="hero__lead">${esc(p.hero.description)}</p>
            <ul class="consult__channels">
              <li><a href="tel:${cfg.phoneTel}" data-track="phone_click"><span class="icon-dot">${icon('phone')}</span><span><strong>${esc(hc.callTitle)}</strong><span class="ltr">${cfg.phoneDisplay}</span></span></a></li>
              <li><a href="${wa(p.heroCta.bookConsultation)}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-label="consult_channel"><span class="icon-dot">${icon('whatsapp')}</span><span><strong>WhatsApp</strong><span class="ltr">${cfg.phoneDisplay}</span></span></a></li>
            </ul>
          </div>
          ${contactForm(ctx, { subject: 'Technical Consultation', heading: p.heroCta.bookConsultation, submitLabel: p.heroCta.bookConsultation, idPrefix: 'tc' })}
        </div>
      </div>
    </section>

    ${ctx.closer({
      t: p.cta.title,
      lead: p.cta.description,
      actions: `<a class="btn btn--gold btn--lg" href="${wa(p.cta.button)}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-label="consult_closer">${icon('whatsapp')} ${esc(p.cta.button)}</a>`,
    })}`;

  return { title: `${p.seo.title} | Robotrick`, description: p.seo.description, body };
}
