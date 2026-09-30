import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Lori } from '../../../app/brand/Lori';

/** Navy greeting card (Lori's screen colour) at the top of the overview, with Lori standing in front of it. */
export function WelcomeBanner({ name, attention = false }: { name: string; attention?: boolean }) {
  const { t } = useTranslation('dashboardReception');
  return (
    // Top margin leaves room for Lori's head, which rises above the card
    <div className="relative flex min-h-52 rounded-feature bg-ink px-6 py-7 sm:mt-14 sm:px-9">
      <div className="relative flex max-w-[62%] flex-col justify-center">
        <p className="text-sm font-medium text-glow">{t('overview.welcomeBack')} 👋</p>
        <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-white sm:text-4xl">{name}</h1>
        <p className="mt-2 text-sm text-frost/75">{t('overview.heroNote')}</p>
        <Link
          to="/reception/enrollments"
          className="mt-5 inline-flex w-fit items-center gap-2 rounded-md text-sm font-semibold text-glow underline-offset-4 hover:underline focus-visible:focus-ring"
        >
          {t('overview.goEnrollments')}
          <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
        </Link>
      </div>

      {/* Lori, in front of the card and taller than it; faces the text in both directions */}
      <Lori attention={attention} className="absolute bottom-0 end-8 z-10 hidden h-[128%] cursor-pointer sm:block" />
    </div>
  );
}
