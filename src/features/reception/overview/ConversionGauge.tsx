import { useTranslation } from 'react-i18next';

/** Half-circle gauge: share of leads that became students. Flat colours only. */
export function ConversionGauge({ converted, total }: { converted: number; total: number }) {
  const { t } = useTranslation('dashboardReception');
  const pct = total > 0 ? Math.round((converted / total) * 100) : 0;
  // Arc of radius 80 from the left end to the right end of the half circle
  const r = 80;
  const len = Math.PI * r;
  const arc = `M ${100 - r} 100 A ${r} ${r} 0 0 1 ${100 + r} 100`;

  return (
    <div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-ink" aria-hidden />
          {t('overview.converted')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-gold" aria-hidden />
          {t('overview.stillLeads')}
        </span>
      </div>
      <svg viewBox="0 0 200 112" className="mx-auto mt-3 w-full max-w-60" role="img" aria-label={`${t('overview.conversion')}: ${pct}%`}>
        <path d={arc} fill="none" stroke="#cccc99" strokeWidth="18" strokeLinecap="round" />
        {pct > 0 && <path d={arc} fill="none" stroke="#003300" strokeWidth="18" strokeLinecap="round" strokeDasharray={`${(len * pct) / 100} ${len}`} />}
        <text x="100" y="92" textAnchor="middle" className="fill-ink text-[28px] font-bold">
          {pct}%
        </text>
      </svg>
      <p className="mt-1 text-center text-sm text-ink-3">
        {t('overview.conversionNote', { converted, total })}
      </p>
    </div>
  );
}
