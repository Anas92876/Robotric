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

/** The dashboard menu: logo, sections of links, and the signed-in person. */
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
        className={cn('fixed inset-0 z-40 bg-ink-deep/30 backdrop-blur-[1px] transition-opacity lg:hidden', open ? 'opacity-100' : 'pointer-events-none opacity-0')}
      />
      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-50 flex w-72 max-w-[85vw] flex-col border-e border-line bg-paper transition-transform duration-200',
          'lg:z-30 lg:w-64',
          // Off-screen only below lg; on large screens the menu always shows
          !open && 'max-lg:ltr:-translate-x-full max-lg:rtl:translate-x-full',
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 px-5">
          <Link to={homePath} className="rounded-md focus-visible:focus-ring" aria-label="Robotrick">
            <BrandLogo lang={lang} />
          </Link>
          <button type="button" onClick={onClose} aria-label={t('shell.closeMenu')} className="grid size-9 place-items-center rounded-full text-ink-3 hover:bg-ink/5 lg:hidden">
            <X className="size-5" />
          </button>
        </div>

        <nav aria-label={t('shell.mainNav')} className="flex-1 space-y-5 overflow-y-auto px-3 pb-6 pt-2">
          {sections.map((s) => (
            <SidebarSection key={s.id} section={s} current={current} />
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-card px-2 py-2">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-gold font-semibold text-ink">{user.name.charAt(0).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{user.name}</p>
              <p className="truncate text-xs text-ink-3">{t(`role.${user.role}`, ROLE_LABELS[user.role] ?? user.role)}</p>
            </div>
            <button type="button" onClick={onSignOut} aria-label={t('shell.signOut')} title={t('shell.signOut')} className="grid size-9 place-items-center rounded-full text-ink-3 hover:bg-danger-soft hover:text-danger focus-visible:focus-ring">
              <LogOut className="size-[18px] rtl:rotate-180" />
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

  const title = t(`section.${section.id}`, section.label);
  const listId = `nav-${section.id}`;

  return (
    <div>
      {section.collapsible ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={listId}
          className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-4 hover:text-ink"
        >
          {title}
          <ChevronDown className={cn('size-4 transition-transform', expanded && 'rotate-180')} />
        </button>
      ) : (
        <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-4">{title}</p>
      )}
      {expanded && (
        <ul id={listId} className="mt-1 space-y-0.5">
          {section.items.map((item) => {
            const active = item.path === current;
            const Icon = item.icon;
            return (
              <li key={item.id + item.path}>
                <Link
                  to={item.path}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-input px-3 py-2 text-sm transition-colors focus-visible:focus-ring',
                    active ? 'bg-ink font-medium text-white' : 'text-ink-2 hover:bg-tint-sage hover:text-ink',
                  )}
                >
                  <Icon className={cn('size-[18px] shrink-0', active ? 'text-gold' : 'text-ink-3')} aria-hidden />
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
