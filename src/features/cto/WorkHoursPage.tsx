import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Clock, Pencil, Timer, Trash2, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { useFormat } from '../../app/format';
import { readApiError } from '../../app/apiError';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';
import { Badge, Button, ConfirmDialog, DataTable, Dialog, EmptyState, Field, PageHeader, Panel, PanelTitle, RowMenu, SelectInput, StatTile, TextInput, type Column } from '../../ui';

interface StaffRow { _id: string; name: string; email: string; role: string; isHourly: boolean; workingSince: string | null }
interface Session { _id: string; user: { _id: string; name: string; role: string } | string; clockIn: string; clockOut: string | null; durationMinutes: number | null; autoClosed: boolean }
const pad = (n: number) => String(n).padStart(2, '0');
const local = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const day = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hours = (min: number) => Math.round((min / 60) * 10) / 10;

/** Hourly staff: who is paid by the hour, who is working now, and every clock-in to check or correct. */
export default function WorkHoursPage() {
  const { t } = useTranslation('dashboardCommon');
  const f = useFormat();
  const toast = useToast();
  const qc = useQueryClient();
  const [from, setFrom] = useState(() => day(new Date(Date.now() - 6 * 864e5)));
  const [to, setTo] = useState(() => day(new Date()));
  const [person, setPerson] = useState('');
  const staff = useQuery({ queryKey: ['cto', 'hours', 'staff'], queryFn: async () => ((await api.get('/cto/internal/work/staff')).data.data ?? []) as StaffRow[] });
  const sessions = useQuery({ queryKey: ['cto', 'hours', 'sessions', from, to, person], queryFn: async () => ((await api.get('/cto/internal/work/sessions', { params: { from, to, ...(person ? { userId: person } : {}) } })).data.data ?? []) as Session[], placeholderData: (p) => p });
  const refresh = () => void qc.invalidateQueries({ queryKey: ['cto', 'hours'] });
  const fail = (e: unknown) => toast.error(t('cto.error'), readApiError(e).message);
  const hourly = useMutation({ mutationFn: (u: StaffRow) => api.patch(`/cto/internal/work/staff/${u._id}/hourly`, { isHourly: !u.isHourly }), onSuccess: (_r, u) => { refresh(); toast.success(t(u.isHourly ? 'wh.toast.notHourly' : 'wh.toast.hourly', { name: u.name })); }, onError: fail });
  const [editing, setEditing] = useState<Session | null>(null);
  const lastEdit = useRef(editing);
  if (editing) lastEdit.current = editing;
  const [inAt, setInAt] = useState('');
  const [outAt, setOutAt] = useState('');
  const [error, setError] = useState('');
  const save = useMutation({ mutationFn: () => api.put(`/cto/internal/work/sessions/${editing!._id}`, { clockIn: new Date(inAt).toISOString(), clockOut: outAt ? new Date(outAt).toISOString() : null }), onSuccess: () => { refresh(); toast.success(t('wh.toast.saved')); setEditing(null); }, onError: (e) => setError(readApiError(e).message) });
  const [deleting, setDeleting] = useState<Session | null>(null);
  const remove = useMutation({ mutationFn: (s: Session) => api.delete(`/cto/internal/work/sessions/${s._id}`), onSuccess: () => { refresh(); toast.success(t('wh.toast.deleted')); }, onError: fail });

  const list = sessions.data ?? [];
  const minutesBy = useMemo(() => list.reduce((m, s) => { const id = typeof s.user === 'object' ? s.user._id : s.user; m.set(id, (m.get(id) ?? 0) + (s.durationMinutes ?? 0)); return m; }, new Map<string, number>()), [list]);
  const total = list.reduce((n, s) => n + (s.durationMinutes ?? 0), 0);
  const people = staff.data ?? [];
  const working = people.filter((u) => u.workingSince);
  const nameOf = (s: Session) => (typeof s.user === 'object' ? s.user.name : people.find((u) => u._id === s.user)?.name ?? '');

  const columns: Column<Session>[] = useMemo(
    () => [
      { key: 'who', header: t('wh.col.person'), cell: (s) => <span className="font-medium text-ink" dir="auto">{nameOf(s)}</span> },
      { key: 'day', header: t('wh.col.day'), cell: (s) => <span className="whitespace-nowrap tabular-nums text-ink-2">{f.custom(s.clockIn, { weekday: 'short', day: 'numeric', month: 'short' })}</span> },
      { key: 'time', header: t('wh.col.time'), cell: (s) => <span className="whitespace-nowrap tabular-nums text-ink-2"><bdi dir="ltr">{f.time(s.clockIn)} – {s.clockOut ? f.time(s.clockOut) : '…'}</bdi>{s.autoClosed && <Badge tone="warning" className="ms-2">{t('wh.auto')}</Badge>}</span> },
      { key: 'len', header: t('wh.col.length'), align: 'end', cell: (s) => <span className="tabular-nums text-ink">{s.durationMinutes != null ? t('wh.h', { n: hours(s.durationMinutes) }) : <Badge tone="success">{t('wh.now')}</Badge>}</span> },
      { key: 'menu', header: <span className="sr-only">{t('work.actions')}</span>, align: 'end', cell: (s) => <RowMenu label={t('work.actionsFor', { name: nameOf(s) })} actions={[
        { label: t('work.edit'), icon: <Pencil />, onClick: () => { setInAt(local(s.clockIn)); setOutAt(s.clockOut ? local(s.clockOut) : ''); setError(''); setEditing(s); } },
        { label: t('wh.delete'), icon: <Trash2 />, tone: 'danger', onClick: () => setDeleting(s) },
      ]} /> },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, f, people],
  );

  return (
    <div className="space-y-5">
      <PageHeader title={t('wh.title')} description={t('wh.subtitle')} />
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<Users />} tint="bg-tint-leaf" label={t('wh.hourly')} value={people.filter((u) => u.isHourly).length} loading={staff.isLoading} />
        <StatTile icon={<Timer />} tint="bg-tint-sage" label={t('wh.workingNow')} value={working.length} loading={staff.isLoading} />
        <StatTile icon={<Clock />} tint="bg-tint-straw" label={t('wh.inRange')} value={t('wh.h', { n: hours(total) })} loading={sessions.isLoading} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Panel>
          <PanelTitle title={t('wh.people')} />
          <p className="-mt-2 mb-3 text-xs text-ink-4">{t('wh.peopleHint')}</p>
          {staff.isLoading ? <div className="h-32 animate-pulse rounded-card bg-rail" /> : (
            <ul className="divide-y divide-line">
              {people.map((u) => (
                <li key={u._id} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate text-sm font-medium text-ink"><span dir="auto">{u.name}</span>{u.workingSince && <span className="size-2 shrink-0 rounded-full bg-success" title={t('wh.workingNow')} aria-hidden />}</span>
                    <span className="block text-xs text-ink-4">{u.isHourly ? t('wh.hoursIn', { n: hours(minutesBy.get(u._id) ?? 0) }) : t(`wh.role.${u.role}`, { defaultValue: u.role })}</span>
                  </span>
                  <button type="button" role="switch" aria-checked={u.isHourly} aria-label={t('wh.isHourly', { name: u.name })} disabled={hourly.isPending} onClick={() => hourly.mutate(u)}
                    className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:focus-ring', u.isHourly ? 'bg-success' : 'bg-line-strong')}>
                    <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-[inset-inline-start]', u.isHourly ? 'start-[22px]' : 'start-0.5')} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel className="min-w-0 p-0 sm:p-0">
          <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
            <Field label={t('wh.from')} className="w-40">{(c) => <TextInput {...c} type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-10" />}</Field>
            <Field label={t('wh.to')} className="w-40">{(c) => <TextInput {...c} type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="h-10" />}</Field>
            <Field label={t('wh.col.person')} className="w-48">{(c) => <SelectInput {...c} value={person} onChange={(e) => setPerson(e.target.value)} className="h-10"><option value="">{t('work.everyone')}</option>{people.filter((u) => u.isHourly).map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}</SelectInput>}</Field>
          </div>
          {sessions.isError ? <EmptyState icon={<Clock />} title={readApiError(sessions.error).message} /> : (
            <DataTable label={t('wh.sessions')} columns={columns} rows={list} rowKey={(s) => s._id} loading={sessions.isLoading} empty={<EmptyState icon={<Clock />} title={t('wh.none')} />} />
          )}
        </Panel>
      </div>
      <Dialog open={!!editing} onClose={() => setEditing(null)} title={t('wh.editTitle')} description={(editing ?? lastEdit.current) ? nameOf((editing ?? lastEdit.current)!) : undefined} closeLabel={t('cto.cancel')}
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>{t('cto.cancel')}</Button><Button loading={save.isPending} onClick={() => { if (outAt && outAt <= inAt) return setError(t('wh.errOrder')); setError(''); save.mutate(); }}>{t('work.save')}</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('wh.in')}>{(c) => <TextInput {...c} type="datetime-local" value={inAt} onChange={(e) => setInAt(e.target.value)} dir="ltr" />}</Field>
          <Field label={t('wh.out')} hint={t('wh.outHint')}>{(c) => <TextInput {...c} type="datetime-local" value={outAt} onChange={(e) => setOutAt(e.target.value)} dir="ltr" />}</Field>
        </div>
        {error && <p role="alert" className="mt-3 rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      </Dialog>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} tone="danger" title={t('wh.deleteTitle')} message={t('wh.deleteText')} confirmLabel={t('wh.delete')} cancelLabel={t('cto.cancel')} loading={remove.isPending}
        onConfirm={() => remove.mutate(deleting!, { onSettled: () => setDeleting(null) })} />
    </div>
  );
}
