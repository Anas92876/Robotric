import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import localFont from 'next/font/local';
import '../globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Motion from '@/components/Motion';
import { LOCALES, hasLocale, isRtl } from '@/lib/i18n-config';
import { getContent } from '@/lib/content';
import { SERVICES } from '@/lib/services';
import { SITE } from '@/lib/config';

// Fonts are self-hosted from app/fonts (variable woff2 files from Google Fonts), so builds never depend on Google.
const inter = localFont({ src: '../fonts/inter-latin.woff2', weight: '400 600', variable: '--font-inter', display: 'swap' });
// Arabic font: only referenced by Arabic pages' CSS, so English visitors never download it (Latin characters fall back to Inter)
const cairo = localFont({ src: '../fonts/cairo-arabic.woff2', weight: '400 700', variable: '--font-cairo', display: 'swap', preload: false });

export const dynamicParams = false;
export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }));

export const viewport: Viewport = { themeColor: '#003300' };

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  icons: { icon: '/favicon.png' },
  twitter: { card: 'summary_large_image' },
};

// Adds `js` (content that animates in) and `motion` (unless reduced motion is requested) before first paint
const earlyScript = `(function(d){d.classList.add('js');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('motion')})(document.documentElement)`;

export default async function LangLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const c = getContent(lang);
  const s = c.site;
  const dd = c.home.navigation.servicesDropdown;

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Organization', name: 'Robotrick', alternateName: 'روبوتريك',
    url: SITE.url, logo: `${SITE.url}/images/logo-en.png`, foundingDate: String(SITE.founded), email: SITE.email, telephone: SITE.phoneTel,
    address: { '@type': 'PostalAddress', streetAddress: 'Baghdad Station - Al-Shallal Street', addressLocality: 'Aleppo', addressCountry: 'SY' },
    sameAs: [SITE.facebook, SITE.instagram, SITE.linkedin],
  };

  return (
    <html lang={lang} dir={isRtl(lang) ? 'rtl' : 'ltr'} data-scroll-behavior="smooth" className={`${inter.variable} ${lang === 'ar' ? cairo.variable : ''}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: earlyScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>
        <a className="sr-only" href="#main">{s.nav.skip}</a>
        <Header
          lang={lang}
          nav={s.nav}
          services={SERVICES.map((x) => ({ slug: x.slug, key: x.key, tint: x.tint, name: dd[x.key], desc: dd[`${x.key}Desc` as keyof typeof dd] }))}
          servicesFooter={s.services.dropdownFooter}
        />
        <main id="main">{children}</main>
        <Footer lang={lang} c={c} />
        <Motion backLabel={lang === 'ar' ? 'العودة إلى الأعلى' : 'Back to top'} />
        {SITE.gaId ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${SITE.gaId}`} strategy="afterInteractive" />
            <Script id="ga" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${SITE.gaId}');`}</Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
