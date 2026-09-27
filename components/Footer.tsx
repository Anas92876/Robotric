import Link from 'next/link';
import { Icon } from '@/lib/icons';
import { SITE, wa } from '@/lib/config';
import { SERVICES } from '@/lib/services';
import type { Content } from '@/lib/content';
import type { Locale } from '@/lib/i18n-config';

export default function Footer({ lang, c }: { lang: Locale; c: Content }) {
  const { site: s, home } = c;
  const dd = home.navigation.servicesDropdown;
  const base = `/${lang}`;
  return (
    <>
      <footer className="footer">
        <div className="container">
          <div className="footer__grid">
            <div className="footer__about">
              <Link className="logo" href={base}>
                <span className={`brand-logo brand-logo--${lang}`} style={{ ['--logo' as string]: `url(/images/logo-${lang}.png)` }} role="img" aria-label="Robotrick" />
              </Link>
              <p>{home.footer.tagline}</p>
              <div className="socials">
                <a href={SITE.facebook} target="_blank" rel="noopener" aria-label="Facebook"><Icon name="facebook" /></a>
                <a href={SITE.instagram} target="_blank" rel="noopener" aria-label="Instagram"><Icon name="instagram" /></a>
                <a href={SITE.linkedin} target="_blank" rel="noopener" aria-label="LinkedIn"><Icon name="linkedin" /></a>
                <a href={wa()} target="_blank" rel="noopener" aria-label="WhatsApp" data-track="whatsapp_click" data-track-label="footer"><Icon name="whatsapp" /></a>
              </div>
            </div>
            <div>
              <h4>{s.footer.quickLinks}</h4>
              <ul>
                <li><Link href={`${base}/about`}>{s.nav.about}</Link></li>
                <li><Link href={`${base}/gallery`}>{s.nav.gallery}</Link></li>
                <li><Link href={`${base}/blog`}>{s.nav.blog}</Link></li>
                <li><Link href={`${base}/join-us`}>{s.nav.joinUs}</Link></li>
                <li><Link href={`${base}/verify`}>{s.footer.verify}</Link></li>
                <li><Link href={`${base}/login`}>{s.nav.login}</Link></li>
              </ul>
            </div>
            <div>
              <h4>{s.footer.services}</h4>
              <ul>{SERVICES.map((x) => <li key={x.slug}><Link href={`${base}/${x.slug}`}>{dd[x.key]}</Link></li>)}</ul>
            </div>
            <div>
              <h4>{s.footer.contactInfo}</h4>
              <ul className="footer__contact">
                <li><a href={SITE.maps} target="_blank" rel="noopener">{home.footer.address}</a></li>
                <li><a href={`tel:${SITE.phoneTel}`} data-track="phone_click"><span className="ltr">{SITE.phoneDisplay}</span></a></li>
                <li><a href={`mailto:${SITE.email}`} data-track="email_click">{SITE.email}</a></li>
                <li>{s.footer.hours}</li>
              </ul>
            </div>
          </div>
          <div className="footer__bottom">
            <span>© {new Date().getFullYear()} Robotrick. {home.footer.copyright}</span>
          </div>
        </div>
      </footer>

      <a className="wa-float" href={wa(s.common.whatsappHello)} target="_blank" rel="noopener" data-track="whatsapp_click" data-track-label="floating">
        <Icon name="whatsapp" /><span>{s.footer.whatsappFloat}</span>
      </a>
    </>
  );
}
