import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CalendarCheck, CalendarX2, ChevronRight, Clock, ShieldCheck, TrendingUp } from 'lucide-react';
import { api } from '../../../lib/api';
import { useFormat } from '../../../app/format';
import { cn } from '../../../lib/utils';
import { Badge, Button, DataTable, EmptyState, PageHeader, Panel, PanelTitle, StatTile, type BadgeTone, type Column } from '../../../ui';

type Att = 'present' | 'late' | 'absent' | 'excused';
interface Record_ { _id: string; status: Att; checkInTime?: string | null; courseTitle?: string; session: { title: string; date: string; startTime?: string; endTime?: string } }
interface CourseRow { courseId: string; courseTitle: string; totalSessions: number; presentCount: number; absentCount: number; lateCount: number; excusedCount: number; attendancePercentage: number }
interface Overview { courses: CourseRow[]; overallStats: { averageAttendance: number; totalSessions: number; totalPresent: number; totalAbsent: number; totalLate: number }; recentAttendance: Record_[] }

const TONE: Record<Att, BadgeTone> = { present: 'success', late: 'warning', absent: 'danger', excused: 'info' };
const rate = (n: number) => (n >= 85 ? 'text-success' : n >= 70 ? 'text-warning' : 'text-danger');

/** One row per class the student was marked in. */
function useColumns(withCourse: boolean): Column<Record_>[] {
  const { t } = useTranslation('dashboardStudent');
  const f = useFormat();
  return useMemo(
    () => [
      { key: 'date', header: t('att.col.date'), cell: (r) => <span className="whitespace-nowrap tabular-nums text-ink-2">{f.custom(r.session.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span> },
      { key: 'class', header: t('att.col.class'), cell: (r) => <div className="min-w-0"><p className="truncate font-medium text-ink" dir="auto">{r.session.title}</p>{withCourse && r.courseTitle && <p className="truncate text-xs text-ink-4" dir="auto">{r.courseTitle}</p>}</div> },
      { key: 'time', header: t('att.col.time'), hideOnMobile: true, cell: (r) => (r.session.startTime ? <bdi dir="ltr" className="tabular-nums text-ink-3">{r.session.startTime}–{r.session.endTime}</bdi> : null) },
      { key: 'in', header: t('att.col.checkIn'), hideOnMobile: true, cell: (r) => (r.checkInTime && r.status !== 'absent' ? <span className="tabular-nums text-ink-3">{f.time(r.checkInTime)}</span> : <span className="text-ink-4">—</span>) },
      { key: 'status', header: t('att.col.status'), cell: (r) => <Badge tone={TONE[r.status]}>{t(`crs.att.${r.status}`)}</Badge> },
    ],
    [t, f, withCourse],
  );
}

/** How often the student came to class, per course, and the latest classes. */
export default function AttendancePage() {
  const { t } = useTranslation('dashboardStudent');
  const q = useQuery({ queryKey: ['student', 'attendance'], queryFn: async () => (await api.get('/student/attendance/overview')).data.data as Overview, staleTime: 60_000 });
  const o = q.data;
  const columns = useColumns(true);

  return (
    <div className="space-y-5">
      <PageHeader title={t('att.title')} description={t('att.subtitle')} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={<TrendingUp />} tint="bg-tint-leaf" label={t('att.average')} value={o ? `${Math.round(o.overallStats.averageAttendance)}%` : undefined} loading={q.isLoading} />
        <StatTile icon={<CalendarCheck />} tint="bg-tint-sage" label={t('att.present')} value={o?.overallStats.totalPresent} loading={q.isLoading} />
        <StatTile icon={<Clock />} tint="bg-tint-straw" label={t('att.late')} value={o?.overallStats.totalLate} loading={q.isLoading} />
        <StatTile icon={<CalendarX2 />} tint="bg-tint-sand" label={t('att.absent')} value={o?.overallStats.totalAbsent} loading={q.isLoading} />
      </div>

      {q.isError ? (
        <Panel><EmptyState icon={<CalendarCheck />} title={t('att.loadError')} action={<Button variant="secondary" onClick={() => void q.refetch()}>{t('courses.retry')}</Button>} /></Panel>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Panel className="min-w-0 p-0 sm:p-0">
            <div className="px-5 pt-5"><PanelTitle title={t('att.recent')} /></div>
            <DataTable label={t('att.recent')} columns={columns} rows={o?.recentAttendance ?? []} rowKey={(r) => r._id} loading={q.isLoading} empty={<EmptyState icon={<CalendarCheck />} title={t('att.none')} />} />
          </Panel>
          <Panel>
            <PanelTitle title={t('att.byCourse')} />
            {q.isLoading ? <div className="h-32 animate-pulse rounded-card bg-rail" /> : !o?.courses.length ? <p className="py-4 text-center text-sm text-ink-4">{t('ov.noCourses')}</p> : (
              <ul className="space-y-2">
                {o.courses.map((c) => (
                  <li key={c.courseId}>
                    <Link to={`/student/attendance/${c.courseId}`} className="block rounded-card border border-line p-3.5 hover:border-ink focus-visible:focus-ring">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate font-medium text-ink" dir="auto">{c.courseTitle}</span>
                        <span className={cn('shrink-0 text-lg font-bold tabular-nums', rate(c.attendancePercentage))}>{Math.round(c.attendancePercentage)}%</span>
                      </div>
                      <div className="mt-2 flex h-2 overflow-hidden rounded-pill bg-rail" aria-hidden>
                        {[['bg-success', c.presentCount], ['bg-warning', c.lateCount], ['bg-info', c.excusedCount], ['bg-danger', c.absentCount]].map(([cls, n]) => (n ? <span key={cls as string} className={cls as string} style={{ width: `${((n as number) / Math.max(1, c.totalSessions)) * 100}%` }} /> : null))}
                      </div>
                      <p className="mt-1.5 flex items-center justify-between text-xs text-ink-4">
                        <span>{t('att.counts', { present: c.presentCount, late: c.lateCount, absent: c.absentCount })}</span>
                        <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}

/** Every class of one course with the student's attendance. */
export function CourseAttendancePage() {
  const { courseId = '' } = useParams();
  const { t } = useTranslation('dashboardStudent');
  const records = useQuery({ queryKey: ['student', 'attendance', courseId], queryFn: async () => ((await api.get(`/student/attendance/courses/${courseId}`)).data.data ?? []) as Record_[] });
  const overview = useQuery({ queryKey: ['student', 'attendance'], queryFn: async () => (await api.get('/student/attendance/overview')).data.data as Overview, staleTime: 60_000 });
  const c = overview.data?.courses.find((x) => x.courseId === courseId);
  const columns = useColumns(false);

  return (
    <div className="space-y-5">
      <PageHeader back={{ to: '/student/attendance', label: t('att.title') }} title={c?.courseTitle ?? t('att.title')} description={t('att.courseSubtitle')} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={<TrendingUp />} tint="bg-tint-leaf" label={t('att.rate')} value={c ? `${Math.round(c.attendancePercentage)}%` : '—'} loading={overview.isLoading} />
        <StatTile icon={<CalendarCheck />} tint="bg-tint-sage" label={t('att.present')} value={c?.presentCount ?? 0} loading={overview.isLoading} />
        <StatTile icon={<Clock />} tint="bg-tint-straw" label={t('att.late')} value={c?.lateCount ?? 0} loading={overview.isLoading} />
        <StatTile icon={c?.excusedCount ? <ShieldCheck /> : <CalendarX2 />} tint="bg-tint-sand" label={t('att.absent')} value={c?.absentCount ?? 0} loading={overview.isLoading} />
      </div>
      <Panel className="p-0 sm:p-0">
        <DataTable label={t('att.title')} columns={columns} rows={records.data ?? []} rowKey={(r) => r._id} loading={records.isLoading} empty={<EmptyState icon={<CalendarCheck />} title={t('att.none')} />} />
      </Panel>
    </div>
  );
}
