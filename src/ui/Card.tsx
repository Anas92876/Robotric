import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/utils';

/** White surface on the cream canvas, with the soft brand shadow. */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-card bg-paper shadow-card', className)} {...rest} />;
}

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Buttons or links on the end side of the header. */
  actions?: ReactNode;
  className?: string;
}

export function CardHeader({ title, description, actions, className }: CardHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4', className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
