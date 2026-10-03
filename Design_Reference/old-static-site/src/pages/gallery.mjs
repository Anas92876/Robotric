// Gallery — content: content/<lang>/home.json → gallery (page title, categories, CTA) + site.json → gallery.items
// Photos: the live site's /images/image-N.jpg set (image-4 is missing on the live server and is left out).
export const file = 'gallery.html';

export function render(ctx) {
  const { c, s, esc, icon, img, pageHero, arrow } = ctx;
  const g = c.home.gallery;
  const cats = Object.keys(g.categories);

  const body = `
    ${pageHero({ crumbs: [{ label: s.nav.gallery }], badge: g.badge, t: g.pageTitle, lead: g.pageSubtitle })}

    <section class="section section--tight">
      <div class="container">
        <div class="filters" role="toolbar" aria-label="${esc(g.pageTitle)}">
          ${cats.map((k, i) => `<button type="button" class="filter${i === 0 ? ' is-active' : ''}" data-filter="${k}" aria-pressed="${i === 0}">${esc(g.categories[k])} <span class="filter__count">${k === 'all' ? s.gallery.items.length : s.gallery.items.filter((x) => x.category === k).length}</span></button>`).join('')}
        </div>
        <div class="masonry" data-gallery>
          ${s.gallery.items.map((it) => `
          <figure class="masonry__item" data-category="${it.category}">
            <button type="button" class="masonry__btn" data-full="${img(`images/image-${it.id}.webp`)}" aria-label="${esc(it.title)}">
              <img src="${img(`images/image-${it.id}.webp`)}" alt="${esc(it.title)}" loading="lazy" decoding="async">
            </button>
            <figcaption><span class="tag">${esc(g.categories[it.category])}</span>${esc(it.title)}</figcaption>
          </figure>`).join('')}
        </div>
        <p class="empty" data-gallery-empty hidden>${esc(g.emptyState)}</p>
      </div>
    </section>

    <div class="lightbox" data-lightbox hidden role="dialog" aria-modal="true" aria-label="${esc(g.pageTitle)}">
      <button type="button" class="lightbox__close" data-lb-close aria-label="${esc(s.gallery.close)}">${icon('x')}</button>
      <button type="button" class="lightbox__nav lightbox__nav--prev" data-lb-prev aria-label="${esc(s.gallery.prev)}">${icon(ctx.isAr ? 'chevronRight' : 'chevronLeft')}</button>
      <figure class="lightbox__figure"><img alt="" data-lb-img><figcaption data-lb-caption></figcaption></figure>
      <button type="button" class="lightbox__nav lightbox__nav--next" data-lb-next aria-label="${esc(s.gallery.next)}">${icon(ctx.isAr ? 'chevronLeft' : 'chevronRight')}</button>
    </div>

    ${ctx.closer({
      t: g.ctaTitle,
      lead: g.ctaDescription,
      actions: `<a class="btn btn--gold btn--lg" href="contact.html">${esc(g.ctaButton)}</a>
            <a class="btn btn--ghost-gold btn--lg" href="training.html">${esc(c.home.navigation.servicesDropdown.training)} ${arrow}</a>`,
    })}`;

  return { title: s.gallery.seoTitle, description: s.gallery.seoDescription, body };
}
