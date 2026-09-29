import { useMemo, useRef, useState } from 'react';
import { Menu as HMenu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Globe, LogOut, Menu, Search } from 'lucide-react';
import { updateHtmlAttributes } from '../../i18n';
import { cn } from '../../lib/utils';
import { ROLE_LABELS, type NavLink, type NavSection } from '../navigation';

interface AppTopbarProps {
  sections: NavSection[];
  user: { name: string; email?: string; role: string };
  onSignOut: () => void;
  onMenu: () => void;
}

/** Top bar: today's date, page search, language switch and the account menu. */
export function AppTopbar({ sections, user, onSignOut, onMenu }: AppTopbarProps) {
  const { t, i18n } = useTranslation('dashboardNav');
  const isAr = i18n.language === 'ar';
  const locale = isAr ? 'ar-SY-u-nu-latn' : 'en-GB';
  const now = new Date();

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

        <LanguageSwitch />
        <AccountMenu user={user} onSignOut={onSignOut} />
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

/** Globe button with the current language; opens a menu to pick English or Arabic. */
function LanguageSwitch() {
  const { t, i18n } = useTranslation('dashboardNav');
  const current = i18n.language === 'ar' ? 'ar' : 'en';
  const choose = (lang: 'en' | 'ar') => {
    if (lang === current) return;
    void i18n.changeLanguage(lang);
    updateHtmlAttributes(lang);
  };
  const options = [
    { lang: 'en' as const, code: 'EN', name: 'English' },
    { lang: 'ar' as const, code: 'AR', name: 'العربية' },
  ];

  return (
    <HMenu as="div" className="relative shrink-0">
      <MenuButton
        aria-label={t('shell.language')}
        className="flex h-11 items-center gap-2 rounded-pill border border-line bg-paper px-3.5 text-sm font-semibold text-ink transition-colors hover:border-line-strong focus-visible:focus-ring data-[open]:border-ink"
      >
        <Globe className="size-[18px] text-ink-3" aria-hidden />
        <span className="hidden sm:inline">{current === 'ar' ? 'AR' : 'EN'}</span>
        <ChevronDown className="size-4 text-ink-4 transition-transform in-data-[open]:rotate-180" aria-hidden />
      </MenuButton>
      <MenuItems anchor="bottom end" className="z-40 w-48 rounded-card border border-line bg-paper p-1.5 shadow-pop [--anchor-gap:8px] focus:outline-none">
        {options.map((o) => (
          <MenuItem key={o.lang}>
            <button
              type="button"
              lang={o.lang}
              onClick={() => choose(o.lang)}
              className="flex w-full items-center gap-3 rounded-input px-3 py-2.5 text-sm text-ink data-[focus]:bg-rail"
            >
              <span className="grid h-6 w-8 place-items-center rounded-md bg-rail text-[11px] font-bold tracking-wide text-ink-2">{o.code}</span>
              <span className="flex-1 text-start font-medium">{o.name}</span>
              {current === o.lang && <Check className="size-4 text-ink" aria-hidden />}
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </HMenu>
  );
}

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

/** The signed-in person: initials, name and role; opens a menu with the email and sign out. */
function AccountMenu({ user, onSignOut }: { user: { name: string; email?: string; role: string }; onSignOut: () => void }) {
  const { t } = useTranslation('dashboardNav');
  const role = t(`role.${user.role}`, ROLE_LABELS[user.role] ?? user.role);

  return (
    <HMenu as="div" className="relative shrink-0">
      <MenuButton className="flex h-11 items-center gap-2.5 rounded-pill border border-line bg-paper p-1 pe-1 transition-colors hover:border-line-strong focus-visible:focus-ring data-[open]:border-ink md:pe-3">
        <span className="relative grid size-9 place-items-center rounded-full bg-ink text-xs font-semibold tracking-wide text-cream">
          {initials(user.name)}
          <span aria-hidden className="absolute -bottom-0.5 -end-0.5 size-3 rounded-full bg-success ring-2 ring-paper" />
        </span>
        <span className="hidden min-w-0 text-start leading-tight md:block">
          <span className="block max-w-36 truncate text-sm font-semibold text-ink">{user.name}</span>
          <span className="block max-w-36 truncate text-xs text-ink-4">{role}</span>
        </span>
        <ChevronDown className="hidden size-4 text-ink-4 md:block" aria-hidden />
        <span className="sr-only">{t('shell.account')}</span>
      </MenuButton>
      <MenuItems
        anchor="bottom end"
        className="z-40 mt-2 w-64 rounded-card border border-line bg-paper p-1.5 shadow-pop [--anchor-gap:8px] focus:outline-none"
      >
        <div className="flex items-center gap-3 px-3 py-2.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold text-sm font-semibold text-ink">{initials(user.name)}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            {user.email && <p className="truncate text-xs text-ink-4">{user.email}</p>}
          </div>
        </div>
        <div className="my-1 h-px bg-line" />
        <MenuItem>
          <button type="button" onClick={onSignOut} className="flex w-full items-center gap-2.5 rounded-input px-3 py-2.5 text-sm font-medium text-danger data-[focus]:bg-danger-soft">
            <LogOut className="size-4 rtl:rotate-180" aria-hidden />
            {t('shell.signOut')}
          </button>
        </MenuItem>
      </MenuItems>
    </HMenu>
  );
}
