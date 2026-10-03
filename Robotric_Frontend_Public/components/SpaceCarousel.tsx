'use client';

import { useEffect, useRef, useState } from 'react';

// "Our Space" photo carousel: scroll-snap track, dot pagination, gentle autoplay that pauses on interaction
export default function SpaceCarousel({ slides, isAr, dotLabel }: { slides: { img: string; caption: string }[]; isAr: boolean; dotLabel: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(1);
  const [active, setActive] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => setPages(Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth - 0.05)));
    const sync = () => {
      const max = el.scrollWidth - el.clientWidth;
      setActive(Math.round((max > 0 ? Math.abs(el.scrollLeft) / max : 0) * (pages - 1)));
    };
    measure();
    el.addEventListener('scroll', sync, { passive: true });
    addEventListener('resize', measure);
    let id = 0;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      id = window.setInterval(() => {
        if (paused.current || document.hidden || pages < 2) return;
        const max = el.scrollWidth - el.clientWidth;
        const cur = Math.abs(el.scrollLeft);
        const next = cur >= max - 4 ? 0 : Math.min(max, cur + el.clientWidth);
        el.scrollTo({ left: isAr ? -next : next, behavior: 'smooth' });
      }, 4500);
    }
    return () => { el.removeEventListener('scroll', sync); removeEventListener('resize', measure); clearInterval(id); };
  }, [pages, isAr]);

  const go = (i: number) => {
    const el = track.current;
    const target = el?.children[Math.min(slides.length - 1, Math.round((i * slides.length) / pages))] as HTMLElement | undefined;
    target?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  };

  return (
    <div className="carousel carousel--space"
      onMouseEnter={() => { paused.current = true; }} onMouseLeave={() => { paused.current = false; }}
      onFocus={() => { paused.current = true; }} onBlur={() => { paused.current = false; }}
      onTouchStart={() => { paused.current = true; }}>
      <div className="carousel__track" ref={track}>
        {slides.map((sp) => (
          <figure className="space-slide" key={sp.img}>
            <div className="photo photo--wide" style={{ ['--img' as string]: `url(/${sp.img})` }} />
            <figcaption>{sp.caption}</figcaption>
          </figure>
        ))}
      </div>
      {pages > 1 ? (
        <div className="carousel__dots">
          {Array.from({ length: pages }, (_, i) => (
            <button key={i} type="button" className={i === active ? 'is-active' : ''} aria-label={`${dotLabel} ${i + 1}`} onClick={() => go(i)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
