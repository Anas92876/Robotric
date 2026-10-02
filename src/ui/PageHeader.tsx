import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Main page actions (e.g. "Add user"), on the end side. */
  actions?: ReactNode;
  /** Link back to the parent page, shown above the title on detail pages. */
  back?: { to: string; label: string };
}

/** Title block at the top of every page. */
export function PageHeader({ title, description, actions, back }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        {back && (
          <Link to={back.to} className="mb-2 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-ink-3 hover:text-ink focus-visible:focus-ring">
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
            {back.label}
          </Link>
        )}
        <h1 className="text-xl font-semibold tracking-tight text-ink [overflow-wrap:anywhere] sm:text-2xl lg:text-3xl" dir="auto">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-3 sm:text-base" dir="auto">{description}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div>}
    </header>
  );
}
