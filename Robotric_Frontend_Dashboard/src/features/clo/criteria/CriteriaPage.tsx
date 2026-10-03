import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BookOpen, ListChecks, Pause, Pencil, Play, Plus, Trash2, UsersRound } from 'lucide-react';
import { api } from '../../../lib/api';
import { readApiError } from '../../../app/apiError';
import { useToast } from '../../../components/ui/Toast';
import { Badge, Button, ConfirmDialog, EmptyState, PageHeader, Panel, RowMenu } from '../../../ui';
import { CriteriaDialog, type Criteria } from './CriteriaDialog';

/** What trainers rate when they evaluate a student, per course or per group. */
export default function CriteriaPage() {
  const { t } = useTranslation('dashboardCLO');
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['clo', 'criteria'], queryFn: async () => ((await api.get('/clo/evaluation-criteria')).data.data ?? []) as Criteria[] });
  const [form, setForm] = useState<{ criteria: Criteria | null } | null>(null);
  const lastForm = useRef(form);
  if (form) lastForm.current = form;
  const [deleting, setDeleting] = useState<Criteria | null>(null);
  const lastDel = useRef(deleting);
  if (deleting) lastDel.current = deleting;
  const refresh = () => void qc.invalidateQueries({ queryKey: ['clo', 'criteria'] });
  const fail = (e: unknown) => toast.error(t('tr.actionError'), readApiError(e).message);
  const status = useMutation({ mutationFn: (c: Criteria) => api.put(`/clo/evaluation-criteria/${c._id}`, { status: c.status === 'active' ? 'inactive' : 'active' }), onSuccess: (_r, c) => { refresh(); toast.success(t(c.status === 'active' ? 'cr.toast.paused' : 'cr.toast.resumed')); }, onError: fail });
  const remove = useMutation({ mutationFn: (c: Criteria) => api.delete(`/clo/evaluation-criteria/${c._id}`), onSuccess: () => { refresh(); toast.success(t('cr.toast.deleted')); }, onError: fail });
  const list = q.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title={t('cr.title')} description={t('cr.subtitle')} actions={<Button icon={<Plus />} onClick={() => setForm({ criteria: null })}>{t('cr.new')}</Button>} />
      {q.isError ? <Panel><EmptyState icon={<ListChecks />} title={readApiError(q.error).message} action={<Button variant="secondary" onClick={() => void q.refetch()}>{t('tr.retry')}</Button>} /></Panel>
        : q.isLoading ? <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-44 animate-pulse rounded-panel bg-rail" />)}</div>
        : list.length === 0 ? <Panel><EmptyState icon={<ListChecks />} title={t('cr.none')} description={t('cr.noneHint')} action={<Button icon={<Plus />} onClick={() => setForm({ criteria: null })}>{t('cr.new')}</Button>} /></Panel>
        : (
          <ul className="grid gap-4 md:grid-cols-2">
            {list.map((c) => (
              <li key={c._id}>
                <Panel className="h-full">
                  <div className="flex items-start gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-semibold text-ink" dir="auto">{c.name}</span>
                      {c.description && <span className="mt-0.5 line-clamp-2 block text-sm text-ink-3" dir="auto">{c.description}</span>}
                    </span>
                    <Badge tone={c.status === 'active' ? 'success' : 'neutral'}>{t(`cr.status.${c.status}`)}</Badge>
                    <RowMenu label={t('tr.actionsFor', { name: c.name })} actions={[
                      { label: t('tr.edit'), icon: <Pencil />, onClick: () => setForm({ criteria: c }) },
                      { label: t(c.status === 'active' ? 'cr.pause' : 'cr.resume'), icon: c.status === 'active' ? <Pause /> : <Play />, onClick: () => status.mutate(c) },
                      { label: t('cr.delete'), icon: <Trash2 />, tone: 'danger', onClick: () => setDeleting(c) },
                    ]} />
                  </div>
                  <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
                    {c.appliesTo === 'groups' ? <UsersRound className="size-3.5" aria-hidden /> : <BookOpen className="size-3.5" aria-hidden />}
                    {(c.appliesTo === 'groups' ? c.groupIds.map((g) => g.name) : c.courseIds.map((x) => x.title)).map((n) => <span key={n} className="rounded-pill bg-rail px-2 py-0.5 text-ink-2" dir="auto">{n}</span>)}
                  </p>
                  <ul className="mt-3 space-y-1">
                    {c.parameters.map((p) => (
                      <li key={p._id ?? p.name} className="flex items-center gap-2 text-sm">
                        <span className="min-w-0 flex-1 truncate text-ink" dir="auto">{p.name}</span>
                        <span className="text-xs text-ink-4">{t(`cr.type.${p.type}`)}</span>
                        {p.weight > 0 && <span className="w-10 text-end text-xs tabular-nums text-ink-3" dir="ltr">{p.weight}%</span>}
                      </li>
                    ))}
                    {c.includeOverallRating && <li className="text-xs text-ink-4">{t('cr.plusOverall')}</li>}
                  </ul>
                </Panel>
              </li>
            ))}
          </ul>
        )}
      <CriteriaDialog open={!!form} onClose={() => setForm(null)} criteria={(form ?? lastForm.current)?.criteria ?? null} />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} tone="danger" title={t('cr.deleteTitle', { name: (deleting ?? lastDel.current)?.name ?? '' })} message={t('cr.deleteText')} confirmLabel={t('cr.delete')} cancelLabel={t('tr.cancel')} loading={remove.isPending}
        onConfirm={() => remove.mutate(deleting!, { onSettled: () => setDeleting(null) })} />
    </div>
  );
}
