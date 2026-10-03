// 3D Printing — content: content/<lang>/3d-printing.json
export const file = '3d-printing.html';

const DESIGN_ICONS = ['compass', 'tool', 'layers'];
const MATERIAL_SWATCHES = [
  ['#cccc99', '#9dbb86', '#ffffcc', '#2a4e1c'], // PLA — "various colors"
  ['#003300', '#5f6e5b'],                       // PETG / ABS — engineering parts
  ['#475a47'],                                   // TPU — flexible
];
const PROJECT_ICONS = ['lightbulb', 'layers', 'award'];
const FEATURE_ICONS = ['chat', 'brush', 'doc', 'scale', 'bolt'];

export function render(ctx) {
  const { c, s, esc, icon, img, wa, title, head, pageHero, arrow } = ctx;
  const p = c['3d-printing'];
  const dd = c.home.navigation.servicesDropdown;
  const quote = wa(`${p.cta.title} — ${p.hero.headline}`);

  const body = `
    ${pageHero({
      crumbs: [{ label: s.nav.services }, { label: dd.printing }],
      badge: p.hero.badge, t: p.hero.headline, hl: p.hero.headlineHighlight,
      aside: `<figure class="photo photo--wide hero-photo" style="--img:url(${img('images/services/3d-printing.webp')})" role="img" aria-label="${esc(p.hero.headline)}"></figure>`,
      lead: p.hero.description,
      actions: `<a class="btn btn--primary" href="${quote}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-label="print_hero">${icon('whatsapp')} ${esc(p.cta.button)}</a>`,
    })}

    <!-- Design capabilities -->
    <section class="section">
      <div class="container">
        ${head({ badge: p.design.badge, t: p.design.title, hl: p.design.titleHighlight })}
        <div class="steps steps--3">
          ${p.design.items.map((it, i) => `<div class="step"><span class="icon-dot">${icon(DESIGN_ICONS[i])}</span><h3>${esc(it.title)}</h3><p>${esc(it.description)}</p></div>`).join('')}
        </div>
      </div>
    </section>

    <!-- Materials -->
    <section class="section">
      <div class="container">
        ${head({ badge: p.materials.badge, t: p.materials.title, hl: p.materials.titleHighlight })}
        <div class="materials">
          ${p.materials.items.map((m, i) => `
          <article class="material">
            <div class="material__spool" aria-hidden="true">${MATERIAL_SWATCHES[i].map((col) => `<span style="background:${col}"></span>`).join('')}</div>
            <h3 class="ltr">${esc(m.name)}</h3>
            <p>${esc(m.description)}</p>
          </article>`).join('')}
        </div>
      </div>
    </section>

    <!-- Integrated projects -->
    <section class="section">
      <div class="container">
        ${head({ badge: p.projects.badge, t: p.projects.title, hl: p.projects.titleHighlight })}
        <div class="grid grid--3">
          ${p.projects.items.map((it, i) => `
          <article class="feature feature--${['cream', 'straw', 'sand'][i]}"><span class="icon-dot">${icon(PROJECT_ICONS[i])}</span><h3>${esc(it.title)}</h3><p>${esc(it.description)}</p></article>`).join('')}
        </div>
      </div>
    </section>

    <!-- What distinguishes our service -->
    <section class="section">
      <div class="container">
        <div class="split split--top">
          <div class="section-head__main">
            <span class="pill pill--plain">${esc(p.features.badge)}</span>
            <h2 class="h-section">${esc(p.features.title)}</h2>
          </div>
          <ul class="feature-list">
            ${p.features.items.map((it, i) => `<li><span class="icon-dot icon-dot--ink">${icon(FEATURE_ICONS[i])}</span><div><h3>${esc(it.title)}</h3><p>${esc(it.description)}</p></div></li>`).join('')}
          </ul>
        </div>
      </div>
    </section>

    ${ctx.closer({
      t: p.cta.title,
      lead: p.cta.description,
      actions: `<a class="btn btn--gold btn--lg" href="${quote}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-label="print_closer">${icon('whatsapp')} ${esc(p.cta.button)}</a>
            <a class="btn btn--ghost-gold btn--lg" href="contact.html?subject=general">${esc(s.nav.contact)} ${arrow}</a>`,
    })}`;

  return { title: `${p.seo.title} | Robotrick`, description: p.seo.description, body };
}
