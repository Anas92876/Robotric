// Technical Projects — content: content/<lang>/technical-projects.json
export const file = 'technical-projects.html';

const CAP_ICONS = ['robot', 'gear', 'chip'];
const EXAMPLE_ICONS = ['layers', 'leaf', 'school'];
const FEATURE_ICONS = ['spark', 'doc', 'shield', 'lock'];

export function render(ctx) {
  const { c, s, esc, icon, img, title, head, pageHero, arrow } = ctx;
  const p = c['technical-projects'];
  const dd = c.home.navigation.servicesDropdown;

  const body = `
    ${pageHero({
      crumbs: [{ label: s.nav.services }, { label: dd.projects }],
      badge: p.hero.badge, t: p.hero.headline, hl: p.hero.headlineHighlight, lead: p.hero.description,
      actions: `<a class="btn btn--primary" href="contact.html?subject=partnership" data-track="cta_click" data-track-label="projects_start">${esc(p.heroCta.startProject)}</a>
              <a class="btn btn--outline" href="gallery.html#projects">${esc(p.heroCta.viewWork)} ${arrow}</a>`,
    })}

    <!-- Capabilities -->
    <section class="section section--tight">
      <div class="container">
        <div class="cap">
          <figure class="photo cap__photo" style="--img:url(${img('images/services/tech.webp')})" role="img" aria-label="${esc(p.capabilities.title)} ${esc(p.capabilities.titleHighlight)}"></figure>
          <div class="cap__body">
            ${head({ badge: p.capabilities.badge, t: p.capabilities.title, hl: p.capabilities.titleHighlight, lead: p.capabilities.description })}
            <ul class="cap__list">
              ${p.capabilities.items.map((it, i) => `<li><span class="icon-dot icon-dot--ink">${icon(CAP_ICONS[i])}</span><div><h3>${esc(it.title)}</h3><p>${esc(it.description)}</p></div></li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Project examples -->
    <section class="section">
      <div class="container">
        ${head({ t: p.projects.title, hl: p.projects.titleHighlight, lead: p.projects.description })}
        <div class="grid grid--3">
          ${p.projects.items.map((it, i) => `
          <article class="feature feature--${['khaki', 'leaf', 'sage'][i]}">
            <span class="feature__num">0${i + 1}</span>
            <span class="icon-dot">${icon(EXAMPLE_ICONS[i])}</span>
            <h3>${esc(it.title)}</h3>
            <p>${esc(it.description)}</p>
          </article>`).join('')}
        </div>
      </div>
    </section>

    <!-- Journey timeline -->
    <section class="section">
      <div class="container">
        ${head({ badge: p.journey.badge, t: p.journey.title, hl: p.journey.titleHighlight, lead: p.journey.description })}
        <ol class="vtimeline">
          ${p.journey.steps.map((st, i) => `
          <li class="vtimeline__step">
            <span class="vtimeline__dot">${i + 1}</span>
            <div class="vtimeline__card">
              <span class="label">${esc(st.subtitle)}</span>
              <h3>${esc(st.title)}</h3>
              <ul class="vtimeline__items">${st.items.map((x) => {
                const [lead, ...rest] = x.split(':');
                return rest.length ? `<li><strong>${esc(lead)}:</strong>${esc(rest.join(':'))}</li>` : `<li>${esc(x)}</li>`;
              }).join('')}</ul>
            </div>
          </li>`).join('')}
        </ol>
      </div>
    </section>

    <!-- What distinguishes us -->
    <section class="section">
      <div class="container">
        ${head({ t: p.features.title })}
        <div class="grid grid--2">
          ${p.features.items.map((it, i) => `
          <div class="card card--row"><span class="icon-dot">${icon(FEATURE_ICONS[i])}</span><div><h3>${esc(it.title)}</h3><p>${esc(it.description)}</p></div></div>`).join('')}
        </div>
      </div>
    </section>

    ${ctx.closer({
      t: p.cta.title,
      lead: p.cta.description,
      actions: `<a class="btn btn--gold btn--lg" href="contact.html?subject=partnership" data-track="cta_click" data-track-label="projects_closer">${esc(p.cta.button)}</a>
            <a class="btn btn--ghost-gold btn--lg" href="${ctx.wa(p.cta.title)}" target="_blank" rel="noopener">${icon('whatsapp')} ${esc(s.common.chatWhatsapp)}</a>`,
    })}`;

  return { title: `${p.seo.title} | Robotrick`, description: p.seo.description, body };
}
