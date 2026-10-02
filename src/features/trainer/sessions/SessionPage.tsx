import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Ban, CalendarClock, CheckSquare, ClipboardCheck, Clock, PackageOpen, Pencil, Star, Target, Trash2, UsersRound, Video } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { Badge, Button, ConfirmDialog, Dialog, EmptyState, Field, PageHeader, Panel, PanelTitle, TextArea } from '../../../ui';
import { SessionMaterials } from '../../clo/sessions/SessionMaterials';
import { useSessionMutations, useSessionRole, useTrainerSession } from './api';
import { SESSION_TONE } from './SessionsPage';

/** One class (trainer or CLO): the plan, attendance, evaluations, homework; edit, cancel or delete. The CLO also manages its PDFs. */
export default function SessionPage() {
  const { sessionId = '' } = useParams();
  const { t } = useTranslation('dashboardTrainer');
  const f = useFormat();
  const toast = useToast();
  const navigate = useNavigate();
  const r = useSessionRole();
  const q = useTrainerSession(sessionId);
  const m = useSessionMutations();
  // A class's status follows its times (the backend works it out from the clock), so there is no start/end button
  const [confirm, setConfirm] = useState<'delete' | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [reason, setReason] = useState('');
  const fail = (err: unknown) => toast.error(t('sp.actionError'), readApiError(err).message);
  const s = q.data;
  const back = { to: `${r.base}/sessions`, label: t('ses.title') };

  if (q.isError) return <div className="space-y-5"><PageHeader back={back} title={t('sp.one')} /><Panel><EmptyState icon={<AlertCircle />} title={readApiError(q.error).status === 404 ? t('sp.notFound') : t('ses.loadError')} /></Panel></div>;
  if (!s) return <div className="space-y-4"><div className="h-10 w-72 animate-pulse rounded-md bg-rail" /><div className="h-48 animate-pulse rounded-panel bg-rail" /></div>;

  const plan = s.lessonPlan ?? {};
  const run = () => {
    const done = () => setConfirm(null);
    if (confirm === 'delete') m.remove.mutate(s._id, { onSuccess: () => { toast.success(t('sp.toast.deleted')); navigate(back.to); }, onError: fail, onSettled: done });
  };
  const list = (items: string[] | undefined, icon: React.ReactNode, title: string) =>
    items?.length ? (
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink">{icon}{title}</p>
        <ul className="space-y-1.5">{items.map((x, i) => <li key={i} className="flex gap-2 text-sm text-ink-2" dir="auto"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-glow-deep" aria-hidden />{x}</li>)}</ul>
      </div>
    ) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        back={back}
        title={s.title}
        description={[t('sp.number', { n: s.sessionNumber }), s.groupId?.name, s.courseId?.title].filter(Boolean).join(' · ')}
        actions={<>
          <Badge tone={SESSION_TONE[s.status]}>{t(`ov.status.${s.status}`)}</Badge>
          {s.status !== 'cancelled' && <Link to={`${r.base}/sessions/${s._id}/edit`} className="inline-flex h-11 items-center gap-2 rounded-pill border border-ink px-5 text-sm font-medium text-ink hover:bg-ink hover:text-white focus-visible:focus-ring"><Pencil className="size-[18px]" aria-hidden />{t('sp.edit')}</Link>}
        </>}
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-card border border-line bg-paper px-5 py-4 text-sm">
        <span className="inline-flex items-center gap-2 text-ink"><CalendarClock className="size-4 text-ink-3" aria-hidden />{f.custom(s.scheduledDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        <span className="inline-flex items-center gap-2 text-ink"><Clock className="size-4 text-ink-3" aria-hidden /><bdi dir="ltr" className="tabular-nums">{s.startTime}–{s.endTime}</bdi></span>
        {s.groupId && <Link to={`${r.base}/groups/${s.groupId._id}`} className="inline-flex items-center gap-2 text-ink underline-offset-2 hover:underline"><UsersRound className="size-4 text-ink-3" aria-hidden />{s.groupId.name}</Link>}
        {s.video?.hasVideo && <span className="inline-flex items-center gap-2 text-ink-3"><Video className="size-4" aria-hidden />{t('sp.hasVideo')}</span>}
      </div>
      {s.status === 'cancelled' && s.cancellationReason && <p className="rounded-card bg-danger-soft px-4 py-3 text-sm text-danger">{t('sp.cancelledBecause', { reason: s.cancellationReason })}</p>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel>
          <PanelTitle title={t('sp.plan')} />
          {s.description && <p className="mb-5 whitespace-pre-line text-[15px] text-ink-2" dir="auto">{s.description}</p>}
          <div className="space-y-5">
            {list(plan.objectives, <Target className="size-4 text-ink-3" aria-hidden />, t('sf.objectives'))}
            {list(plan.materialsNeeded, <PackageOpen className="size-4 text-ink-3" aria-hidden />, t('sf.materials'))}
            {plan.notes && <div><p className="mb-1 text-sm font-medium text-ink">{t('sf.notes')}</p><p className="whitespace-pre-line text-sm text-ink-2" dir="auto">{plan.notes}</p></div>}
            {!s.description && !plan.objectives?.length && !plan.materialsNeeded?.length && !plan.notes && <p className="py-4 text-center text-sm text-ink-4">{t('sp.noPlan')}</p>}
          </div>
        </Panel>

        <div className="space-y-3">
          {s.status !== 'cancelled' && (
            <>
              <Link to={r.role === 'clo' ? `/clo/attendance${s.groupId ? `?group=${s.groupId._id}` : ''}` : `/trainer/attendance?session=${s._id}`} className="flex items-center gap-3 rounded-card border border-line bg-paper p-4 hover:border-ink focus-visible:focus-ring">
                <ClipboardCheck className="size-5 text-ink-3" aria-hidden /><span className="flex-1 font-medium text-ink">{r.role === 'clo' ? t('dashboardCLO:att.title') : t('sp.attendance')}</span>
              </Link>
              <Link to={r.role === 'clo' ? `/clo/evaluations?session=${s._id}` : `/trainer/session/${s._id}/evaluations`} className="flex items-center gap-3 rounded-card border border-line bg-paper p-4 hover:border-ink focus-visible:focus-ring">
                <Star className="size-5 text-ink-3" aria-hidden /><span className="flex-1 font-medium text-ink">{t('sp.evaluate')}</span>
              </Link>
              <Link to={`${r.base}/tasks/new?session=${s._id}${s.groupId ? `&group=${s.groupId._id}` : ''}`} className="flex items-center gap-3 rounded-card border border-line bg-paper p-4 hover:border-ink focus-visible:focus-ring">
                <CheckSquare className="size-5 text-ink-3" aria-hidden /><span className="flex-1 font-medium text-ink">{t('sp.homework')}</span>
              </Link>
            </>
          )}
          {r.role === 'clo' && s.groupId && <SessionMaterials sessionId={s._id} groupId={s.groupId._id} courseId={s.courseId?._id ?? ''} />}
          <div className="flex flex-wrap gap-2 pt-2">
            {s.status === 'scheduled' && <Button size="sm" variant="ghost" icon={<Ban />} onClick={() => { setReason(''); setCanceling(true); }}>{t('sp.cancel')}</Button>}
            <Button size="sm" variant="ghost" className="text-danger" icon={<Trash2 />} onClick={() => setConfirm('delete')}>{t('sp.delete')}</Button>
          </div>
        </div>
      </div>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} tone="danger" title={t('sp.deleteTitle')} message={t('sp.deleteText')} confirmLabel={t('sp.delete')} cancelLabel={t('sf.cancel')} loading={m.remove.isPending} onConfirm={run} />
      <Dialog open={canceling} onClose={() => setCanceling(false)} title={t('sp.cancelTitle')} description={t('sp.cancelText')} closeLabel={t('grp.close')}
        footer={<><Button variant="ghost" onClick={() => setCanceling(false)}>{t('sp.keep')}</Button><Button variant="danger" loading={m.cancel.isPending} onClick={() => m.cancel.mutate({ id: s._id, reason: reason.trim() }, { onSuccess: () => { toast.success(t('sp.toast.cancelled')); setCanceling(false); }, onError: fail })}>{t('sp.cancel')}</Button></>}>
        <Field label={t('sp.reason')}>{(c) => <TextArea {...c} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
      </Dialog>
    </div>
  );
}
