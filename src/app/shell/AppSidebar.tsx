import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, LogOut, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { activePath, ROLE_LABELS, type NavSection } from '../navigation';
import { BrandLogo } from './BrandLogo';

interface AppSidebarProps {
  sections: NavSection[];
  user: { name: string; role: string };
  homePath: string;
  onSignOut: () => void;
  /** Mobile drawer state; on large screens the sidebar is always visible. */
  open: boolean;
  onClose: () => void;
}

/** The dashboard menu: logo, a flat list of links, and the signed-in person's card. */
export function AppSidebar({ sections, user, homePath, onSignOut, open, onClose }: AppSidebarProps) {
  const { t, i18n } = useTranslation('dashboardNav');
  const { pathname } = useLocation();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const current = activePath(pathname, sections);

  // Close the drawer when the page changes
  useEffect(() => onClose(), [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Mobile backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn('fixed inset-0 z-40 bg-ink-deep/30 transition-opacity lg:hidden', open ? 'opacity-100' : 'pointer-events-none opacity-0')}
      />
      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-50 flex w-72 max-w-[85vw] flex-col bg-rail transition-transform duration-200',
          'lg:z-30 lg:w-64',
          // Off-screen only below lg; on large screens the menu always shows
          !open && 'max-lg:ltr:-translate-x-full max-lg:rtl:translate-x-full',
        )}
      >
        <div className="flex h-20 shrink-0 items-center justify-between gap-2 px-7">
          <Link to={homePath} className="rounded-md focus-visible:focus-ring" aria-label="Robotrick">
            <BrandLogo lang={lang} />
          </Link>
          <button type="button" onClick={onClose} aria-label={t('shell.closeMenu')} className="grid size-9 place-items-center rounded-full text-ink-3 hover:bg-paper lg:hidden">
            <X className="size-5" />
          </button>
        </div>

        <nav aria-label={t('shell.mainNav')} className="flex-1 space-y-3 overflow-y-auto px-4 pb-4 pt-2">
          {sections.map((s) => (
            <SidebarSection key={s.id} section={s} current={current} />
          ))}
        </nav>

        {/* The signed-in person, as a solid card (the reference's promo card spot) */}
        <div className="p-4 pt-8">
          <div className="relative rounded-feature bg-ink px-4 pb-4 pt-9 text-center">
            <div className="absolute -top-7 start-1/2 grid size-14 place-items-center rounded-full bg-gold text-xl font-semibold text-ink ring-4 ring-rail ltr:-translate-x-1/2 rtl:translate-x-1/2">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <p className="truncate font-semibold text-cream">{user.name}</p>
            <p className="truncate text-xs text-gold">{t(`role.${user.role}`, ROLE_LABELS[user.role] ?? user.role)}</p>
            <button
              type="button"
              onClick={onSignOut}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-input bg-paper px-3 py-2.5 text-sm font-medium text-ink hover:bg-cream focus-visible:focus-ring"
            >
              <LogOut className="size-4 rtl:rotate-180" aria-hidden />
              {t('shell.signOut')}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function SidebarSection({ section, current }: { section: NavSection; current?: string }) {
  const { t } = useTranslation('dashboardNav');
  const containsCurrent = useMemo(() => section.items.some((i) => i.path === current), [section.items, current]);
  const [expanded, setExpanded] = useState(!section.collapsible || containsCurrent);
  useEffect(() => {
    if (containsCurrent) setExpanded(true);
  }, [containsCurrent]);

  const listId = `nav-${section.id}`;

  return (
    <div>
      {/* Only fold-out groups (admin departments) get a heading; plain groups are a flat list */}
      {section.collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={listId}
          className="flex w-full items-center justify-between rounded-md px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-ink-4 hover:text-ink"
        >
          {t(`section.${section.id}`, section.label)}
          <ChevronDown className={cn('size-4 transition-transform', expanded && 'rotate-180')} />
        </button>
      )}
      {expanded && (
        <ul id={listId} className="space-y-1">
          {section.items.map((item) => {
            const active = item.path === current;
            const Icon = item.icon;
            return (
              <li key={item.id + item.path}>
                <Link
                  to={item.path}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3.5 rounded-input px-4 py-2.5 text-[15px] transition-colors focus-visible:focus-ring',
                    active ? 'bg-ink font-medium text-white' : 'text-ink-3 hover:bg-paper hover:text-ink',
                  )}
                >
                  <Icon className={cn('size-5 shrink-0', active ? 'text-white' : 'text-ink-4')} aria-hidden />
                  <span className="truncate">{t(item.id, item.label)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
