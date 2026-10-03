// Blog — content: content/<lang>/home.json → blog. The live blog has no posts yet ("coming soon").
export const file = 'blog.html';

export function render(ctx) {
  const { c, s, esc, icon, pageHero, arrow } = ctx;
  const b = c.home.blog;

  const body = `
    ${pageHero({ crumbs: [{ label: s.nav.blog }], badge: s.nav.blog, t: b.title, lead: b.subtitle })}

    <section class="section section--tight">
      <div class="container">
        <div class="soon">
          <span class="soon__icon">${icon('doc')}</span>
          <p>${esc(b.comingSoon)}</p>
          <div class="btn-row">
            <a class="btn btn--outline" href="${ctx.cfg.instagram}" target="_blank" rel="noopener">${icon('instagram')} Instagram</a>
            <a class="btn btn--outline" href="${ctx.cfg.facebook}" target="_blank" rel="noopener">${icon('facebook')} Facebook</a>
            <a class="btn btn--primary" href="gallery.html">${esc(s.nav.gallery)} ${arrow}</a>
          </div>
        </div>
      </div>
    </section>`;

  return { title: s.blogPage.seoTitle, description: b.subtitle, body };
}
