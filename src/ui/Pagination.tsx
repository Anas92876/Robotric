import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  onPage: (page: number) => void;
  /** e.g. (from, to, total) => `${from}–${to} of ${total}` */
  summary: (from: number, to: number, total: number) => string;
  pageSize: number;
  labels: { previous: string; next: string };
}

/** Previous / next with a "1–20 of 134" summary. Arrows flip in RTL. */
export function Pagination({ page, pages, total, onPage, summary, pageSize, labels }: PaginationProps) {
  if (pages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
      <p className="text-sm text-ink-3 tabular-nums">{summary(from, to, total)}</p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" icon={<ChevronLeft className="rtl:rotate-180" />} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          {labels.previous}
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          {labels.next}
          <ChevronRight className="rtl:rotate-180" />
        </Button>
      </div>
    </div>
  );
}
