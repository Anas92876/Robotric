import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Clock, Eye, FileCheck, FileUp, ShieldAlert, Trash2, Upload } from 'lucide-react';
import { api } from '../../../lib/api';
import { ALL_DOCUMENT_TYPES, type DocumentType, type StudentDocument } from '../../../hooks/student/useStudentDocuments';
import { useToast } from '../../../components/ui/Toast';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { cn } from '../../../lib/utils';
import { Badge, Button, ConfirmDialog, EmptyState, PageHeader, Panel, StatTile, type BadgeTone } from '../../../ui';

const MAX = 10 * 1048576;
const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';
const TONE: Record<StudentDocument['verificationStatus'], BadgeTone> = { pending: 'warning', verified: 'success', rejected: 'danger' };
const mb = (b: number) => (b < 1048576 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`);

/** Papers the WRO competition needs from each student: upload, replace, and see whether they were accepted. */
export default function DocumentsPage() {
  const { t } = useTranslation('dashboardStudent');
  const f = useFormat();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['student', 'documents'], queryFn: async () => { const r = (await api.get('/student/documents')).data; return { required: !!r.wroRequired, docs: (r.data ?? []) as StudentDocument[] }; } });
  const [progress, setProgress] = useState<{ type: DocumentType; pct: number } | null>(null);
  const [removing, setRemoving] = useState<StudentDocument | null>(null);
  const lastRemoving = useRef<StudentDocument | null>(null);
  if (removing) lastRemoving.current = removing;
  const inputs = useRef<Partial<Record<DocumentType, HTMLInputElement | null>>>({});
  const refresh = () => void qc.invalidateQueries({ queryKey: ['student', 'documents'] });

  const upload = useMutation({
    mutationFn: ({ file, type }: { file: File; type: DocumentType }) => {
      const form = new FormData();
      form.append('document', file);
      form.append('documentType', type);
      return api.post('/student/documents', form, { headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress: (e) => e.total && setProgress({ type, pct: Math.round((e.loaded * 100) / e.total) }) });
    },
    onSuccess: () => { toast.success(t('doc.toast.uploaded')); refresh(); },
    onError: (err) => toast.error(t('doc.uploadError'), readApiError(err).message),
    onSettled: () => setProgress(null),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/student/documents/${id}`),
    onSuccess: () => { toast.success(t('doc.toast.deleted')); refresh(); },
    onError: (err) => toast.error(t('doc.deleteError'), readApiError(err).message),
    onSettled: () => setRemoving(null),
  });

  const pick = (type: DocumentType, file?: File) => {
    if (!file) return;
    if (!ACCEPT.split(',').includes(file.type)) return toast.error(t('doc.badType'), file.name);
    if (file.size > MAX) return toast.error(t('doc.tooBig'), file.name);
    setProgress({ type, pct: 0 });
    upload.mutate({ file, type });
  };

  const docs = q.data?.docs ?? [];
  const byType = (type: DocumentType) => docs.find((d) => d.documentType === type);
  const count = (s: StudentDocument['verificationStatus']) => docs.filter((d) => d.verificationStatus === s).length;

  if (!q.isLoading && q.data && !q.data.required) {
    return (
      <div className="space-y-5">
        <PageHeader title={t('doc.title')} description={t('doc.subtitle')} />
        <Panel><EmptyState icon={<FileCheck />} title={t('doc.notNeeded')} description={t('doc.notNeededHint')} /></Panel>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t('doc.title')} description={t('doc.subtitle')} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={<FileUp />} tint="bg-tint-leaf" label={t('doc.sent', { total: ALL_DOCUMENT_TYPES.length })} value={`${docs.length} / ${ALL_DOCUMENT_TYPES.length}`} loading={q.isLoading} />
        <StatTile icon={<CheckCircle2 />} tint="bg-tint-sage" label={t('doc.status.verified')} value={count('verified')} loading={q.isLoading} />
        <StatTile icon={<Clock />} tint="bg-tint-straw" label={t('doc.status.pending')} value={count('pending')} loading={q.isLoading} />
        <StatTile icon={<ShieldAlert />} tint="bg-tint-sand" label={t('doc.status.rejected')} value={count('rejected')} loading={q.isLoading} />
      </div>
      <p className="text-sm text-ink-3">{t('doc.rules')}</p>

      {q.isError ? (
        <Panel><EmptyState icon={<FileCheck />} title={t('doc.loadError')} action={<Button variant="secondary" onClick={() => void q.refetch()}>{t('courses.retry')}</Button>} /></Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ALL_DOCUMENT_TYPES.map((type) => {
            const d = byType(type);
            const busy = progress?.type === type;
            return (
              <article key={type} className={cn('flex flex-col rounded-card border bg-paper p-4 shadow-card', d?.verificationStatus === 'rejected' ? 'border-danger/40' : 'border-line')}>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-ink">{t(`doc.type.${type}`)}</h2>
                  {d ? <Badge tone={TONE[d.verificationStatus]}>{t(`doc.status.${d.verificationStatus}`)}</Badge> : <Badge tone="neutral">{t('doc.missing')}</Badge>}
                </div>
                {d ? (
                  <div className="mt-2 space-y-1 text-xs text-ink-4">
                    <p className="truncate" dir="auto">{d.originalName} · {mb(d.fileSize)}</p>
                    <p>{t('doc.sentOn', { date: f.date(d.createdAt) })}</p>
                    {d.verificationStatus === 'rejected' && d.verificationNote && <p className="rounded-input bg-danger-soft px-2.5 py-1.5 text-sm text-danger" dir="auto">{d.verificationNote}</p>}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-ink-4">{t('doc.needed')}</p>
                )}
                {busy && (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-pill bg-rail" role="progressbar" aria-valuenow={progress!.pct} aria-valuemin={0} aria-valuemax={100}>
                    <span className="block h-full bg-glow transition-[width]" style={{ width: `${progress!.pct}%` }} />
                  </div>
                )}
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  {d?.verificationStatus !== 'verified' && (
                    <Button size="sm" variant={d ? 'secondary' : 'primary'} icon={<Upload />} loading={busy} disabled={!!progress} onClick={() => inputs.current[type]?.click()}>{t(d ? 'doc.replace' : 'doc.upload')}</Button>
                  )}
                  {d?.fileUrl && <a href={d.fileUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-pill px-3.5 text-sm font-medium text-ink hover:bg-ink/5 focus-visible:focus-ring"><Eye className="size-4" aria-hidden />{t('doc.view')}</a>}
                  {d && d.verificationStatus !== 'verified' && <Button size="sm" variant="ghost" className="text-danger" icon={<Trash2 />} onClick={() => setRemoving(d)}>{t('doc.delete')}</Button>}
                </div>
                <input ref={(el) => { inputs.current[type] = el; }} type="file" accept={ACCEPT} hidden onChange={(e) => { pick(type, e.target.files?.[0]); e.target.value = ''; }} />
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} tone="danger" loading={remove.isPending} title={t('doc.deleteTitle')} message={t('doc.deleteText', { type: (removing ?? lastRemoving.current) ? t(`doc.type.${(removing ?? lastRemoving.current)!.documentType}`) : '' })} confirmLabel={t('doc.delete')} cancelLabel={t('sub.keep')} onConfirm={() => remove.mutate(removing!._id)} />
    </div>
  );
}
