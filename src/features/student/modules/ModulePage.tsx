import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, ExternalLink, FileText } from 'lucide-react';
import { api } from '../../../lib/api';
import { readApiError } from '../../../app/apiError';
import { Badge, Button, EmptyState, PageHeader, Panel } from '../../../ui';

interface Module {
  _id: string;
  course: string;
  title: string;
  description?: string | null;
  type: 'video' | 'pdf' | 'text' | 'quiz' | 'assignment' | string;
  content?: { videoUrl?: string | null; pdfUrl?: string | null; textContent?: string | null } | null;
  quiz?: { _id: string; title: string } | string | null;
  assignment?: { _id: string; title: string } | string | null;
}
type Neighbour = { _id: string; title: string } | null;

const refId = (x: { _id: string } | string | null | undefined) => (typeof x === 'object' && x ? x._id : x || '');
/** YouTube watch/share links → embeddable link; other links are opened in a new tab. */
const youTube = (url: string) => url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/)?.[1];

/** One lesson module of a course: its content, then on to the next one. */
export default function ModulePage() {
  const { moduleId = '' } = useParams();
  const { t } = useTranslation('dashboardStudent');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['student', 'module', moduleId],
    queryFn: async () => (await api.get(`/student/modules/${moduleId}`)).data.data as { module: Module; progress: { status: string } | null },
  });
  const neighbours = useQuery({
    queryKey: ['student', 'module', moduleId, 'around'],
    queryFn: async () => {
      const [n, p] = await Promise.all([api.get(`/student/modules/${moduleId}/next`), api.get(`/student/modules/${moduleId}/previous`)]);
      return { next: n.data.data as Neighbour, prev: p.data.data as Neighbour };
    },
  });
  const complete = useMutation({
    mutationFn: () => api.post(`/student/modules/${moduleId}/complete`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['student'] }),
  });

  // Opening a module marks it started (once)
  useEffect(() => {
    if (q.data && (!q.data.progress || q.data.progress.status === 'not_started')) void api.post(`/student/modules/${moduleId}/start`).catch(() => undefined);
  }, [q.data, moduleId]);

  const back = { to: '/student/courses', label: t('courses.title') };
  if (q.isError) {
    return (
      <div className="space-y-5">
        <PageHeader back={back} title={t('mod.title')} />
        <Panel><EmptyState icon={<AlertCircle />} title={readApiError(q.error).status === 404 ? t('mod.notFound') : readApiError(q.error).message} /></Panel>
      </div>
    );
  }
  if (!q.data) return <div className="space-y-4"><div className="h-10 w-72 animate-pulse rounded-md bg-rail" /><div className="h-64 animate-pulse rounded-panel bg-rail" /></div>;

  const m = q.data.module;
  const done = q.data.progress?.status === 'completed' || complete.isSuccess;
  const video = m.content?.videoUrl;
  const yt = video ? youTube(video) : undefined;
  const quizId = refId(m.quiz);
  const assignmentId = refId(m.assignment);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader back={{ to: `/student/courses/${m.course}`, label: t('mod.backToCourse') }} title={m.title} description={m.description || undefined} actions={done ? <Badge tone="success" icon={<CheckCircle2 />}>{t('mod.done')}</Badge> : undefined} />

      {yt ? (
        <div className="relative aspect-video overflow-hidden rounded-panel bg-black">
          <iframe src={`https://www.youtube-nocookie.com/embed/${yt}`} title={m.title} allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="absolute inset-0 size-full border-0" />
        </div>
      ) : video ? (
        <a href={video} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-ink underline underline-offset-2">{t('mod.openVideo')} <ExternalLink className="size-4" aria-hidden /></a>
      ) : null}

      {m.content?.textContent && (
        <Panel><div className="whitespace-pre-line text-[15px] leading-relaxed text-ink-2" dir="auto">{m.content.textContent}</div></Panel>
      )}

      {m.content?.pdfUrl && (
        <a href={m.content.pdfUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-card border border-line bg-paper p-4 hover:border-ink">
          <FileText className="size-5 text-ink-3" aria-hidden /><span className="flex-1 font-medium text-ink">{t('mod.openPdf')}</span><ExternalLink className="size-4 text-ink-4" aria-hidden />
        </a>
      )}

      {quizId && (
        <Link to={`/student/quizzes/${quizId}`} className="flex items-center gap-4 rounded-panel bg-ink p-5 text-white focus-visible:focus-ring">
          <ClipboardList className="size-6 text-glow" aria-hidden />
          <span className="flex-1 font-semibold">{t('mod.takeQuiz')}</span>
          <ArrowRight className="size-5 text-glow rtl:rotate-180" aria-hidden />
        </Link>
      )}
      {assignmentId && (
        <Link to={`/student/assignments/${assignmentId}`} className="flex items-center gap-4 rounded-panel bg-ink p-5 text-white focus-visible:focus-ring">
          <FileText className="size-6 text-glow" aria-hidden />
          <span className="flex-1 font-semibold">{t('mod.openAssignment')}</span>
          <ArrowRight className="size-5 text-glow rtl:rotate-180" aria-hidden />
        </Link>
      )}

      {!yt && !video && !m.content?.textContent && !m.content?.pdfUrl && !quizId && !assignmentId && <Panel><EmptyState icon={<FileText />} title={t('mod.empty')} /></Panel>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <Button variant="ghost" icon={<ArrowLeft className="rtl:rotate-180" />} disabled={!neighbours.data?.prev} onClick={() => neighbours.data?.prev && navigate(`/student/modules/${neighbours.data.prev._id}`)}>{t('mod.prev')}</Button>
        {!done && m.type !== 'quiz' && m.type !== 'assignment' && <Button variant="secondary" icon={<CheckCircle2 />} loading={complete.isPending} onClick={() => complete.mutate()}>{t('mod.markDone')}</Button>}
        <Button disabled={!neighbours.data?.next} onClick={() => neighbours.data?.next && navigate(`/student/modules/${neighbours.data.next._id}`)}>{t('mod.next')} <ArrowRight className="size-[18px] rtl:rotate-180" aria-hidden /></Button>
      </div>
    </div>
  );
}
