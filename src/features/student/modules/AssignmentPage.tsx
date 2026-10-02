import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CalendarClock, Download, FileUp, Paperclip, Star, Trash2, X } from 'lucide-react';
import { api } from '../../../lib/api';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { Badge, Button, ConfirmDialog, EmptyState, PageHeader, Panel, PanelTitle } from '../../../ui';

interface Assignment {
  _id: string; title: string; description?: string | null; instructions?: string | null; dueDate?: string | null; maxScore: number;
  allowedFileTypes?: string[]; maxFileSize?: number; maxFiles?: number; allowLateSubmission?: boolean;
  course?: { _id: string; title: string } | string; module?: { _id: string } | string;
}
interface Submission {
  _id: string; submittedAt: string; isLate: boolean; status: string;
  files: { _id: string; originalName: string; fileUrl: string | null; fileSize: number }[];
  grade: { score: number | null; feedback?: string | null; gradedAt?: string | null };
}
interface View { assignment: Assignment; submission: Submission | null; isOverdue: boolean; canSubmit: boolean }

const mb = (b: number) => (b < 1048576 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`);

/** A module assignment: the brief, the student's files, and the grade once marked. */
export default function AssignmentPage() {
  const { assignmentId = '' } = useParams();
  const { t } = useTranslation('dashboardStudent');
  const f = useFormat();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [problem, setProblem] = useState('');
  const [removing, setRemoving] = useState(false);
  const key = ['student', 'assignment', assignmentId];
  const q = useQuery({ queryKey: key, queryFn: async () => (await api.get(`/student/assignments/${assignmentId}`)).data.data as View });
  const refresh = () => void qc.invalidateQueries({ queryKey: key });
  const submit = useMutation({
    mutationFn: () => {
      const form = new FormData();
      files.forEach((x) => form.append('files', x));
      return api.post(`/student/assignments/${assignmentId}/submit`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => { setFiles([]); refresh(); },
    onError: (err) => setProblem(readApiError(err).message),
  });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/student/assignments/submissions/${id}`), onSuccess: () => { setRemoving(false); refresh(); } });

  const back = { to: '/student/courses', label: t('courses.title') };
  if (q.isError) {
    return (
      <div className="space-y-5">
        <PageHeader back={back} title={t('asg.title')} />
        <Panel><EmptyState icon={<AlertCircle />} title={readApiError(q.error).status === 404 ? t('asg.notFound') : readApiError(q.error).message} /></Panel>
      </div>
    );
  }
  if (!q.data) return <div className="space-y-4"><div className="h-10 w-72 animate-pulse rounded-md bg-rail" /><div className="h-64 animate-pulse rounded-panel bg-rail" /></div>;

  const { assignment: a, submission: s, isOverdue, canSubmit } = q.data;
  const maxFiles = a.maxFiles ?? 5;
  const maxSize = a.maxFileSize ?? 10 * 1048576;
  const accept = a.allowedFileTypes?.length ? a.allowedFileTypes.map((x) => (x.startsWith('.') || x.includes('/') ? x : `.${x}`)).join(',') : undefined;

  const add = (list: FileList | null) => {
    setProblem('');
    const next = [...files, ...[...(list ?? [])]];
    if (next.length > maxFiles) return setProblem(t('asg.tooMany', { count: maxFiles }));
    const big = next.find((x) => x.size > maxSize);
    if (big) return setProblem(t('asg.tooBig', { name: big.name, size: mb(maxSize) }));
    setFiles(next);
  };

  return (
    <div className="space-y-5">
      <PageHeader back={typeof a.module === 'object' && a.module ? { to: `/student/modules/${a.module._id}`, label: t('asg.backToLesson') } : back} title={a.title} description={a.description || undefined} />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-card border border-line bg-paper px-5 py-4 text-sm">
        {a.dueDate && <span className="inline-flex items-center gap-2 text-ink"><CalendarClock className="size-4 text-ink-3" aria-hidden />{t('asg.due', { date: f.date(a.dueDate) })}</span>}
        <span className="inline-flex items-center gap-2 text-ink"><Star className="size-4 text-ink-3" aria-hidden />{t('asg.points', { count: a.maxScore })}</span>
        <span className="ms-auto">
          {s ? <Badge tone={s.grade.score != null ? 'success' : 'info'}>{s.grade.score != null ? t('asg.graded') : t('asg.handedIn')}</Badge> : isOverdue ? <Badge tone="danger">{t('asg.overdue')}</Badge> : <Badge tone="warning">{t('asg.toDo')}</Badge>}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Panel>
          <PanelTitle title={t('asg.brief')} />
          {a.instructions ? <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-2" dir="auto">{a.instructions}</p> : <p className="text-sm text-ink-4">{t('asg.noBrief')}</p>}
          {!!a.allowedFileTypes?.length && <p className="mt-4 text-xs text-ink-4">{t('asg.types', { types: a.allowedFileTypes.join(', '), count: maxFiles, size: mb(maxSize) })}</p>}
        </Panel>

        <div className="space-y-5">
          {s && (
            <Panel>
              <PanelTitle title={t('asg.yourWork')} />
              <p className="mb-3 text-xs text-ink-4">{t('asg.sentOn', { date: f.date(s.submittedAt) })}{s.isLate ? ` · ${t('asg.late')}` : ''}</p>
              <ul className="space-y-2">
                {s.files.map((x) => (
                  <li key={x._id} className="flex items-center gap-2 rounded-input bg-canvas px-3 py-2 text-sm">
                    <Paperclip className="size-4 shrink-0 text-ink-3" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-ink" dir="auto">{x.originalName}</span>
                    {x.fileUrl && <a href={x.fileUrl} target="_blank" rel="noreferrer" aria-label={t('asg.download', { name: x.originalName })} className="grid size-8 place-items-center rounded-full text-ink-3 hover:bg-ink/5 hover:text-ink"><Download className="size-4" /></a>}
                  </li>
                ))}
              </ul>
              {s.grade.score != null ? (
                <div className="mt-4 rounded-card bg-ink p-4 text-white">
                  <p className="text-3xl font-bold tabular-nums text-glow">{s.grade.score}<span className="text-base text-frost/60"> / {a.maxScore}</span></p>
                  {s.grade.feedback && <p className="mt-2 whitespace-pre-line text-sm text-frost/85" dir="auto">{s.grade.feedback}</p>}
                </div>
              ) : (
                canSubmit && <Button className="mt-4" size="sm" variant="ghost" icon={<Trash2 />} onClick={() => setRemoving(true)}>{t('asg.withdraw')}</Button>
              )}
            </Panel>
          )}

          {!s && (
            <Panel>
              <PanelTitle title={t('asg.handIn')} />
              {!canSubmit ? (
                <p className="rounded-input bg-rail px-3 py-2.5 text-sm text-ink-3">{t('asg.closed')}</p>
              ) : (
                <>
                  <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-card border-2 border-dashed border-line-strong px-4 py-8 text-sm text-ink-3 hover:border-ink hover:text-ink focus-visible:focus-ring">
                    <FileUp className="size-7" aria-hidden />{t('asg.pick', { count: maxFiles })}
                  </button>
                  <input ref={fileRef} type="file" multiple accept={accept} hidden onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
                  {files.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {files.map((x, i) => (
                        <li key={x.name + i} className="flex items-center gap-2 rounded-input bg-canvas px-3 py-2 text-sm">
                          <Paperclip className="size-4 shrink-0 text-ink-3" aria-hidden />
                          <span className="min-w-0 flex-1 truncate text-ink">{x.name}</span>
                          <span className="text-xs text-ink-4">{mb(x.size)}</span>
                          <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={t('asg.removeFile', { name: x.name })} className="grid size-7 place-items-center rounded-full text-ink-4 hover:bg-danger-soft hover:text-danger"><X className="size-3.5" /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {problem && <p role="alert" className="mt-3 text-sm text-danger">{problem}</p>}
                  <Button className="mt-4 w-full" icon={<FileUp />} disabled={!files.length} loading={submit.isPending} onClick={() => submit.mutate()}>{t('asg.send')}</Button>
                </>
              )}
            </Panel>
          )}
        </div>
      </div>

      <ConfirmDialog open={removing} onClose={() => setRemoving(false)} tone="danger" title={t('asg.withdrawTitle')} message={t('asg.withdrawText')} confirmLabel={t('asg.withdraw')} cancelLabel={t('qz.review')} loading={remove.isPending} onConfirm={() => s && remove.mutate(s._id)} />
    </div>
  );
}
