import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CalendarClock, CheckCircle2, ChevronRight, Clock, Eye, FileText, ListTodo, Lock, MessageSquareText, PlayCircle, Star } from 'lucide-react';
import { api } from '../../../lib/api';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { PDFViewer } from '../../../components/ui/PDFViewer';
import { Badge, Button, EmptyState, PageHeader, Panel, PanelTitle, type BadgeTone } from '../../../ui';

type Att = 'present' | 'late' | 'absent' | 'excused';
interface Session {
  _id: string;
  title: string;
  description?: string | null;
  scheduledDate?: string | null;
  startTime?: string;
  endTime?: string;
  courseId?: { _id: string; title: string } | null;
  materials?: { _id: string; title: string; description?: string; fileSize?: number }[] | null;
  attendance?: { status: Att; checkedInAt?: string | null } | null;
  evaluation?: { overallScore: number | null; parameters?: { name: string; score: number; maxScore: number }[]; trainerNotes?: string | null } | null;
  hasVideo?: boolean;
  tasks?: { _id: string; title: string; deadline?: string | null; maxScore?: number; submission?: { status: string; score?: number | null; isLate?: boolean } | null }[];
}
type Locked = { locked: true; title: string; scheduledDate?: string; startTime?: string; endTime?: string };

const ATT_TONE: Record<Att, BadgeTone> = { present: 'success', late: 'warning', absent: 'danger', excused: 'info' };

/** A class can be closed until its day; the server then answers 403 with { locked: true }. */
function useSession(id: string) {
  return useQuery({
    queryKey: ['student', 'session', id],
    queryFn: async (): Promise<Session | Locked> => {
      try {
        // A locked class is an expected answer here, not an error to pop up
        return (await api.get(`/student/sessions/${id}`, { skipErrorToast: true } as object)).data.session as Session;
      } catch (err) {
        const d = (err as { response?: { status?: number; data?: Locked } }).response;
        if (d?.status === 403 && d.data?.locked) return { ...d.data, locked: true };
        throw err;
      }
    },
    retry: false,
  });
}

function Countdown({ to }: { to: number }) {
  const { t } = useTranslation('dashboardStudent');
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const ms = Math.max(0, to - now);
  const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
  return (
    <div className="flex justify-center gap-3">
      {[[d, t('cls.days')], [h, t('cls.hours')], [m, t('cls.minutes')]].map(([n, l]) => (
        <div key={String(l)} className="min-w-20 rounded-card bg-white/10 px-4 py-3 text-center">
          <p className="text-3xl font-bold tabular-nums text-glow">{n}</p>
          <p className="text-xs text-frost/70">{l}</p>
        </div>
      ))}
    </div>
  );
}

/** The class video is served through a short-lived token, never as a plain YouTube link. */
function Video({ id }: { id: string }) {
  const { t } = useTranslation('dashboardStudent');
  const q = useQuery({
    queryKey: ['student', 'session', id, 'video'],
    queryFn: async () => {
      const token: string = (await api.get(`/student/sessions/${id}/video-token`)).data.data.token;
      const base = (api.defaults.baseURL ?? '').replace(/\/$/, '');
      return `${base}/student/sessions/${id}/video-embed?token=${encodeURIComponent(token)}`;
    },
    staleTime: 5 * 60_000,
  });
  if (q.isLoading) return <div className="grid aspect-video place-items-center rounded-card bg-rail"><PlayCircle className="size-10 text-ink-4" aria-hidden /></div>;
  if (q.isError || !q.data) return <p className="flex items-center gap-2 rounded-card bg-rail p-4 text-sm text-ink-3"><AlertCircle className="size-4" aria-hidden />{t('cls.videoError')}</p>;
  return (
    <div className="relative aspect-video overflow-hidden rounded-card bg-black">
      <iframe src={q.data} title={t('cls.video')} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen className="absolute inset-0 size-full border-0" />
    </div>
  );
}

function Stars({ score, max }: { score: number; max: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${score} / ${max}`}>
      {Array.from({ length: max }, (_, i) => <Star key={i} className={i < Math.round(score) ? 'size-4 fill-glow text-glow' : 'size-4 text-line-strong'} aria-hidden />)}
    </span>
  );
}

/** One class for the student: when, their attendance, video, materials, homework and the trainer's evaluation. */
export default function SessionPage() {
  const { sessionId = '' } = useParams();
  const { t } = useTranslation('dashboardStudent');
  const f = useFormat();
  const q = useSession(sessionId);
  const [pdf, setPdf] = useState<string | null>(null);
  const s = q.data;
  const courseBack = s && !('locked' in s) && s.courseId ? { to: `/student/courses/${s.courseId._id}`, label: s.courseId.title } : { to: '/student/courses', label: t('courses.title') };
  const timeRange = (a?: string, b?: string) => (a ? <bdi dir="ltr">{a}{b ? `–${b}` : ''}</bdi> : null);

  if (q.isError) {
    const status = readApiError(q.error).status;
    return (
      <div className="space-y-5">
        <PageHeader back={courseBack} title={t('cls.title')} />
        <Panel><EmptyState icon={<AlertCircle />} title={t(status === 404 ? 'cls.notFound' : status === 403 ? 'cls.noAccess' : 'cls.loadError')} action={status && status >= 500 ? <Button variant="secondary" onClick={() => void q.refetch()}>{t('courses.retry')}</Button> : undefined} /></Panel>
      </div>
    );
  }
  if (q.isLoading || !s) return <div className="space-y-4"><div className="h-10 w-72 animate-pulse rounded-md bg-rail" /><div className="h-48 animate-pulse rounded-panel bg-rail" /></div>;

  if ('locked' in s) {
    return (
      <div className="space-y-5">
        <PageHeader back={courseBack} title={s.title || t('cls.title')} />
        <section className="space-y-5 rounded-panel bg-ink px-6 py-10 text-center text-white">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/10"><Lock className="size-7 text-glow" aria-hidden /></span>
          <div>
            <p className="text-xl font-semibold">{t('cls.lockedTitle')}</p>
            {s.scheduledDate && <p className="mt-1 text-sm text-frost/75">{f.custom(s.scheduledDate, { weekday: 'long', day: 'numeric', month: 'long' })} · {timeRange(s.startTime, s.endTime)}</p>}
          </div>
          {s.scheduledDate && <Countdown to={new Date(s.scheduledDate).getTime()} />}
        </section>
      </div>
    );
  }

  const ev = s.evaluation;
  const tasks = s.tasks ?? [];
  const mats = s.materials ?? [];
  const size = (b?: number) => (!b ? '' : b < 1048576 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`);

  return (
    <div className="space-y-5">
      <PageHeader back={courseBack} title={s.title} description={s.description || undefined} />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-card border border-line bg-paper px-5 py-4 text-sm">
        {s.scheduledDate && <span className="inline-flex items-center gap-2 text-ink"><CalendarClock className="size-4 text-ink-3" aria-hidden />{f.custom(s.scheduledDate, { weekday: 'long', day: 'numeric', month: 'long' })}</span>}
        {s.startTime && <span className="inline-flex items-center gap-2 tabular-nums text-ink"><Clock className="size-4 text-ink-3" aria-hidden />{timeRange(s.startTime, s.endTime)}</span>}
        <span className="ms-auto">
          {s.attendance ? (
            <Badge tone={ATT_TONE[s.attendance.status]} icon={<CheckCircle2 />}>
              {t(`crs.att.${s.attendance.status}`)}{s.attendance.checkedInAt ? ` · ${f.time(s.attendance.checkedInAt)}` : ''}
            </Badge>
          ) : (
            <Badge tone="neutral">{t('cls.noAttendance')}</Badge>
          )}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {s.hasVideo && (
            <Panel>
              <PanelTitle title={t('cls.video')} />
              <Video id={s._id} />
            </Panel>
          )}

          <Panel>
            <PanelTitle title={t('cls.materials', { count: mats.length })} />
            {mats.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-4">{t('cls.noMaterials')}</p>
            ) : (
              <ul className="space-y-2">
                {mats.map((m) => (
                  <li key={m._id} className="flex items-center gap-3 rounded-card border border-line p-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-input bg-tint-straw text-ink"><FileText className="size-5" aria-hidden /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink" dir="auto">{m.title}</span>
                      {(m.description || m.fileSize) && <span className="block truncate text-xs text-ink-4" dir="auto">{[m.description, size(m.fileSize)].filter(Boolean).join(' · ')}</span>}
                    </span>
                    <Button size="sm" variant="secondary" icon={<Eye />} onClick={() => setPdf(m._id)}>{t('cls.view')}</Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {tasks.length > 0 && (
            <Panel>
              <PanelTitle title={t('cls.homework')} link={{ to: '/student/tasks', label: t('ov.viewAll') }} />
              <ul className="divide-y divide-line">
                {tasks.map((tk) => {
                  const sub = tk.submission;
                  return (
                    <li key={tk._id}>
                      <Link to={`/student/tasks/${tk._id}`} className="flex items-center gap-3 py-3 hover:bg-rail focus-visible:bg-rail focus-visible:outline-none">
                        <ListTodo className="size-4 shrink-0 text-ink-3" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink" dir="auto">{tk.title}</span>
                          {tk.deadline && <span className="block text-xs text-ink-4">{t('cls.due', { date: f.date(tk.deadline) })}</span>}
                        </span>
                        {sub ? (
                          <Badge tone={sub.status === 'graded' ? 'success' : 'info'}>{sub.status === 'graded' && sub.score != null ? t('cls.scored', { score: sub.score, max: tk.maxScore ?? 100 }) : t('cls.handedIn')}</Badge>
                        ) : (
                          <Badge tone="warning">{t('cls.toDo')}</Badge>
                        )}
                        <ChevronRight className="size-4 shrink-0 text-ink-4 rtl:rotate-180" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}
        </div>

        <Panel>
          <PanelTitle title={t('cls.evaluation')} />
          {!ev ? (
            <p className="py-4 text-center text-sm text-ink-4">{t('cls.noEvaluation')}</p>
          ) : (
            <div className="space-y-4">
              {ev.overallScore != null && (
                <div className="rounded-card bg-ink p-4 text-center text-white">
                  <p className="text-4xl font-bold tabular-nums text-glow">{ev.overallScore}<span className="text-lg text-frost/60"> / 5</span></p>
                  <p className="mt-1 text-xs text-frost/70">{t('cls.overall')}</p>
                </div>
              )}
              {!!ev.parameters?.length && (
                <ul className="space-y-2.5">
                  {ev.parameters.map((p) => (
                    <li key={p.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-ink-2" dir="auto">{p.name}</span>
                      <Stars score={Number(p.score) || 0} max={p.maxScore || 5} />
                    </li>
                  ))}
                </ul>
              )}
              {ev.trainerNotes && (
                <div className="rounded-card bg-canvas p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-ink-3"><MessageSquareText className="size-3.5" aria-hidden />{t('cls.notes')}</p>
                  <p className="whitespace-pre-line text-sm text-ink" dir="auto">{ev.trainerNotes}</p>
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>

      <PDFViewer resourceId={pdf} isOpen={!!pdf} onClose={() => setPdf(null)} />
    </div>
  );
}
