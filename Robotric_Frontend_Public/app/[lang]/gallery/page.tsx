import Link from 'next/link';
import { resolvePage } from '@/lib/page';
import { pageMeta } from '@/lib/meta';
import { Arrow, Closer, Crumbs, PageHero } from '@/components/ui';
import GalleryGrid from '@/components/GalleryGrid';

export async function generateMetadata({ params }: PageProps<'/[lang]/gallery'>) {
  const { lang, c } = await resolvePage(params);
  return pageMeta(lang, 'gallery', c.site.gallery.seoTitle, c.site.gallery.seoDescription);
}

// Photos are the live site's /images/image-N set (image-4 is missing on the live server and is left out)
export default async function GalleryPage({ params }: PageProps<'/[lang]/gallery'>) {
  const { c, base, isAr } = await resolvePage(params);
  const g = c.home.gallery, s = c.site;

  return (
    <>
      <PageHero crumbs={<Crumbs home={s.nav.home} homeHref={base} items={[{ label: s.nav.gallery }]} />} badge={g.badge} t={g.pageTitle} lead={g.pageSubtitle} />
      <section className="section section--tight">
        <div className="container">
          <GalleryGrid items={s.gallery.items} categories={g.categories} emptyText={g.emptyState} isAr={isAr}
            labels={{ close: s.gallery.close, prev: s.gallery.prev, next: s.gallery.next, title: g.pageTitle }} />
        </div>
      </section>
      <Closer t={g.ctaTitle} lead={g.ctaDescription}>
        <Link className="btn btn--gold btn--lg" href={`${base}/contact`}>{g.ctaButton}</Link>
        <Link className="btn btn--ghost-gold btn--lg" href={`${base}/training`}>{c.home.navigation.servicesDropdown.training} <Arrow /></Link>
      </Closer>
    </>
  );
}
