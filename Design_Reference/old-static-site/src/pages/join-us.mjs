// Join Us — content: content/<lang>/home.json → joinUs (hero, benefits) + site.json → join.
// Open positions are loaded live from the backend (GET /public/jobs), exactly like robotrick.net,
// so the list is always the one reception publishes — never a stale hard-coded list.
export const file = 'join-us.html';

const BENEFIT_ICONS = ['spark', 'leaf', 'robot'];

export function render(ctx) {
  const { c, s, esc, icon, img, pageHero } = ctx;
  const j = c.home.joinUs;
  const t = s.join;
  const benefits = ['creativeEnvironment', 'growth', 'innovativeProjects'];

  const body = `
    ${pageHero({
      crumbs: [{ label: s.nav.joinUs }],
      badge: t.badge, t: j.hero.title, lead: j.hero.subtitle,
      aside: `<figure class="photo photo--wide hero-photo" style="--img:url(${img('images/image-2.webp')})" role="img" aria-label="Robotrick team"></figure>`,
      actions: `<a class="btn btn--primary" href="#positions">${esc(t.openTitle)}</a>`,
    })}

    <!-- Open positions (live) -->
    <section class="section" id="positions">
      <div class="container">
        ${ctx.head({ t: t.openTitle, lead: t.openLead })}
        <div class="jobs" data-jobs data-lang="${ctx.lang}"
          data-label-new="${esc(t.new)}" data-label-whatsapp="${esc(t.viaWhatsapp)}" data-label-form="${esc(t.viaForm)}" data-label-open="${esc(t.openPage)}"
          data-label-empty="${esc(t.empty)}" data-label-empty-lead="${esc(t.emptyLead)}" data-label-error="${esc(t.error)}" data-label-retry="${esc(t.retry)}">
          <p class="jobs__status">${esc(t.loading)}</p>
        </div>
      </div>
    </section>

    <!-- Why join -->
    <section class="section">
      <div class="container">
        ${ctx.head({ t: j.benefits.title, lead: j.benefits.subtitle })}
        <div class="grid grid--3">
          ${benefits.map((k, i) => `
          <div class="card"><span class="icon-dot">${icon(BENEFIT_ICONS[i])}</span><h3>${esc(j.benefits[k].title)}</h3><p>${esc(j.benefits[k].description)}</p></div>`).join('')}
        </div>
      </div>
    </section>

    <!-- How to apply -->
    <section class="section">
      <div class="container">
        ${ctx.head({ t: t.howTitle, center: true })}
        <ol class="journey journey--3">
          ${t.howSteps.map((st, i) => `<li class="journey__step"><span class="journey__num">${i + 1}</span><span class="journey__text">${esc(st)}</span></li>`).join('')}
        </ol>
      </div>
    </section>`;

  return { title: t.seoTitle, description: t.seoDescription, body };
}
