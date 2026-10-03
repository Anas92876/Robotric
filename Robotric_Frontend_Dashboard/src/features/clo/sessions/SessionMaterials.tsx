import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Eye, FileText, Plus, X } from 'lucide-react';
import { api } from '../../../lib/api';
import { readApiError } from '../../../app/apiError';
import { useToast } from '../../../components/ui/Toast';
import { PDFViewer } from '../../../components/ui/PDFViewer';
import { Button, ConfirmDialog, Dialog, EmptyState, Panel, PanelTitle } from '../../../ui';

interface Resource { _id: string; title: string; originalName: string; fileSize: number; assignments: { details: { groupId: string; sessions: { sessionId: string }[] }[] } }
const mb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** The PDFs given to one class (CLO only): open, add from the course's library, remove. */
export function SessionMaterials({ sessionId, groupId, courseId }: { sessionId: string; groupId: string; courseId: string }) {
  const { t } = useTranslation('dashboardCLO');
  const toast = useToast();
  const qc = useQueryClient();
  const key = ['clo', 'resources', 'course', courseId];
  const q = useQuery({ queryKey: key, queryFn: async () => ((await api.get('/clo/resources', { params: { courseId } })).data.data ?? []) as Resource[], enabled: !!courseId });
  const inClass = (r: Resource) => r.assignments?.details?.some((d) => d.sessions.some((s) => s.sessionId === sessionId));
  const mine = (q.data ?? []).filter(inClass);
  const others = (q.data ?? []).filter((r) => !inClass(r));
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [removing, setRemoving] = useState<Resource | null>(null);
  const [pdf, setPdf] = useState<Resource | null>(null);
  const refresh = () => void qc.invalidateQueries({ queryKey: ['clo', 'resources'] });
  const fail = (e: unknown) => toast.error(t('tr.actionError'), readApiError(e).message);

  const add = useMutation({
    mutationFn: () => Promise.all(picked.map((id) => api.post(`/clo/resources/${id}/assign`, { assignments: [{ groupId, sessionIds: [sessionId] }] }))),
    onSuccess: () => { refresh(); toast.success(t('mat.toast.added', { count: picked.length })); setPicking(false); },
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: async (r: Resource) => {
      const groups = (await api.get(`/clo/resources/${r._id}/assignments`)).data.data.assignments as { sessions: { assignmentId: string; sessionId: string }[] }[];
      const ids = groups.flatMap((g) => g.sessions).filter((s) => s.sessionId === sessionId).map((s) => s.assignmentId);
      await Promise.all(ids.map((a) => api.delete(`/clo/resources/${r._id}/assignments/${a}`)));
    },
    onSuccess: () => { refresh(); toast.success(t('mat.toast.removed')); },
    onError: fail,
  });

  return (
    <Panel>
      <PanelTitle title={t('mat.title')} actions={<Button size="sm" variant="secondary" icon={<Plus />} disabled={!courseId} onClick={() => { setPicked([]); setPicking(true); }}>{t('mat.add')}</Button>} />
      {q.isLoading ? <div className="h-16 animate-pulse rounded-card bg-rail" /> : mine.length === 0 ? <p className="py-3 text-center text-sm text-ink-4">{t('mat.none')}</p> : (
        <ul className="space-y-2">
          {mine.map((r) => (
            <li key={r._id} className="flex items-center gap-2 rounded-card border border-line p-2.5">
              <FileText className="size-5 shrink-0 text-ink-3" aria-hidden />
              <button type="button" onClick={() => setPdf(r)} className="min-w-0 flex-1 rounded-md text-start focus-visible:focus-ring"><span className="block truncate text-sm font-medium text-ink hover:underline" dir="auto">{r.title}</span><span className="block text-xs text-ink-4" dir="ltr">{mb(r.fileSize)}</span></button>
              <Button size="sm" variant="ghost" iconOnly icon={<Eye />} aria-label={t('mat.open', { name: r.title })} onClick={() => setPdf(r)} />
              <Button size="sm" variant="ghost" iconOnly icon={<X />} aria-label={t('mat.remove', { name: r.title })} onClick={() => setRemoving(r)} />
            </li>
          ))}
        </ul>
      )}

      <Dialog open={picking} onClose={() => setPicking(false)} title={t('mat.pickTitle')} description={t('mat.pickText')} closeLabel={t('tr.cancel')}
        footer={<><Button variant="ghost" onClick={() => setPicking(false)}>{t('tr.cancel')}</Button><Button disabled={!picked.length} loading={add.isPending} onClick={() => add.mutate()}>{t('mat.addN', { count: picked.length })}</Button></>}>
        {others.length === 0 ? <EmptyState icon={<FileText />} title={t('mat.noneLeft')} description={t('mat.noneLeftHint')} /> : (
          <ul className="max-h-80 space-y-1.5 overflow-y-auto">
            {others.map((r) => (
              <li key={r._id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-card border border-line p-2.5 hover:border-ink has-[:focus-visible]:focus-ring">
                  <input type="checkbox" checked={picked.includes(r._id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, r._id] : p.filter((x) => x !== r._id)))} className="size-4 accent-[#0f1f33]" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-ink" dir="auto">{r.title}</span><span className="block truncate text-xs text-ink-4" dir="auto">{r.originalName}</span></span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} tone="danger" title={t('mat.removeTitle')} message={t('mat.removeText', { name: removing?.title ?? '' })} confirmLabel={t('mat.removeShort')} cancelLabel={t('tr.cancel')} loading={remove.isPending}
        onConfirm={() => remove.mutate(removing!, { onSettled: () => setRemoving(null) })} />
      <PDFViewer resourceId={pdf?._id ?? null} title={pdf?.title} isOpen={!!pdf} onClose={() => setPdf(null)} />
    </Panel>
  );
}
