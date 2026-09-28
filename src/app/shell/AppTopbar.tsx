import { useTranslation } from 'react-i18next';
import { Menu } from 'lucide-react';
import { updateHtmlAttributes } from '../../i18n';

/** Slim bar above the page: menu button on phones and the language switch. */
export function AppTopbar({ onMenu }: { onMenu: () => void }) {
  const { t, i18n } = useTranslation('dashboardNav');
  const next = i18n.language === 'ar' ? 'en' : 'ar';

  const switchLanguage = () => {
    void i18n.changeLanguage(next);
    updateHtmlAttributes(next);
  };

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur supports-[backdrop-filter]:bg-canvas/70">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <button type="button" onClick={onMenu} aria-label={t('shell.openMenu')} className="grid size-10 place-items-center rounded-full text-ink hover:bg-ink/5 focus-visible:focus-ring lg:hidden">
          <Menu className="size-5" />
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={switchLanguage}
          lang={next}
          className="rounded-pill border border-line-strong px-3.5 py-1.5 text-sm font-medium text-ink hover:border-ink focus-visible:focus-ring"
        >
          {t('shell.switchLanguage')}
        </button>
      </div>
    </header>
  );
}
