import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Pencil, Sparkles, Star, Trash2, UserCheck, Users } from 'lucide-react';
import { api } from '../../../lib/api';
import { useToast } from '../../../components/ui/Toast';
import { readApiError } from '../../../app/apiError';
import { Badge, Button, ConfirmDialog, EmptyState, PageHeader, Panel, PanelTitle, RowMenu, StatTile } from '../../../ui';
import { EvaluationDialog, type EvaluationDraft } from './EvaluationDialog';

interface Ev { _id: string; studentId: { _id: string; name: string; email: string } | string; overallRating: number; parameters?: Record<string, unknown>; trainerNotes?: { generalNotes?: string } | null; flags?: { needsAttention?: boolean; excelling?: boolean } }
interface Data { session: { _id: string; title: string; groupId: string }; evaluations: Ev[]; unevaluatedStudents: { _id: string; name: string; email: string }[]; stats: { totalStudents: number; evaluated: number; pending: number } }
const who = (e: Ev) => (typeof e.studentId === 'object' ? e.studentId : { _id: e.studentId, name: '', email: '' });

/** Evaluate every student of one class. */
export default function SessionEvaluationsPage() {
  const { sessionId = '' } = useParams();
  const { t } = useTranslation('dashboardTrainer');
  const toast = useToast();
  const qc = useQueryClient();
  const key = ['trainer', 'evaluations', sessionId];
  const q = useQuery({ queryKey: key, queryFn: async () => (await api.get(`/trainer/evaluations/session/${sessionId}`)).data.data as Data });
  const refresh = () => void qc.invalidateQueries({ queryKey: key });
  const [form, setForm] = useState<{ student: { _id: string; name: string }; ev?: Ev } | null>(null);
  const lastForm = useRef(form);
  if (form) lastForm.current = form;
  const [deleting, setDeleting] = useState<Ev | null>(null);
  const save = useMutation({ mutationFn: ({ id, body }: { id?: string; body: Record<string, unknown> }) => (id ? api.put(`/trainer/evaluations/${id}`, body) : api.post('/trainer/evaluations', body)), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/trainer/evaluations/${id}`), onSuccess: () => { refresh(); toast.success(t('evp.deleted')); }, onError: (err) => toast.error(t('sp.actionError'), readApiError(err).message) });
  const d = q.data;
  const shown = form ?? lastForm.current;

  const onSave = async (draft: EvaluationDraft) => {
    const body = { ...draft, ...(form?.ev ? {} : { studentId: form!.student._id, sessionId, groupId: d!.session.groupId }) };
    await save.mutateAsync({ id: form?.ev?._id, body });
    toast.success(t('evp.saved'));
    setForm(null);
  };

  return (
    <div className="space-y-5">
      <PageHeader back={{ to: `/trainer/sessions/${sessionId}`, label: d?.session.title ?? t('ses.title') }} title={t('evp.title')} description={d?.session.title} />
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<Users />} tint="bg-tint-leaf" label={t('ov.students')} value={d?.stats.totalStudents} loading={q.isLoading} />
        <StatTile icon={<UserCheck />} tint="bg-tint-sage" label={t('evp.done')} value={d?.stats.evaluated} loading={q.isLoading} />
        <StatTile icon={<Star />} tint="bg-tint-straw" label={t('evp.left')} value={d?.stats.pending} loading={q.isLoading} />
      </div>
      {q.isError ? <Panel><EmptyState icon={<Star />} title={readApiError(q.error).message} /></Panel> : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel>
            <PanelTitle title={t('evp.toDo')} />
            {q.isLoading ? <div className="h-24 animate-pulse rounded-card bg-rail" /> : !d?.unevaluatedStudents.length ? <p className="py-4 text-center text-sm text-ink-4">{t('evp.allDone')}</p> : (
              <ul className="space-y-2">
                {d.unevaluatedStudents.map((s) => (
                  <li key={s._id} className="flex items-center gap-3 rounded-card border border-line p-3">
                    <span className="min-w-0 flex-1"><span className="block truncate font-medium text-ink" dir="auto">{s.name}</span><span className="block truncate text-xs text-ink-4" dir="ltr">{s.email}</span></span>
                    <Button size="sm" icon={<Star />} onClick={() => setForm({ student: s })}>{t('evp.evaluate')}</Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel>
            <PanelTitle title={t('evp.evaluated')} />
            {q.isLoading ? <div className="h-24 animate-pulse rounded-card bg-rail" /> : !d?.evaluations.length ? <p className="py-4 text-center text-sm text-ink-4">{t('evp.none')}</p> : (
              <ul className="space-y-2">
                {d.evaluations.map((e) => {
                  const s = who(e);
                  return (
                    <li key={e._id} className="rounded-card border border-line p-3">
                      <div className="flex items-center gap-3">
                        <span className="min-w-0 flex-1 truncate font-medium text-ink" dir="auto">{s.name}</span>
                        <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-ink"><Star className="size-4 fill-glow text-glow" aria-hidden />{e.overallRating} / 5</span>
                        <RowMenu label={t('evp.actionsFor', { name: s.name })} actions={[{ label: t('sp.edit'), icon: <Pencil />, onClick: () => setForm({ student: s, ev: e }) }, { label: t('evp.delete'), icon: <Trash2 />, tone: 'danger', onClick: () => setDeleting(e) }]} />
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {e.flags?.excelling && <Badge tone="success" icon={<Sparkles />}>{t('evd.flag.excelling')}</Badge>}
                        {e.flags?.needsAttention && <Badge tone="warning" icon={<AlertTriangle />}>{t('evd.flag.needsAttention')}</Badge>}
                      </div>
                      {e.trainerNotes?.generalNotes && <p className="mt-1.5 line-clamp-2 text-xs text-ink-3" dir="auto">{e.trainerNotes.generalNotes}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      )}
      <EvaluationDialog
        open={!!form}
        onClose={() => setForm(null)}
        student={shown?.student ?? null}
        groupId={d?.session.groupId ?? ''}
        initial={shown?.ev ? { overallRating: shown.ev.overallRating, parameters: shown.ev.parameters ?? {}, trainerNotes: shown.ev.trainerNotes?.generalNotes ?? '', flags: { needsAttention: !!shown.ev.flags?.needsAttention, excelling: !!shown.ev.flags?.excelling } } : null}
        saving={save.isPending}
        onSave={onSave}
      />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} tone="danger" title={t('evp.deleteTitle')} message={t('evp.deleteText', { name: deleting ? who(deleting).name : '' })} confirmLabel={t('evp.delete')} cancelLabel={t('sf.cancel')} loading={remove.isPending} onConfirm={() => remove.mutate(deleting!._id, { onSettled: () => setDeleting(null) })} />
    </div>
  );
}
