import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarClock, CalendarDays, CheckCircle2, Plus, XCircle } from 'lucide-react';
import { useFormat } from '../../../app/format';
import { Badge, Button, DataTable, EmptyState, PageHeader, Panel, SearchInput, SelectInput, StatTile, type BadgeTone, type Column } from '../../../ui';
import { useSessionRole, useTrainerSessionList, type SessionStatus, type TrainerSession } from './api';

export const SESSION_TONE: Record<SessionStatus, BadgeTone> = { scheduled: 'neutral', in_progress: 'success', completed: 'info', cancelled: 'danger' };
type View = 'upcoming' | 'past' | 'cancelled' | '';
const startOf = (s: TrainerSession) => new Date(`${s.scheduledDate.slice(0, 10)}T${s.startTime || '00:00'}`).getTime();

/** Every class the trainer teaches: what is coming, what is done. */
export default function SessionsPage() {
  const { t } = useTranslation('dashboardTrainer');
  const f = useFormat();
  const r = useSessionRole();
  const q = useTrainerSessionList();
  const [view, setView] = useState<View>('upcoming');
  const [group, setGroup] = useState('');
  const [search, setSearch] = useState('');
  const all = q.data ?? [];
  const groups = [...new Map(all.filter((s) => s.groupId).map((s) => [s.groupId!._id, s.groupId!.name])).entries()];
  const isUpcoming = (s: TrainerSession) => s.status === 'scheduled' || s.status === 'in_progress';
  const sq = search.trim().toLowerCase();
  const rows = all
    .filter((s) => (view === 'upcoming' ? isUpcoming(s) : view === 'past' ? s.status === 'completed' : view === 'cancelled' ? s.status === 'cancelled' : true))
    .filter((s) => !group || s.groupId?._id === group)
    .filter((s) => !sq || s.title.toLowerCase().includes(sq))
    .sort((a, b) => (view === 'upcoming' ? startOf(a) - startOf(b) : startOf(b) - startOf(a)));

  const columns: Column<TrainerSession>[] = useMemo(
    () => [
      { key: 'n', header: '#', cell: (s) => <span className="grid size-8 place-items-center rounded-full bg-tint-sage text-xs font-semibold tabular-nums text-ink">{s.sessionNumber}</span> },
      { key: 'title', header: t('ses.col.class'), cell: (s) => <Link to={`${r.base}/sessions/${s._id}`} className="block max-w-sm rounded-md focus-visible:focus-ring"><span className="block truncate font-medium text-ink underline-offset-2 hover:underline" dir="auto">{s.title}</span><span className="block truncate text-xs text-ink-4" dir="auto">{[s.groupId?.name, s.courseId?.title].filter(Boolean).join(' · ')}</span></Link> },
      { key: 'when', header: t('ses.col.when'), cell: (s) => <span className="whitespace-nowrap tabular-nums text-ink-2">{f.custom(s.scheduledDate, { weekday: 'short', day: 'numeric', month: 'short' })} · <bdi dir="ltr">{s.startTime}–{s.endTime}</bdi></span> },
      { key: 'status', header: t('ses.col.status'), cell: (s) => <Badge tone={SESSION_TONE[s.status]}>{t(`ov.status.${s.status}`)}</Badge> },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, f, r.base],
  );
  const tile = (v: View) => ({ onClick: () => setView(v), active: view === v });

  return (
    <div className="space-y-5">
      <PageHeader title={t('ses.title')} description={r.role === 'clo' ? t('dashboardCLO:cs.subtitle') : t('ses.subtitle')} actions={<Link to={`${r.base}/sessions/new`} className="inline-flex h-11 items-center gap-2 rounded-pill bg-ink px-5 text-sm font-medium text-white hover:bg-ink-deep focus-visible:focus-ring"><Plus className="size-[18px]" aria-hidden />{t('ses.new')}</Link>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={<CalendarClock />} tint="bg-tint-leaf" label={t('ses.upcoming')} value={all.filter(isUpcoming).length} loading={q.isLoading} {...tile('upcoming')} />
        <StatTile icon={<CheckCircle2 />} tint="bg-tint-straw" label={t('ses.done')} value={all.filter((s) => s.status === 'completed').length} loading={q.isLoading} {...tile('past')} />
        <StatTile icon={<XCircle />} tint="bg-tint-sand" label={t('ses.cancelled')} value={all.filter((s) => s.status === 'cancelled').length} loading={q.isLoading} {...tile('cancelled')} />
        <StatTile icon={<CalendarDays />} tint="bg-tint-sage" label={t('ses.all')} value={all.length} loading={q.isLoading} {...tile('')} />
      </div>
      <Panel className="p-0 sm:p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="min-w-56 flex-1"><SearchInput value={search} onChange={setSearch} placeholder={t('ses.search')} /></div>
          {groups.length > 1 && (
            <SelectInput aria-label={t('grp.groups')} value={group} onChange={(e) => setGroup(e.target.value)} className="w-auto min-w-44">
              <option value="">{t('ses.allGroups')}</option>
              {groups.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </SelectInput>
          )}
        </div>
        {q.isError ? <EmptyState icon={<CalendarClock />} title={t('ses.loadError')} action={<Button variant="secondary" onClick={() => void q.refetch()}>{t('grp.retry')}</Button>} /> : (
          <DataTable label={t('ses.title')} columns={columns} rows={rows} rowKey={(s) => s._id} loading={q.isLoading} empty={<EmptyState icon={<CalendarClock />} title={t('ses.none')} />} />
        )}
      </Panel>
    </div>
  );
}
