// About — content: content/<lang>/site.json → about (robotrick.net /about page text).
export const file = 'about.html';

const VALUE_ICONS = ['heart', 'users', 'leaf', 'trophy', 'target'];

export function render(ctx) {
  const { s, esc, icon, img, title, head, pageHero } = ctx;
  const a = s.about;
  const years = [...new Set(a.achievements.map((x) => x.year))];

  const body = `
    ${pageHero({ crumbs: [{ label: a.badge }], badge: a.badge, t: a.storyTitle })}

    <!-- Story -->
    <section class="section section--tight">
      <div class="container">
        <div class="story">
          <figure class="photo photo--tall story__photo" style="--img:url(${img('images/about/image_2026-02-24_04-37-12.webp')})" role="img" aria-label="${esc(a.buildingAlt)}"></figure>
          <div class="story__text prose prose--lg">
            <span class="story__year" aria-hidden="true">2022</span>
            ${a.story.map((p) => `<p>${esc(p)}</p>`).join('')}
          </div>
        </div>
      </div>
    </section>

    <!-- Vision & Mission -->
    <section class="section">
      <div class="container">
        ${head({ t: a.vmTitle })}
        <div class="vm">
          <article class="vm__card vm__card--dark">
            <span class="icon-dot icon-dot--gold">${icon('target')}</span>
            <span class="label">${esc(a.visionTitle)}</span>
            <p class="vm__text">${esc(a.vision)}</p>
          </article>
          <article class="vm__card">
            <span class="icon-dot">${icon('spark')}</span>
            <span class="label">${esc(a.missionTitle)}</span>
            <p class="vm__text">${esc(a.mission)}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- Values -->
    <section class="section">
      <div class="container">
        ${head({ t: a.valuesTitle })}
        <ul class="values">
          ${a.values.map((v, i) => `<li class="values__item"><span class="values__num">0${i + 1}</span><span class="icon-dot">${icon(VALUE_ICONS[i])}</span><span class="values__word">${esc(v)}</span></li>`).join('')}
        </ul>
      </div>
    </section>

    <!-- Achievements timeline -->
    <section class="section">
      <div class="container">
        ${head({ badge: a.achievementsBadge, t: a.achievementsTitle, lead: a.achievementsLead })}
        <div class="timeline">
          ${years.map((y) => `
          <div class="timeline__year">
            <div class="timeline__label"><span>${y}</span></div>
            <div class="timeline__items">
              ${a.achievements.filter((x) => x.year === y).map((x) => `
              <article class="proof">
                <div class="proof__head"><span class="proof__medal">${icon('medal')}</span><div><strong>${esc(x.title)}</strong><span>${esc(x.event)}</span></div></div>
                <div class="proof__stat"><span class="ltr">${esc(x.stat)}</span></div>
              </article>`).join('')}
            </div>
          </div>`).join('')}
        </div>
      </div>
    </section>

    <!-- Our space -->
    <section class="section">
      <div class="container">
        ${head({ t: a.spaceTitle })}
        <div class="carousel carousel--space">
          <div class="carousel__track">
            ${a.space.map((sp) => `
            <figure class="space-slide">
              <div class="photo photo--wide" style="--img:url(${img(sp.img)})"></div>
              <figcaption>${esc(sp.caption)}</figcaption>
            </figure>`).join('')}
          </div>
          <div class="carousel__dots"></div>
        </div>
      </div>
    </section>`;

  return { title: a.seoTitle, description: a.seoDescription, body };
}
