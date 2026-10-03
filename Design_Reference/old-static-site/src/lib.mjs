// Helpers shared by the layout and every page template.
import { ICONS } from './icons.mjs';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function makeCtx({ lang, file, content, site, cfg }) {
  const isAr = lang === 'ar';
  const root = isAr ? '../' : '';
  const icon = (n) => ICONS[n] ?? '';
  const wa = (text) => `https://wa.me/${cfg.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
  const img = (p) => root + p;
  const arrow = '<span class="arrow">→</span>';

  // "Title <em>Highlight</em>" — the highlight is optional in the source content
  const title = (t, hl) => [esc(t), hl ? `<em class="hl">${esc(hl)}</em>` : ''].filter(Boolean).join(' ');

  // DESIGN.md section opener: pill badge → heading → description
  const head = ({ badge, t, hl, lead, side = '', center = false, id = '' }) => `
        <div class="section-head${center ? ' section-head--center' : ''}"${id ? ` id="${id}"` : ''}>
          <div class="section-head__main">
            ${badge ? `<span class="pill pill--plain">${esc(badge)}</span>` : ''}
            <h2>${title(t, hl)}</h2>
          </div>
          ${lead || side ? `<div class="section-head__side">${lead ? `<p>${esc(lead)}</p>` : ''}${side}</div>` : ''}
        </div>`;

  // Inner-page hero: breadcrumb, badge, h1 on one side; description + actions on the other
  const pageHero = ({ crumbs = [], badge, t, hl, lead, actions = '', extra = '', aside = '' }) => `
    <section class="page-hero">
      <div class="container">
        <div class="hero__split">
          <div class="hero__main">
            <nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">${esc(site.nav.home)}</a>${crumbs.map((c) => `<span>/</span>${c.href ? `<a href="${c.href}">${esc(c.label)}</a>` : `<span>${esc(c.label)}</span>`}`).join('')}</nav>
            ${badge ? `<span class="pill pill--plain">${esc(badge)}</span>` : ''}
            <h1>${title(t, hl)}</h1>
          </div>
          <div class="hero__side">
            ${aside}
            ${lead ? `<p class="hero__lead">${esc(lead)}</p>` : ''}
            ${actions ? `<div class="btn-row">${actions}</div>` : ''}
          </div>
        </div>
        ${extra}
      </div>
    </section>`;

  // Dark brand-register closing banner (one per page, each with that page's own CTA copy)
  const closer = ({ badge, t, lead, actions, meta = '' }) => `
    <section class="section">
      <div class="container">
        <div class="closer">
          ${badge ? `<span class="pill">${esc(badge)} <span class="pill__arrow">${arrow}</span></span>` : ''}
          <h2>${esc(t)}</h2>
          ${lead ? `<p>${esc(lead)}</p>` : ''}
          <div class="btn-row" style="justify-content:center">${actions}</div>
          ${meta}
        </div>
      </div>
    </section>`;

  const yearsSince = `<b data-years-since="2022">${new Date().getFullYear() - 2022}</b>`;

  return { lang, isAr, file, root, c: content, s: site, cfg, icon, wa, img, esc, arrow, title, head, pageHero, closer, yearsSince };
}
