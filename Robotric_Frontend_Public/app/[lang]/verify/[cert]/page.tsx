import { resolvePage } from '@/lib/page';
import { pageMeta } from '@/lib/meta';
import { verifyCertificate } from '@/lib/api';
import VerifyView from '@/components/VerifyView';

export async function generateMetadata({ params }: PageProps<'/[lang]/verify/[cert]'>) {
  const { lang, c } = await resolvePage(params);
  const { cert } = await params;
  // Individual certificate pages are not indexed
  return { ...pageMeta(lang, `verify/${cert}`, c.site.verify.seoTitle, c.site.verify.seoDescription), robots: { index: false } };
}

// Checked live on every request (same endpoint and upper-casing as robotrick.net)
export default async function CertificatePage({ params }: PageProps<'/[lang]/verify/[cert]'>) {
  const { lang, c } = await resolvePage(params);
  const number = decodeURIComponent((await params).cert).toUpperCase();
  const result = await verifyCertificate(number);
  return <VerifyView lang={lang} c={c} number={number} result={result} />;
}
