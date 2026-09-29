import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';

/** Solid gold greeting card at the top of the overview, with Lori standing in front of it. */
export function WelcomeBanner({ name }: { name: string }) {
  const { t } = useTranslation('dashboardReception');
  return (
    // Top margin leaves room for Lori's head, which rises above the card
    <div className="relative flex min-h-52 rounded-feature bg-gold px-6 py-7 sm:mt-14 sm:px-9">
      <div className="relative flex max-w-[62%] flex-col justify-center">
        <p className="text-sm font-medium text-ink-2">{t('overview.welcomeBack')} 👋</p>
        <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{name}</h1>
        <p className="mt-2 text-sm text-ink-2">{t('overview.heroNote')}</p>
        <Link
          to="/reception/enrollments"
          className="mt-5 inline-flex w-fit items-center gap-2 rounded-md text-sm font-semibold text-ink underline-offset-4 hover:underline focus-visible:focus-ring"
        >
          {t('overview.goEnrollments')}
          <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
        </Link>
      </div>

      {/* Lori, in front of the card and taller than it; faces the text in both directions */}
      <img
        src="/dash-assets/images/lori.webp"
        alt=""
        aria-hidden
        width={467}
        height={600}
        className="pointer-events-none absolute bottom-0 end-8 z-10 hidden h-[128%] w-auto select-none drop-shadow-[0_18px_22px_rgb(0_51_0/0.25)] sm:block rtl:-scale-x-100 motion-safe:animate-lori"
      />
    </div>
  );
}
