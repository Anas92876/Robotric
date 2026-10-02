import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

interface StatTileProps {
  icon: ReactNode;
  /** Soft background of the icon square, e.g. "bg-tint-leaf". */
  tint: string;
  label: ReactNode;
  value?: number | string;
  loading?: boolean;
  /** Makes the tile a link. */
  to?: string;
  /** Makes the tile a toggle button (e.g. a quick filter). */
  onClick?: () => void;
  active?: boolean;
}

/** Small headline number: icon in a tinted square, big value, label under it. */
export function StatTile({ icon, tint, label, value, loading, to, onClick, active }: StatTileProps) {
  const body = (
    <>
      <span className={cn('mx-auto grid size-10 place-items-center rounded-input text-ink [&_svg]:size-5', tint)}>{icon}</span>
      {loading ? <span className="mx-auto mt-3 block h-7 w-10 animate-pulse rounded-md bg-rail" /> : <span className="mt-2 block text-2xl font-bold tabular-nums text-ink" dir="ltr">{value ?? 0}</span>}
      <span className="mt-0.5 block text-xs text-ink-3">{label}</span>
    </>
  );
  const base = 'block rounded-card border bg-paper px-3 py-4 text-center shadow-card';
  const interactive = 'transition-colors hover:border-ink focus-visible:focus-ring';
  if (to)
    return (
      <Link to={to} className={cn(base, 'border-line', interactive)}>
        {body}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} aria-pressed={active} className={cn(base, 'w-full', interactive, active ? 'border-ink ring-1 ring-ink' : 'border-line')}>
        {body}
      </button>
    );
  return <div className={cn(base, 'border-line')}>{body}</div>;
}
