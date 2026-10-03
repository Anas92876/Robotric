// Shared page chrome: <head>, announcement, navigation, footer.
import { ICONS } from './icons.mjs';
import { esc } from './lib.mjs';

// The six services, in the live site's order. Names/descriptions come from home.navigation.servicesDropdown.
export const SERVICES = [
  { file: 'training.html', key: 'training', icon: 'robot', tint: 'leaf' },
  { file: 'technical-projects.html', key: 'projects', icon: 'gear', tint: 'khaki' },
  { file: '3d-printing.html', key: 'printing', icon: 'printer', tint: 'cream' },
  { file: 'technical-consultation.html', key: 'consultation', icon: 'chat', tint: 'sand' },
  { file: 'curriculum-design.html', key: 'curriculumDesign', icon: 'book', tint: 'moss' },
  { file: 'stem-lab-setup.html', key: 'stemLabSetup', icon: 'flask', tint: 'sage' },
];

export function layout(ctx, { title, description, body, noindex = false }) {
  const { lang, isAr, file, root, c, s, cfg, wa } = ctx;
  const home = c.home;
  const dd = home.navigation.servicesDropdown;
  const pagePath = file === 'index.html' ? '' : file;
  const enUrl = `${cfg.siteUrl}/${pagePath}`;
  const arUrl = `${cfg.siteUrl}/ar/${pagePath}`;
  const canonical = isAr ? arUrl : enUrl;
  const otherLang = isAr ? `../${file}` : `ar/${file}`;
  const cur = (f) => (file === f ? ' aria-current="page"' : '');
  const inServices = SERVICES.some((x) => x.file === file);
  const fonts = isAr ? 'family=Cairo:wght@400;500;600;700&family=Inter:wght@400;500' : 'family=Inter:wght@400;500;600';
  const logo = `<span class="brand-logo brand-logo--${lang}" style="--logo:url(${root}images/logo-${lang}.png)" role="img" aria-label="Robotrick"></span>`;

  const svcItems = SERVICES.map((x) => `<a class="dropdown__item" href="${x.file}"${cur(x.file)}><span class="dropdown__icon" style="background:var(--tint-${x.tint})">${ICONS[x.icon]}</span><span><strong>${esc(dd[x.key])}</strong><span>${esc(dd[x.key + 'Desc'])}</span></span></a>`).join('');

  const ga = cfg.gaId ? `
  <script async src="https://www.googletagmanager.com/gtag/js?id=${cfg.gaId}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${cfg.gaId}');</script>` : '';

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Organization', name: 'Robotrick', alternateName: 'روبوتريك',
    url: cfg.siteUrl, logo: `${cfg.siteUrl}/images/logo-en.png`, foundingDate: '2022', email: cfg.email, telephone: cfg.phoneTel,
    description: 'Robotrick is a professional robotics and technology company in Aleppo, Syria. We provide robotics training, technical projects, 3D printing, STEM lab setup, and technical consultation.',
    address: { '@type': 'PostalAddress', streetAddress: 'Baghdad Station - Al-Shallal Street', addressLocality: 'Aleppo', addressCountry: 'SY' },
    sameAs: [cfg.facebook, cfg.instagram, cfg.linkedin],
  });

  return `<!doctype html>
<html lang="${lang}" dir="${isAr ? 'rtl' : 'ltr'}">
<head>
  <meta charset="utf-8">
  <script>(function(d){d.classList.add('js');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('motion')})(document.documentElement)</script>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">${noindex ? '\n  <meta name="robots" content="noindex">' : ''}
  <meta name="theme-color" content="#003300">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="en" href="${enUrl}">
  <link rel="alternate" hreflang="ar" href="${arUrl}">
  <link rel="alternate" hreflang="x-default" href="${enUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Robotrick">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${cfg.siteUrl}/og-image.jpg">
  <meta property="og:locale" content="${isAr ? 'ar_SY' : 'en_US'}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="${root}favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fonts}&display=swap">
  <link rel="stylesheet" href="${root}styles.css">
  <script type="application/ld+json">${jsonLd}</script>${ga}
</head>
<body data-api-base="${cfg.apiBase}" data-wa="${cfg.whatsapp}" data-page="${file.replace('.html', '')}">
  <a class="sr-only" href="#main">${esc(s.nav.skip)}</a>

  <div class="announce" role="region" aria-label="Announcement">
    <div class="container">
      <span>${esc(s.announce.text)}</span><span class="announce__divider" aria-hidden="true"></span>
      <a href="${wa(s.announce.message)}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-label="announcement">${esc(s.announce.cta)} <span class="arrow">→</span></a>
    </div>
  </div>

  <header class="nav" id="nav">
    <div class="container nav__inner">
      <a class="logo" href="index.html">${logo}</a>
      <nav class="nav__links" id="nav-links" aria-label="Main">
        <a class="nav__link" href="about.html"${cur('about.html')}>${esc(s.nav.about)}</a>
        <div class="dropdown">
          <button class="nav__link" type="button" aria-expanded="false" aria-haspopup="true"${inServices ? ' aria-current="page"' : ''}>${esc(s.nav.services)} ${ICONS.chevron}</button>
          <div class="dropdown__panel">${svcItems}</div>
        </div>
        <a class="nav__link" href="gallery.html"${cur('gallery.html')}>${esc(s.nav.gallery)}</a>
        <a class="nav__link" href="blog.html"${cur('blog.html')}>${esc(s.nav.blog)}</a>
        <a class="nav__link" href="join-us.html"${cur('join-us.html')}${file === 'job.html' ? ' aria-current="page"' : ''}>${esc(s.nav.joinUs)}</a>
        <a class="nav__link" href="contact.html"${cur('contact.html')}>${esc(s.nav.contact)}</a>
        <a class="nav__link nav__mobile-only" href="${cfg.loginUrl}">${esc(s.nav.login)}</a>
      </nav>
      <div class="nav__actions">
        <a class="lang-switch" href="${otherLang}" hreflang="${isAr ? 'en' : 'ar'}" lang="${isAr ? 'en' : 'ar'}">${esc(s.nav.otherLang)}</a>
        <a class="nav__text-link" href="${cfg.loginUrl}">${esc(s.nav.login)}</a>
        <a class="btn btn--primary btn--sm" href="technical-consultation.html" data-track="cta_click" data-track-label="nav_consultation">${esc(s.nav.cta)}</a>
        <button class="nav__toggle" type="button" aria-controls="nav-links" aria-expanded="false" aria-label="${esc(s.nav.menu)}">${ICONS.menu}</button>
      </div>
    </div>
  </header>

  <main id="main">
${body}
  </main>

  <footer class="footer">
    <div class="container">
      <div class="footer__grid">
        <div class="footer__about">
          <a class="logo" href="index.html">${logo}</a>
          <p>${esc(home.footer.tagline)}</p>
          <div class="socials">
            <a href="${cfg.facebook}" target="_blank" rel="noopener" aria-label="Facebook">${ICONS.facebook}</a>
            <a href="${cfg.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${ICONS.instagram}</a>
            <a href="${cfg.linkedin}" target="_blank" rel="noopener" aria-label="LinkedIn">${ICONS.linkedin}</a>
            <a href="${wa()}" target="_blank" rel="noopener" aria-label="WhatsApp" data-track="whatsapp_click" data-track-label="footer">${ICONS.whatsapp}</a>
          </div>
        </div>
        <div>
          <h4>${esc(s.footer.quickLinks)}</h4>
          <ul>
            <li><a href="about.html">${esc(s.nav.about)}</a></li>
            <li><a href="gallery.html">${esc(s.nav.gallery)}</a></li>
            <li><a href="blog.html">${esc(s.nav.blog)}</a></li>
            <li><a href="join-us.html">${esc(s.nav.joinUs)}</a></li>
            <li><a href="verify.html">${esc(s.footer.verify)}</a></li>
            <li><a href="${cfg.loginUrl}">${esc(s.nav.login)}</a></li>
          </ul>
        </div>
        <div>
          <h4>${esc(s.footer.services)}</h4>
          <ul>${SERVICES.map((x) => `<li><a href="${x.file}">${esc(dd[x.key])}</a></li>`).join('')}</ul>
        </div>
        <div>
          <h4>${esc(s.footer.contactInfo)}</h4>
          <ul class="footer__contact">
            <li><a href="${cfg.maps}" target="_blank" rel="noopener">${esc(home.footer.address)}</a></li>
            <li><a href="tel:${cfg.phoneTel}" data-track="phone_click"><span class="ltr">${cfg.phoneDisplay}</span></a></li>
            <li><a href="mailto:${cfg.email}" data-track="email_click">${cfg.email}</a></li>
            <li>${esc(s.footer.hours)}</li>
          </ul>
        </div>
      </div>
      <div class="footer__bottom">
        <span>© <span data-year>${new Date().getFullYear()}</span> Robotrick. ${esc(home.footer.copyright)}</span>
      </div>
    </div>
  </footer>

  <a class="wa-float" href="${wa(s.common.whatsappHello)}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-label="floating">${ICONS.whatsapp}<span>${esc(s.footer.whatsappFloat)}</span></a>

  <script src="${root}script.js" defer></script>
</body>
</html>
`;
}
