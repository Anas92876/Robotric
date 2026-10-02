import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/config';
import { LOCALES } from '@/lib/i18n-config';
import { getPosts } from '@/lib/api';

const PATHS = ['', 'about', 'training', 'technical-projects', '3d-printing', 'technical-consultation', 'curriculum-design', 'stem-lab-setup', 'gallery', 'blog', 'join-us', 'contact', 'verify'];

export const revalidate = 3600;

// Every page in both languages, each with its en/ar alternates, plus the published articles
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entry = (p: string, extra: Partial<MetadataRoute.Sitemap[number]>) => LOCALES.map((lang) => ({
    url: `${SITE.url}/${lang}${p ? `/${p}` : ''}`,
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${SITE.url}/${l}${p ? `/${p}` : ''}`])) },
    ...extra,
  }));
  const pages = PATHS.flatMap((p) => entry(p, {
    changeFrequency: p === 'join-us' || p === 'blog' ? 'daily' : 'monthly',
    priority: p === '' ? 1 : p === 'training' ? 0.9 : 0.7,
  }));
  const posts = ((await getPosts()) ?? []).flatMap((post) => entry(`blog/${post.slug}`, {
    changeFrequency: 'monthly', priority: 0.6, ...(post.publishedAt ? { lastModified: new Date(post.publishedAt) } : {}),
  }));
  return [...pages, ...posts];
}
