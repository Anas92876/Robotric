import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';

/** Solid gold greeting card at the top of the overview. */
export function WelcomeBanner({ name }: { name: string }) {
  const { t } = useTranslation('dashboardReception');
  return (
    <div className="relative flex min-h-48 overflow-hidden rounded-feature bg-gold px-6 py-7 sm:px-9">
      {/* Flat decorative circles, like the reference's line doodles */}
      <span aria-hidden className="absolute -bottom-16 -start-10 size-44 rounded-full border-[14px] border-ink/5" />
      <span aria-hidden className="absolute -top-10 end-1/3 size-24 rounded-full border-[10px] border-cream/40" />

      <div className="relative z-10 flex max-w-[60%] flex-col justify-center">
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

      <RobotArt className="absolute bottom-0 end-4 hidden h-[88%] sm:block rtl:-scale-x-100" />
    </div>
  );
}

/** A friendly robot at a desk, flat brand colours only. */
function RobotArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 190" className={className} aria-hidden>
      {/* antenna */}
      <line x1="120" y1="18" x2="120" y2="40" stroke="#003300" strokeWidth="5" strokeLinecap="round" />
      <circle cx="120" cy="14" r="8" fill="#ffffcc" stroke="#003300" strokeWidth="4" />
      {/* head */}
      <rect x="78" y="40" width="84" height="62" rx="18" fill="#003300" />
      <rect x="90" y="54" width="60" height="32" rx="12" fill="#ffffcc" />
      <circle cx="107" cy="70" r="6" fill="#003300" />
      <circle cx="133" cy="70" r="6" fill="#003300" />
      <rect x="68" y="60" width="10" height="22" rx="5" fill="#003300" />
      <rect x="162" y="60" width="10" height="22" rx="5" fill="#003300" />
      {/* body */}
      <rect x="86" y="108" width="68" height="60" rx="16" fill="#003300" />
      <circle cx="120" cy="132" r="9" fill="#cccc99" />
      {/* arms holding a book */}
      <rect x="56" y="118" width="34" height="12" rx="6" fill="#003300" transform="rotate(-18 73 124)" />
      <rect x="150" y="118" width="34" height="12" rx="6" fill="#003300" transform="rotate(18 167 124)" />
      <path d="M150 150 L196 138 L200 170 L154 182 Z" fill="#ffffcc" stroke="#003300" strokeWidth="4" strokeLinejoin="round" />
      <line x1="162" y1="156" x2="188" y2="149" stroke="#003300" strokeWidth="3" strokeLinecap="round" />
      <line x1="164" y1="166" x2="184" y2="161" stroke="#003300" strokeWidth="3" strokeLinecap="round" />
      {/* desk */}
      <rect x="20" y="176" width="210" height="14" rx="7" fill="#003300" opacity="0.85" />
    </svg>
  );
}
