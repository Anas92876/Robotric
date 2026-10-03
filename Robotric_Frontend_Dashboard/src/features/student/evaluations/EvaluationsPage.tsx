import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Award, BookOpen, ChevronRight, MessageSquareText, Star, TrendingUp } from 'lucide-react';
import { api } from '../../../lib/api';
import { useFormat } from '../../../app/format';
import { cn } from '../../../lib/utils';
import { Button, Dialog, EmptyState, PageHeader, Panel, StatTile } from '../../../ui';

interface Evaluation {
  _id: string;
  sessionTitle: string;
  sessionDate: string | null;
  overallScore: number | null;
  maxScore: number;
  parameters: { name: string; score: number; maxScore: number }[];
  trainerNotes: string | null;
  evaluationDate: string;
}
interface CourseGroup { courseId: string | null; courseName: string; groupName: string | null; totalSessions: number; scoredSessions: number; averageScore: number | null; percentage: number | null; evaluations: Evaluation[] }
interface Data { evaluations: Evaluation[]; total: number; courseGroups: CourseGroup[]; overallAverage: number | null; overallPercentage: number | null }

const tone = (pct: number | null) => (pct == null ? 'text-ink-4' : pct >= 80 ? 'text-success' : pct >= 60 ? 'text-warning' : 'text-danger');

function Stars({ score, max }: { score: number; max: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${score} / ${max}`}>
      {Array.from({ length: max }, (_, i) => <Star key={i} className={i < Math.round(score) ? 'size-4 fill-glow text-glow' : 'size-4 text-line-strong'} aria-hidden />)}
    </span>
  );
}

/** How the trainers rated the student in each class, per course. */
export default function EvaluationsPage() {
  const { t } = useTranslation('dashboardStudent');
  const f = useFormat();
  const q = useQuery({ queryKey: ['student', 'evaluations'], queryFn: async () => (await api.get('/student/sessions/evaluations')).data as Data, staleTime: 60_000 });
  const [open, setOpen] = useState<Evaluation | null>(null);
  const d = q.data;
  // The backend may leave the overall figure empty; then use the average of the courses
  const rated = d?.courseGroups.filter((c) => c.percentage != null) ?? [];
  const overall = d?.overallPercentage ?? (rated.length ? rated.reduce((s, c) => s + c.percentage!, 0) / rated.length : null);
  const best = d?.courseGroups.reduce<CourseGroup | null>((b, c) => (c.percentage != null && (!b || (b.percentage ?? 0) < c.percentage) ? c : b), null);

  return (
    <div className="space-y-5">
      <PageHeader title={t('ev.title')} description={t('ev.subtitle')} />
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<TrendingUp />} tint="bg-tint-leaf" label={t('ev.overall')} value={overall != null ? `${Math.round(overall)}%` : '—'} loading={q.isLoading} />
        <StatTile icon={<Star />} tint="bg-tint-straw" label={t('ev.count')} value={d?.total ?? 0} loading={q.isLoading} />
        <StatTile icon={<Award />} tint="bg-tint-sage" label={t('ev.best')} value={best ? `${Math.round(best.percentage!)}%` : '—'} loading={q.isLoading} />
      </div>

      {q.isError ? (
        <Panel><EmptyState icon={<Star />} title={t('ev.loadError')} action={<Button variant="secondary" onClick={() => void q.refetch()}>{t('courses.retry')}</Button>} /></Panel>
      ) : q.isLoading ? (
        <div className="h-48 animate-pulse rounded-panel bg-rail" />
      ) : !d?.courseGroups.length ? (
        <Panel><EmptyState icon={<Star />} title={t('ev.none')} description={t('ev.noneHint')} /></Panel>
      ) : (
        d.courseGroups.map((c) => (
          <Panel key={`${c.courseId}-${c.groupName}`} className="p-0 sm:p-0">
            <div className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-input bg-tint-sage text-ink"><BookOpen className="size-5" aria-hidden /></span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold text-ink" dir="auto">{c.courseName}</h2>
                <p className="text-xs text-ink-4">{[c.groupName, t('ev.scored', { n: c.scoredSessions, total: c.totalSessions })].filter(Boolean).join(' · ')}</p>
              </div>
              <span className={cn('text-3xl font-bold tabular-nums', tone(c.percentage))}>{c.percentage != null ? `${Math.round(c.percentage)}%` : '—'}</span>
            </div>
            <ul className="divide-y divide-line">
              {c.evaluations.map((e) => (
                <li key={e._id}>
                  <button type="button" onClick={() => setOpen(e)} className="flex w-full items-center gap-3 px-5 py-3.5 text-start hover:bg-rail focus-visible:bg-rail focus-visible:outline-none">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink" dir="auto">{e.sessionTitle}</span>
                      <span className="block text-xs text-ink-4">{f.date(e.sessionDate ?? e.evaluationDate)}</span>
                    </span>
                    {e.trainerNotes && <MessageSquareText className="size-4 shrink-0 text-ink-4" aria-label={t('ev.hasNotes')} />}
                    {e.overallScore != null ? <Stars score={e.overallScore} max={e.maxScore || 5} /> : <span className="text-sm text-ink-4">—</span>}
                    <ChevronRight className="size-4 shrink-0 text-ink-4 rtl:rotate-180" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        ))
      )}

      <Dialog open={!!open} onClose={() => setOpen(null)} title={open?.sessionTitle ?? ''} description={open ? f.date(open.sessionDate ?? open.evaluationDate) : ''} closeLabel={t('qz.done')}>
        {open && (
          <div className="space-y-4">
            {open.overallScore != null && (
              <div className="rounded-card bg-ink p-4 text-center text-white">
                <p className="text-4xl font-bold tabular-nums text-glow">{open.overallScore}<span className="text-lg text-frost/60"> / {open.maxScore || 5}</span></p>
                <p className="mt-1 text-xs text-frost/70">{t('cls.overall')}</p>
              </div>
            )}
            {open.parameters.length > 0 && (
              <ul className="space-y-2.5">
                {open.parameters.map((p) => (
                  <li key={p.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-ink-2" dir="auto">{p.name}</span>
                    <Stars score={Number(p.score) || 0} max={p.maxScore || 5} />
                  </li>
                ))}
              </ul>
            )}
            {open.trainerNotes && (
              <div className="rounded-card bg-canvas p-3">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-ink-3"><MessageSquareText className="size-3.5" aria-hidden />{t('cls.notes')}</p>
                <p className="whitespace-pre-line text-sm text-ink" dir="auto">{open.trainerNotes}</p>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
