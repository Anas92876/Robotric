'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/lib/icons';

declare global { interface Window { gtag?: (...args: unknown[]) => void } }

const REVEAL = [
  '.section-head__main', '.section-head__side', '.split > *', '.stats',
  '.card', '.feature', '.step', '.proof', '.faq details', '.map', '.footer__grid > *', '.footer__bottom',
  '.values__item', '.timeline__year', '.vtimeline__step', '.material', '.phase', '.option', '.lab-step',
  '.contact-card', '.masonry__item', '.dept', '.journey__step', '.track-tab', '.cap__list li',
  '.feature-list li', '.results__list li', '.space-slide', '.soon', '.pullquote', '.band', '.job-card',
].join(',');
const SCALE = '.feature, .proof, .stats';

// Runs all DOM-level motion for the current page and returns a cleanup function.
function initMotion(): () => void {
  const cleanups: (() => void)[] = [];
  const on = <K extends keyof WindowEventMap>(t: Window, ev: K, fn: (e: WindowEventMap[K]) => void, opts?: AddEventListenerOptions) => {
    t.addEventListener(ev, fn, opts); cleanups.push(() => t.removeEventListener(ev, fn));
  };
  const root = document.documentElement;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motion = root.classList.contains('motion');
  const main = document.querySelector('main');
  if (!main) return () => {};

  const observers: IntersectionObserver[] = [];
  const onceVisible = (els: Element[], cb: (el: Element) => void, margin = '0px 0px -10% 0px') => {
    if (!('IntersectionObserver' in window)) { els.forEach(cb); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { cb(en.target); io.unobserve(en.target); }
    }), { rootMargin: margin });
    els.forEach((el) => io.observe(el));
    observers.push(io);
  };

  /* ---- Staggered reveal ---------------------------------------------------- */
  const scope = [main, document.querySelector('.footer')].filter(Boolean) as Element[];
  const candidates = scope.flatMap((s) => [...s.querySelectorAll(REVEAL)]);
  candidates.forEach((el) => {
    if (el.classList.contains('reveal')) return;
    if (el.closest('.hero, .page-hero .hero__split, .halo, .device')) return;
    if (el.parentElement?.closest('.reveal') && !el.matches('.faq details')) return;
    el.classList.add('reveal');
    if (el.parentElement?.matches('.grid--2, .split')) {
      const idx = [...el.parentElement.children].indexOf(el);
      el.classList.add(idx % 2 ? 'reveal--right' : 'reveal--left');
    } else if (el.matches(SCALE)) el.classList.add('reveal--scale');
  });
  const groups = new Map<Element, number>();
  const reveals = scope.flatMap((s) => [...s.querySelectorAll('.reveal:not(.is-in)')]);
  reveals.forEach((el) => {
    const key = el.parentElement!;
    const i = groups.get(key) ?? 0;
    (el as HTMLElement).style.setProperty('--i', String(i % 6));
    groups.set(key, i + 1);
  });
  const timers: number[] = [];
  if (calm) reveals.forEach((r) => r.classList.add('is-in', 'is-settled'));
  else onceVisible(reveals, (el) => {
    el.classList.add('is-in');
    const delay = (parseFloat(getComputedStyle(el).transitionDelay) || 0) * 1000;
    timers.push(window.setTimeout(() => el.classList.add('is-settled'), delay + 850));
  });

  /* ---- Words, highlights, list cascades ------------------------------------ */
  const heroTitles = [...main.querySelectorAll('.hero h1.split-words, .page-hero h1.split-words, .consult__intro h1.split-words')];
  heroTitles.forEach((h) => { void (h as HTMLElement).offsetWidth; timers.push(window.setTimeout(() => h.classList.add('words-in'), 60)); });
  onceVisible([...main.querySelectorAll('.split-words')].filter((h) => !heroTitles.includes(h)), (h) => h.classList.add('words-in'), '0px 0px -12% 0px');
  onceVisible([...main.querySelectorAll('em.hl')], (el) => el.classList.add('is-drawn'), '0px 0px -15% 0px');
  main.querySelectorAll('.checks, .feature__meta, .vtimeline__items, .facts').forEach((list) => {
    if (list.closest('.halo')) return;
    list.classList.add('kids');
    [...list.children].forEach((c, k) => (c as HTMLElement).style.setProperty('--k', String(k)));
    if (!list.closest('.reveal')) onceVisible([list], (l) => l.classList.add('is-in'));
  });

  /* ---- Stats count up ------------------------------------------------------- */
  const countUp = (el: Element) => {
    const m = el.textContent?.trim().match(/^([\d,]+)(.*)$/);
    if (!m || calm) return;
    const target = Number(m[1].replace(/,/g, ''));
    const suffix = m[2], comma = m[1].includes(',');
    const dur = 1600 + Math.min(target, 12000) / 20, t0 = performance.now();
    const fmt = (n: number) => (comma ? n.toLocaleString('en-US') : String(n)) + suffix;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(Math.round(target * (1 - Math.pow(1 - p, 4))));
      if (p < 1) requestAnimationFrame(tick);
    };
    el.textContent = fmt(0);
    requestAnimationFrame(tick);
  };
  onceVisible([...main.querySelectorAll('.stat b')], (el) => timers.push(window.setTimeout(() => countUp(el), 250)));

  /* ---- Hero halo breathing ------------------------------------------------- */
  const halo = main.querySelector('.halo');
  if (halo && !calm) timers.push(window.setTimeout(() => halo.classList.add('is-live'), 1700));

  /* ---- FAQ smooth open/close ------------------------------------------------ */
  main.querySelectorAll<HTMLDetailsElement>('.faq details').forEach((d) => {
    const summary = d.querySelector('summary');
    if (!summary) return;
    let anim: Animation | null = null;
    const onClick = (e: Event) => {
      if (calm || !d.animate) return;
      e.preventDefault();
      anim?.cancel();
      const start = d.offsetHeight;
      if (!d.open) {
        d.open = true;
        anim = d.animate({ height: [`${start}px`, `${d.offsetHeight}px`] }, { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' });
      } else {
        anim = d.animate({ height: [`${start}px`, `${summary.offsetHeight}px`] }, { duration: 300, easing: 'cubic-bezier(.22,1,.36,1)' });
        anim.onfinish = () => { d.open = false; };
      }
    };
    summary.addEventListener('click', onClick);
    cleanups.push(() => summary.removeEventListener('click', onClick));
  });

  /* ---- Scroll-linked values: --y, --hero on :root; --enter per element ---- */
  if (motion) {
    const linked = [...main.querySelectorAll('.closer, .photo, .journey')];
    const visible = new Set<Element>();
    const vio = new IntersectionObserver((ents) => ents.forEach((en) => (en.isIntersecting ? visible.add(en.target) : visible.delete(en.target))), { rootMargin: '10% 0px 10% 0px' });
    linked.forEach((el) => vio.observe(el));
    observers.push(vio);
    const clamp = (v: number) => Math.max(0, Math.min(1, v));
    let queued = false;
    const frame = () => {
      queued = false;
      const y = scrollY, vh = innerHeight;
      root.style.setProperty('--y', y.toFixed(1));
      root.style.setProperty('--hero', clamp(y / (vh * 0.8)).toFixed(3));
      visible.forEach((el) => {
        const r = el.getBoundingClientRect();
        (el as HTMLElement).style.setProperty('--enter', clamp((vh - r.top) / (vh * 0.55)).toFixed(3));
      });
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
    on(window, 'scroll', queue, { passive: true });
    on(window, 'resize', queue);
    frame();
    // Elements already in view get their value as soon as the observer reports them
    timers.push(window.setTimeout(queue, 50));
  }

  /* ---- Pointer: tilt + spotlight on cards, magnetic buttons (mouse only) --- */
  if (motion && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    main.querySelectorAll<HTMLElement>('a.feature, .proof, .card:not(.form), .job-card').forEach((el) => {
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
        el.style.setProperty('--tx', (0.5 - y).toFixed(3));
        el.style.setProperty('--ty', (x - 0.5).toFixed(3));
        el.style.setProperty('--ta', `${(Math.min(1, Math.hypot(x - 0.5, y - 0.5) * 2) * 6).toFixed(2)}deg`);
      };
      const leave = () => el.style.setProperty('--ta', '0deg');
      el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave);
      cleanups.push(() => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); });
    });
    // No class is added here: changing a button before React hydrates it causes a
    // hydration mismatch (globals.css targets these buttons directly).
    document.querySelectorAll<HTMLElement>('.btn--lg, .nav .btn--primary').forEach((b) => {
      const move = (e: PointerEvent) => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--bx', `${((e.clientX - r.left - r.width / 2) * 0.25).toFixed(1)}px`);
        b.style.setProperty('--by', `${((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1)}px`);
      };
      const leave = () => { b.style.setProperty('--bx', '0px'); b.style.setProperty('--by', '0px'); };
      b.addEventListener('pointermove', move); b.addEventListener('pointerleave', leave);
      cleanups.push(() => { b.removeEventListener('pointermove', move); b.removeEventListener('pointerleave', leave); });
    });
  }

  return () => {
    cleanups.forEach((f) => f());
    observers.forEach((o) => o.disconnect());
    timers.forEach((t) => clearTimeout(t));
  };
}

// Scroll progress bar + back-to-top button with a progress ring
function ProgressUI({ backLabel }: { backLabel: string }) {
  const [p, setP] = useState(0);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      setP(max > 0 ? Math.min(1, scrollY / max) : 0);
      setShown(scrollY > 700);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);
  const style = { ['--p' as string]: p.toFixed(3) };
  return (
    <>
      <div className="progress" style={style} aria-hidden="true" />
      <button type="button" className={`to-top${shown ? ' is-shown' : ''}`} style={style} aria-label={backLabel}
        onClick={() => scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}>
        <svg className="ring" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" /></svg>
        <Icon name="chevronUp" className="chev" />
      </button>
    </>
  );
}

export default function Motion({ backLabel }: { backLabel: string }) {
  const pathname = usePathname();

  // Re-run page motion after every navigation (the new page's DOM is in place when this effect runs)
  useEffect(() => initMotion(), [pathname]);

  // Conversion tracking for any element with data-track (GA4 when configured)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element).closest<HTMLElement>('[data-track]');
      if (el && typeof window.gtag === 'function') window.gtag('event', el.dataset.track, { label: el.dataset.trackLabel || el.textContent?.trim().slice(0, 60), page: location.pathname });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return <ProgressUI backLabel={backLabel} />;
}
