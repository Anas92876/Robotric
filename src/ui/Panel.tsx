import type { HTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

/** A large bordered section of a page (the reference layout's white blocks). */
export function Panel({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <section className={cn('rounded-panel border border-line bg-paper p-5 sm:p-6', className)} {...rest} />;
}

interface PanelTitleProps {
  title: ReactNode;
  /** Optional "View all →" link on the end side. */
  link?: { to: string; label: ReactNode };
  actions?: ReactNode;
  className?: string;
}

export function PanelTitle({ title, link, actions, className }: PanelTitleProps) {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-3', className)}>
      <h2 className="text-lg font-semibold text-ink sm:text-xl">{title}</h2>
      {link && (
        <Link to={link.to} className="inline-flex items-center gap-1.5 rounded-md text-sm text-ink-3 hover:text-ink focus-visible:focus-ring">
          {link.label}
          <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
        </Link>
      )}
      {actions}
    </div>
  );
}
