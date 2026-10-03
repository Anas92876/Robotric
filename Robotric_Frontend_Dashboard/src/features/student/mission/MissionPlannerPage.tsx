import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info, Lock, Maximize2, Minimize2 } from 'lucide-react';
import { useWroAccess } from '../../../hooks/student/useWroAccess';
import { Button, EmptyState, PageHeader, Panel } from '../../../ui';
import { cn } from '../../../lib/utils';

/**
 * WRO field map tool (a standalone page in /odom-map) shown inside the dashboard, with a full-screen mode.
 * The measurements / code / blocks views of the old planner are switched off for now.
 */
export default function MissionPlannerPage() {
  const { t } = useTranslation('dashboardStudent');
  const { wroAccess, isLoading } = useWroAccess(true);
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [full]);

  if (!isLoading && !wroAccess) {
    return (
      <div className="space-y-5">
        <PageHeader title={t('mp.title')} description={t('mp.subtitle')} />
        <Panel><EmptyState icon={<Lock />} title={t('mp.locked')} description={t('mp.lockedHint')} /></Panel>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('mp.title')} description={t('mp.subtitle')} actions={<Button variant="secondary" icon={<Maximize2 />} onClick={() => setFull(true)}>{t('mp.fullScreen')}</Button>} />
      <p className="flex items-start gap-2 rounded-card bg-tint-straw px-4 py-3 text-sm text-ink-2">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>{t('mp.origin')}</span>
      </p>
      <div className={cn(full ? 'fixed inset-0 z-50 bg-ink' : 'overflow-hidden rounded-panel border border-line bg-ink')}>
        {full && (
          <Button variant="glow" size="sm" icon={<Minimize2 />} onClick={() => setFull(false)} className="absolute end-4 top-4 z-10">{t('mp.exitFull')}</Button>
        )}
        <iframe src="/odom-map/OdomMap.html" title={t('mp.mapTitle')} className={cn('block w-full border-0', full ? 'h-full' : 'h-[calc(100vh-260px)] min-h-[480px]')} />
      </div>
    </div>
  );
}
