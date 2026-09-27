import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

interface SEOProps {
  title: string;
  titleAr?: string;
  description: string;
  descriptionAr?: string;
  keywords?: string;
  keywordsAr?: string;
  image?: string;
  path?: string; // e.g. "/about" — canonical + hreflang are built from this
  noindex?: boolean;
}

const BASE_URL = 'https://www.robotrick.net';
const DEFAULT_IMAGE = '/og-image.jpg';

const DEFAULT_KEYWORDS_EN =
  'robotics, technology, Syria, Aleppo, arduino, AI, 3D printing, STEM, technical projects, consultation';
const DEFAULT_KEYWORDS_AR =
  'روبوتات، تكنولوجيا، سوريا، حلب، أردوينو، ذكاء اصطناعي، طباعة ثلاثية الأبعاد، STEM، مشاريع تقنية، استشارات';

export const SEO = ({
  title,
  titleAr,
  description,
  descriptionAr,
  keywords,
  keywordsAr,
  image = DEFAULT_IMAGE,
  path = '',
  noindex = false,
}: SEOProps) => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const siteName = 'Robotrick';
  const siteTagline = isRTL ? 'شركة روبوتريك' : 'Robotrick Company';

  const activeTitle = isRTL && titleAr ? titleAr : title;
  const activeDescription = isRTL && descriptionAr ? descriptionAr : description;
  const activeKeywords = isRTL
    ? (keywordsAr ?? DEFAULT_KEYWORDS_AR)
    : (keywords ?? DEFAULT_KEYWORDS_EN);

  const canonicalUrl = `${BASE_URL}${path}`;
  const hreflangEn = `${BASE_URL}${path}`;
  const hreflangAr = `${BASE_URL}/ar${path}`;
  const fullTitle = `${activeTitle} | ${siteTagline}`;
  const absoluteImage = image.startsWith('http') ? image : `${BASE_URL}${image}`;

  return (
    <Helmet>
      {/* Core */}
      <html lang={isRTL ? 'ar' : 'en'} dir={isRTL ? 'rtl' : 'ltr'} />
      <title>{fullTitle}</title>
      <meta name="description" content={activeDescription} />
      <meta name="keywords" content={activeKeywords} />
      <meta name="author" content={siteName} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Hreflang for bilingual */}
      <link rel="alternate" hrefLang="en" href={hreflangEn} />
      <link rel="alternate" hrefLang="ar" href={hreflangAr} />
      <link rel="alternate" hrefLang="x-default" href={hreflangEn} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={isRTL ? 'ar_SY' : 'en_US'} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={activeDescription} />
      <meta property="og:image" content={absoluteImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@robotrick_net" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={activeDescription} />
      <meta name="twitter:image" content={absoluteImage} />
    </Helmet>
  );
};
