'use client';

import { useEffect, useState } from 'react';

// Hero sub-headline that cycles through the live site's "typing" sentences
export default function Rotator({ items }: { items: string[] }) {
  const [i, setI] = useState(0);
  const [out, setOut] = useState(false);
  useEffect(() => {
    if (items.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let t: number;
    const id = window.setInterval(() => {
      setOut(true);
      t = window.setTimeout(() => { setI((n) => (n + 1) % items.length); setOut(false); }, 350);
    }, 3200);
    return () => { clearInterval(id); clearTimeout(t); };
  }, [items.length]);
  return (
    <div className="rotator" aria-live="polite">
      <span className="rotator__dot" />
      <span className={`rotator__text${out ? ' is-out' : ''}`}>{items[i]}</span>
    </div>
  );
}
