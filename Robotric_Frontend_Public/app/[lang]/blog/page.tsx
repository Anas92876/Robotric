import Link from 'next/link';
import { resolvePage } from '@/lib/page';
import { pageMeta } from '@/lib/meta';
import { Icon } from '@/lib/icons';
import { SITE } from '@/lib/config';
import { getPosts } from '@/lib/api';
import { postDate, excerpt, readingMinutes } from '@/lib/posts';
import { Arrow, Crumbs, PageHero } from '@/components/ui';

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<'/[lang]/blog'>) {
  const { lang, c } = await resolvePage(params);
  return pageMeta(lang, 'blog', c.site.blogPage.seoTitle, c.home.blog.subtitle);
}

// Published posts from the dashboard, newest first
export default async function BlogPage({ params }: PageProps<'/[lang]/blog'>) {
  const { lang, c, base } = await resolvePage(params);
  const b = c.home.blog, s = c.site, t = s.blogPage;
  const posts = await getPosts();

  return (
    <>
      <PageHero crumbs={<Crumbs home={s.nav.home} homeHref={base} items={[{ label: s.nav.blog }]} />} badge={s.nav.blog} t={b.title} lead={b.subtitle} />
      <section className="section section--tight">
        <div className="container">
          {posts === null ? (
            <div className="soon"><strong>{t.error}</strong></div>
          ) : posts.length === 0 ? (
            <div className="soon">
              <span className="soon__icon"><Icon name="doc" /></span>
              <strong>{t.empty}</strong>
              <p>{t.emptyLead}</p>
              <div className="btn-row">
                <a className="btn btn--outline" href={SITE.instagram} target="_blank" rel="noopener"><Icon name="instagram" /> Instagram</a>
                <a className="btn btn--outline" href={SITE.facebook} target="_blank" rel="noopener"><Icon name="facebook" /> Facebook</a>
                <Link className="btn btn--primary" href={`${base}/gallery`}>{s.nav.gallery} <Arrow /></Link>
              </div>
            </div>
          ) : (
            <div className="posts">
              {posts.map((p, i) => (
                <Link className={`post-card${i === 0 ? ' post-card--lead' : ''}`} href={`${base}/blog/${p.slug}`} key={p._id}>
                  <div className="post-card__meta">
                    {i === 0 ? <span className="tag">{t.latest}</span> : null}
                    {p.publishedAt ? <time dateTime={p.publishedAt}>{postDate(p.publishedAt, lang)}</time> : null}
                    <span aria-hidden>·</span>
                    <span>{t.minRead.replace('{n}', String(readingMinutes(p.body)))}</span>
                  </div>
                  <h2 dir="auto">{p.title}</h2>
                  <p dir="auto">{excerpt(p.body, i === 0 ? 320 : 180)}</p>
                  <div className="post-card__foot">
                    <div className="post-card__tags">{(p.tags ?? []).slice(0, 3).map((x) => <span className="chip chip--line" key={x} dir="auto">#{x}</span>)}</div>
                    <span className="link-arrow">{t.read} <Arrow /></span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
