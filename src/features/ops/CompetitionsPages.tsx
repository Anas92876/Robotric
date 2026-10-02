import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarRange, Pencil, Plus, Trash2, Trophy, Users, X } from 'lucide-react';
import { useFormat } from '../../app/format';
import { readApiError } from '../../app/apiError';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../providers/AuthProvider';
import { Badge, Button, ConfirmDialog, DataTable, Dialog, EmptyState, Field, PageHeader, Panel, RowMenu, SelectInput, TextArea, TextInput, type Column } from '../../ui';
import { useCompetitions, useCrud, useTeams, type Competition, type Team } from './api';

const day = (iso?: string) => (iso ? iso.slice(0, 10) : '');
const stateOf = (c: Competition) => { const now = Date.now(); return new Date(c.endDate).getTime() < now ? 'past' : new Date(c.startDate).getTime() > now ? 'soon' : 'live'; };

/** Competitions the centre runs or joins, with their teams. */
export default function CompetitionsPage() {
  const { t } = useTranslation('dashboardCommon');
  const f = useFormat();
  const toast = useToast();
  const { user } = useAuth();
  const canEdit = ['admin', 'superadmin', 'organizer'].includes(user?.role ?? '');
  const comps = useCompetitions();
  const teams = useTeams();
  const { save, remove } = useCrud<Record<string, unknown>>('/competitions');
  const [form, setForm] = useState<{ c: Competition | null } | null>(null);
  const lastForm = useRef(form);
  if (form) lastForm.current = form;
  const [d, setD] = useState({ title: '', startDate: '', endDate: '', maxTeams: '0', description: '' });
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<Competition | null>(null);
  useEffect(() => { if (form) { const c = form.c; setD({ title: c?.title ?? '', startDate: day(c?.startDate), endDate: day(c?.endDate), maxTeams: String(c?.maxTeams ?? 0), description: c?.description ?? '' }); setError(''); } }, [form]);
  const set = (k: keyof typeof d) => (e: { target: { value: string } }) => setD((x) => ({ ...x, [k]: e.target.value }));
  const submit = () => {
    if (!d.title.trim()) return setError(t('cmp.errTitle'));
    if (!d.startDate || !d.endDate) return setError(t('cmp.errDates'));
    if (d.endDate < d.startDate) return setError(t('cmp.errOrder'));
    setError('');
    save.mutate({ id: form?.c?._id, d: { title: d.title.trim(), startDate: d.startDate, endDate: d.endDate, maxTeams: Number(d.maxTeams) || 0, description: d.description.trim() } }, { onSuccess: () => { toast.success(t(form?.c ? 'cmp.toast.saved' : 'cmp.toast.created')); setForm(null); }, onError: (e) => setError(readApiError(e).message) });
  };
  const list = [...(comps.data ?? [])].sort((a, b) => b.startDate.localeCompare(a.startDate));
  const teamCount = (id: string) => (teams.data ?? []).filter((x) => x.competitionId === id).length;
  return (
    <div className="space-y-5">
      <PageHeader title={t('cmp.title')} description={t('cmp.subtitle')} actions={canEdit ? <Button icon={<Plus />} onClick={() => setForm({ c: null })}>{t('cmp.new')}</Button> : undefined} />
      {comps.isError ? <Panel><EmptyState icon={<Trophy />} title={readApiError(comps.error).message} /></Panel> : comps.isLoading ? <div className="h-40 animate-pulse rounded-panel bg-rail" /> : list.length === 0 ? <Panel><EmptyState icon={<Trophy />} title={t('cmp.none')} /></Panel> : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => {
            const s = stateOf(c);
            return (
              <li key={c._id}>
                <Panel className="flex h-full flex-col">
                  <div className="flex items-start gap-2">
                    <span className="min-w-0 flex-1 font-semibold text-ink" dir="auto">{c.title}</span>
                    <Badge tone={s === 'live' ? 'success' : s === 'soon' ? 'info' : 'neutral'}>{t(`cmp.state.${s}`)}</Badge>
                    {canEdit && <RowMenu label={t('work.actionsFor', { name: c.title })} actions={[{ label: t('work.edit'), icon: <Pencil />, onClick: () => setForm({ c }) }, { label: t('cmp.delete'), icon: <Trash2 />, tone: 'danger', onClick: () => setDeleting(c) }]} />}
                  </div>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-ink-4"><CalendarRange className="size-3.5" aria-hidden />{f.date(c.startDate)} – {f.date(c.endDate)}</p>
                  {c.description && <p className="mt-2 line-clamp-3 text-sm text-ink-3" dir="auto">{c.description}</p>}
                  <Link to={`/teams?competition=${c._id}`} className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-medium text-ink underline-offset-2 hover:underline">
                    <Users className="size-4" aria-hidden />{c.maxTeams ? t('cmp.teamsOf', { n: teamCount(c._id), max: c.maxTeams }) : t('cmp.teamsN', { count: teamCount(c._id) })}
                  </Link>
                </Panel>
              </li>
            );
          })}
        </ul>
      )}
      <Dialog open={!!form} onClose={() => setForm(null)} title={t((form ?? lastForm.current)?.c ? 'cmp.editTitle' : 'cmp.newTitle')} closeLabel={t('cto.cancel')}
        footer={<><Button variant="ghost" onClick={() => setForm(null)}>{t('cto.cancel')}</Button><Button loading={save.isPending} onClick={submit}>{t('work.save')}</Button></>}>
        <div className="space-y-4">
          <Field label={t('cmp.name')} required>{(c) => <TextInput {...c} value={d.title} onChange={set('title')} dir="auto" />}</Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t('cmp.start')} required>{(c) => <TextInput {...c} type="date" value={d.startDate} onChange={set('startDate')} />}</Field>
            <Field label={t('cmp.end')} required>{(c) => <TextInput {...c} type="date" value={d.endDate} onChange={set('endDate')} />}</Field>
            <Field label={t('cmp.max')} hint={t('cmp.maxHint')}>{(c) => <TextInput {...c} type="number" min={0} value={d.maxTeams} onChange={set('maxTeams')} />}</Field>
          </div>
          <Field label={t('work.description')}>{(c) => <TextArea {...c} rows={3} value={d.description} onChange={set('description')} dir="auto" />}</Field>
          {error && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        </div>
      </Dialog>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} tone="danger" title={t('cmp.deleteTitle', { name: deleting?.title ?? '' })} message={t('cmp.deleteText')} confirmLabel={t('cmp.delete')} cancelLabel={t('cto.cancel')} loading={remove.isPending}
        onConfirm={() => remove.mutate(deleting!._id, { onSuccess: () => toast.success(t('cmp.toast.deleted')), onError: (e) => toast.error(t('cto.error'), readApiError(e).message), onSettled: () => setDeleting(null) })} />
    </div>
  );
}

/** Teams entered in competitions, with their members. */
export function TeamsPage() {
  const { t } = useTranslation('dashboardCommon');
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const comp = params.get('competition') ?? '';
  const comps = useCompetitions();
  const teams = useTeams();
  const { save, remove } = useCrud<Record<string, unknown>>('/teams');
  const [form, setForm] = useState<{ x: Team | null } | null>(null);
  const lastForm = useRef(form);
  if (form) lastForm.current = form;
  const [name, setName] = useState('');
  const [competition, setCompetition] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<Team | null>(null);
  useEffect(() => { if (form) { setName(form.x?.name ?? ''); setCompetition(form.x?.competitionId ?? comp); setMembers(form.x?.members ?? []); setDraft(''); setError(''); } }, [form, comp]);
  const compName = useMemo(() => new Map((comps.data ?? []).map((c) => [c._id, c.title])), [comps.data]);
  const rows = (teams.data ?? []).filter((x) => !comp || x.competitionId === comp).sort((a, b) => a.name.localeCompare(b.name));
  const addMember = () => { const v = draft.trim(); if (v && !members.includes(v)) setMembers((m) => [...m, v]); setDraft(''); };
  const submit = () => {
    if (!name.trim()) return setError(t('team.errName'));
    if (!form?.x && !competition) return setError(t('team.errComp'));
    setError('');
    const all = draft.trim() && !members.includes(draft.trim()) ? [...members, draft.trim()] : members;
    save.mutate({ id: form?.x?._id, d: form?.x ? { name: name.trim(), members: all } : { name: name.trim(), competitionId: competition, members: all } }, { onSuccess: () => { toast.success(t(form?.x ? 'team.toast.saved' : 'team.toast.created')); setForm(null); }, onError: (e) => setError(readApiError(e).message) });
  };
  const columns: Column<Team>[] = [
    { key: 'n', header: t('team.name'), cell: (x) => <span className="font-medium text-ink" dir="auto">{x.name}</span> },
    { key: 'c', header: t('cmp.one'), cell: (x) => <span className="text-ink-2" dir="auto">{compName.get(x.competitionId) ?? '—'}</span> },
    { key: 'm', header: t('team.members'), cell: (x) => <span className="block max-w-md truncate text-sm text-ink-3" dir="auto">{x.members.join(' · ') || '—'}</span> },
    { key: 'menu', header: <span className="sr-only">{t('work.actions')}</span>, align: 'end', cell: (x) => <RowMenu label={t('work.actionsFor', { name: x.name })} actions={[{ label: t('work.edit'), icon: <Pencil />, onClick: () => setForm({ x }) }, { label: t('team.delete'), icon: <Trash2 />, tone: 'danger', onClick: () => setDeleting(x) }]} /> },
  ];
  return (
    <div className="space-y-5">
      <PageHeader title={t('team.title')} description={t('team.subtitle')} actions={<Button icon={<Plus />} onClick={() => setForm({ x: null })}>{t('team.new')}</Button>} />
      <Panel className="p-0 sm:p-0">
        <div className="border-b border-line p-4">
          <SelectInput aria-label={t('cmp.one')} value={comp} onChange={(e) => setParams(e.target.value ? { competition: e.target.value } : {})} className="w-auto min-w-56"><option value="">{t('team.allComps')}</option>{(comps.data ?? []).map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}</SelectInput>
        </div>
        {teams.isError ? <EmptyState icon={<Users />} title={readApiError(teams.error).message} /> : <DataTable label={t('team.title')} columns={columns} rows={rows} rowKey={(x) => x._id} loading={teams.isLoading} empty={<EmptyState icon={<Users />} title={t('team.none')} />} />}
      </Panel>
      <Dialog open={!!form} onClose={() => setForm(null)} title={t((form ?? lastForm.current)?.x ? 'team.editTitle' : 'team.newTitle')} closeLabel={t('cto.cancel')}
        footer={<><Button variant="ghost" onClick={() => setForm(null)}>{t('cto.cancel')}</Button><Button loading={save.isPending} onClick={submit}>{t('work.save')}</Button></>}>
        <div className="space-y-4">
          <Field label={t('team.name')} required>{(c) => <TextInput {...c} value={name} onChange={(e) => setName(e.target.value)} dir="auto" />}</Field>
          {!form?.x && <Field label={t('cmp.one')} required>{(c) => <SelectInput {...c} value={competition} onChange={(e) => setCompetition(e.target.value)}><option value="">{t('team.pickComp')}</option>{(comps.data ?? []).map((x) => <option key={x._id} value={x._id}>{x.title}</option>)}</SelectInput>}</Field>}
          <Field label={t('team.members')} hint={t('team.membersHint')}>
            {(c) => (
              <div>
                <div className="flex gap-2"><TextInput {...c} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMember(); } }} className="h-10" dir="auto" /><Button size="sm" variant="secondary" icon={<Plus />} onClick={addMember} className="h-10 shrink-0">{t('work.add')}</Button></div>
                {members.length > 0 && <ul className="mt-2 flex flex-wrap gap-1.5">{members.map((m) => <li key={m} className="inline-flex items-center gap-1 rounded-pill bg-rail py-1 ps-3 pe-1 text-sm text-ink"><span dir="auto">{m}</span><button type="button" aria-label={t('team.remove', { name: m })} onClick={() => setMembers((l) => l.filter((x) => x !== m))} className="grid size-6 place-items-center rounded-full text-ink-3 hover:bg-ink/10 focus-visible:focus-ring"><X className="size-3.5" /></button></li>)}</ul>}
              </div>
            )}
          </Field>
          {error && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        </div>
      </Dialog>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} tone="danger" title={t('team.deleteTitle', { name: deleting?.name ?? '' })} message={t('team.deleteText')} confirmLabel={t('team.delete')} cancelLabel={t('cto.cancel')} loading={remove.isPending}
        onConfirm={() => remove.mutate(deleting!._id, { onSuccess: () => toast.success(t('team.toast.deleted')), onError: (e) => toast.error(t('cto.error'), readApiError(e).message), onSettled: () => setDeleting(null) })} />
    </div>
  );
}
