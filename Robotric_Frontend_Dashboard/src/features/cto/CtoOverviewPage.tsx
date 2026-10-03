import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlarmClock, Award, CheckCircle2, FolderKanban, ListTodo, RotateCcw, ShieldAlert, Trophy } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';
import { useFormat } from '../../app/format';
import { readApiError } from '../../app/apiError';
import { useToast } from '../../components/ui/Toast';
import { Button, Dialog, EmptyState, Panel, PanelTitle, SelectInput, StatTile, WelcomeBanner } from '../../ui';

interface Analytics {
  summary: { totalProjects: number; totalTasks: number; overdueCount: number; hardDeadlineBreachedCount: number; todo: number; in_progress: number; done: number };
  priorityBreakdown: Record<string, number>;
  monthlyProductivity: { month: string; completed: number }[];
  employeeScores: { _id: string; name: string; role: string; thisMonthScore: number; tasksThisMonth: number; allTimeScore: number }[];
  employeeOfMonth: { _id: string; name: string; role: string; score: number; tasks: number; isManual: boolean } | null;
}

/** The CTO's home: the state of internal work, monthly output and the team leaderboard. */
export default function CtoOverviewPage() {
  const { t } = useTranslation('dashboardCommon');
  const f = useFormat();
  const toast = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const q = useQuery({ queryKey: ['cto', 'analytics'], queryFn: async () => (await api.get('/cto/internal/analytics')).data.data as Analytics, staleTime: 60_000 });
  const staff = useQuery({ queryKey: ['cto', 'engineers'], queryFn: async () => ((await api.get('/cto/internal/engineers')).data.data ?? []) as { _id: string; name: string; role: string }[], staleTime: 300_000 });
  const [picking, setPicking] = useState(false);
  const [pick, setPick] = useState('');
  const refresh = () => void qc.invalidateQueries({ queryKey: ['cto', 'analytics'] });
  const fail = (e: unknown) => toast.error(t('cto.error'), readApiError(e).message);
  const choose = useMutation({ mutationFn: () => api.post('/cto/internal/analytics/employee-of-month', { userId: pick }), onSuccess: () => { refresh(); toast.success(t('cto.toast.picked')); setPicking(false); }, onError: fail });
  const auto = useMutation({ mutationFn: () => api.delete('/cto/internal/analytics/employee-of-month'), onSuccess: () => { refresh(); toast.success(t('cto.toast.auto')); }, onError: fail });
  const a = q.data;
  const s = a?.summary;
  const months = a?.monthlyProductivity ?? [];
  const most = Math.max(1, ...months.map((m) => m.completed));
  const monthLabel = (m: string) => { const d = new Date(`1 ${m}`); return Number.isNaN(d.getTime()) ? m : f.custom(d, { month: 'short' }); };
  const eom = a?.employeeOfMonth;

  return (
    <div className="space-y-5">
      <WelcomeBanner greeting={t('cto.hello')} name={user?.name ?? ''} note={t('cto.note')} link={{ to: '/cto-internal/tasks', label: t('cto.goTasks') }} attention={(s?.hardDeadlineBreachedCount ?? 0) > 0} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={<FolderKanban />} tint="bg-tint-leaf" label={t('cto.projects')} value={s?.totalProjects} loading={q.isLoading} to="/cto-internal/projects" />
        <StatTile icon={<ListTodo />} tint="bg-tint-sage" label={t('cto.open')} value={s ? s.todo + s.in_progress : undefined} loading={q.isLoading} to="/cto-internal/tasks" />
        <StatTile icon={<AlarmClock />} tint="bg-tint-straw" label={t('cto.overdue')} value={s?.overdueCount} loading={q.isLoading} to="/cto-internal/deadlines" />
        <StatTile icon={<ShieldAlert />} tint="bg-tint-sand" label={t('cto.breached')} value={s?.hardDeadlineBreachedCount} loading={q.isLoading} to="/cto-internal/deadlines" />
      </div>
      {q.isError ? <Panel><EmptyState icon={<FolderKanban />} title={readApiError(q.error).message} /></Panel> : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-5">
            <Panel>
              <PanelTitle title={t('cto.monthly')} />
              {q.isLoading ? <div className="h-40 animate-pulse rounded-card bg-rail" /> : months.length === 0 ? <p className="py-6 text-center text-sm text-ink-4">{t('cto.noDone')}</p> : (
                <div className="flex h-44 items-end gap-3" role="list" aria-label={t('cto.monthly')}>
                  {months.map((m) => (
                    <div key={m.month} role="listitem" className="flex flex-1 flex-col items-center gap-1.5" aria-label={`${monthLabel(m.month)}: ${m.completed}`}>
                      <span className="text-xs font-semibold tabular-nums text-ink">{m.completed}</span>
                      <span className="w-full max-w-12 rounded-t-md bg-ink" style={{ height: `${(m.completed / most) * 120 + 4}px` }} />
                      <span className="text-xs text-ink-4">{monthLabel(m.month)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
            <Panel>
              <PanelTitle title={t('cto.leaderboard')} />
              <p className="-mt-2 mb-3 text-xs text-ink-4">{t('cto.scoreHint')}</p>
              {q.isLoading ? <div className="h-32 animate-pulse rounded-card bg-rail" /> : !a?.employeeScores.length ? <p className="py-4 text-center text-sm text-ink-4">{t('cto.noScores')}</p> : (
                <ol className="divide-y divide-line">
                  {a.employeeScores.slice(0, 10).map((e, i) => (
                    <li key={e._id} className="flex items-center gap-3 py-2.5">
                      <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums ${i === 0 ? 'bg-ink text-glow' : 'bg-rail text-ink'}`}>{i + 1}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-ink" dir="auto">{e.name}</span><span className="block text-xs text-ink-4">{t('cto.tasksDone', { count: e.tasksThisMonth })}</span></span>
                      <span className="text-sm font-semibold tabular-nums text-ink">{e.thisMonthScore}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </div>
          <div className="space-y-5">
            <div className="rounded-panel bg-ink p-5 text-white">
              <p className="flex items-center gap-2 text-sm text-frost/75"><Trophy className="size-4 text-glow" aria-hidden />{t('cto.eom')}</p>
              {eom ? (
                <>
                  <p className="mt-2 text-2xl font-bold" dir="auto">{eom.name}</p>
                  <p className="mt-1 text-sm text-frost/70">{t('cto.eomStats', { score: eom.score, count: eom.tasks })}</p>
                  <p className="mt-1 text-xs text-frost/60">{t(eom.isManual ? 'cto.eomManual' : 'cto.eomAuto')}</p>
                </>
              ) : <p className="mt-2 text-sm text-frost/70">{t('cto.eomNone')}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="glow" icon={<Award />} onClick={() => { setPick(eom?._id ?? ''); setPicking(true); }}>{t('cto.choose')}</Button>
                {eom?.isManual && <Button size="sm" variant="ghost" icon={<RotateCcw />} className="text-white hover:bg-white/10" loading={auto.isPending} onClick={() => auto.mutate()}>{t('cto.auto')}</Button>}
              </div>
            </div>
            <Panel>
              <PanelTitle title={t('cto.status')} />
              <ul className="space-y-2.5">
                {(['todo', 'in_progress', 'done'] as const).map((k) => {
                  const total = s ? s.todo + s.in_progress + s.done : 0;
                  const n = s?.[k] ?? 0;
                  return (
                    <li key={k}>
                      <div className="mb-1 flex justify-between text-sm"><span className="text-ink-2">{t(`myTasks.status.${k}`)}</span><span className="tabular-nums text-ink">{n}</span></div>
                      <span className="block h-2 overflow-hidden rounded-full bg-rail"><span className={`block h-full rounded-full ${k === 'done' ? 'bg-success' : k === 'in_progress' ? 'bg-info' : 'bg-line-strong'}`} style={{ width: `${total ? (n / total) * 100 : 0}%` }} /></span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-4"><CheckCircle2 className="size-3.5" aria-hidden />{t('cto.totalTasks', { count: s?.totalTasks ?? 0 })}</p>
            </Panel>
          </div>
        </div>
      )}
      <Dialog open={picking} onClose={() => setPicking(false)} title={t('cto.chooseTitle')} description={t('cto.chooseText')} closeLabel={t('cto.cancel')}
        footer={<><Button variant="ghost" onClick={() => setPicking(false)}>{t('cto.cancel')}</Button><Button disabled={!pick} loading={choose.isPending} onClick={() => choose.mutate()}>{t('cto.choose')}</Button></>}>
        <SelectInput aria-label={t('cto.eom')} value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">{t('cto.pickPerson')}</option>
          {(staff.data ?? []).map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
        </SelectInput>
      </Dialog>
    </div>
  );
}
