// Integrated STEM Lab Setup — content: content/<lang>/stem-lab-setup.json
export const file = 'stem-lab-setup.html';

const STEP_ICONS = ['search', 'compass', 'chip', 'users'];
const STEP_TINTS = ['sage', 'cream', 'khaki', 'leaf'];
const WHY_ICONS = ['target', 'award', 'leaf'];

export function render(ctx) {
  const { c, s, esc, icon, wa, head, pageHero } = ctx;
  const p = c['stem-lab-setup'];
  const dd = c.home.navigation.servicesDropdown;

  // "Title: detail" items render with the title emphasised, as on the live page
  const item = (x) => {
    const i = x.indexOf(':');
    return i > 0 ? `<li><span><strong>${esc(x.slice(0, i).trim())}</strong>${esc(x.slice(i))}</span></li>` : `<li>${esc(x)}</li>`;
  };

  const body = `
    ${pageHero({
      crumbs: [{ label: s.nav.services }, { label: dd.stemLabSetup }],
      badge: p.hero.badge, t: p.hero.headline, hl: p.hero.headlineHighlight, lead: p.hero.description,
      actions: `<a class="btn btn--primary" href="contact.html?subject=partnership" data-track="cta_click" data-track-label="stem_hero">${esc(p.cta.button)}</a>`,
    })}

    <!-- 4-step process -->
    <section class="section">
      <div class="container">
        ${head({ badge: p.process.badge, t: p.process.title, hl: p.process.titleHighlight, lead: p.process.subtitle })}
        <ol class="lab-steps">
          ${p.process.steps.map((st, i) => `
          <li class="lab-step lab-step--${STEP_TINTS[i]}">
            <div class="lab-step__num"><span>${i + 1}</span><span class="icon-dot icon-dot--ink">${icon(STEP_ICONS[i])}</span></div>
            <div class="lab-step__body">
              <h3>${esc(st.title)}</h3>
              <p class="lab-step__intro">${esc(st.description)}</p>
              <ul class="checks">${st.items.map(item).join('')}</ul>
            </div>
          </li>`).join('')}
        </ol>
      </div>
    </section>

    <!-- Why choose -->
    <section class="section">
      <div class="container">
        ${head({ t: p.whyChoose.title, hl: p.whyChoose.titleHighlight })}
        <div class="grid grid--3">
          ${p.whyChoose.items.map((it, i) => `
          <div class="card"><span class="icon-dot">${icon(WHY_ICONS[i])}</span><h3>${esc(it.title)}</h3><p>${esc(it.description)}</p></div>`).join('')}
        </div>
      </div>
    </section>

    ${ctx.closer({
      t: p.cta.title,
      lead: p.cta.description,
      actions: `<a class="btn btn--gold btn--lg" href="contact.html?subject=partnership" data-track="cta_click" data-track-label="stem_closer">${esc(p.cta.button)}</a>
            <a class="btn btn--ghost-gold btn--lg" href="${wa(p.cta.title)}" target="_blank" rel="noopener">${icon('whatsapp')} ${esc(s.common.chatWhatsapp)}</a>`,
    })}`;

  return { title: `${p.seo.title} | Robotrick`, description: p.seo.description, body };
}
