import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CalendarClock, CheckCheck, ChevronRight, ClipboardCheck, Save, StickyNote } from 'lucide-react';
import { api } from '../../../lib/api';
import { useToast } from '../../../components/ui/Toast';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { cn } from '../../../lib/utils';
import { Badge, Button, EmptyState, PageHeader, Panel, StatTile, TextInput } from '../../../ui';
import { useTrainerSession, useTrainerSessionList } from '../sessions/api';

type Status = 'present' | 'late' | 'absent';
const STATUSES: Status[] = ['present', 'late', 'absent'];
const ON: Record<Status, string> = { present: 'border-success bg-success text-white', late: 'border-warning bg-warning text-white', absent: 'border-danger bg-danger text-white' };
interface Row { status: Status | null; notes: string }

/** Choose which class (when none is given in the address). */
function Picker() {
  const { t } = useTranslation('dashboardTrainer');
  const f = useFormat();
  const list = useTrainerSessionList();
  const now = Date.now();
  const recent = (list.data ?? [])
    .filter((s) => s.status !== 'cancelled' && new Date(s.scheduledDate).getTime() < now + 864e5)
    .sort((a, b) => +new Date(b.scheduledDate) - +new Date(a.scheduledDate))
    .slice(0, 12);
  return (
    <div className="space-y-5">
      <PageHeader title={t('at.title')} description={t('at.pick')} />
      <Panel>
        {list.isLoading ? <div className="h-32 animate-pulse rounded-card bg-rail" /> : recent.length === 0 ? <EmptyState icon={<CalendarClock />} title={t('at.noClasses')} /> : (
          <ul className="space-y-2">
            {recent.map((s) => (
              <li key={s._id}>
                <Link to={`/trainer/attendance?session=${s._id}`} className="flex items-center gap-3 rounded-card border border-line p-3 hover:border-ink focus-visible:focus-ring">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-tint-sage text-xs font-semibold text-ink">{s.sessionNumber}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium text-ink" dir="auto">{s.title}</span><span className="block truncate text-xs text-ink-4" dir="auto">{s.groupId?.name} · {f.custom(s.scheduledDate, { weekday: 'short', day: 'numeric', month: 'short' })}</span></span>
                  <ChevronRight className="size-4 text-ink-4 rtl:rotate-180" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/** Take or correct the attendance of one class. */
export default function AttendancePage() {
  const [params] = useSearchParams();
  const sessionId = params.get('session') ?? '';
  const { t } = useTranslation('dashboardTrainer');
  const f = useFormat();
  const toast = useToast();
  const qc = useQueryClient();
  const session = useTrainerSession(sessionId);
  const groupId = session.data?.groupId?._id ?? '';
  const students = useQuery({ queryKey: ['trainer', 'group', groupId, 'students'], queryFn: async () => ((await api.get(`/trainer/groups/${groupId}/students`)).data.data ?? []) as { _id: string; name: string; email: string }[], enabled: !!groupId });
  const sheet = useQuery({
    queryKey: ['trainer', 'attendance', sessionId],
    queryFn: async () => {
      try {
        return (await api.get(`/trainer/attendance/session/${sessionId}`, { skipErrorToast: true } as object)).data.data as { records: { student: { _id: string }; status: Status; notes?: string | null }[] } | null;
      } catch (err) {
        if (readApiError(err).status === 404) return null;
        throw err;
      }
    },
    enabled: !!sessionId,
  });
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [dirty, setDirty] = useState(false);
  const [noteOpen, setNoteOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!students.data || sheet.isLoading) return;
    const next: Record<string, Row> = {};
    for (const s of students.data) {
      const r = sheet.data?.records.find((x) => x.student._id === s._id);
      next[s._id] = { status: r?.status ?? null, notes: r?.notes ?? '' };
    }
    setRows(next);
    setDirty(false);
  }, [students.data, sheet.data, sheet.isLoading]);

  const save = useMutation({
    mutationFn: () => api.post('/trainer/attendance', { sessionId, records: Object.entries(rows).filter(([, r]) => r.status).map(([student, r]) => ({ student, status: r.status, notes: r.notes.trim() || undefined })) }),
    onSuccess: () => { toast.success(t('at.saved')); setDirty(false); void qc.invalidateQueries({ queryKey: ['trainer'] }); },
    onError: (err) => toast.error(t('at.saveError'), readApiError(err).message),
  });

  const counts = useMemo(() => STATUSES.reduce((a, s) => ({ ...a, [s]: Object.values(rows).filter((r) => r.status === s).length }), {} as Record<Status, number>), [rows]);
  const unmarked = Object.values(rows).filter((r) => !r.status).length;
  const set = (id: string, patch: Partial<Row>) => { setRows((cur) => ({ ...cur, [id]: { ...cur[id], ...patch } })); setDirty(true); };

  if (!sessionId) return <Picker />;
  const s = session.data;
  if (session.isError) return <div className="space-y-5"><PageHeader back={{ to: '/trainer/sessions', label: t('ses.title') }} title={t('at.title')} /><Panel><EmptyState icon={<ClipboardCheck />} title={t('sp.notFound')} /></Panel></div>;

  return (
    <div className="space-y-5">
      <PageHeader
        back={{ to: s ? `/trainer/sessions/${s._id}` : '/trainer/sessions', label: s?.title ?? t('ses.title') }}
        title={t('at.title')}
        description={s ? `${s.title} · ${s.groupId?.name ?? ''} · ${f.custom(s.scheduledDate, { weekday: 'long', day: 'numeric', month: 'long' })}` : undefined}
        actions={<>
          {sheet.data && <Badge tone="info">{t('at.taken')}</Badge>}
          <Button variant="secondary" icon={<CheckCheck />} onClick={() => { setRows((cur) => Object.fromEntries(Object.entries(cur).map(([k, v]) => [k, { ...v, status: 'present' as Status }]))); setDirty(true); }} disabled={!students.data?.length}>{t('at.allPresent')}</Button>
          <Button icon={<Save />} loading={save.isPending} disabled={!Object.values(rows).some((r) => r.status)} onClick={() => save.mutate()}>{t('at.save')}</Button>
        </>}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={<ClipboardCheck />} tint="bg-tint-sage" label={t('at.present')} value={counts.present} />
        <StatTile icon={<CalendarClock />} tint="bg-tint-straw" label={t('at.late')} value={counts.late} />
        <StatTile icon={<ClipboardCheck />} tint="bg-tint-sand" label={t('at.absent')} value={counts.absent} />
        <StatTile icon={<StickyNote />} tint="bg-tint-leaf" label={t('at.unmarked')} value={unmarked} />
      </div>
      {dirty && <p role="status" className="rounded-card bg-warning-soft px-4 py-2.5 text-sm text-warning">{t('at.unsaved')}</p>}
      <Panel className="p-0 sm:p-0">
        {students.isLoading || sheet.isLoading || session.isLoading ? <div className="m-5 h-40 animate-pulse rounded-card bg-rail" /> : !students.data?.length ? <EmptyState icon={<ClipboardCheck />} title={t('grp.noStudents')} /> : (
          <ul className="divide-y divide-line">
            {students.data.map((st) => {
              const r = rows[st._id] ?? { status: null, notes: '' };
              return (
                <li key={st._id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="min-w-0 flex-1"><span className="block truncate font-medium text-ink" dir="auto">{st.name}</span><span className="block truncate text-xs text-ink-4" dir="ltr">{st.email}</span></span>
                    <div role="radiogroup" aria-label={t('at.statusFor', { name: st.name })} className="flex gap-1.5">
                      {STATUSES.map((x) => (
                        <button key={x} type="button" role="radio" aria-checked={r.status === x} onClick={() => set(st._id, { status: x })} className={cn('h-9 rounded-pill border px-3.5 text-sm font-medium transition-colors focus-visible:focus-ring', r.status === x ? ON[x] : 'border-line-strong text-ink-2 hover:border-ink')}>
                          {t(`at.${x}`)}
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => setNoteOpen(noteOpen === st._id ? null : st._id)} aria-expanded={noteOpen === st._id} aria-label={t('at.noteFor', { name: st.name })} className={cn('grid size-9 place-items-center rounded-full focus-visible:focus-ring', r.notes ? 'bg-tint-straw text-ink' : 'text-ink-4 hover:bg-ink/5')}>
                      <StickyNote className="size-4" />
                    </button>
                  </div>
                  {noteOpen === st._id && <TextInput className="mt-2 h-10" value={r.notes} onChange={(e) => set(st._id, { notes: e.target.value })} placeholder={t('at.notePlaceholder')} aria-label={t('at.noteFor', { name: st.name })} autoFocus />}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
