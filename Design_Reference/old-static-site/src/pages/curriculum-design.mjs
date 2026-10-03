// Educational Technical Curriculum Design — content: content/<lang>/curriculum-design.json
export const file = 'curriculum-design.html';

const WHY_ICONS = ['book', 'users', 'tool'];
const STAFF_ICONS = ['school', 'users'];

export function render(ctx) {
  const { c, s, esc, icon, wa, head, pageHero, arrow } = ctx;
  const p = c['curriculum-design'];
  const dd = c.home.navigation.servicesDropdown;

  const body = `
    ${pageHero({
      crumbs: [{ label: s.nav.services }, { label: dd.curriculumDesign }],
      badge: p.hero.badge, t: p.hero.headline, hl: p.hero.headlineHighlight, lead: p.hero.description,
      actions: `<a class="btn btn--primary" href="contact.html?subject=partnership" data-track="cta_click" data-track-label="curriculum_hero">${esc(p.heroCta.bookConsultation)}</a>`,
      extra: `<blockquote class="pullquote"><span aria-hidden="true">“</span>${esc(p.hero.tagline)}</blockquote>`,
    })}

    <!-- Why our curricula -->
    <section class="section">
      <div class="container">
        ${head({ badge: p.why.badge, t: p.why.title, hl: p.why.titleHighlight })}
        <div class="grid grid--3">
          ${p.why.items.map((it, i) => `
          <article class="feature feature--${['moss', 'leaf', 'khaki'][i]}"><span class="icon-dot">${icon(WHY_ICONS[i])}</span><h3>${esc(it.title)}</h3><p>${esc(it.description)}</p></article>`).join('')}
        </div>
      </div>
    </section>

    <!-- Methodology -->
    <section class="section">
      <div class="container">
        ${head({ badge: p.methodology.badge, t: p.methodology.title, lead: p.methodology.description })}
        <ol class="phases">
          ${p.methodology.steps.map((st, i) => `
          <li class="phase"><span class="phase__num">${i + 1}</span><h3>${esc(st.title)}</h3><p>${esc(st.description)}</p></li>`).join('')}
        </ol>
      </div>
    </section>

    <!-- Staffing options -->
    <section class="section">
      <div class="container">
        ${head({ badge: p.staff.badge, t: p.staff.title, hl: p.staff.titleHighlight, lead: p.staff.description })}
        <div class="options">
          ${p.staff.items.map((it, i) => `
          <article class="option${i === 0 ? ' option--a' : ' option--b'}">
            <span class="option__letter" aria-hidden="true">${i === 0 ? 'A' : 'B'}</span>
            <span class="icon-dot">${icon(STAFF_ICONS[i])}</span>
            <h3>${esc(it.title)}</h3>
            <p>${esc(it.description)}</p>
          </article>`).join(`<span class="options__or" aria-hidden="true">/</span>`)}
        </div>
      </div>
    </section>

    <!-- Guaranteed results -->
    <section class="section">
      <div class="container">
        <div class="results">
          <div>
            <span class="pill">${esc(p.results.badge)} <span class="pill__arrow">${arrow}</span></span>
            <h2>${esc(p.results.title)} <em class="hl hl--gold">${esc(p.results.titleHighlight)}</em></h2>
          </div>
          <ol class="results__list">
            ${p.results.items.map((r, i) => `<li><span>0${i + 1}</span><p>${esc(r)}</p></li>`).join('')}
          </ol>
        </div>
      </div>
    </section>

    ${ctx.closer({
      t: p.cta.title,
      lead: p.cta.description,
      actions: `<a class="btn btn--gold btn--lg" href="contact.html?subject=partnership" data-track="cta_click" data-track-label="curriculum_closer">${esc(p.cta.button)}</a>
            <a class="btn btn--ghost-gold btn--lg" href="${wa(p.cta.title)}" target="_blank" rel="noopener">${icon('whatsapp')} ${esc(s.common.chatWhatsapp)}</a>`,
    })}`;

  return { title: `${p.seo.title} | Robotrick`, description: p.seo.description, body };
}
