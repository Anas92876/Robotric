import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CalendarDays, Clock, History, Lock, Play, Square, Timer } from 'lucide-react';
import { api } from '../../../lib/api';
import { useToast } from '../../../components/ui/Toast';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import type { WorkSession } from '../../../hooks/useWorkClock';
import { Badge, Button, ConfirmDialog, DataTable, EmptyState, PageHeader, Panel, PanelTitle, StatTile, type Column } from '../../../ui';

const ROOT = ['my', 'hours'] as const;
const pad = (n: number) => String(n).padStart(2, '0');
const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

/** Clock in and out (for staff paid by the hour) and see the days worked. */
export default function MyHoursPage() {
  const { t } = useTranslation('dashboardCommon');
  const f = useFormat();
  const toast = useToast();
  const qc = useQueryClient();
  const status = useQuery({
    queryKey: [...ROOT, 'status'],
    queryFn: async () => (await api.get('/engineer/work/status')).data.data as { isHourly: boolean; active: WorkSession | null },
  });
  const hourly = !!status.data?.isHourly;
  const sessions = useQuery({ queryKey: [...ROOT, 'sessions'], queryFn: async () => ((await api.get('/engineer/work/sessions')).data.data ?? []) as WorkSession[], enabled: hourly });
  const refresh = () => void qc.invalidateQueries({ queryKey: ROOT });
  const fail = (err: unknown) => toast.error(t('errorMessage'), readApiError(err).message);
  const start = useMutation({ mutationFn: () => api.post('/engineer/work/start'), onSuccess: () => { refresh(); toast.success(t('myHours.toast.started')); }, onError: fail });
  const stop = useMutation({ mutationFn: () => api.post('/engineer/work/stop'), onSuccess: () => { refresh(); toast.success(t('myHours.toast.stopped')); }, onError: fail });
  const [confirmStop, setConfirmStop] = useState(false);

  const active = status.data?.active ?? null;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  const runningMin = active ? Math.max(0, Math.floor((now - new Date(active.clockIn).getTime()) / 60000)) : 0;

  const duration = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h && m ? t('myHours.hm', { h, m }) : h ? t('myHours.h', { h }) : t('myHours.m', { m });
  };

  // Totals of finished days plus the one running now
  const totals = useMemo(() => {
    const d = new Date();
    const today = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const week = new Date(today);
    week.setDate(today.getDate() - today.getDay());
    const month = new Date(d.getFullYear(), d.getMonth(), 1);
    const sum = { today: runningMin, week: runningMin, month: runningMin };
    for (const s of sessions.data ?? []) {
      if (!s.clockOut) continue;
      const day = new Date(s.clockIn);
      if (day >= today) sum.today += s.durationMinutes;
      if (day >= week) sum.week += s.durationMinutes;
      if (day >= month) sum.month += s.durationMinutes;
    }
    return sum;
  }, [sessions.data, runningMin]);

  const columns: Column<WorkSession>[] = useMemo(
    () => [
      { key: 'day', header: t('myHours.col.day'), cell: (s) => <span className="font-medium text-ink">{f.custom(s.clockIn, { weekday: 'long', day: 'numeric', month: 'short' })}</span> },
      {
        key: 'time',
        header: t('myHours.col.time'),
        cell: (s) => (
          <span className="tabular-nums text-ink-2" dir="ltr">
            {f.time(s.clockIn)} – {s.clockOut ? f.time(s.clockOut) : '…'}
          </span>
        ),
      },
      {
        key: 'duration',
        header: t('myHours.col.duration'),
        align: 'end',
        cell: (s) =>
          s.clockOut ? (
            <span className="inline-flex items-center gap-2">
              {s.autoClosed && (
                <span title={t('myHours.autoClosedHint')} className="inline-flex">
                  <Badge tone="warning" icon={<AlertTriangle />}>{t('myHours.autoClosed')}</Badge>
                </span>
              )}
              <span className="font-semibold tabular-nums text-ink">{duration(s.durationMinutes)}</span>
            </span>
          ) : (
            <Badge tone="success">{t('myHours.inProgress')}</Badge>
          ),
      },
    ],
    [t, f], // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (!status.isLoading && !hourly) {
    return (
      <div className="space-y-5">
        <PageHeader title={t('myHours.title')} description={t('myHours.subtitle')} />
        <Panel>
          <EmptyState icon={<Lock />} title={t('myHours.notEnabled')} description={t('myHours.notEnabledHint')} />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t('myHours.title')} description={t('myHours.subtitle')} />

      <section aria-live="polite" className="flex flex-col items-center gap-5 rounded-panel bg-ink px-6 py-10 text-center text-white sm:flex-row sm:justify-between sm:px-10 sm:text-start">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <span className={active ? 'grid size-16 place-items-center rounded-2xl bg-glow text-ink' : 'grid size-16 place-items-center rounded-2xl bg-white/10 text-frost'}>
            <Timer className="size-8" aria-hidden />
          </span>
          <div>
            {status.isLoading ? (
              <span className="block h-10 w-48 animate-pulse rounded-md bg-white/10" />
            ) : active ? (
              <>
                <p className="flex items-center justify-center gap-2 text-sm text-frost/80 sm:justify-start">
                  <span className="size-2 rounded-full bg-glow" aria-hidden />
                  {t('myHours.since', { time: f.time(active.clockIn) })}
                </p>
                <p className="mt-1 font-mono text-4xl font-bold tabular-nums text-glow sm:text-5xl" dir="ltr">
                  {clock(now - new Date(active.clockIn).getTime())}
                </p>
              </>
            ) : (
              <>
                <p className="text-xl font-semibold">{t('myHours.notIn')}</p>
                <p className="mt-1 text-sm text-frost/70">{t('myHours.notInHint')}</p>
              </>
            )}
          </div>
        </div>
        {!status.isLoading &&
          (active ? (
            <Button variant="danger" size="md" icon={<Square />} onClick={() => setConfirmStop(true)} loading={stop.isPending}>
              {t('myHours.stop')}
            </Button>
          ) : (
            <Button variant="glow" size="md" icon={<Play />} onClick={() => start.mutate()} loading={start.isPending}>
              {t('myHours.start')}
            </Button>
          ))}
      </section>

      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<Clock />} tint="bg-tint-leaf" label={t('myHours.today')} value={duration(totals.today)} loading={sessions.isLoading} />
        <StatTile icon={<CalendarDays />} tint="bg-tint-straw" label={t('myHours.week')} value={duration(totals.week)} loading={sessions.isLoading} />
        <StatTile icon={<History />} tint="bg-tint-sand" label={t('myHours.month')} value={duration(totals.month)} loading={sessions.isLoading} />
      </div>

      <Panel className="p-0 sm:p-0">
        <div className="border-b border-line px-5 py-4">
          <PanelTitle className="mb-0" title={t('myHours.history')} actions={<span className="text-xs text-ink-4">{t('myHours.last90')}</span>} />
        </div>
        <DataTable label={t('myHours.history')} columns={columns} rows={sessions.data ?? []} rowKey={(s) => s._id} loading={sessions.isLoading} empty={<EmptyState icon={<History />} title={t('myHours.none')} />} />
      </Panel>

      <ConfirmDialog
        open={confirmStop}
        onClose={() => setConfirmStop(false)}
        title={t('myHours.stopTitle')}
        message={t('myHours.stopText', { time: duration(runningMin) })}
        confirmLabel={t('myHours.stop')}
        cancelLabel={t('myHours.keepWorking')}
        loading={stop.isPending}
        onConfirm={() => stop.mutate(undefined, { onSettled: () => setConfirmStop(false) })}
      />
    </div>
  );
}
