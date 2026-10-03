'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/lib/icons';

type Item = { id: number; title: string; category: string };

export default function GalleryGrid({ items, categories, emptyText, isAr, labels }: {
  items: Item[]; categories: Record<string, string>; emptyText: string; isAr: boolean; labels: { close: string; prev: string; next: string; title: string };
}) {
  const [cat, setCat] = useState('all');
  const [open, setOpen] = useState<number | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const shown = items.filter((it) => cat === 'all' || it.category === cat);

  // #projects style links preselect a category
  useEffect(() => {
    const h = location.hash.slice(1);
    if (h in categories) setCat(h);
  }, [categories]);

  const pick = (k: string) => {
    setCat(k);
    history.replaceState(null, '', k === 'all' ? location.pathname : `#${k}`);
  };

  const close = useCallback(() => { setOpen(null); lastFocus.current?.focus(); }, []);
  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + shown.length) % shown.length)), [shown.length]);

  useEffect(() => {
    if (open === null) return;
    document.body.style.overflow = 'hidden';
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(isAr ? -1 : 1);
      if (e.key === 'ArrowLeft') step(isAr ? 1 : -1);
    };
    addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; removeEventListener('keydown', onKey); };
  }, [open, close, step, isAr]);

  const current = open !== null ? shown[open] : null;

  return (
    <>
      <div className="filters" role="toolbar" aria-label={labels.title}>
        {Object.entries(categories).map(([k, label]) => (
          <button key={k} type="button" className={`filter${cat === k ? ' is-active' : ''}`} aria-pressed={cat === k} onClick={() => pick(k)}>
            {label} <span className="filter__count">{k === 'all' ? items.length : items.filter((x) => x.category === k).length}</span>
          </button>
        ))}
      </div>

      <div className="masonry">
        {shown.map((it, i) => (
          <figure className="masonry__item" key={it.id}>
            <button type="button" className="masonry__btn" aria-label={it.title} onClick={(e) => { lastFocus.current = e.currentTarget; setOpen(i); }}>
              <Image src={`/images/image-${it.id}.webp`} alt={it.title} width={1600} height={1200} sizes="(max-width: 760px) 100vw, 33vw" quality={70} loading={i < 3 ? 'eager' : 'lazy'} fetchPriority={i === 0 ? 'high' : undefined} style={{ width: '100%', height: 'auto' }} />
            </button>
            <figcaption><span className="tag">{categories[it.category]}</span>{it.title}</figcaption>
          </figure>
        ))}
      </div>
      {shown.length === 0 ? <p className="empty">{emptyText}</p> : null}

      {current ? (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={labels.title} onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <button ref={closeBtn} type="button" className="lightbox__close" aria-label={labels.close} onClick={close}><Icon name="x" /></button>
          <button type="button" className="lightbox__nav lightbox__nav--prev" aria-label={labels.prev} onClick={() => step(-1)}><Icon name={isAr ? 'chevronRight' : 'chevronLeft'} /></button>
          <figure className="lightbox__figure">
            <Image src={`/images/image-${current.id}.webp`} alt={current.title} width={1600} height={1200} sizes="90vw" quality={80} style={{ width: 'auto', height: 'auto' }} />
            <figcaption>{current.title}</figcaption>
          </figure>
          <button type="button" className="lightbox__nav lightbox__nav--next" aria-label={labels.next} onClick={() => step(1)}><Icon name={isAr ? 'chevronLeft' : 'chevronRight'} /></button>
        </div>
      ) : null}
    </>
  );
}
