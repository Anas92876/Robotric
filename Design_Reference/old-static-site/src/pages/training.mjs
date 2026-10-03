// Training — content: content/<lang>/training-intro.json (hero, stats labels, CTA)
//                     content/<lang>/training-map.json   (the live "Program Map": 4 tracks, 8 departments, FAQ)
//                     content/<lang>/home.json → progressSteps
export const file = 'training.html';

const TRACK_ICONS = { summer: 'sun', winter: 'snow', yearRound: 'calendar', competitions: 'trophy' };
const DEPT_ICONS = ['robot', 'drone', 'ai', 'cube', 'vr', 'compass', 'code', 'chip'];
const DEPT_TINTS = ['leaf', 'sage', 'khaki', 'cream', 'sand', 'moss', 'straw', 'fern'];

export function render(ctx) {
  const { c, s, esc, icon, img, wa, title, head, pageHero, arrow, yearsSince } = ctx;
  const intro = c['training-intro'];
  const map = c['training-map'];
  const t = s.training;
  const tracks = Object.values(map.tracks);
  const enrollMsg = (name) => `${map.whatsappPrefix} ${name}${map.whatsappSuffix}`;

  const enroll = (p) => p.available === false
    ? `<span class="btn btn--sm btn--disabled" aria-disabled="true">${esc(map.comingSoon)}</span>`
    : `<a class="btn btn--primary btn--sm" href="${wa(enrollMsg(p.title))}" target="_blank" rel="noopener" data-track="program_inquiry" data-track-label="${esc(p.title)}">${icon('whatsapp')} ${esc(map.enrollCta)}</a>`;

  const learnList = (items) => `<div class="learn"><span class="label">${esc(t.whatYouLearn)}</span><ul class="checks">${items.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>`;

  // Summer / Winter / Competitions programs
  const programCard = (p) => `
          <article class="program-card${p.available === false ? ' is-soon' : ''}">
            <div class="program-card__top">
              <h4>${esc(p.title)}</h4>
              ${p.available === false ? `<span class="tag tag--soon">${esc(map.comingSoon)}</span>` : ''}
            </div>
            <dl class="facts">
              <div><dt>${esc(map.ageLabel)}</dt><dd>${esc(p.age)}</dd></div>
              ${p.hours ? `<div><dt>${esc(map.hoursLabel)}</dt><dd>${esc(p.hours)}</dd></div>` : ''}
            </dl>
            <p>${esc(p.description)}</p>
            ${learnList(p.whatYouLearn)}
            <div class="program-card__foot">${enroll(p)}</div>
          </article>`;

  // Year-round departments, each expandable to its programs
  const department = (d, i) => `
          <details class="dept dept--${DEPT_TINTS[i]}">
            <summary>
              ${t.departmentImages[i] ? `<span class="dept__img" style="--img:url(${img(t.departmentImages[i])})"></span>` : `<span class="dept__img dept__img--icon">${icon(DEPT_ICONS[i])}</span>`}
              <span class="dept__head">
                <span class="dept__name">${esc(d.name)}</span>
                <span class="dept__tagline">${esc(d.tagline)}</span>
              </span>
              <span class="dept__count">${d.programs.length} ${esc(d.programs.length === 1 ? t.program : t.programs)}</span>
              <span class="dept__toggle" aria-hidden="true"></span>
            </summary>
            <div class="dept__body">
              <p class="dept__desc">${esc(d.description)}</p>
              <div class="dept__programs">
                ${d.programs.map((p) => `
                <article class="program-card">
                  <div class="program-card__top"><h4>${esc(p.title)}</h4></div>
                  <dl class="facts">
                    <div><dt>${esc(map.ageLabel)}</dt><dd>${esc(p.age)}</dd></div>
                    <div><dt>${esc(map.levelsLabel)}</dt><dd>${esc(p.levels)}</dd></div>
                    <div><dt>${esc(t.hoursPerLevel)}</dt><dd>${esc(p.hoursPerLevel)}</dd></div>
                    <div><dt>${esc(t.prerequisite)}</dt><dd>${esc(p.prerequisite)}</dd></div>
                  </dl>
                  <p>${esc(p.description)}</p>
                  ${learnList(p.whatYouLearn)}
                  <div class="program-card__foot">${enroll(p)}</div>
                </article>`).join('')}
              </div>
            </div>
          </details>`;

  const panel = (tr) => `
        <section class="track-panel" id="track-${tr.id}" role="tabpanel" aria-labelledby="tab-${tr.id}">
          <header class="track-panel__head">
            <span class="track-panel__emoji" aria-hidden="true">${tr.emoji}</span>
            <div><h3>${esc(tr.title)}</h3><p>${esc(tr.description)}</p></div>
          </header>
          ${tr.programs ? `<div class="program-grid">${tr.programs.map(programCard).join('')}</div>` : ''}
          ${tr.departments ? `<div class="dept-list">${tr.departments.map(department).join('')}</div>` : ''}
        </section>`;

  const yearRound = map.tracks.yearRound;

  const body = `
    ${pageHero({
      crumbs: [{ label: intro.breadcrumb.services }, { label: intro.breadcrumb.training }],
      badge: intro.hero.badge, t: intro.hero.headline, hl: intro.hero.headlineHighlight, lead: intro.hero.description,
      actions: `<a class="btn btn--primary" href="#map">${esc(map.openLabel)} ${arrow}</a>
              <a class="btn btn--outline" href="${wa(s.announce.message)}" target="_blank" rel="noopener">${icon('whatsapp')} ${esc(s.announce.text)}</a>`,
      extra: `<div class="stats stats--3 page-hero__stats">
          <div class="stat"><b>${esc(s.trainingStats[0].value)}</b><span>${esc(intro.stats.programTracks)}</span></div>
          <div class="stat">${yearsSince}<span>${esc(intro.stats.yearsExperience)}</span></div>
          <div class="stat"><b>${esc(s.trainingStats[1].value)}</b><span>${esc(intro.stats.handsOnLearning)}</span></div>
        </div>`,
    })}

    <!-- Program map -->
    <section class="section" id="map">
      <div class="container">
        ${head({ t: map.title, hl: map.titleHighlight, lead: map.subtitle })}
        <div class="track-tabs" role="tablist" aria-label="${esc(map.title)} ${esc(map.titleHighlight)}">
          ${tracks.map((tr, i) => `
          <button class="track-tab" role="tab" id="tab-${tr.id}" aria-controls="track-${tr.id}" aria-selected="${i === 0}" type="button">
            <span class="track-tab__icon">${icon(TRACK_ICONS[tr.id])}</span>
            <span class="track-tab__text"><strong>${esc(tr.title)}</strong><small>${esc(tr.subtitle)}</small></span>
          </button>`).join('')}
        </div>
        <div class="track-panels">${tracks.map(panel).join('')}</div>
      </div>
    </section>

    <!-- Learning journey -->
    <section class="section">
      <div class="container">
        ${head({ t: c.home.progressSteps.title, center: true })}
        <ol class="journey">
          ${c.home.progressSteps.steps.map((st, i) => `<li class="journey__step"><span class="journey__num">${i + 1}</span><span class="journey__text">${esc(st)}</span></li>`).join('')}
        </ol>
      </div>
    </section>

    <!-- Year-round FAQ -->
    <section class="section">
      <div class="container">
        <div class="split split--top">
          <div class="section-head__main">
            <span class="pill pill--plain">${esc(yearRound.title)}</span>
            <h2 class="h-section">${esc(t.faqTitle)}</h2>
            <a class="link-arrow" href="verify.html">${esc(s.footer.verify)} ${arrow}</a>
          </div>
          <div class="faq">
            ${yearRound.faq.map((q, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(q.question)}</summary><p>${esc(q.answer)}</p></details>`).join('')}
          </div>
        </div>
      </div>
    </section>

    ${ctx.closer({
      t: intro.cta.title,
      lead: t.fixCtaDescription,
      actions: `<a class="btn btn--gold btn--lg" href="${wa(s.announce.message)}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-label="training_closer">${icon('whatsapp')} ${esc(intro.cta.button)}</a>`,
    })}`;

  return { title: `${intro.seo.title} | Robotrick`, description: intro.seo.description, body };
}
