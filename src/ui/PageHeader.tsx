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
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link to={back.to} className="mb-2 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-ink-3 hover:text-ink focus-visible:focus-ring">
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
            {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl" dir="auto">{title}</h1>
        {description && <p className="mt-1 text-ink-3" dir="auto">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
