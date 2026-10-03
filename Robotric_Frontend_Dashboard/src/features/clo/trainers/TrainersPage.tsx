import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BarChart3, BookOpen, GraduationCap, Pencil, Plus, Power, UserCheck, UserX, Users, UsersRound } from 'lucide-react';
import { api } from '../../../lib/api';
import { readApiError } from '../../../app/apiError';
import { useToast } from '../../../components/ui/Toast';
import { Badge, Button, ConfirmDialog, DataTable, Dialog, EmptyState, Field, PageHeader, Panel, RowMenu, SearchInput, StatTile, TextArea, TextInput, type Column } from '../../../ui';

interface Trainer {
  _id: string;
  name: string;
  email: string;
  profile?: { status?: string; phone?: string; specialization?: string; bio?: string } | null;
  createdAt: string;
  stats: { totalGroups: number; activeGroups: number; totalStudents: number; coursesCount: number; avgAttendance: number };
}
interface Performance {
  performance: { period: number; totalGroups: number; activeGroups: number; totalStudents: number; coursesCount: number; overallAttendanceRate: number };
  groups: { _id: string; name: string; courseId: { title: string } | string | null; students: string[]; status: string }[];
  courses: { _id: string; title: string }[];
}
type Status = 'active' | 'inactive' | '';
const isActive = (x: Trainer) => x.profile?.status !== 'inactive';
const KEY = ['clo', 'trainers'] as const;

/** Add a trainer or change their details. The password is required only for a new account. */
function TrainerDialog({ open, onClose, trainer }: { open: boolean; onClose: () => void; trainer: Trainer | null }) {
  const { t } = useTranslation('dashboardCLO');
  const toast = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', specialization: '', bio: '' });
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setForm({ name: trainer?.name ?? '', email: trainer?.email ?? '', password: '', phone: trainer?.profile?.phone ?? '', specialization: trainer?.profile?.specialization ?? '', bio: trainer?.profile?.bio ?? '' });
    setError('');
  }, [open, trainer]);
  const save = useMutation({
    mutationFn: () => {
      const body = { name: form.name.trim(), email: form.email.trim(), ...(form.password ? { password: form.password } : {}), profile: { phone: form.phone.trim(), specialization: form.specialization.trim(), bio: form.bio.trim() } };
      return trainer ? api.put(`/clo/trainers/${trainer._id}`, body) : api.post('/clo/trainers', body);
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEY }); toast.success(t(trainer ? 'tr.toast.saved' : 'tr.toast.created')); onClose(); },
    onError: (e) => setError(readApiError(e).message),
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError(t('tr.errName'));
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError(t('tr.errEmail'));
    if ((!trainer || form.password) && form.password.length < 6) return setError(t('tr.errPassword'));
    setError('');
    save.mutate();
  };
  return (
    <Dialog open={open} onClose={onClose} title={t(trainer ? 'tr.editTitle' : 'tr.newTitle')} closeLabel={t('tr.cancel')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('tr.cancel')}</Button><Button type="submit" form="trainer-form" loading={save.isPending}>{t(trainer ? 'tr.save' : 'tr.create')}</Button></>}>
      <form id="trainer-form" onSubmit={submit} noValidate className="space-y-4">
        <Field label={t('tr.name')} required>{(c) => <TextInput {...c} value={form.name} onChange={set('name')} autoComplete="off" dir="auto" />}</Field>
        <Field label={t('tr.email')} required>{(c) => <TextInput {...c} type="email" value={form.email} onChange={set('email')} autoComplete="off" dir="ltr" />}</Field>
        <Field label={t('tr.password')} required={!trainer} hint={t(trainer ? 'tr.passwordKeep' : 'tr.passwordHint')}>{(c) => <TextInput {...c} type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('tr.phone')}>{(c) => <TextInput {...c} type="tel" value={form.phone} onChange={set('phone')} dir="ltr" />}</Field>
          <Field label={t('tr.specialization')}>{(c) => <TextInput {...c} value={form.specialization} onChange={set('specialization')} dir="auto" />}</Field>
        </div>
        <Field label={t('tr.bio')}>{(c) => <TextArea {...c} rows={3} value={form.bio} onChange={set('bio')} dir="auto" />}</Field>
        {error && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      </form>
    </Dialog>
  );
}

/** A trainer's groups, courses and attendance over the last month. */
function PerformanceDialog({ trainer, onClose }: { trainer: Trainer | null; onClose: () => void }) {
  const { t } = useTranslation('dashboardCLO');
  const last = useRef(trainer);
  if (trainer) last.current = trainer;
  const shown = trainer ?? last.current;
  const q = useQuery({ queryKey: [...KEY, shown?._id, 'performance'], queryFn: async () => (await api.get(`/clo/trainers/${shown!._id}/performance?period=30`)).data.data as Performance, enabled: !!trainer });
  const p = q.data?.performance;
  return (
    <Dialog open={!!trainer} onClose={onClose} size="lg" title={shown?.name ?? ''} description={shown?.email} closeLabel={t('tr.cancel')}>
      {q.isError ? <EmptyState icon={<BarChart3 />} title={readApiError(q.error).message} /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile icon={<UsersRound />} tint="bg-tint-straw" label={t('tr.activeGroups')} value={p?.activeGroups} loading={q.isLoading} />
            <StatTile icon={<Users />} tint="bg-tint-sand" label={t('tr.students')} value={p?.totalStudents} loading={q.isLoading} />
            <StatTile icon={<BookOpen />} tint="bg-tint-leaf" label={t('tr.courses')} value={p?.coursesCount} loading={q.isLoading} />
            <StatTile icon={<UserCheck />} tint="bg-tint-sage" label={t('tr.attendance30')} value={p ? `${Math.round(p.overallAttendanceRate)}%` : undefined} loading={q.isLoading} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-ink">{t('tr.groupsOf')}</p>
            {q.isLoading ? <div className="h-20 animate-pulse rounded-card bg-rail" /> : !q.data?.groups.length ? <p className="text-sm text-ink-4">{t('tr.noGroups')}</p> : (
              <ul className="divide-y divide-line rounded-card border border-line">
                {q.data.groups.map((g) => (
                  <li key={g._id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-ink" dir="auto">{g.name}</span><span className="block truncate text-xs text-ink-4" dir="auto">{g.courseId && typeof g.courseId === 'object' ? g.courseId.title : ''}</span></span>
                    <span className="text-xs text-ink-3">{t('tr.studentsCount', { count: g.students.length })}</span>
                    <Badge tone={g.status === 'active' ? 'success' : 'neutral'}>{t(`ov.status.${g.status}`, { defaultValue: g.status })}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}

/** The trainers of the centre: who teaches how much, and how their classes attend. */
export default function TrainersPage() {
  const { t } = useTranslation('dashboardCLO');
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: [...KEY, 'list'], queryFn: async () => ((await api.get('/clo/trainers')).data.data ?? []) as Trainer[] });
  const [view, setView] = useState<Status>('active');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<{ trainer: Trainer | null } | null>(null);
  const lastForm = useRef(form);
  if (form) lastForm.current = form;
  const [details, setDetails] = useState<Trainer | null>(null);
  const [toggling, setToggling] = useState<Trainer | null>(null);
  const lastToggle = useRef(toggling);
  if (toggling) lastToggle.current = toggling;
  const toggle = useMutation({
    mutationFn: (x: Trainer) => api.delete(`/clo/trainers/${x._id}`, { data: { action: isActive(x) ? 'deactivate' : 'activate' } }),
    onSuccess: (_r, x) => { void qc.invalidateQueries({ queryKey: KEY }); toast.success(t(isActive(x) ? 'tr.toast.deactivated' : 'tr.toast.activated')); },
    onError: (e) => toast.error(t('tr.actionError'), readApiError(e).message),
  });

  const all = q.data ?? [];
  const sq = search.trim().toLowerCase();
  const rows = all.filter((x) => !view || (view === 'active') === isActive(x)).filter((x) => !sq || `${x.name} ${x.email} ${x.profile?.specialization ?? ''}`.toLowerCase().includes(sq));
  const columns: Column<Trainer>[] = useMemo(
    () => [
      { key: 'name', header: t('tr.col.trainer'), cell: (x) => <button type="button" onClick={() => setDetails(x)} className="block max-w-xs rounded-md text-start focus-visible:focus-ring"><span className="block truncate font-medium text-ink underline-offset-2 hover:underline" dir="auto">{x.name}</span><span className="block truncate text-xs text-ink-4" dir="ltr">{x.email}</span></button> },
      { key: 'spec', header: t('tr.specialization'), hideOnMobile: true, cell: (x) => <span className="text-ink-2" dir="auto">{x.profile?.specialization || '—'}</span> },
      { key: 'groups', header: t('tr.col.groups'), align: 'end', cell: (x) => <span className="tabular-nums text-ink-2">{x.stats.activeGroups}<span className="text-ink-4"> / {x.stats.totalGroups}</span></span> },
      { key: 'students', header: t('tr.students'), align: 'end', hideOnMobile: true, cell: (x) => <span className="tabular-nums text-ink-2">{x.stats.totalStudents}</span> },
      { key: 'att', header: t('tr.col.attendance'), align: 'end', cell: (x) => <span className="tabular-nums text-ink-2" dir="ltr">{x.stats.totalGroups ? `${Math.round(x.stats.avgAttendance)}%` : '—'}</span> },
      { key: 'status', header: t('tr.col.status'), cell: (x) => <Badge tone={isActive(x) ? 'success' : 'neutral'}>{t(isActive(x) ? 'tr.active' : 'tr.inactive')}</Badge> },
      {
        key: 'menu', header: <span className="sr-only">{t('tr.col.actions')}</span>, align: 'end',
        cell: (x) => <RowMenu label={t('tr.actionsFor', { name: x.name })} actions={[
          { label: t('tr.performance'), icon: <BarChart3 />, onClick: () => setDetails(x) },
          { label: t('tr.edit'), icon: <Pencil />, onClick: () => setForm({ trainer: x }) },
          { label: t(isActive(x) ? 'tr.deactivate' : 'tr.activate'), icon: <Power />, tone: isActive(x) ? 'danger' : 'default', onClick: () => setToggling(x) },
        ]} />,
      },
    ],
    [t],
  );
  const tile = (v: Status) => ({ onClick: () => setView(v), active: view === v });
  const shownToggle = toggling ?? lastToggle.current;

  return (
    <div className="space-y-5">
      <PageHeader title={t('tr.title')} description={t('tr.subtitle')} actions={<Button icon={<Plus />} onClick={() => setForm({ trainer: null })}>{t('tr.new')}</Button>} />
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<UserCheck />} tint="bg-tint-leaf" label={t('tr.active')} value={all.filter(isActive).length} loading={q.isLoading} {...tile('active')} />
        <StatTile icon={<UserX />} tint="bg-tint-sand" label={t('tr.inactive')} value={all.filter((x) => !isActive(x)).length} loading={q.isLoading} {...tile('inactive')} />
        <StatTile icon={<GraduationCap />} tint="bg-tint-sage" label={t('tr.all')} value={all.length} loading={q.isLoading} {...tile('')} />
      </div>
      <Panel className="p-0 sm:p-0">
        <div className="border-b border-line p-4"><SearchInput value={search} onChange={setSearch} placeholder={t('tr.search')} /></div>
        {q.isError ? <EmptyState icon={<GraduationCap />} title={readApiError(q.error).message} action={<Button variant="secondary" onClick={() => void q.refetch()}>{t('tr.retry')}</Button>} /> : (
          <DataTable label={t('tr.title')} columns={columns} rows={rows} rowKey={(x) => x._id} loading={q.isLoading} empty={<EmptyState icon={<GraduationCap />} title={t('tr.none')} />} />
        )}
      </Panel>
      <TrainerDialog open={!!form} onClose={() => setForm(null)} trainer={(form ?? lastForm.current)?.trainer ?? null} />
      <PerformanceDialog trainer={details} onClose={() => setDetails(null)} />
      <ConfirmDialog
        open={!!toggling} onClose={() => setToggling(null)} tone={shownToggle && isActive(shownToggle) ? 'danger' : 'default'} loading={toggle.isPending}
        title={t(shownToggle && isActive(shownToggle) ? 'tr.deactivateTitle' : 'tr.activateTitle', { name: shownToggle?.name ?? '' })}
        message={t(shownToggle && isActive(shownToggle) ? 'tr.deactivateText' : 'tr.activateText')}
        confirmLabel={t(shownToggle && isActive(shownToggle) ? 'tr.deactivate' : 'tr.activate')} cancelLabel={t('tr.cancel')}
        onConfirm={() => toggle.mutate(toggling!, { onSettled: () => setToggling(null) })}
      />
    </div>
  );
}
