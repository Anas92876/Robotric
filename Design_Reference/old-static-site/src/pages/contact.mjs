// Contact — content: content/<lang>/home.json → contact (the live contact section) + site.json → contactPage
export const file = 'contact.html';

// Contact form, reused by the Technical Consultation page. Posts to /api/contact exactly like the live site:
// { name, phone, subject (the visible label, or the custom text for "Other"), message? }
export function contactForm(ctx, { subject = null, heading = null, submitLabel = null, idPrefix = 'c' } = {}) {
  const { c, esc, icon, wa } = ctx;
  const f = c.home.contact.form;
  const v = c.home.contact.validation;
  const opts = f.subjectOptions;
  const selected = subject === 'Technical Consultation' ? opts.consultation : opts.inquiry;
  const id = (k) => `${idPrefix}-${k}`;
  return `
          <form class="card form" data-contact novalidate
            data-msg-name-required="${esc(v.nameRequired)}" data-msg-name-min="${esc(v.nameMinLength)}"
            data-msg-phone-required="${esc(v.phoneRequired)}" data-msg-phone-invalid="${esc(v.phoneInvalid)}"
            data-msg-form-error="${esc(v.formError)}" data-msg-success="${esc(v.success)}" data-msg-success-lead="${esc(v.successMessage)}"
            data-msg-sending="${esc(f.submitting)}">
            ${heading ? `<h2 class="form__title">${esc(heading)}</h2>` : ''}
            <div class="form__row">
              <div class="field"><label for="${id('name')}">${esc(f.nameLabel)}</label><input id="${id('name')}" name="name" required minlength="2" autocomplete="name" placeholder="${esc(f.namePlaceholder)}"><small class="field__error" hidden></small></div>
              <div class="field"><label for="${id('phone')}">${esc(f.phoneLabel)}</label><input id="${id('phone')}" name="phone" type="tel" required autocomplete="tel" placeholder="${esc(f.phonePlaceholder)}"><small class="field__error" hidden></small></div>
            </div>
            <div class="field">
              <label for="${id('subject')}">${esc(f.subjectLabel)}</label>
              <select id="${id('subject')}" name="subject">
                ${['inquiry', 'partnership', 'general', 'consultation', 'other'].map((k) => `<option value="${esc(opts[k])}"${k === 'other' ? ' data-other' : ''}${opts[k] === selected ? ' selected' : ''}>${esc(opts[k])}</option>`).join('')}
              </select>
            </div>
            <div class="field" data-subject-other hidden><label class="sr-only" for="${id('other')}">${esc(opts.other)}</label><input id="${id('other')}" name="customSubject" placeholder="${esc(f.customSubjectPlaceholder)}"></div>
            <div class="field"><label for="${id('msg')}">${esc(f.messageLabel)}</label><textarea id="${id('msg')}" name="message" placeholder="${esc(f.messagePlaceholder)}"></textarea></div>
            <button class="btn btn--primary btn--lg" type="submit">${esc(submitLabel || f.submit)}</button>
            <div class="form__status" role="status" aria-live="polite"></div>
            <div class="or">${esc(f.orConnect)}</div>
            <a class="btn btn--outline btn--lg" href="${wa(ctx.s.common.whatsappHello)}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-label="form_instant">${icon('whatsapp')} ${esc(f.whatsapp)}</a>
          </form>`;
}

export function render(ctx) {
  const { c, s, cfg, esc, icon, pageHero } = ctx;
  const hc = c.home.contact;
  const visit = hc.visitLocation.split(/<br\s*\/?>/i).map(esc).join('<br>');

  const body = `
    ${pageHero({ crumbs: [{ label: s.nav.contact }], badge: s.nav.contact, t: hc.title, hl: hc.titleHighlight, lead: hc.description })}

    <section class="section section--tight">
      <div class="container">
        <div class="contact-cards">
          <a class="contact-card" href="tel:${cfg.phoneTel}" data-track="phone_click">
            <span class="icon-dot icon-dot--ink">${icon('phone')}</span>
            <h3>${esc(hc.callTitle)}</h3>
            <p class="ltr">${cfg.phoneDisplay}</p>
            <small>${esc(hc.callHours)}</small>
          </a>
          <a class="contact-card" href="${cfg.maps}" target="_blank" rel="noopener">
            <span class="icon-dot icon-dot--ink">${icon('pin')}</span>
            <h3>${esc(hc.visitTitle)}</h3>
            <p>${visit}</p>
          </a>
          <a class="contact-card" href="mailto:${cfg.email}" data-track="email_click">
            <span class="icon-dot icon-dot--ink">${icon('mail')}</span>
            <h3>${esc(hc.emailTitle)}</h3>
            <p>${cfg.email}</p>
          </a>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="split split--top">
          ${contactForm(ctx, { idPrefix: 'c' })}
          <iframe class="map" title="${esc(hc.visitTitle)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=36.2137733,37.151768&amp;z=16&amp;hl=${ctx.lang}&amp;output=embed"></iframe>
        </div>
      </div>
    </section>`;

  return { title: s.contactPage.seoTitle, description: s.contactPage.seoDescription, body };
}
