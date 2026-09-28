import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** 'end' for numbers and action buttons. */
  align?: 'start' | 'end';
  /** Hide on small screens (the table still scrolls sideways if needed). */
  hideOnMobile?: boolean;
  className?: string;
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

/** The one table of the dashboard: consistent header, rows, loading and empty states. */
export function DataTable<T>({ columns, rows, rowKey, loading, empty, label }: DataTableProps<T>) {
  const cellAlign = (c: Column<T>) => (c.align === 'end' ? 'text-end' : 'text-start');
  const mobile = (c: Column<T>) => (c.hideOnMobile ? 'hidden md:table-cell' : '');

  if (!loading && rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm" aria-label={label} aria-busy={loading || undefined}>
        <thead>
          <tr className="border-b border-line">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn('whitespace-nowrap px-5 py-3 text-xs font-medium uppercase tracking-wide text-ink-3', cellAlign(c), mobile(c))}>
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
                    <td key={c.key} className={cn('px-5 py-4', mobile(c))}>
                      <div className="h-4 w-3/4 max-w-40 animate-pulse rounded bg-ink/8" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr key={rowKey(row)} className="border-b border-line transition-colors last:border-0 hover:bg-tint-sage/50">
                  {columns.map((c) => (
                    <td key={c.key} className={cn('px-5 py-3.5 align-middle text-ink-2', cellAlign(c), mobile(c), c.className)}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
