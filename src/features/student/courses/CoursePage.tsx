import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BookOpen, CalendarCheck, ChevronRight, ClipboardList, Clock, Lock, Star, UserRound, Video, Wallet } from 'lucide-react';
import { useFormat } from '../../../app/format';
import { cn } from '../../../lib/utils';
import { Badge, Button, EmptyState, PageHeader, Panel, PanelTitle, StatTile, type BadgeTone } from '../../../ui';
import { useCourse, type AttendanceStatus, type CourseSession } from './api';

const ATT_TONE: Record<AttendanceStatus, BadgeTone> = { present: 'success', late: 'warning', absent: 'danger', excused: 'info' };

/** One course: progress, the next class, and every class with the student's attendance. */
export default function CoursePage() {
  const { courseId = '' } = useParams();
  const { t } = useTranslation('dashboardStudent');
  const f = useFormat();
  const { info, sessions } = useCourse(courseId);
  const c = info.data;
  const list = [...(sessions.data ?? [])].sort((a, b) => a.sessionNumber - b.sessionNumber);
  const attendanceOf = (id: string) => c?.sessions.find((s) => s.id === id)?.attendance?.status;
  const next = list.find((s) => s.isToday || s.isUpcoming);
  const done = c?.studentStats.completedSessions ?? 0;
  const total = c?.studentStats.totalSessions || list.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const back = { to: '/student/courses', label: t('courses.title') };

  if (info.isError) {
    return (
      <div className="space-y-5">
        <PageHeader back={back} title={t('crs.notFound')} />
        <Panel><EmptyState icon={<BookOpen />} title={t('crs.loadError')} action={<Button variant="secondary" onClick={() => void info.refetch()}>{t('courses.retry')}</Button>} /></Panel>
      </div>
    );
  }

  // Times stay left-to-right inside Arabic text (16:00–18:00, not 18:00–16:00)
  const when = (s: CourseSession) => (
    <>
      {f.custom(s.scheduledStartDateTime, { weekday: 'short', day: 'numeric', month: 'short' })} · <bdi dir="ltr">{s.startTime}–{s.endTime}</bdi>
    </>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        back={back}
        title={c?.title ?? <span className="inline-block h-8 w-64 animate-pulse rounded-md bg-rail" />}
        description={c?.description || undefined}
        actions={
          <>
            {c?.boardEnabled && c.groupId && (
              <Link to={`/student/groups/${c.groupId}/board`} className="inline-flex h-11 items-center gap-2 rounded-pill border border-ink px-5 text-sm font-medium text-ink hover:bg-ink hover:text-white focus-visible:focus-ring">
                <ClipboardList className="size-[18px]" aria-hidden />{t('crs.board')}
              </Link>
            )}
            <Link to={`/student/payments/${courseId}`} className="inline-flex h-11 items-center gap-2 rounded-pill border border-ink px-5 text-sm font-medium text-ink hover:bg-ink hover:text-white focus-visible:focus-ring">
              <Wallet className="size-[18px]" aria-hidden />{t('crs.payments')}
            </Link>
          </>
        }
      />
      {c?.trainer && <p className="-mt-2 flex items-center gap-1.5 text-sm text-ink-3"><UserRound className="size-4" aria-hidden />{t('crs.trainer', { name: c.trainer.name })}</p>}

      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<BookOpen />} tint="bg-tint-leaf" label={t('crs.progress', { done, total })} value={`${pct}%`} loading={info.isLoading} />
        <StatTile icon={<CalendarCheck />} tint="bg-tint-straw" label={t('ov.attendance')} value={c?.studentStats.attendanceAverage != null ? `${Math.round(c.studentStats.attendanceAverage)}%` : '—'} loading={info.isLoading} />
        <StatTile icon={<Star />} tint="bg-tint-sage" label={t('crs.evaluation')} value={c?.studentStats.evaluationAverage != null ? `${Math.round(c.studentStats.evaluationAverage)}%` : '—'} loading={info.isLoading} to="/student/evaluations" />
      </div>

      {next && (
        <Link to={next.isLocked ? '#' : `/student/sessions/${next._id}`} aria-disabled={next.isLocked} onClick={(e) => next.isLocked && e.preventDefault()} className={cn('flex flex-wrap items-center gap-4 rounded-panel bg-ink p-5 text-white focus-visible:focus-ring', next.isLocked && 'cursor-default')}>
          <span className="grid size-12 shrink-0 place-items-center rounded-input bg-white/10"><Clock className="size-6 text-glow" aria-hidden /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-glow">{next.isToday ? t('crs.today') : t('crs.next')}</span>
            <span className="block truncate text-lg font-semibold" dir="auto">{next.title}</span>
            <span className="block text-sm tabular-nums text-frost/75">{when(next)}</span>
          </span>
          {next.isLocked ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-frost/75"><Lock className="size-4" aria-hidden />{t('crs.locked')}</span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-glow">{t('crs.open')} <ArrowRight className="size-4 rtl:rotate-180" aria-hidden /></span>
          )}
        </Link>
      )}

      <Panel className="p-0 sm:p-0">
        <div className="px-5 pt-5"><PanelTitle title={t('crs.classes', { count: list.length })} /></div>
        {sessions.isLoading ? (
          <div className="space-y-2 px-5 pb-5">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-card bg-rail" />)}</div>
        ) : list.length === 0 ? (
          <EmptyState icon={<CalendarCheck />} title={t('crs.noClasses')} description={t('crs.noClassesHint')} />
        ) : (
          <ol className="divide-y divide-line border-t border-line">
            {list.map((s) => {
              const att = attendanceOf(s._id);
              const future = !s.isPast && !s.isToday;
              const locked = s.isLocked;
              const body = (
                <>
                  <span className={cn('grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums', s.isToday ? 'bg-ink text-glow' : s.isPast ? 'bg-tint-sage text-ink' : 'bg-rail text-ink-3')}>
                    {locked ? <Lock className="size-4" aria-hidden /> : s.sessionNumber}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate font-medium', locked ? 'text-ink-4' : 'text-ink')} dir="auto">{s.title}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-ink-4">
                      <span className="tabular-nums">{when(s)}</span>
                      {s.isOnline && <span className="inline-flex items-center gap-1"><Video className="size-3.5" aria-hidden />{t('crs.online')}</span>}
                      {s.quiz && <span className="inline-flex items-center gap-1"><ClipboardList className="size-3.5" aria-hidden />{s.quizAttempt?.passed ? t('crs.quizPassed') : t('crs.quiz')}</span>}
                    </span>
                  </span>
                  {s.status === 'cancelled' ? (
                    <Badge tone="neutral">{t('crs.cancelled')}</Badge>
                  ) : att ? (
                    <Badge tone={ATT_TONE[att]}>{t(`crs.att.${att}`)}</Badge>
                  ) : s.isToday ? (
                    <Badge tone="success">{t('crs.todayShort')}</Badge>
                  ) : future ? (
                    <Badge tone="neutral">{t('crs.soon')}</Badge>
                  ) : null}
                  {!locked && <ChevronRight className="size-4 shrink-0 text-ink-4 rtl:rotate-180" aria-hidden />}
                </>
              );
              return (
                <li key={s._id}>
                  {locked ? (
                    <div className="flex items-center gap-3 px-5 py-3.5" title={t('crs.locked')}>{body}</div>
                  ) : (
                    <Link to={`/student/sessions/${s._id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-rail focus-visible:bg-rail focus-visible:outline-none">{body}</Link>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </Panel>
    </div>
  );
}
