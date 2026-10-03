import { redirect } from 'next/navigation';
import { resolvePage } from '@/lib/page';
import { pageMeta } from '@/lib/meta';
import VerifyView from '@/components/VerifyView';

export async function generateMetadata({ params }: PageProps<'/[lang]/verify'>) {
  const { lang, c } = await resolvePage(params);
  return pageMeta(lang, 'verify', c.site.verify.seoTitle, c.site.verify.seoDescription);
}

export default async function VerifyPage({ params, searchParams }: PageProps<'/[lang]/verify'>) {
  const { lang, c } = await resolvePage(params);
  // Old-style links (?cert=NUMBER) move to the shareable /verify/NUMBER URL
  const cert = (await searchParams).cert;
  if (typeof cert === 'string' && cert.trim()) redirect(`/${lang}/verify/${encodeURIComponent(cert.trim().toUpperCase())}`);
  return <VerifyView lang={lang} c={c} />;
}
