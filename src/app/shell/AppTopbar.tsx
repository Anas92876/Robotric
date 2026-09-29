import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, Search } from 'lucide-react';
import { updateHtmlAttributes } from '../../i18n';
import { cn } from '../../lib/utils';
import type { NavLink, NavSection } from '../navigation';

interface AppTopbarProps {
  sections: NavSection[];
  userName: string;
  onMenu: () => void;
}

/** Top bar: today's date, page search, language switch and the person's avatar. */
export function AppTopbar({ sections, userName, onMenu }: AppTopbarProps) {
  const { t, i18n } = useTranslation('dashboardNav');
  const isAr = i18n.language === 'ar';
  const next = isAr ? 'en' : 'ar';
  const locale = isAr ? 'ar-SY-u-nu-latn' : 'en-GB';
  const now = new Date();

  const switchLanguage = () => {
    void i18n.changeLanguage(next);
    updateHtmlAttributes(next);
  };

  return (
    <header className="sticky top-0 z-20 bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
      <div className="flex h-20 items-center gap-3 px-4 sm:gap-5 sm:px-6 lg:px-8">
        <button type="button" onClick={onMenu} aria-label={t('shell.openMenu')} className="grid size-11 shrink-0 place-items-center rounded-full bg-rail text-ink hover:bg-tint-sand focus-visible:focus-ring lg:hidden">
          <Menu className="size-5" />
        </button>

        <div className="hidden shrink-0 sm:block">
          <p className="text-lg font-semibold leading-tight text-ink">{new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(now)}</p>
          <p className="text-xs text-ink-4">{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(now)}</p>
        </div>

        <div className="flex min-w-0 flex-1 justify-center">
          <PageSearch sections={sections} />
        </div>

        <button
          type="button"
          onClick={switchLanguage}
          lang={next}
          aria-label={t('shell.switchLanguage')}
          title={t('shell.switchLanguage')}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-rail text-sm font-semibold text-ink hover:bg-tint-sand focus-visible:focus-ring"
        >
          {isAr ? 'EN' : 'ع'}
        </button>
        <div aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-gold text-base font-semibold text-ink">
          {userName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}

/** Type a page name, pick it, go there. Searches the pages in the person's own menu. */
function PageSearch({ sections }: { sections: NavSection[] }) {
  const { t } = useTranslation('dashboardNav');
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const pages = useMemo(() => {
    const seen = new Set<string>();
    const all: (NavLink & { title: string })[] = [];
    for (const s of sections)
      for (const item of s.items)
        if (!seen.has(item.path)) {
          seen.add(item.path);
          all.push({ ...item, title: t(item.id, item.label) });
        }
    return all;
  }, [sections, t]);

  const q = query.trim().toLowerCase();
  const matches = q ? pages.filter((p) => p.title.toLowerCase().includes(q) || p.label.toLowerCase().includes(q)).slice(0, 7) : [];

  const go = (path: string) => {
    navigate(path);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute start-4 top-1/2 size-[18px] -translate-y-1/2 text-ink-4" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlight(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setHighlight((h) => Math.min(h + 1, matches.length - 1));
          else if (e.key === 'ArrowUp') setHighlight((h) => Math.max(h - 1, 0));
          else if (e.key === 'Enter' && matches[highlight]) go(matches[highlight].path);
          else if (e.key === 'Escape') setOpen(false);
        }}
        placeholder={t('shell.searchPages')}
        aria-label={t('shell.searchPages')}
        role="combobox"
        aria-expanded={open && matches.length > 0}
        aria-controls="page-search-results"
        className="h-12 w-full rounded-pill border border-line bg-paper ps-11 pe-4 text-sm text-ink shadow-[0_8px_24px_-12px_rgb(0_51_0/0.25)] placeholder:text-ink-4 focus:border-ink focus:outline-none"
      />
      {open && matches.length > 0 && (
        <ul id="page-search-results" role="listbox" className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-card border border-line bg-paper py-1.5 shadow-pop">
          {matches.map((p, i) => {
            const Icon = p.icon;
            return (
              <li key={p.path} role="option" aria-selected={i === highlight}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(p.path)}
                  onMouseEnter={() => setHighlight(i)}
                  className={cn('flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm text-ink', i === highlight && 'bg-rail')}
                >
                  <Icon className="size-[18px] text-ink-3" aria-hidden />
                  {p.title}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
