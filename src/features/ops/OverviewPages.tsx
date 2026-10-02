import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BookOpen, Boxes, ChevronRight, Cpu, FileText, Inbox, Settings, Smartphone, Trophy, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { readApiError } from '../../app/apiError';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../providers/AuthProvider';
import { Button, Field, PageHeader, Panel, PanelTitle, TextArea, TextInput, WelcomeBanner } from '../../ui';

const quiet = { skipErrorToast: true } as object;

function Dept({ icon, title, to, rows, loading }: { icon: ReactNode; title: string; to: string; rows: { label: string; value: ReactNode }[]; loading: boolean }) {
  return (
    <Panel className="flex flex-col">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-full bg-tint-sage text-ink [&_svg]:size-4">{icon}</span>
        <h2 className="flex-1 text-base font-semibold text-ink">{title}</h2>
      </div>
      {loading ? <div className="h-24 animate-pulse rounded-card bg-rail" /> : (
        <dl className="flex-1 space-y-2 text-sm">
          {rows.map((r) => <div key={r.label} className="flex justify-between gap-3"><dt className="text-ink-3">{r.label}</dt><dd className="font-semibold tabular-nums text-ink">{r.value ?? '—'}</dd></div>)}
        </dl>
      )}
      <Link to={to} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-ink underline-offset-2 hover:underline">{title}<ChevronRight className="size-4 rtl:rotate-180" aria-hidden /></Link>
    </Panel>
  );
}

/** Home for admins (every department at a glance) and for judges and editors (their own work). */
export default function OverviewPage() {
  const { t } = useTranslation('dashboardCommon');
  const { user } = useAuth();
  const role = user?.role ?? '';
  const admin = role === 'admin' || role === 'superadmin';
  const clo = useQuery({ queryKey: ['clo', 'overview'], queryFn: async () => (await api.get('/clo/dashboard', quiet)).data.data as { stats: { courses: { published: number }; groups: { active: number }; students: { total: number }; trainers: { active: number }; performance: { attendanceRate: number } } }, enabled: admin });
  const rec = useQuery({ queryKey: ['reception', 'overview', 'stats'], queryFn: async () => (await api.get('/reception/dashboard', quiet)).data.data as { totalEnrollments: number; recentEnrollments: number }, enabled: admin });
  const cto = useQuery({ queryKey: ['cto', 'analytics'], queryFn: async () => (await api.get('/cto/internal/analytics', quiet)).data.data as { summary: { todo: number; in_progress: number; overdueCount: number; totalProjects: number } }, enabled: admin });
  const orders = useQuery({ queryKey: ['ops', 'orders'], queryFn: async () => ((await api.get('/orders', quiet)).data ?? []) as { status: string }[], enabled: admin });
  const stock = useQuery({ queryKey: ['ops', 'stock', 'stats'], queryFn: async () => (await api.get('/stock/stats', quiet)).data as { lowStock: number; outOfStock: number }, enabled: admin });
  const s = clo.data?.stats;
  const c = cto.data?.summary;

  return (
    <div className="space-y-5">
      <WelcomeBanner greeting={t('ovw.hello')} name={user?.name ?? ''} note={t(admin ? 'ovw.noteAdmin' : role === 'judge' ? 'ovw.noteJudge' : 'ovw.note')} />
      {admin ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Dept icon={<BookOpen />} title={t('ovw.learning')} to="/clo" loading={clo.isLoading} rows={[{ label: t('ovw.students'), value: s?.students.total }, { label: t('ovw.groups'), value: s?.groups.active }, { label: t('ovw.courses'), value: s?.courses.published }, { label: t('ovw.attendance'), value: s ? <span dir="ltr">{Math.round(s.performance.attendanceRate)}%</span> : undefined }]} />
          <Dept icon={<Users />} title={t('ovw.reception')} to="/reception" loading={rec.isLoading} rows={[{ label: t('ovw.enrollments'), value: rec.data?.totalEnrollments }, { label: t('ovw.newWeek'), value: rec.data?.recentEnrollments }, { label: t('ovw.trainers'), value: s?.trainers.active }]} />
          <Dept icon={<Cpu />} title={t('ovw.technical')} to="/cto-internal/dashboard" loading={cto.isLoading} rows={[{ label: t('ovw.projects'), value: c?.totalProjects }, { label: t('ovw.openTasks'), value: c ? c.todo + c.in_progress : undefined }, { label: t('ovw.late'), value: c?.overdueCount }]} />
          <Dept icon={<Boxes />} title={t('ovw.operations')} to="/inventory" loading={orders.isLoading || stock.isLoading} rows={[{ label: t('ovw.pendingOrders'), value: orders.data?.filter((o) => o.status === 'pending').length }, { label: t('ovw.lowStock'), value: stock.data?.lowStock }, { label: t('ovw.outStock'), value: stock.data?.outOfStock }]} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {role === 'judge' && <QuickLink to="/competitions" icon={<Trophy />} title={t('cmp.title')} text={t('ovw.judgeLink')} />}
          {role !== 'judge' && <QuickLink to="/posts" icon={<FileText />} title={t('ovw.posts')} text={t('ovw.postsLink')} />}
          {role !== 'judge' && <QuickLink to="/my-tasks" icon={<Inbox />} title={t('ovw.tasks')} text={t('ovw.tasksLink')} />}
        </div>
      )}
    </div>
  );
}

function QuickLink({ to, icon, title, text }: { to: string; icon: ReactNode; title: string; text: string }) {
  return (
    <Link to={to} className="flex items-center gap-4 rounded-panel border border-line bg-paper p-5 hover:border-ink focus-visible:focus-ring">
      <span className="grid size-11 place-items-center rounded-full bg-tint-leaf text-ink [&_svg]:size-5">{icon}</span>
      <span className="min-w-0 flex-1"><span className="block font-semibold text-ink">{title}</span><span className="block text-sm text-ink-3">{text}</span></span>
      <ChevronRight className="size-5 text-ink-4 rtl:rotate-180" aria-hidden />
    </Link>
  );
}

interface AppVersion { minimumAppVersion: string; forceUpdate: boolean; updateMessage: string; downloadUrl: string }

/** Admin settings: the oldest mobile app version that may still be used. */
export function AdminPanelPage() {
  const { t } = useTranslation('dashboardCommon');
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'app-version'], queryFn: async () => (await api.get('/app-version')).data.data as AppVersion });
  const [d, setD] = useState({ minimumAppVersion: '', forceUpdate: false, updateMessage: '' });
  const [error, setError] = useState('');
  useEffect(() => { if (q.data) setD({ minimumAppVersion: q.data.minimumAppVersion, forceUpdate: q.data.forceUpdate, updateMessage: q.data.updateMessage }); }, [q.data]);
  const save = useMutation({ mutationFn: () => api.put('/admin/settings/version', d), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['admin', 'app-version'] }); toast.success(t('adm.toast.saved')); }, onError: (e) => setError(readApiError(e).message) });
  const submit = () => { if (!/^\d+\.\d+\.\d+$/.test(d.minimumAppVersion.trim())) return setError(t('adm.errVersion')); setError(''); save.mutate(); };
  return (
    <div className="space-y-5">
      <PageHeader title={t('adm.title')} description={t('adm.subtitle')} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel>
          <PanelTitle title={t('adm.app')} />
          <p className="-mt-2 mb-4 text-sm text-ink-3">{t('adm.appText')}</p>
          {q.isLoading ? <div className="h-40 animate-pulse rounded-card bg-rail" /> : (
            <div className="space-y-4">
              <Field label={t('adm.minVersion')} hint={t('adm.minHint')}>{(c) => <TextInput {...c} value={d.minimumAppVersion} onChange={(e) => setD((x) => ({ ...x, minimumAppVersion: e.target.value }))} placeholder="1.3.0" className="max-w-40" dir="ltr" />}</Field>
              <label className="flex items-start gap-3 text-sm text-ink">
                <input type="checkbox" checked={d.forceUpdate} onChange={(e) => setD((x) => ({ ...x, forceUpdate: e.target.checked }))} className="mt-0.5 size-4 accent-[#0f1f33]" />
                <span><span className="block font-medium">{t('adm.force')}</span><span className="block text-xs text-ink-4">{t('adm.forceHint')}</span></span>
              </label>
              <Field label={t('adm.message')} hint={t('adm.messageHint')}>{(c) => <TextArea {...c} rows={3} value={d.updateMessage} onChange={(e) => setD((x) => ({ ...x, updateMessage: e.target.value }))} dir="auto" />}</Field>
              {error && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
              <div className="flex justify-end"><Button icon={<Smartphone />} loading={save.isPending} onClick={submit}>{t('work.save')}</Button></div>
            </div>
          )}
        </Panel>
        <div className="space-y-3">
          <QuickLink to="/reception/users" icon={<Users />} title={t('adm.users')} text={t('adm.usersText')} />
          <QuickLink to="/dashboard" icon={<Settings />} title={t('adm.overview')} text={t('adm.overviewText')} />
        </div>
      </div>
    </div>
  );
}
