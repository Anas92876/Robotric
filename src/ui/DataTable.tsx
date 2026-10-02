import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** 'end' for numbers and action buttons. */
  align?: 'start' | 'end';
  /** Hide on small screens (left out of the phone cards too). */
  hideOnMobile?: boolean;
  className?: string;
  /**
   * Its place in the phone card. By default the first column is the card's title, a column keyed
   * "menu", "go" or "actions" sits in the corner, and every other column is a "label: value" line.
   */
  mobile?: 'title' | 'corner' | 'line' | 'hide';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  /** Shown instead of rows when there are none. */
  empty?: ReactNode;
  /** Accessible name of the table. */
  label: string;
}

const CORNER_KEYS = ['menu', 'go', 'actions'];
function placeOf<T>(c: Column<T>, i: number): NonNullable<Column<T>['mobile']> {
  if (c.mobile) return c.mobile;
  if (c.hideOnMobile) return 'hide';
  if (CORNER_KEYS.includes(c.key)) return 'corner';
  return i === 0 ? 'title' : 'line';
}

/**
 * The one table of the dashboard: consistent header, rows, loading and empty states.
 * On phones and small tablets each row becomes a card, so nothing needs sideways scrolling.
 */
export function DataTable<T>({ columns, rows, rowKey, loading, empty, label }: DataTableProps<T>) {
  const cellAlign = (c: Column<T>) => (c.align === 'end' ? 'text-end' : 'text-start');
  const mobile = (c: Column<T>) => (c.hideOnMobile ? 'hidden lg:table-cell' : '');
  const placed = columns.map((c, i) => ({ c, place: placeOf(c, i) }));
  const title = placed.filter((x) => x.place === 'title');
  const corner = placed.filter((x) => x.place === 'corner');
  const lines = placed.filter((x) => x.place === 'line');

  if (!loading && rows.length === 0 && empty) return <>{empty}</>;

  return (
    <>
      {/* Phones and small tablets: one card per row */}
      <ul className="divide-y divide-line md:hidden" aria-label={label} aria-busy={loading || undefined}>
        {loading
          ? Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="space-y-2.5 p-4">
                <div className="h-4 w-2/3 animate-pulse rounded bg-ink/8" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-ink/8" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-ink/8" />
              </li>
            ))
          : rows.map((row) => (
              <li key={rowKey(row)} className="p-4">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 text-sm text-ink-2 [overflow-wrap:anywhere] [&_*]:max-w-full">
                    {title.map(({ c }) => <div key={c.key} className="min-w-0">{c.cell(row)}</div>)}
                  </div>
                  {corner.length > 0 && <div className="-me-1 -mt-1 flex shrink-0 items-center gap-1">{corner.map(({ c }) => <div key={c.key}>{c.cell(row)}</div>)}</div>}
                </div>
                {lines.length > 0 && (
                  <dl className="mt-2.5 space-y-1.5">
                    {lines.map(({ c }) => (
                      <div key={c.key} className="flex items-start justify-between gap-3 text-sm">
                        <dt className="shrink-0 pt-px text-xs text-ink-4">{c.header}</dt>
                        <dd className="min-w-0 text-end text-ink-2 [overflow-wrap:anywhere] [&>*]:ms-auto [&_*]:max-w-full [&_.whitespace-nowrap]:whitespace-normal">{c.cell(row)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            ))}
      </ul>

      {/* Tablets and up: the table */}
      <div className="relative hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm" aria-label={label} aria-busy={loading || undefined}>
          <thead>
            <tr className="border-b border-line">
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn('whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wide text-ink-3 xl:px-5', cellAlign(c), mobile(c))}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }, (_, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    {columns.map((c) => (
                      <td key={c.key} className={cn('px-4 py-4 xl:px-5', mobile(c))}>
                        <div className="h-4 w-3/4 max-w-40 animate-pulse rounded bg-ink/8" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row) => (
                  <tr key={rowKey(row)} className="border-b border-line transition-colors last:border-0 hover:bg-tint-sage/50">
                    {columns.map((c) => (
                      <td key={c.key} className={cn('px-4 py-3.5 align-middle text-ink-2 xl:px-5', cellAlign(c), mobile(c), c.className)}>
                        {c.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
