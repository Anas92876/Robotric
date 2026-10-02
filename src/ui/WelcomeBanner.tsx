import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Lori } from '../app/brand/Lori';

interface WelcomeBannerProps {
  /** Small green line above the name, e.g. "Welcome back". */
  greeting: string;
  name: string;
  note?: string;
  link?: { to: string; label: string };
  /** Lori hops now and then to point at something that needs doing. */
  attention?: boolean;
}

/** Navy greeting card (Lori's screen colour) at the top of every overview, with Lori standing in front of it. */
export function WelcomeBanner({ greeting, name, note, link, attention = false }: WelcomeBannerProps) {
  return (
    // Top margin leaves room for Lori's head, which rises above the card
    <div className="relative flex min-h-52 rounded-feature bg-ink px-6 py-7 sm:mt-14 sm:px-9">
      <BannerDecor />
      <div className="relative flex max-w-[62%] flex-col justify-center">
        <p className="text-sm font-medium text-glow">{greeting} 👋</p>
        <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-white sm:text-4xl">{name}</h1>
        {note && <p className="mt-2 text-sm text-frost/75">{note}</p>}
        {link && (
          <Link
            to={link.to}
            className="mt-5 inline-flex w-fit items-center gap-2 rounded-md text-sm font-semibold text-glow underline-offset-4 hover:underline focus-visible:focus-ring"
          >
            {link.label}
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
          </Link>
        )}
      </div>

      {/* Lori, in front of the card and taller than it; faces the text in both directions */}
      <Lori attention={attention} className="absolute bottom-0 end-8 z-10 hidden h-[128%] cursor-pointer sm:block" />
    </div>
  );
}

/**
 * Circuit-board decoration: faint traces with solder pads in Lori's green, a tilted
 * lighter-navy tile behind Lori, a small chip and a few sparkles. Flat colours only.
 * Clipped to the card (Lori stands outside this layer, so he is never clipped),
 * kept away from the text, and mirrored in Arabic so the tile stays behind Lori.
 */
function BannerDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-feature rtl:-scale-x-100">
      {/* Right side (behind Lori); the whole layer is mirrored in Arabic, so positions here are physical and inline (old RTL rules in index.css swap .left-0/.right-0) */}
      <svg viewBox="0 0 460 260" preserveAspectRatio="xMaxYMid slice" className="absolute inset-y-0 h-full w-[460px] max-w-full" style={{ right: 0 }}>
        <rect x="200" y="28" width="200" height="200" rx="36" fill="#16283f" transform="rotate(12 300 128)" />
        <g fill="none" stroke="#3fd360" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
          <path d="M460 44 H392 L362 74 V112" />
          <path d="M460 92 H428 L412 108 V150" />
          <path d="M460 206 H404 L374 236 H300" />
          <path d="M180 260 V224 L206 198 H244" />
          <path d="M150 0 V26 L178 54 H226" />
        </g>
        <g fill="#3fd360" opacity="0.45">
          <circle cx="362" cy="116" r="4" />
          <circle cx="412" cy="154" r="4" />
          <circle cx="296" cy="236" r="4" />
          <circle cx="248" cy="198" r="4" />
          <circle cx="230" cy="54" r="4" />
        </g>
        {/* A small chip */}
        <g fill="none" stroke="#3fd360" strokeWidth="1.5" opacity="0.28">
          <rect x="416" y="176" width="22" height="22" rx="4" />
          <path d="M422 176 V170 M427 176 V170 M432 176 V170 M422 198 V204 M427 198 V204 M432 198 V204" />
        </g>
        {/* Sparkles */}
        <g stroke="#eefcf1" strokeWidth="2" strokeLinecap="round" opacity="0.35">
          <path d="M130 70 v10 M125 75 h10" />
          <path d="M440 134 v8 M436 138 h8" />
          <path d="M96 196 v8 M92 200 h8" />
        </g>
      </svg>

      {/* Left side: a small trace in the bottom corner, below the text */}
      <svg viewBox="0 0 160 90" className="absolute bottom-0 h-[90px] w-[160px]" style={{ left: 0 }}>
        <g fill="none" stroke="#3fd360" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.22">
          <path d="M0 40 H40 L66 66 V90" />
          <path d="M0 70 H22" />
        </g>
        <g fill="#3fd360" opacity="0.35">
          <circle cx="26" cy="70" r="3.5" />
        </g>
      </svg>
    </div>
  );
}
