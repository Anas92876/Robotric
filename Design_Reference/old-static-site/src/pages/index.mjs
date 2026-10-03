// Home — content: content/<lang>/home.json (robotrick.net landing page).
import { SERVICES } from '../layout.mjs';

export const file = 'index.html';

const CATEGORY_ICONS = { Robotics: 'robot', AI: 'ai', VR: 'vr', '3D Printing': 'cube', Drones: 'drone', 'Web Dev': 'code', Competitions: 'trophy', EngineeringDesign: 'compass' };
const CATEGORY_TINTS = ['leaf', 'khaki', 'sand', 'cream', 'sage', 'straw', 'moss', 'fern'];
// Service-card features that quote an unconfirmed number (e.g. "2200+ Students Trained") are left out.
const hasNumber = (f) => /\d/.test(f);

export function render(ctx) {
  const { c, s, esc, icon, img, wa, title, head, arrow, yearsSince } = ctx;
  const h = c.home;
  const dd = h.navigation.servicesDropdown;
  const faq = h.faq.items.map((q, i) => ({ ...q, ...(s.home.fixFaq[i] || {}) }));
  const gallery = s.home.galleryIds.map((id) => s.gallery.items.find((g) => g.id === id));

  const body = `
    <!-- Hero -->
    <section class="hero">
      <div class="container">
        <div class="hero__split">
          <div class="hero__main">
            <a class="pill" href="about.html">${esc(h.hero.badge)} <span class="pill__arrow">${arrow}</span></a>
            <h1>${title(h.hero.headline, h.hero.headlineHighlight)}</h1>
            <div class="btn-row">
              <a class="btn btn--primary btn--lg" href="technical-consultation.html" data-track="cta_click" data-track-label="hero_consultation">${esc(h.hero.ctaExplore)}</a>
              <a class="btn btn--outline btn--lg" href="training.html">${esc(dd.training)} ${arrow}</a>
            </div>
          </div>
          <div class="hero__side">
            <div class="rotator" data-rotate='${esc(JSON.stringify(h.hero.typingSentences))}' aria-live="polite">
              <span class="rotator__dot"></span><span class="rotator__text">${esc(h.hero.typingSentences[0])}</span>
            </div>
            <p class="hero__lead">${esc(h.hero.description)}</p>
          </div>
        </div>

        <div class="halo">
          <span class="orb orb--a" aria-hidden="true"></span><span class="orb orb--b" aria-hidden="true"></span>
          <div class="lori" aria-hidden="true"><img src="${img('images/lori.webp')}" alt="" width="625" height="803"></div>
          <div class="device">
            <div class="device__bar"><i></i><i></i><i></i><span class="device__url">robotrick.net</span></div>
            <div class="device__photo">
              <img src="${img('images/about/image_2026-02-24_03-11-56.webp')}" alt="${esc(s.about.buildingAlt)}" width="1600" height="1067" fetchpriority="high">
              <div class="device__chips">
                <a class="chip chip--solid" href="training.html">${icon('robot')} ${esc(h.hero.training)}</a>
                <a class="chip chip--solid" href="technical-projects.html">${icon('gear')} ${esc(h.hero.projects)}</a>
                <a class="chip chip--solid" href="3d-printing.html">${icon('printer')} ${esc(h.hero.printing)}</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Numbers -->
    <section class="section section--tight">
      <div class="container">
        <div class="stats stats--4">
          <div class="stat">${yearsSince}<span>${esc(h.socialProof.yearsExperience)}</span></div>
          ${s.home.stats.map((x) => `<div class="stat"><b>${esc(x.value)}</b><span>${esc(h.socialProof[x.key])}</span></div>`).join('')}
        </div>
      </div>
    </section>

    <!-- About teaser -->
    <section class="section">
      <div class="container">
        ${head({ badge: h.about.badge, t: h.about.title, hl: h.about.titleHighlight, lead: h.about.additionalDescription, side: `<a class="link-arrow" href="about.html">${esc(s.common.learnMore)} ${arrow}</a>` })}
      </div>
    </section>

    <!-- Services -->
    <section class="section">
      <div class="container">
        ${head({ badge: h.services.badge, t: h.services.title, hl: h.services.titleHighlight, lead: h.services.description })}
        <div class="grid grid--3">
          ${SERVICES.map((x) => {
            const sv = h.services[x.key];
            const feats = sv.features.filter((f) => !hasNumber(f));
            return `<a class="feature feature--${x.tint}" href="${x.file}">
            <span class="icon-dot">${icon(x.icon)}</span>
            <h3>${esc(sv.title)}</h3>
            <p>${esc(sv.description)}</p>
            <div class="feature__meta">${feats.map((f) => `<span class="chip">${esc(f)}</span>`).join('')}</div>
            <span class="feature__foot link-arrow">${esc(sv.cta)} ${arrow}</span>
          </a>`;
          }).join('')}
        </div>
        <div class="card card--flat band">
          <h3>${esc(h.services.ctaText)}</h3>
          <a class="btn btn--primary" href="contact.html">${esc(h.services.ctaButton)} ${arrow}</a>
        </div>
      </div>
    </section>

    <!-- Why choose -->
    <section class="section">
      <div class="container">
        ${head({ badge: h.whyChooseUs.badge, t: h.whyChooseUs.title, hl: h.whyChooseUs.titleHighlight, lead: h.whyChooseUs.description })}
        <div class="grid grid--4">
          ${[['excellence', 'trophy'], ['team', 'users'], ['technology', 'chip'], ['results', 'target']].map(([k, ic]) => `
          <div class="card"><span class="icon-dot">${icon(ic)}</span><h3>${esc(h.whyChooseUs[k].title)}</h3><p>${esc(k === 'excellence' ? s.home.fixExcellence : h.whyChooseUs[k].description)}</p></div>`).join('')}
        </div>
      </div>
    </section>

    <!-- Program categories -->
    <section class="section">
      <div class="container">
        ${head({ badge: c['training-intro'].hero.badge, t: h.programs.title, hl: h.programs.titleHighlight, lead: h.programs.description, side: `<a class="link-arrow" href="training.html">${esc(s.common.learnMore)} ${arrow}</a>` })}
        <div class="grid grid--4">
          ${Object.entries(h.programs.categoryCards).map(([k, card], i) => `
          <a class="feature feature--${CATEGORY_TINTS[i % CATEGORY_TINTS.length]} feature--compact" href="training.html#map">
            <span class="icon-dot">${icon(CATEGORY_ICONS[k] || 'robot')}</span>
            <h3>${esc(h.programs.categories[k])}</h3>
            <p>${esc(card.shortDesc)}</p>
            <div class="feature__meta"><span class="chip">${icon('users')} ${esc(card.ageGroup)}</span></div>
          </a>`).join('')}
        </div>
        <div class="card card--flat band">
          <h3>${esc(h.programs.cta.question)}</h3>
          <a class="btn btn--outline" href="contact.html?subject=inquiry">${esc(h.programs.cta.button)} ${arrow}</a>
        </div>
      </div>
    </section>

    <!-- Gallery teaser -->
    <section class="section">
      <div class="container">
        ${head({ badge: h.gallery.badge, t: h.gallery.title, hl: h.gallery.titleHighlight, lead: h.gallery.description, side: `<a class="link-arrow" href="gallery.html">${esc(h.gallery.cta)} ${arrow}</a>` })}
        <div class="mosaic">
          ${gallery.map((g) => `<a class="photo" href="gallery.html" style="--img:url(${img(`images/image-${g.id}.webp`)})" aria-label="${esc(g.title)}"></a>`).join('')}
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="section">
      <div class="container">
        <div class="split split--top">
          <div class="section-head__main">
            <span class="pill pill--plain">${esc(h.navigation.faq)}</span>
            <h2 class="h-section">${title(h.faq.title, h.faq.titleHighlight)}</h2>
            <a class="btn btn--outline" href="${wa(s.common.whatsappHello)}" target="_blank" rel="noopener">${icon('whatsapp')} ${esc(s.common.chatWhatsapp)}</a>
          </div>
          <div class="faq">
            ${faq.map((q, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(q.question)}</summary><p>${esc(q.answer)}</p></details>`).join('')}
          </div>
        </div>
      </div>
    </section>

    ${ctx.closer({
      badge: h.contactCTA.title2,
      t: h.contactCTA.title1,
      actions: `<a class="btn btn--gold btn--lg" href="contact.html" data-track="cta_click" data-track-label="home_closer">${esc(h.contactCTA.contactBtn)}</a>
            <a class="btn btn--ghost-gold btn--lg" href="${wa(h.contactCTA.profileBtn)}" target="_blank" rel="noopener">${esc(h.contactCTA.profileBtn)} ${arrow}</a>`,
    })}`;

  return {
    title: ctx.isAr ? 'روبوتريك | شركة روبوتيك وتكنولوجيا في سوريا' : 'Robotrick | Robotics & Technology Company in Syria',
    description: ctx.isAr
      ? 'روبوتريك شركة متخصصة في الروبوتات والتكنولوجيا في حلب، سوريا. نقدم برامج تدريبية، مشاريع تقنية، طباعة ثلاثية الأبعاد وحلول STEM احترافية.'
      : 'Robotrick is a professional robotics and technology company in Aleppo, Syria. We offer training programs, custom technical projects, 3D printing, and STEM solutions.',
    body,
  };
}
