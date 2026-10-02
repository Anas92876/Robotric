import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BookOpen, CalendarCheck, CheckCircle2, ClipboardList, Clock, CreditCard, FileText, GraduationCap, Wallet } from 'lucide-react';
import { useAuth } from '../../../providers/AuthProvider';
import { useFormat } from '../../../app/format';
import { cn } from '../../../lib/utils';
import { EmptyState, Panel, PanelTitle, StatTile, WelcomeBanner } from '../../../ui';
import { useStudentActivity, useStudentDeadlines, useStudentProgress, useStudentStats, type Activity } from './api';

const ACTIVITY_ICON: Record<string, typeof BookOpen> = { payment: Wallet, attendance: CalendarCheck, quiz: ClipboardList, assignment: FileText, session: GraduationCap, module: BookOpen };

/** The student's home: courses and progress, what is due soon, money still to pay, and what happened lately. */
export default function StudentOverviewPage() {
  const { t } = useTranslation('dashboardStudent');
  const f = useFormat();
  const { user } = useAuth();
  const stats = useStudentStats();
  const progress = useStudentProgress();
  const deadlines = useStudentDeadlines();
  const activity = useStudentActivity();
  const s = stats.data;

  // The backend writes activity titles in English, so build them here from the type and course
  const activityText = (a: Activity) => {
    if (a.type === 'payment') {
      const amount = a.title.match(/\$\s?([\d.,]+)/)?.[1];
      return amount ? t('ov.act.paymentOf', { amount: f.money(Number(amount.replace(/,/g, ''))), course: a.courseTitle }) : t('ov.act.payment', { course: a.courseTitle });
    }
    if (/^Enrolled in/i.test(a.title)) return t('ov.act.enrolled', { course: a.courseTitle });
    return a.title;
  };

  return (
    <div className="space-y-5">
      <WelcomeBanner
        greeting={t('ov.hello')}
        name={user?.name ?? ''}
        note={t('ov.note')}
        link={{ to: '/student/courses', label: t('ov.goCourses') }}
        attention={(deadlines.data?.length ?? 0) > 0}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={<BookOpen />} tint="bg-tint-leaf" label={t('ov.courses')} value={s?.activeCourses ?? 0} loading={stats.isLoading} to="/student/courses" />
        <StatTile icon={<CheckCircle2 />} tint="bg-tint-straw" label={t('ov.sessionsDone')} value={s?.totalSessionsCompleted ?? 0} loading={stats.isLoading} />
        <StatTile icon={<CalendarCheck />} tint="bg-tint-sage" label={t('ov.attendance')} value={`${Math.round(s?.averageAttendance ?? 0)}%`} loading={stats.isLoading} to="/student/attendance" />
        <StatTile icon={<Clock />} tint="bg-tint-sand" label={t('ov.hours')} value={s?.totalSessionHours ?? 0} loading={stats.isLoading} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel>
          <PanelTitle title={t('ov.myCourses')} link={{ to: '/student/courses', label: t('ov.viewAll') }} />
          {progress.isLoading ? (
            <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-20 animate-pulse rounded-card bg-rail" />)}</div>
          ) : !progress.data?.length ? (
            <EmptyState icon={<BookOpen />} title={t('ov.noCourses')} description={t('ov.noCoursesHint')} />
          ) : (
            <ul className="space-y-3">
              {progress.data.slice(0, 4).map((c) => {
                const pct = c.totalSessions ? Math.round((c.completedSessions / c.totalSessions) * 100) : 0;
                return (
                  <li key={c.courseId}>
                    <Link to={`/student/courses/${c.courseId}`} className="block rounded-card border border-line p-4 transition-colors hover:border-ink focus-visible:focus-ring">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate font-semibold text-ink" dir="auto">{c.courseTitle}</p>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">{pct}%</span>
                      </div>
                      <div className="mt-2.5 h-2 overflow-hidden rounded-pill bg-rail">
                        <span className="block h-full rounded-pill bg-glow" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-ink-4">{t('ov.sessionsOf', { done: c.completedSessions, total: c.totalSessions })}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <div className="space-y-5">
          {s && s.totalRemaining > 0 && (
            <Link to="/student/payments" className="block rounded-panel bg-ink p-5 text-white focus-visible:focus-ring">
              <div className="flex items-center justify-between">
                <p className="text-sm text-frost/75">{t('ov.toPay')}</p>
                <CreditCard className="size-5 text-glow" aria-hidden />
              </div>
              <p className="mt-2 text-3xl font-bold tabular-nums">{f.money(s.totalRemaining)}</p>
              <p className="mt-1 text-xs text-frost/70">{s.overduePayments > 0 ? t('ov.overdue', { count: s.overduePayments }) : t('ov.paidSoFar', { amount: f.money(s.totalPaid) })}</p>
              <p className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-glow">
                {t('ov.seePayments')} <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
              </p>
            </Link>
          )}

          <Panel>
            <PanelTitle title={t('ov.dueSoon')} />
            {deadlines.isLoading ? (
              <div className="h-16 animate-pulse rounded-card bg-rail" />
            ) : !deadlines.data?.length ? (
              <p className="py-4 text-center text-sm text-ink-4">{t('ov.nothingDue')}</p>
            ) : (
              <ul className="space-y-2">
                {deadlines.data.slice(0, 5).map((d) => (
                  <li key={d._id} className="flex items-center gap-3 rounded-card bg-canvas px-3 py-2.5">
                    <span className={cn('grid size-9 shrink-0 place-items-center rounded-input', d.priority === 'high' ? 'bg-danger-soft text-danger' : 'bg-tint-straw text-ink')}>
                      {d.type === 'payment' ? <Wallet className="size-4" aria-hidden /> : <FileText className="size-4" aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink" dir="auto">{d.type === 'payment' ? t('ov.installment') : d.title}</span>
                      <span className="block truncate text-xs text-ink-4" dir="auto">{d.courseTitle}</span>
                    </span>
                    <span className={cn('shrink-0 text-xs font-medium tabular-nums', d.priority === 'high' ? 'text-danger' : 'text-ink-3')}>{f.dayMonth(d.dueDate)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <Panel>
        <PanelTitle title={t('ov.recent')} />
        {activity.isLoading ? (
          <div className="h-24 animate-pulse rounded-card bg-rail" />
        ) : !activity.data?.length ? (
          <p className="py-4 text-center text-sm text-ink-4">{t('ov.noActivity')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {activity.data.slice(0, 6).map((a) => {
              const Icon = ACTIVITY_ICON[a.type] ?? BookOpen;
              return (
                <li key={a._id} className="flex items-center gap-3 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-tint-sage text-ink">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink" dir="auto">{activityText(a)}</span>
                  <span className="shrink-0 text-xs text-ink-4 tabular-nums">{f.date(a.timestamp)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
