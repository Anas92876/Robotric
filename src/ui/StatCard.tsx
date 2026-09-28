import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

export type Tint = 'leaf' | 'khaki' | 'moss' | 'sand' | 'sage' | 'straw' | 'fern';

const tints: Record<Tint, string> = {
  leaf: 'bg-tint-leaf',
  khaki: 'bg-tint-khaki',
  moss: 'bg-tint-moss',
  sand: 'bg-tint-sand',
  sage: 'bg-tint-sage',
  straw: 'bg-tint-straw',
  fern: 'bg-tint-fern',
};

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  /** Pastel background, like the public site's specimen cards. */
  tint?: Tint;
  /** Small line under the value, e.g. "+4 this week". */
  note?: ReactNode;
  loading?: boolean;
}

/** A headline number. */
export function StatCard({ label, value, icon, tint = 'leaf', note, loading }: StatCardProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3 rounded-card p-5', tints[tint])}>
      <div className="min-w-0">
        <p className="text-sm text-ink-2">{label}</p>
        {loading ? (
          <div className="mt-2 h-8 w-16 animate-pulse rounded-md bg-ink/10" />
        ) : (
          <p className="mt-1 text-3xl font-semibold tracking-tight text-ink tabular-nums">{value}</p>
        )}
        {note && <p className="mt-1 text-xs text-ink-3">{note}</p>}
      </div>
      {icon && <div className="grid size-10 shrink-0 place-items-center rounded-full bg-paper/70 text-ink [&_svg]:size-5">{icon}</div>}
    </div>
  );
}
