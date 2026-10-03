import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass } from 'lucide-react';
import { ROUTES } from '../../../constants/routes.constants';

/** Shown for any address the dashboard does not know. */
export default function NotFoundPage() {
  const { t } = useTranslation('dashboardCommon');
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-ink text-glow"><Compass className="size-8" aria-hidden /></span>
        <p className="mt-6 text-sm font-semibold tabular-nums text-ink-3">404</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">{t('nf.title')}</h1>
        <p className="mt-2 text-sm text-ink-3">{t('nf.text')}</p>
        <Link to={ROUTES.DASHBOARD} className="mt-6 inline-flex h-11 items-center rounded-pill bg-ink px-6 text-sm font-medium text-white hover:bg-ink-deep focus-visible:focus-ring">{t('nf.home')}</Link>
      </div>
    </main>
  );
}
