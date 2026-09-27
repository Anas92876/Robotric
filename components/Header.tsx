'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/lib/icons';
import ServiceIcon from './ServiceIcon';

export type HeaderProps = {
  lang: 'en' | 'ar';
  nav: { home: string; about: string; services: string; gallery: string; blog: string; joinUs: string; contact: string; cta: string; login: string; signup: string; menu: string; otherLang: string };
  services: { slug: string; key: string; tint: string; name: string; desc: string }[];
  servicesFooter: string;
};

export default function Header({ lang, nav, services, servicesFooter }: HeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [ddOpen, setDdOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const ddRef = useRef<HTMLDivElement>(null);

  const base = `/${lang}`;
  const rest = pathname.replace(/^\/(en|ar)(?=\/|$)/, '');
  const otherLangHref = `/${lang === 'en' ? 'ar' : 'en'}${rest}`;
  const isCurrent = (slug: string) => rest === `/${slug}` || rest.startsWith(`/${slug}/`);
  const current = (on: boolean) => (on ? ('page' as const) : undefined);
  const inServices = services.some((s) => isCurrent(s.slug));

  // Close menus on navigation
  useEffect(() => { setMenuOpen(false); setDdOpen(false); }, [pathname]);

  // Scrolled border + hide while scrolling down, show when scrolling up
  useEffect(() => {
    let prev = window.scrollY;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      if (!reduce) {
        if (y > 480 && y > prev + 4) setHidden(true);
        else if (y < prev - 4 || y < 480) setHidden(false);
      }
      prev = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Click outside or Escape closes the services menu
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!ddRef.current?.contains(e.target as Node)) setDdOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDdOpen(false); };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);

  const logo = <span className={`brand-logo brand-logo--${lang}`} style={{ ['--logo' as string]: `url(/images/logo-${lang}.png)` }} role="img" aria-label="Robotrick" />;
  const cls = ['nav', scrolled && 'is-scrolled', menuOpen && 'is-open', hidden && !menuOpen && !ddOpen && 'is-hidden'].filter(Boolean).join(' ');

  return (
    <>
      <header className={cls} id="nav">
        <div className="container nav__inner">
          <Link className="logo" href={base}>{logo}</Link>
          <nav className="nav__links" id="nav-links" aria-label="Main">
            <Link className="nav__link" href={base} aria-current={current(rest === '' || rest === '/')}>{nav.home}</Link>
            <Link className="nav__link" href={`${base}/about`} aria-current={current(isCurrent('about'))}>{nav.about}</Link>
            <div className={`dropdown${ddOpen ? ' is-open' : ''}`} ref={ddRef}>
              <button className="nav__link" type="button" aria-expanded={ddOpen} aria-haspopup="true" aria-current={current(inServices)} onClick={() => setDdOpen((o) => !o)}>
                {nav.services} <Icon name="chevron" />
              </button>
              <div className="dropdown__panel">
                <div className="dropdown__grid">
                  {services.map((s) => (
                    <Link key={s.slug} className="dropdown__item" href={`${base}/${s.slug}`} aria-current={current(isCurrent(s.slug))}>
                      <span className="dropdown__icon" style={{ ['--tile' as string]: `var(--tint-${s.tint})` }}><ServiceIcon name={s.key} /></span>
                      <span className="dropdown__text"><strong>{s.name}</strong><span>{s.desc}</span></span>
                      <span className="dropdown__go" aria-hidden="true"><Icon name="arrowRight" className="arrow" /></span>
                    </Link>
                  ))}
                </div>
                <div className="dropdown__footer">
                  <span>{servicesFooter}</span>
                  <Link className="link-arrow" href={`${base}/technical-consultation`}>{nav.cta} <Icon name="arrowRight" className="arrow" /></Link>
                </div>
              </div>
            </div>
            <Link className="nav__link" href={`${base}/gallery`} aria-current={current(isCurrent('gallery'))}>{nav.gallery}</Link>
            <Link className="nav__link" href={`${base}/blog`} aria-current={current(isCurrent('blog'))}>{nav.blog}</Link>
            <Link className="nav__link" href={`${base}/join-us`} aria-current={current(isCurrent('join-us'))}>{nav.joinUs}</Link>
            <Link className="nav__link" href={`${base}/contact`} aria-current={current(isCurrent('contact'))}>{nav.contact}</Link>
            <Link className="nav__link nav__mobile-only" href={`${base}/login`}>{nav.login}</Link>
          </nav>
          <div className="nav__actions">
            <Link className="lang-switch" href={otherLangHref} hrefLang={lang === 'en' ? 'ar' : 'en'} lang={lang === 'en' ? 'ar' : 'en'}>{nav.otherLang}</Link>
            <Link className="nav__text-link" href={`${base}/login`} aria-current={current(isCurrent('login') || isCurrent('signup'))}>{nav.login}</Link>
            <Link className="btn btn--primary btn--sm" href={`${base}/technical-consultation`} data-track="cta_click" data-track-label="nav_consultation">{nav.cta}</Link>
            <button className="nav__toggle" type="button" aria-controls="nav-links" aria-expanded={menuOpen} aria-label={nav.menu} onClick={() => setMenuOpen((o) => !o)}>
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
