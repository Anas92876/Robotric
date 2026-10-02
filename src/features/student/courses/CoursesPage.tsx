import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Award, BookOpen, CalendarCheck, ChevronRight, Layers, Lock, UserRound, Wallet } from 'lucide-react';
import { useStudentCourses, type EnrolledCourse } from '../../../hooks';
import { useFormat } from '../../../app/format';
import { cn } from '../../../lib/utils';
import { Badge, Button, EmptyState, PageHeader, Panel, SearchInput, StatTile } from '../../../ui';

type View = 'active' | 'ended' | '';
const CLOSED = ['completed', 'archived', 'cancelled'];
const isClosed = (e: EnrolledCourse) => e.status === 'completed' || CLOSED.includes(e.groupStatus ?? '');
const pctOf = (done?: number, total?: number) => (total ? Math.round(((done ?? 0) / total) * 100) : 0);

function Thumb({ src, title, closed }: { src?: string; title: string; closed?: boolean }) {
  return src ? (
    <img src={src} alt="" className={cn('size-full object-cover', closed && 'grayscale opacity-60')} loading="lazy" />
  ) : (
    <span className={cn('grid size-full place-items-center bg-ink', closed && 'opacity-70')} aria-label={title}>
      <BookOpen className="size-8 text-glow" aria-hidden />
    </span>
  );
}

function Bar({ value }: { value: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-pill bg-rail">
      <span className="block h-full rounded-pill bg-glow" style={{ width: `${value}%` }} />
    </div>
  );
}

function CourseCard({ e }: { e: EnrolledCourse }) {
  const { t } = useTranslation('dashboardStudent');
  const f = useFormat();
  const closed = isClosed(e);
  const pct = pctOf(e.progress?.completedSessions, e.progress?.totalSessions);
  const remaining = e.payment?.remainingAmount ?? 0;
  const trainer = e.course.instructor?.name;

  return (
    <Link to={`/student/courses/${e.course._id}`} className="group flex flex-col overflow-hidden rounded-card border border-line bg-paper shadow-card transition-colors hover:border-ink focus-visible:focus-ring">
      <div className="relative aspect-[16/6] overflow-hidden">
        <Thumb src={e.course.thumbnail} title={e.course.title} closed={closed} />
        <span className="absolute start-3 top-3">
          {closed ? <Badge tone="neutral" icon={<Lock />}>{t('courses.ended')}</Badge> : <Badge tone="success">{t('courses.active')}</Badge>}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h2 className="line-clamp-2 font-semibold leading-snug text-ink" dir="auto">{e.course.title}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-4">
            {trainer && <span className="inline-flex items-center gap-1"><UserRound className="size-3.5" aria-hidden />{trainer}</span>}
            {e.course.level && <span>{t(`courses.level.${e.course.level}`, { defaultValue: e.course.level })}</span>}
          </p>
        </div>

        {closed ? (
          <p className={cn('mt-auto flex items-center gap-2 rounded-input px-3 py-2 text-sm', e.hasCertificate ? 'bg-success-soft text-success' : 'bg-canvas text-ink-3')}>
            <Award className="size-4 shrink-0" aria-hidden />
            {e.hasCertificate ? t('courses.certReady', { date: e.certificate?.issuedAt ? f.date(e.certificate.issuedAt) : '' }) : t('courses.certPending')}
          </p>
        ) : (
          <div className="mt-auto space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-3">{t('courses.classes', { done: e.progress?.completedSessions ?? 0, total: e.progress?.totalSessions ?? 0 })}</span>
              <span className="font-semibold tabular-nums text-ink">{pct}%</span>
            </div>
            <Bar value={pct} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-ink-3">
              <span className="inline-flex items-center gap-1"><CalendarCheck className="size-3.5" aria-hidden />{t('courses.attendance', { pct: Math.round(e.attendance?.percentage ?? 0) })}</span>
              {remaining > 0 && <span className="inline-flex items-center gap-1 font-medium text-warning"><Wallet className="size-3.5" aria-hidden />{t('courses.toPay', { amount: f.money(remaining) })}</span>}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

function BundleCard({ e }: { e: EnrolledCourse }) {
  const { t } = useTranslation('dashboardStudent');
  const subs = e.bundleSubCourses?.length
    ? e.bundleSubCourses.map((s) => ({ id: s.course._id, title: s.course.title, pct: pctOf(s.progress?.completedSessions, s.progress?.totalSessions), closed: CLOSED.includes(s.groupStatus ?? '') }))
    : (e.course.bundleCourses ?? []).map((c) => ({ id: c._id, title: c.title, pct: 0, closed: false }));

  return (
    <div className="flex flex-col overflow-hidden rounded-card border border-line bg-paper shadow-card sm:col-span-2">
      <div className="flex items-center gap-4 bg-ink p-4 text-white">
        <span className="grid size-12 shrink-0 place-items-center rounded-input bg-white/10"><Layers className="size-6 text-glow" aria-hidden /></span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-glow">{t('courses.bundle', { count: subs.length })}</p>
          <h2 className="truncate font-semibold" dir="auto">{e.course.title}</h2>
        </div>
      </div>
      <ul className="divide-y divide-line">
        {subs.map((s) => (
          <li key={s.id}>
            <Link to={`/student/courses/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-rail focus-visible:bg-rail focus-visible:outline-none">
              <BookOpen className="size-4 shrink-0 text-ink-3" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink" dir="auto">{s.title}</span>
                {!s.closed && <span className="mt-1.5 block max-w-56"><Bar value={s.pct} /></span>}
              </span>
              {s.closed ? <Badge tone="neutral">{t('courses.ended')}</Badge> : <span className="text-xs font-semibold tabular-nums text-ink">{s.pct}%</span>}
              <ChevronRight className="size-4 shrink-0 text-ink-4 rtl:rotate-180" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The courses the student is in (bundles show their parts), with progress, attendance and money still due. */
export default function CoursesPage() {
  const { t } = useTranslation('dashboardStudent');
  const { courses, isLoading, error, refetch } = useStudentCourses();
  const [view, setView] = useState<View>('');
  const [search, setSearch] = useState('');

  // Parts of a bundle are listed inside their bundle card, not on their own
  const all = (courses ?? []).filter((e) => e?.enrollmentSource !== 'bundle');
  const q = search.trim().toLowerCase();
  const rows = all
    .filter((e) => !view || (view === 'ended' ? isClosed(e) : !isClosed(e)))
    .filter((e) => !q || e.course.title.toLowerCase().includes(q) || (e.course.instructor?.name ?? '').toLowerCase().includes(q));
  const tile = (v: View) => ({ onClick: () => setView(view === v ? '' : v), active: view === v });

  return (
    <div className="space-y-5">
      <PageHeader title={t('courses.title')} description={t('courses.subtitle')} />

      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<BookOpen />} tint="bg-tint-leaf" label={t('courses.all')} value={all.length} loading={isLoading} {...tile('')} />
        <StatTile icon={<CalendarCheck />} tint="bg-tint-straw" label={t('courses.activeMany')} value={all.filter((e) => !isClosed(e)).length} loading={isLoading} {...tile('active')} />
        <StatTile icon={<Award />} tint="bg-tint-sage" label={t('courses.endedMany')} value={all.filter(isClosed).length} loading={isLoading} {...tile('ended')} />
      </div>

      {all.length > 3 && <SearchInput value={search} onChange={setSearch} placeholder={t('courses.search')} />}

      {error ? (
        <Panel><EmptyState icon={<BookOpen />} title={t('courses.loadError')} action={<Button variant="secondary" onClick={() => void refetch()}>{t('courses.retry')}</Button>} /></Panel>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-72 animate-pulse rounded-card bg-rail" />)}</div>
      ) : rows.length === 0 ? (
        <Panel><EmptyState icon={<BookOpen />} title={t(all.length ? 'courses.noMatch' : 'courses.none')} description={all.length ? undefined : t('courses.noneHint')} /></Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((e) => (e.course.type === 'bundle' ? <BundleCard key={e._id} e={e} /> : <CourseCard key={e._id} e={e} />))}
        </div>
      )}
    </div>
  );
}
