import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Cpu, ImagePlus, Pencil, Save, Send, Trash2, X } from 'lucide-react';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { Badge, Button, ConfirmDialog, Dialog, EmptyState, Field, PageHeader, Panel, PanelTitle, TextArea, TextInput } from '../../../ui';
import { useProject, useProjectMutations, type ProjectStatus } from './api';
import { PROJECT_TONE, ownerOf } from './ProjectsPage';

const STATUSES: ProjectStatus[] = ['in_progress', 'submitted', 'completed'];
const MAX_MB = 5;

/** One student project: photos, parts, where it stands and the grade. */
export default function ProjectPage() {
  const { projectId = '' } = useParams();
  const { t, i18n } = useTranslation('dashboardTrainer');
  const f = useFormat();
  const toast = useToast();
  const navigate = useNavigate();
  const q = useProject(projectId);
  const m = useProjectMutations();
  const fileRef = useRef<HTMLInputElement>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [gradeError, setGradeError] = useState('');
  const p = q.data;
  const ar = i18n.language === 'ar';
  useEffect(() => {
    if (!p) return;
    setGrade(p.grade != null ? String(p.grade) : '');
    setFeedback(p.feedback ?? '');
  }, [p]);

  const groupId = p ? (typeof p.groupId === 'object' ? p.groupId._id : p.groupId) : '';
  const back = { to: `/trainer/projects${groupId ? `?group=${groupId}` : ''}`, label: t('pjt.title') };
  if (q.isError) return <div className="space-y-5"><PageHeader back={back} title={t('pjt.one')} /><Panel><EmptyState icon={<AlertCircle />} title={readApiError(q.error).message} /></Panel></div>;
  if (!p) return <div className="space-y-4"><div className="h-10 w-72 max-w-full animate-pulse rounded-md bg-rail" /><div className="h-72 animate-pulse rounded-panel bg-rail" /></div>;

  const name = (ar && p.titleAr) || p.title;
  const desc = (ar && p.descriptionAr) || p.description;
  const imgs = [...p.images].sort((a, b) => a.order - b.order);
  const err = (e: unknown) => toast.error(t('sp.actionError'), readApiError(e).message);

  const upload = (list: FileList | null) => {
    const files = [...(list ?? [])];
    if (fileRef.current) fileRef.current.value = '';
    if (!files.length) return;
    const bad = files.find((x) => !/^image\/(jpeg|png|webp)$/.test(x.type) || x.size > MAX_MB * 1048576);
    if (bad) return toast.error(t('pjd.badFile'), t('pjd.badFileText', { name: bad.name, mb: MAX_MB }));
    m.addImages.mutate({ id: p._id, files }, { onSuccess: () => toast.success(t('pjd.toast.uploaded', { count: files.length })), onError: err });
  };
  const saveGrade = () => {
    const n = Number(grade);
    if (grade.trim() === '' || Number.isNaN(n) || n < 0 || n > 100) return setGradeError(t('pjd.errGrade'));
    setGradeError('');
    m.grade.mutate({ id: p._id, grade: n, feedback: feedback.trim() }, { onSuccess: () => toast.success(t('pjd.toast.graded')), onError: (e) => setGradeError(readApiError(e).message) });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        back={back}
        title={name}
        description={[ownerOf(p).name, typeof p.groupId === 'object' ? p.groupId.name : '', p.courseId && typeof p.courseId === 'object' ? p.courseId.title : ''].filter(Boolean).join(' · ')}
        actions={<>
          <Link to={`/trainer/projects/${p._id}/edit`} className="inline-flex h-11 items-center gap-2 rounded-pill border border-line-strong px-5 text-sm font-medium text-ink hover:border-ink focus-visible:focus-ring"><Pencil className="size-4" aria-hidden />{t('sp.edit')}</Link>
          <Button variant="ghost" icon={<Trash2 />} className="text-danger" onClick={() => setDeleting(true)}>{t('pjt.delete')}</Button>
        </>}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <Panel>
            <PanelTitle title={t('pjd.photos')} actions={<>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => upload(e.target.files)} />
              <Button size="sm" variant="secondary" icon={<ImagePlus />} loading={m.addImages.isPending} onClick={() => fileRef.current?.click()}>{t('pjd.addPhotos')}</Button>
            </>} />
            {imgs.length === 0 ? <EmptyState icon={<ImagePlus />} title={t('pjd.noPhotos')} description={t('pjd.noPhotosHint', { mb: MAX_MB })} /> : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {imgs.map((im, i) => (
                  <li key={im._id} className="group relative overflow-hidden rounded-card border border-line bg-rail">
                    {im.cloudinaryUrl
                      ? <button type="button" onClick={() => setZoom(im.cloudinaryUrl)} aria-label={t('ts.photo', { n: i + 1 })} className="block w-full focus-visible:focus-ring"><img src={im.cloudinaryUrl} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" /></button>
                      : <span className="grid aspect-[4/3] place-items-center text-xs text-ink-4">{t('pjd.unavailable')}</span>}
                    <button type="button" onClick={() => setRemoving(i)} aria-label={t('pjd.removePhoto', { n: i + 1 })} className="absolute end-2 top-2 grid size-8 place-items-center rounded-full bg-paper text-danger shadow-sm focus-visible:focus-ring"><X className="size-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {desc && <Panel><PanelTitle title={t('pjf.about')} /><p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-2" dir="auto">{desc}</p></Panel>}
          {(p.components.length > 0 || p.technologies.length > 0) && (
            <Panel>
              <PanelTitle title={t('pjf.parts')} />
              <div className="space-y-4">
                {[[p.components, t('pjf.components')], [p.technologies, t('pjf.technologies')]].map(([list, label]) => (list as string[]).length > 0 && (
                  <div key={label as string}>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-3"><Cpu className="size-3.5" aria-hidden />{label as string}</p>
                    <div className="flex flex-wrap gap-1.5">{(list as string[]).map((x) => <span key={x} className="rounded-pill bg-rail px-3 py-1 text-sm text-ink" dir="auto">{x}</span>)}</div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
        <div className="space-y-5">
          <Panel>
            <PanelTitle title={t('tk.col.status')} actions={<Badge tone={PROJECT_TONE[p.status]}>{t(`pjt.status.${p.status}`)}</Badge>} />
            <div role="radiogroup" aria-label={t('tk.col.status')} className="grid gap-2">
              {STATUSES.map((s) => (
                <button key={s} type="button" role="radio" aria-checked={p.status === s} disabled={m.status.isPending}
                  onClick={() => p.status !== s && m.status.mutate({ id: p._id, status: s }, { onSuccess: () => toast.success(t('pjd.toast.status')), onError: err })}
                  className={cn('flex items-center gap-3 rounded-card border p-3 text-start text-sm focus-visible:focus-ring', p.status === s ? 'border-ink bg-frost font-medium text-ink' : 'border-line-strong text-ink-2 hover:border-ink')}>
                  <span className={cn('size-3 rounded-full border-2', p.status === s ? 'border-ink bg-ink' : 'border-line-strong')} aria-hidden />
                  <span className="flex-1"><span className="block">{t(`pjt.status.${s}`)}</span><span className="block text-xs font-normal text-ink-4">{t(`pjd.statusHint.${s}`)}</span></span>
                </button>
              ))}
            </div>
          </Panel>
          <Panel>
            <PanelTitle title={t('pjd.grade')} />
            <div className="space-y-3">
              <Field label={t('pjd.gradeLabel')}>{(c) => <TextInput {...c} type="number" min={0} max={100} value={grade} onChange={(e) => setGrade(e.target.value)} className="h-10" />}</Field>
              <Field label={t('ts.feedback')} hint={t('ts.feedbackHint')}>{(c) => <TextArea {...c} rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={5000} dir="auto" />}</Field>
              {gradeError && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{gradeError}</p>}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-ink-4">{p.gradedAt ? t('pjd.gradedOn', { date: f.date(p.gradedAt) }) : t('pjd.notGraded')}</span>
                <Button size="sm" icon={p.grade != null ? <Save /> : <Send />} loading={m.grade.isPending} onClick={saveGrade}>{t('pjd.saveGrade')}</Button>
              </div>
            </div>
          </Panel>
          <p className="text-xs text-ink-4">{t('pjd.created', { date: f.date(p.createdAt) })}</p>
        </div>
      </div>

      <Dialog open={!!zoom} onClose={() => setZoom(null)} size="lg" title={name} closeLabel={t('sf.cancel')}>
        {zoom && <img src={zoom} alt="" className="max-h-[70vh] w-full rounded-input object-contain" />}
      </Dialog>
      <ConfirmDialog open={removing !== null} onClose={() => setRemoving(null)} tone="danger" title={t('pjd.removeTitle')} message={t('pjd.removeText')} confirmLabel={t('pjd.remove')} cancelLabel={t('sf.cancel')} loading={m.removeImage.isPending}
        onConfirm={() => m.removeImage.mutate({ id: p._id, index: removing! }, { onSuccess: () => toast.success(t('pjd.toast.removed')), onError: err, onSettled: () => setRemoving(null) })} />
      <ConfirmDialog open={deleting} onClose={() => setDeleting(false)} tone="danger" title={t('pjt.deleteTitle')} message={t('pjt.deleteText', { name })} confirmLabel={t('pjt.delete')} cancelLabel={t('sf.cancel')} loading={m.remove.isPending}
        onConfirm={() => m.remove.mutate(p._id, { onSuccess: () => { toast.success(t('pjt.toast.deleted')); navigate(back.to); }, onError: err, onSettled: () => setDeleting(false) })} />
    </div>
  );
}
