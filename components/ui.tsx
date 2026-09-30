import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/lib/icons';

// Direction-aware arrow (react-icons); CSS mirrors it on right-to-left pages
export const Arrow = () => <Icon name="arrowRight" className="arrow" />;

// Headline split into masked words on the server; Motion adds `words-in` to play the reveal.
export function Title({ t, hl, as: Tag = 'h2', className = '' }: { t: string; hl?: string; as?: 'h1' | 'h2' | 'h3'; className?: string }) {
  let wi = 0;
  const words = (text: string) => text.split(/(\s+)/).filter(Boolean).map((part, i) =>
    /^\s+$/.test(part) ? part : (
      <span className="w" key={`${i}-${part}`}><span style={{ ['--wi' as string]: wi++ }}>{part}</span></span>
    ));
  return (
    <Tag className={`split-words ${className}`.trim()}>
      {words(t)}
      {hl ? <>{' '}<em className="hl">{words(hl)}</em></> : null}
    </Tag>
  );
}

// DESIGN.md section opener: pill badge → heading → description
export function SectionHead({ badge, t, hl, lead, side, center = false, id }: {
  badge?: string; t: string; hl?: string; lead?: string; side?: ReactNode; center?: boolean; id?: string;
}) {
  return (
    <div className={`section-head${center ? ' section-head--center' : ''}`} id={id}>
      <div className="section-head__main">
        {badge ? <span className="pill pill--plain">{badge}</span> : null}
        <Title t={t} hl={hl} />
      </div>
      {lead || side ? (
        <div className="section-head__side">
          {lead ? <p>{lead}</p> : null}
          {side}
        </div>
      ) : null}
    </div>
  );
}

const Gears = () => (
  <>
    <span className="gear-deco gear-deco--1" aria-hidden="true"><Icon name="gear" /></span>
    <span className="gear-deco gear-deco--2" aria-hidden="true"><Icon name="gear" /></span>
  </>
);

type Crumb = { label: string; href?: string };

export function Crumbs({ home, homeHref, items }: { home: string; homeHref: string; items: Crumb[] }) {
  return (
    <nav className="crumbs" aria-label={homeHref.startsWith('/ar') ? 'مسار التنقل' : 'Breadcrumb'}>
      <Link href={homeHref}>{home}</Link>
      {items.map((c) => (
        <span key={c.label} style={{ display: 'contents' }}>
          <span>/</span>
          {c.href ? <Link href={c.href}>{c.label}</Link> : <span>{c.label}</span>}
        </span>
      ))}
    </nav>
  );
}

// Inner-page hero: breadcrumb, badge and h1 on one side; description and actions on the other.
// With `media`, the text column (h1 + description + actions) sits beside a full-height photo instead.
export function PageHero({ crumbs, badge, t, hl, lead, actions, aside, extra, media }: {
  crumbs: ReactNode; badge?: string; t: string; hl?: string; lead?: string; actions?: ReactNode; aside?: ReactNode; extra?: ReactNode; media?: { src: string; alt: string };
}) {
  if (media) {
    return (
      <section className="page-hero page-hero--media">
        <Gears />
        <div className="container">
          <div className="hero-media">
            <div className="hero-media__text">
              {crumbs}
              {badge ? <span className="pill pill--plain">{badge}</span> : null}
              <Title as="h1" t={t} hl={hl} />
              {lead ? <p className="hero__lead">{lead}</p> : null}
              {actions ? <div className="btn-row">{actions}</div> : null}
            </div>
            <figure className="hero-media__photo" style={{ ['--img' as string]: `url(${media.src})` }} role="img" aria-label={media.alt}>
              <span className="hero-media__frame" aria-hidden="true" />
            </figure>
          </div>
          {extra}
        </div>
      </section>
    );
  }
  return (
    <section className="page-hero">
      <Gears />
      <div className="container">
        <div className="hero__split">
          <div className="hero__main">
            {crumbs}
            {badge ? <span className="pill pill--plain">{badge}</span> : null}
            <Title as="h1" t={t} hl={hl} />
          </div>
          <div className="hero__side">
            {aside}
            {lead ? <p className="hero__lead">{lead}</p> : null}
            {actions ? <div className="btn-row">{actions}</div> : null}
          </div>
        </div>
        {extra}
      </div>
    </section>
  );
}

// Dark brand-register closing banner — each page passes its own live CTA copy
export function Closer({ badge, t, lead, children }: { badge?: string; t: string; lead?: string; children: ReactNode }) {
  return (
    <section className="section">
      <div className="container">
        <div className="closer">
          <span className="orb orb--c" aria-hidden="true" />
          {badge ? <span className="pill">{badge} <span className="pill__arrow"><Arrow /></span></span> : null}
          <Title t={t} />
          {lead ? <p>{lead}</p> : null}
          <div className="btn-row" style={{ justifyContent: 'center' }}>{children}</div>
        </div>
      </div>
    </section>
  );
}

// Background-image photo tile (real photos from /public/images)
export function Photo({ src, className = '', label, children, href }: { src: string; className?: string; label?: string; children?: ReactNode; href?: string }) {
  const style = { ['--img' as string]: `url(${src})` };
  if (href) return <Link className={`photo ${className}`} href={href} style={style} aria-label={label}>{children}</Link>;
  return <figure className={`photo ${className}`} style={style} role={label ? 'img' : undefined} aria-label={label}>{children}</figure>;
}

// "Years of experience" is computed from the 2022 founding year, never hard-coded
export function YearsSince({ from }: { from: number }) {
  return <b data-years-since={from}>{new Date().getFullYear() - from}</b>;
}
