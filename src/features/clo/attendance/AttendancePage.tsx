import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CalendarCheck, Clock, Percent, UserCheck, UserX } from 'lucide-react';
import { api } from '../../../lib/api';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { Badge, Button, DataTable, Dialog, EmptyState, PageHeader, Pagination, Panel, SelectInput, StatTile, type BadgeTone, type Column } from '../../../ui';
import { useCloCourseOptions, useCloGroups } from '../api';

type Status = 'present' | 'late' | 'absent';
interface Sheet {
  _id: string;
  sessionId: string;
  groupId: string;
  session: { title: string; date: string; startTime: string; endTime: string };
  records: { _id: string; student: { _id: string; name: string; email: string } | string; status: Status; notes?: string | null; markedBy?: { name: string } | string | null }[];
  stats: { totalStudents: number; present: number; absent: number; late: number; attendanceRate: number };
}
interface Stats { totalSessions: number; overallAttendanceRate: number; statusDistribution: Record<Status, number> }
const TONE: Record<Status, BadgeTone> = { present: 'success', late: 'warning', absent: 'danger' };
const PAGE = 20;

/** Attendance marked by trainers, across every group: per class, and who came. */
export default function AttendancePage() {
  const { t } = useTranslation('dashboardCLO');
  const f = useFormat();
  const [params, setParams] = useSearchParams();
  const course = params.get('course') ?? '';
  const group = params.get('group') ?? '';
  const [page, setPage] = useState(1);
  const courses = useCloCourseOptions();
  const groups = useCloGroups();
  const groupName = useMemo(() => new Map((groups.data ?? []).map((g) => [g._id, g.name])), [groups.data]);
  const setFilter = (k: 'course' | 'group', v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    if (k === 'course') next.delete('group');
    setParams(next, { replace: true });
    setPage(1);
  };
  const filter = { ...(course ? { courseId: course } : {}), ...(group ? { groupId: group } : {}) };
  const list = useQuery({
    queryKey: ['clo', 'attendance', 'list', course, group, page],
    queryFn: async () => (await api.get('/clo/attendance', { params: { ...filter, page, limit: PAGE } })).data as { data: Sheet[]; pagination: { total: number; pages: number } },
    placeholderData: (prev) => prev,
  });
  const stats = useQuery({ queryKey: ['clo', 'attendance', 'stats', course], queryFn: async () => (await api.get('/clo/attendance/stats', { params: course ? { courseId: course } : {} })).data.data as Stats });
  const [open, setOpen] = useState<Sheet | null>(null);
  const last = useRef(open);
  if (open) last.current = open;
  const shown = open ?? last.current;
  const s = stats.data;

  const columns: Column<Sheet>[] = useMemo(
    () => [
      { key: 'class', header: t('att.col.class'), cell: (x) => <button type="button" onClick={() => setOpen(x)} className="block max-w-sm rounded-md text-start focus-visible:focus-ring"><span className="block truncate font-medium text-ink underline-offset-2 hover:underline" dir="auto">{x.session.title}</span><span className="block truncate text-xs text-ink-4" dir="auto">{groupName.get(x.groupId) ?? ''}</span></button> },
      { key: 'when', header: t('att.col.when'), cell: (x) => <span className="whitespace-nowrap tabular-nums text-ink-2">{f.custom(x.session.date, { weekday: 'short', day: 'numeric', month: 'short' })} · <bdi dir="ltr">{x.session.startTime}</bdi></span> },
      { key: 'counts', header: t('att.col.counts'), hideOnMobile: true, cell: (x) => (
        <span className="flex items-center gap-3 text-xs tabular-nums">
          <span className="inline-flex items-center gap-1 text-success"><UserCheck className="size-3.5" aria-hidden />{x.stats.present}</span>
          <span className="inline-flex items-center gap-1 text-warning"><Clock className="size-3.5" aria-hidden />{x.stats.late}</span>
          <span className="inline-flex items-center gap-1 text-danger"><UserX className="size-3.5" aria-hidden />{x.stats.absent}</span>
        </span>
      ) },
      { key: 'rate', header: t('att.col.rate'), align: 'end', cell: (x) => <span className="font-semibold tabular-nums text-ink" dir="ltr">{x.stats.attendanceRate}%</span> },
    ],
    [t, f, groupName],
  );
  const courseGroups = (groups.data ?? []).filter((g) => !course || g.courseId?._id === course);

  return (
    <div className="space-y-5">
      <PageHeader title={t('att.title')} description={t('att.subtitle')} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={<CalendarCheck />} tint="bg-tint-leaf" label={t('att.classes')} value={s?.totalSessions} loading={stats.isLoading} />
        <StatTile icon={<Percent />} tint="bg-tint-sage" label={t('att.rate')} value={s ? `${s.overallAttendanceRate}%` : undefined} loading={stats.isLoading} />
        <StatTile icon={<Clock />} tint="bg-tint-straw" label={t('att.status.late')} value={s?.statusDistribution.late} loading={stats.isLoading} />
        <StatTile icon={<UserX />} tint="bg-tint-sand" label={t('att.status.absent')} value={s?.statusDistribution.absent} loading={stats.isLoading} />
      </div>
      <Panel className="p-0 sm:p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <SelectInput aria-label={t('gr.course')} value={course} onChange={(e) => setFilter('course', e.target.value)} className="w-full sm:w-auto sm:min-w-48">
            <option value="">{t('gr.allCourses')}</option>
            {(courses.data ?? []).map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
          </SelectInput>
          <SelectInput aria-label={t('gr.one')} value={group} onChange={(e) => setFilter('group', e.target.value)} className="w-full sm:w-auto sm:min-w-48">
            <option value="">{t('att.allGroups')}</option>
            {courseGroups.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
          </SelectInput>
        </div>
        {list.isError ? <EmptyState icon={<CalendarCheck />} title={readApiError(list.error).message} action={<Button variant="secondary" onClick={() => void list.refetch()}>{t('tr.retry')}</Button>} /> : (
          <DataTable label={t('att.title')} columns={columns} rows={list.data?.data ?? []} rowKey={(x) => x._id} loading={list.isLoading} empty={<EmptyState icon={<CalendarCheck />} title={t('att.none')} description={t('att.noneHint')} />} />
        )}
        {(list.data?.pagination.pages ?? 0) > 1 && (
          <div className="border-t border-line p-4">
            <Pagination page={page} pages={list.data!.pagination.pages} total={list.data!.pagination.total} pageSize={PAGE} onPage={setPage} summary={(a, b, n) => t('att.range', { from: a, to: b, total: n })} labels={{ previous: t('att.prev'), next: t('att.next') }} />
          </div>
        )}
      </Panel>

      <Dialog open={!!open} onClose={() => setOpen(null)} size="lg" title={shown?.session.title ?? ''} closeLabel={t('tr.cancel')}
        description={shown && <>{[groupName.get(shown.groupId), f.custom(shown.session.date, { weekday: 'long', day: 'numeric', month: 'long' })].filter(Boolean).join(' · ')} · <bdi dir="ltr">{shown.session.startTime}–{shown.session.endTime}</bdi></>}>
        {shown && (
          <ul className="divide-y divide-line rounded-card border border-line">
            {shown.records.map((r) => {
              const st = typeof r.student === 'object' ? r.student : { name: '', email: '' };
              return (
                <li key={r._id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-ink" dir="auto">{st.name}</span>{r.notes && <span className="block truncate text-xs text-ink-4" dir="auto">{r.notes}</span>}</span>
                  <Badge tone={TONE[r.status]}>{t(`att.status.${r.status}`)}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Dialog>
    </div>
  );
}
