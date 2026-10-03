import Link from 'next/link';
import { notFound } from 'next/navigation';
import { hasLocale } from '@/lib/i18n-config';
import { resolvePage } from '@/lib/page';
import { pageMeta } from '@/lib/meta';
import { getContent } from '@/lib/content';
import { getPost, getPosts } from '@/lib/api';
import { excerpt, paragraphs, postDate, readingMinutes } from '@/lib/posts';
import { Arrow, Crumbs } from '@/components/ui';

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<'/[lang]/blog/[slug]'>) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const post = await getPost(slug);
  const s = getContent(lang).site;
  if (!post || post === 'error') return pageMeta(lang, `blog/${slug}`, s.blogPage.seoTitle, getContent(lang).home.blog.subtitle);
  return pageMeta(lang, `blog/${slug}`, `${post.title} | Robotrick`, excerpt(post.body, 160));
}

export default async function PostPage({ params }: PageProps<'/[lang]/blog/[slug]'>) {
  const { slug } = await params;
  const { lang, c, base } = await resolvePage(params);
  const s = c.site, t = s.blogPage;
  const post = await getPost(slug);
  if (post === null) notFound(); // unknown, unpublished or removed → real 404

  const crumbs = (label: string) => <Crumbs home={s.nav.home} homeHref={base} items={[{ label: s.nav.blog, href: `${base}/blog` }, { label }]} />;

  if (post === 'error') {
    return (
      <>
        <section className="page-hero"><div className="container">{crumbs(t.postPage)}</div></section>
        <section className="section section--tight">
          <div className="container">
            <div className="soon">
              <strong>{t.error}</strong>
              <Link className="btn btn--primary" href={`${base}/blog`}>{t.allPosts}</Link>
            </div>
          </div>
        </section>
      </>
    );
  }

  const others = ((await getPosts()) ?? []).filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <>
      <section className="page-hero"><div className="container">{crumbs(post.title)}</div></section>
      <section className="section section--tight">
        <div className="container">
          <article className="article">
            <header className="article__head">
              <h1 dir="auto">{post.title}</h1>
              <p className="article__meta">
                {post.publishedAt ? <time dateTime={post.publishedAt}>{t.published.replace('{date}', postDate(post.publishedAt, lang))}</time> : null}
                <span aria-hidden>·</span>
                <span>{t.minRead.replace('{n}', String(readingMinutes(post.body)))}</span>
              </p>
              {post.tags?.length ? <div className="post-card__tags">{post.tags.map((x) => <span className="chip chip--line" key={x} dir="auto">#{x}</span>)}</div> : null}
            </header>
            <div className="prose prose--lg article__body" dir="auto">
              {paragraphs(post.body).map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <Link className="btn btn--outline article__back" href={`${base}/blog`}>{t.allPosts}</Link>
          </article>
        </div>
      </section>
      {others.length ? (
        <section className="section">
          <div className="container">
            <h2 className="article__more">{t.more}</h2>
            <div className="posts">
              {others.map((p) => (
                <Link className="post-card" href={`${base}/blog/${p.slug}`} key={p._id}>
                  <div className="post-card__meta">{p.publishedAt ? <time dateTime={p.publishedAt}>{postDate(p.publishedAt, lang)}</time> : null}</div>
                  <h3 dir="auto">{p.title}</h3>
                  <p dir="auto">{excerpt(p.body, 140)}</p>
                  <div className="post-card__foot"><span /><span className="link-arrow">{t.read} <Arrow /></span></div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
