import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ClipboardList, Sparkles, Star } from 'lucide-react';
import { api } from '../../../lib/api';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { Badge, Button, DataTable, Dialog, EmptyState, PageHeader, Pagination, Panel, SelectInput, StatTile, type Column } from '../../../ui';
import { useCloGroups, useCloTrainerOptions } from '../api';

interface Ev {
  _id: string;
  studentId: { _id: string; name: string; email: string } | string;
  trainerId: { _id: string; name: string } | string;
  sessionId: { _id: string; title: string; scheduledDate: string; sessionNumber: number } | string;
  groupId: { _id: string; name: string; courseId?: { title: string } | string } | string;
  overallRating: number;
  parameters: Record<string, unknown>;
  trainerNotes?: { generalNotes?: string } | null;
  flags: { needsAttention?: boolean; excelling?: boolean };
  evaluationDate: string;
}
interface Stats { total: number; averageRating: string | number; ratingDistribution: Record<string, number> }
const name = (x: { name: string } | string | null | undefined) => (x && typeof x === 'object' ? x.name : '');
const PAGE = 20;

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`size-4 ${n <= value ? 'fill-glow text-glow-deep' : 'text-line-strong'}`} aria-hidden />)}
    </span>
  );
}

/** How trainers rated students after class, across every group (read-only for the CLO). */
export default function EvaluationsPage() {
  const { t } = useTranslation('dashboardCLO');
  const f = useFormat();
  const [params, setParams] = useSearchParams();
  const group = params.get('group') ?? '';
  const trainer = params.get('trainer') ?? '';
  const rating = params.get('rating') ?? '';
  const [page, setPage] = useState(1);
  const groups = useCloGroups();
  const trainers = useCloTrainerOptions();
  const setFilter = (k: string, v: string) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); setParams(n, { replace: true }); setPage(1); };
  const filter = { ...(group ? { groupId: group } : {}), ...(trainer ? { trainerId: trainer } : {}), ...(rating ? { minRating: rating, maxRating: rating } : {}) };
  const list = useQuery({ queryKey: ['clo', 'evaluations', group, trainer, rating, page], queryFn: async () => (await api.get('/clo/evaluations', { params: { ...filter, page, limit: PAGE } })).data as { data: Ev[]; pagination: { total: number; pages: number } }, placeholderData: (p) => p });
  const stats = useQuery({ queryKey: ['clo', 'evaluations', 'stats', group, trainer], queryFn: async () => (await api.get('/clo/evaluations/stats', { params: { ...(group ? { groupId: group } : {}), ...(trainer ? { trainerId: trainer } : {}) } })).data.data as Stats });
  const [open, setOpen] = useState<Ev | null>(null);
  const last = useRef(open);
  if (open) last.current = open;
  const shown = open ?? last.current;
  const s = stats.data;
  const dist = s?.ratingDistribution ?? {};
  const most = Math.max(1, ...Object.values(dist));

  const columns: Column<Ev>[] = useMemo(
    () => [
      { key: 'student', header: t('ev.col.student'), cell: (e) => <button type="button" onClick={() => setOpen(e)} className="block max-w-xs rounded-md text-start focus-visible:focus-ring"><span className="block truncate font-medium text-ink underline-offset-2 hover:underline" dir="auto">{name(e.studentId)}</span><span className="block truncate text-xs text-ink-4" dir="auto">{name(e.groupId)}</span></button> },
      { key: 'class', header: t('att.col.class'), hideOnMobile: true, cell: (e) => typeof e.sessionId === 'object' ? <span className="block max-w-xs"><span className="block truncate text-ink-2" dir="auto">{e.sessionId.title}</span><span className="block text-xs tabular-nums text-ink-4">{f.dayMonth(e.sessionId.scheduledDate)}</span></span> : '—' },
      { key: 'trainer', header: t('gr.trainer'), hideOnMobile: true, cell: (e) => <span className="text-ink-2" dir="auto">{name(e.trainerId)}</span> },
      { key: 'rating', header: t('ev.col.rating'), cell: (e) => <Stars value={e.overallRating} /> },
      { key: 'flags', header: <span className="sr-only">{t('ev.col.flags')}</span>, cell: (e) => <span className="flex flex-wrap gap-1">{e.flags.excelling && <Badge tone="success" icon={<Sparkles />}>{t('ev.excelling')}</Badge>}{e.flags.needsAttention && <Badge tone="warning" icon={<AlertTriangle />}>{t('ev.attention')}</Badge>}</span> },
    ],
    [t, f],
  );
  const params2 = shown ? Object.entries(shown.parameters ?? {}).filter(([, v]) => v !== null && v !== '' && v !== undefined) : [];

  return (
    <div className="space-y-5">
      <PageHeader title={t('ev.title')} description={t('ev.subtitle')} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid grid-cols-2 gap-3 self-start">
          <StatTile icon={<ClipboardList />} tint="bg-tint-leaf" label={t('ev.total')} value={s?.total} loading={stats.isLoading} />
          <StatTile icon={<Star />} tint="bg-tint-straw" label={t('ev.average')} value={s ? `${s.averageRating} / 5` : undefined} loading={stats.isLoading} />
        </div>
        <Panel className="py-4 sm:py-4">
          <p className="mb-2 text-sm font-medium text-ink">{t('ev.spread')}</p>
          <ul className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((n) => (
              <li key={n}>
                <button type="button" onClick={() => setFilter('rating', rating === String(n) ? '' : String(n))} aria-pressed={rating === String(n)} className={`flex w-full items-center gap-2 rounded-md px-1 text-xs focus-visible:focus-ring ${rating === String(n) ? 'bg-frost' : ''}`}>
                  <span className="w-8 tabular-nums text-ink-3" dir="ltr">{n} ★</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-rail"><span className="block h-full rounded-full bg-glow-deep" style={{ width: `${((dist[n] ?? 0) / most) * 100}%` }} /></span>
                  <span className="w-8 text-end tabular-nums text-ink-3">{dist[n] ?? 0}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel className="p-0 sm:p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <SelectInput aria-label={t('gr.one')} value={group} onChange={(e) => setFilter('group', e.target.value)} className="w-auto min-w-48"><option value="">{t('att.allGroups')}</option>{(groups.data ?? []).map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}</SelectInput>
          <SelectInput aria-label={t('gr.trainer')} value={trainer} onChange={(e) => setFilter('trainer', e.target.value)} className="w-auto min-w-48"><option value="">{t('gr.allTrainers')}</option>{(trainers.data ?? []).map((x) => <option key={x._id} value={x._id}>{x.name}</option>)}</SelectInput>
          {rating && <Button size="sm" variant="ghost" onClick={() => setFilter('rating', '')}>{t('ev.clearRating', { n: rating })}</Button>}
        </div>
        {list.isError ? <EmptyState icon={<Star />} title={readApiError(list.error).message} action={<Button variant="secondary" onClick={() => void list.refetch()}>{t('tr.retry')}</Button>} /> : (
          <DataTable label={t('ev.title')} columns={columns} rows={list.data?.data ?? []} rowKey={(e) => e._id} loading={list.isLoading} empty={<EmptyState icon={<Star />} title={t('ev.none')} description={t('ev.noneHint')} />} />
        )}
        {(list.data?.pagination.pages ?? 0) > 1 && (
          <div className="border-t border-line p-4"><Pagination page={page} pages={list.data!.pagination.pages} total={list.data!.pagination.total} pageSize={PAGE} onPage={setPage} summary={(a, b, n) => t('att.range', { from: a, to: b, total: n })} labels={{ previous: t('att.prev'), next: t('att.next') }} /></div>
        )}
      </Panel>

      <Dialog open={!!open} onClose={() => setOpen(null)} title={shown ? name(shown.studentId) : ''} closeLabel={t('tr.cancel')}
        description={shown && [typeof shown.sessionId === 'object' ? shown.sessionId.title : '', name(shown.groupId), t('ev.by', { name: name(shown.trainerId) })].filter(Boolean).join(' · ')}>
        {shown && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-card bg-frost p-3"><span className="text-sm text-ink-2">{t('ev.col.rating')}</span><Stars value={shown.overallRating} /></div>
            {params2.length > 0 && (
              <dl className="divide-y divide-line rounded-card border border-line">
                {params2.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <dt className="text-ink-3" dir="auto">{k}</dt>
                    <dd className="font-medium text-ink" dir="auto">{typeof v === 'boolean' ? t(v ? 'ev.yes' : 'ev.no') : String(v)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {shown.trainerNotes?.generalNotes && <div><p className="mb-1 text-sm font-medium text-ink">{t('ev.notes')}</p><p className="whitespace-pre-line text-sm text-ink-2" dir="auto">{shown.trainerNotes.generalNotes}</p></div>}
            <div className="flex flex-wrap gap-1.5">
              {shown.flags.excelling && <Badge tone="success" icon={<Sparkles />}>{t('ev.excelling')}</Badge>}
              {shown.flags.needsAttention && <Badge tone="warning" icon={<AlertTriangle />}>{t('ev.attention')}</Badge>}
            </div>
            <p className="text-xs text-ink-4">{t('ev.on', { date: f.date(shown.evaluationDate) })}</p>
          </div>
        )}
      </Dialog>
    </div>
  );
}
