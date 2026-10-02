import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BookOpen, CalendarCheck, Eye, FileText, FileUp, Link2, Pencil, Trash2, Upload } from 'lucide-react';
import { api } from '../../../lib/api';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { useToast } from '../../../components/ui/Toast';
import { PDFViewer } from '../../../components/ui/PDFViewer';
import { cn } from '../../../lib/utils';
import { Button, ConfirmDialog, Dialog, EmptyState, Field, PageHeader, Panel, RowMenu, SearchInput, SelectInput, TextArea, TextInput } from '../../../ui';
import { useCloCourseOptions, useCloGroups } from '../api';

interface Resource {
  _id: string;
  title: string;
  description?: string | null;
  originalName: string;
  fileSize: number;
  courseId: { _id: string; title: string } | string;
  uploadedBy?: { name: string } | null;
  createdAt: string;
  assignments: { groupCount: number; sessionCount: number; details: { groupId: string; groupName: string; sessions: { sessionId: string; sessionNumber: number }[] }[] };
}
interface GroupSession { _id: string; title: string; sessionNumber: number; scheduledDate: string; status: string }
const KEY = ['clo', 'resources'];
const MAX = 25 * 1048576;
const mb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const courseOf = (r: Resource) => (typeof r.courseId === 'object' ? r.courseId : { _id: r.courseId, title: '' });

/** Upload a PDF to a course's library. */
function UploadDialog({ open, onClose, courseId }: { open: boolean; onClose: () => void; courseId: string }) {
  const { t } = useTranslation('dashboardCLO');
  const toast = useToast();
  const qc = useQueryClient();
  const courses = useCloCourseOptions();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [course, setCourse] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setFile(null); setTitle(''); setCourse(courseId); setDescription(''); setError(''); } }, [open, courseId]);
  const up = useMutation({
    mutationFn: () => { const fd = new FormData(); fd.append('pdf', file!); fd.append('title', title.trim()); fd.append('courseId', course); fd.append('description', description.trim()); return api.post('/clo/resources/upload', fd); },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEY }); toast.success(t('res.toast.uploaded')); onClose(); },
    onError: (e) => setError(readApiError(e).message),
  });
  const pick = (f: File | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) return setError(t('res.errType'));
    if (f.size > MAX) return setError(t('res.errSize'));
    setError('');
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '));
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!file) return setError(t('res.errFile'));
    if (title.trim().length < 3) return setError(t('res.errTitle'));
    if (!course) return setError(t('res.errCourse'));
    setError('');
    up.mutate();
  };
  return (
    <Dialog open={open} onClose={onClose} title={t('res.uploadTitle')} closeLabel={t('tr.cancel')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('tr.cancel')}</Button><Button type="submit" form="upload-form" icon={<Upload />} loading={up.isPending}>{t('res.upload')}</Button></>}>
      <form id="upload-form" onSubmit={submit} noValidate className="space-y-4">
        <label className={cn('flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed p-6 text-center has-[:focus-visible]:focus-ring', file ? 'border-success bg-success-soft' : 'border-line-strong hover:border-ink')}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0] ?? null); }}>
          <FileUp className="size-7 text-ink-3" aria-hidden />
          <span className="text-sm font-medium text-ink" dir="auto">{file ? file.name : t('res.drop')}</span>
          <span className="text-xs text-ink-4">{file ? mb(file.size) : t('res.dropHint')}</span>
          <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        </label>
        <Field label={t('res.titleLabel')} required>{(c) => <TextInput {...c} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} dir="auto" />}</Field>
        <Field label={t('gr.course')} required>{(c) => <SelectInput {...c} value={course} onChange={(e) => setCourse(e.target.value)}><option value="">{t('gr.pickCourse')}</option>{(courses.data ?? []).filter((x) => x.status !== 'archived').map((x) => <option key={x._id} value={x._id}>{x.title}</option>)}</SelectInput>}</Field>
        <Field label={t('res.description')}>{(c) => <TextArea {...c} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} dir="auto" />}</Field>
        {error && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      </form>
    </Dialog>
  );
}

/** Choose which classes of a group get this PDF. */
function AssignDialog({ resource, onClose }: { resource: Resource | null; onClose: () => void }) {
  const { t } = useTranslation('dashboardCLO');
  const f = useFormat();
  const toast = useToast();
  const qc = useQueryClient();
  const last = useRef(resource);
  if (resource) last.current = resource;
  const r = resource ?? last.current;
  const groups = useCloGroups();
  const courseGroups = (groups.data ?? []).filter((g) => r && g.courseId?._id === courseOf(r)._id);
  const options = courseGroups.length ? courseGroups : groups.data ?? [];
  const [groupId, setGroupId] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => { if (resource) setGroupId(resource.assignments.details[0]?.groupId ?? ''); }, [resource]);
  const sessions = useQuery({ queryKey: ['clo', 'groups', groupId, 'sessions'], queryFn: async () => ((await api.get(`/clo/groups/${groupId}/sessions`)).data.data?.sessions ?? []) as GroupSession[], enabled: !!groupId && !!resource });
  useEffect(() => { setPicked(r?.assignments.details.find((d) => d.groupId === groupId)?.sessions.map((s) => s.sessionId) ?? []); }, [groupId, r]);
  const save = useMutation({
    mutationFn: () => api.put(`/clo/resources/${r!._id}/assignments`, { groupId, sessionIds: picked }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEY }); toast.success(t('res.toast.assigned')); onClose(); },
    onError: (e) => toast.error(t('tr.actionError'), readApiError(e).message),
  });
  const list = (sessions.data ?? []).filter((s) => s.status !== 'cancelled');
  return (
    <Dialog open={!!resource} onClose={onClose} size="lg" title={t('res.assignTitle')} description={r?.title} closeLabel={t('tr.cancel')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('tr.cancel')}</Button><Button disabled={!groupId} loading={save.isPending} onClick={() => save.mutate()}>{t('res.saveClasses')}</Button></>}>
      <div className="space-y-4">
        <Field label={t('gr.one')}>{(c) => <SelectInput {...c} value={groupId} onChange={(e) => setGroupId(e.target.value)}><option value="">{t('res.pickGroup')}</option>{options.map((g) => <option key={g._id} value={g._id}>{g.name}{r?.assignments.details.some((d) => d.groupId === g._id) ? ` ✓` : ''}</option>)}</SelectInput>}</Field>
        {groupId && (sessions.isLoading ? <div className="h-20 animate-pulse rounded-card bg-rail" /> : list.length === 0 ? <p className="text-sm text-ink-4">{t('res.noClasses')}</p> : (
          <div>
            <div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium text-ink">{t('res.classes')}</span>
              <button type="button" className="rounded-md text-ink underline underline-offset-2 focus-visible:focus-ring" onClick={() => setPicked(picked.length === list.length ? [] : list.map((s) => s._id))}>{t(picked.length === list.length ? 'res.none' : 'res.all')}</button>
            </div>
            <div className="flex max-h-72 flex-wrap gap-1.5 overflow-y-auto">
              {list.map((s) => {
                const on = picked.includes(s._id);
                return <button key={s._id} type="button" aria-pressed={on} title={s.title} onClick={() => setPicked((p) => (on ? p.filter((x) => x !== s._id) : [...p, s._id]))} className={cn('h-9 rounded-pill border px-3 text-sm tabular-nums focus-visible:focus-ring', on ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink-2 hover:border-ink')}>{t('ctk.classN', { n: s.sessionNumber })} · {f.dayMonth(s.scheduledDate)}</button>;
              })}
            </div>
            <p className="mt-2 text-xs text-ink-4">{t('res.assignHint')}</p>
          </div>
        ))}
      </div>
    </Dialog>
  );
}

/** The PDF library: upload course material, give it to classes, rename or remove it. */
export default function ResourcesPage() {
  const { t } = useTranslation('dashboardCLO');
  const f = useFormat();
  const toast = useToast();
  const qc = useQueryClient();
  const courses = useCloCourseOptions();
  const [course, setCourse] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => { const id = setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(id); }, [search]);
  const q = useQuery({ queryKey: [...KEY, course, debounced], queryFn: async () => ((await api.get('/clo/resources', { params: { ...(course ? { courseId: course } : {}), ...(debounced ? { search: debounced } : {}) } })).data.data ?? []) as Resource[], placeholderData: (p) => p });
  const [uploading, setUploading] = useState(false);
  const [assigning, setAssigning] = useState<Resource | null>(null);
  const [renaming, setRenaming] = useState<Resource | null>(null);
  const [rename, setRename] = useState({ title: '', description: '' });
  const [deleting, setDeleting] = useState<Resource | null>(null);
  const lastDel = useRef(deleting);
  if (deleting) lastDel.current = deleting;
  const [pdf, setPdf] = useState<Resource | null>(null);
  const refresh = () => void qc.invalidateQueries({ queryKey: KEY });
  const fail = (e: unknown) => toast.error(t('tr.actionError'), readApiError(e).message);
  const doRename = useMutation({ mutationFn: () => api.put(`/clo/resources/${renaming!._id}`, { title: rename.title.trim(), description: rename.description.trim() }), onSuccess: () => { refresh(); toast.success(t('res.toast.renamed')); setRenaming(null); }, onError: fail });
  const remove = useMutation({ mutationFn: (r: Resource) => api.delete(`/clo/resources/${r._id}`), onSuccess: () => { refresh(); toast.success(t('res.toast.deleted')); }, onError: fail });
  const list = q.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title={t('res.title')} description={t('res.subtitle')} actions={<Button icon={<Upload />} onClick={() => setUploading(true)}>{t('res.upload')}</Button>} />
      <Panel className="p-0 sm:p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="min-w-56 flex-1"><SearchInput value={search} onChange={setSearch} placeholder={t('res.search')} /></div>
          <SelectInput aria-label={t('gr.course')} value={course} onChange={(e) => setCourse(e.target.value)} className="w-auto min-w-48"><option value="">{t('gr.allCourses')}</option>{(courses.data ?? []).map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}</SelectInput>
        </div>
        {q.isError ? <EmptyState icon={<FileText />} title={readApiError(q.error).message} action={<Button variant="secondary" onClick={() => void q.refetch()}>{t('tr.retry')}</Button>} />
          : q.isLoading ? <div className="space-y-3 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-card bg-rail" />)}</div>
          : list.length === 0 ? <EmptyState icon={<FileText />} title={t('res.empty')} description={search || course ? t('res.emptyFiltered') : t('res.emptyHint')} action={<Button variant="secondary" icon={<Upload />} onClick={() => setUploading(true)}>{t('res.upload')}</Button>} />
          : (
            <ul className="divide-y divide-line">
              {list.map((r) => (
                <li key={r._id} className="flex items-center gap-4 p-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-card bg-tint-straw text-ink"><FileText className="size-5" aria-hidden /></span>
                  <button type="button" onClick={() => setPdf(r)} className="min-w-0 flex-1 rounded-md text-start focus-visible:focus-ring">
                    <span className="block truncate font-medium text-ink hover:underline" dir="auto">{r.title}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-4">
                      <span className="inline-flex items-center gap-1"><BookOpen className="size-3.5" aria-hidden /><span dir="auto">{courseOf(r).title}</span></span>
                      <span dir="ltr">{mb(r.fileSize)}</span>
                      <span>{f.date(r.createdAt)}</span>
                      <span className="inline-flex items-center gap-1"><CalendarCheck className="size-3.5" aria-hidden />{r.assignments.sessionCount ? t('res.usedIn', { groups: r.assignments.groupCount, classes: r.assignments.sessionCount }) : t('res.notUsed')}</span>
                    </span>
                  </button>
                  <Button size="sm" variant="secondary" icon={<Link2 />} onClick={() => setAssigning(r)} className="hidden sm:inline-flex">{t('res.assign')}</Button>
                  <RowMenu label={t('tr.actionsFor', { name: r.title })} actions={[
                    { label: t('res.open'), icon: <Eye />, onClick: () => setPdf(r) },
                    { label: t('res.assign'), icon: <Link2 />, onClick: () => setAssigning(r) },
                    { label: t('res.rename'), icon: <Pencil />, onClick: () => { setRename({ title: r.title, description: r.description ?? '' }); setRenaming(r); } },
                    { label: t('res.delete'), icon: <Trash2 />, tone: 'danger', onClick: () => setDeleting(r) },
                  ]} />
                </li>
              ))}
            </ul>
          )}
      </Panel>
      <UploadDialog open={uploading} onClose={() => setUploading(false)} courseId={course} />
      <AssignDialog resource={assigning} onClose={() => setAssigning(null)} />
      <Dialog open={!!renaming} onClose={() => setRenaming(null)} title={t('res.renameTitle')} closeLabel={t('tr.cancel')}
        footer={<><Button variant="ghost" onClick={() => setRenaming(null)}>{t('tr.cancel')}</Button><Button disabled={rename.title.trim().length < 1} loading={doRename.isPending} onClick={() => doRename.mutate()}>{t('tr.save')}</Button></>}>
        <div className="space-y-4">
          <Field label={t('res.titleLabel')} required>{(c) => <TextInput {...c} value={rename.title} onChange={(e) => setRename((x) => ({ ...x, title: e.target.value }))} maxLength={200} dir="auto" />}</Field>
          <Field label={t('res.description')}>{(c) => <TextArea {...c} rows={2} value={rename.description} onChange={(e) => setRename((x) => ({ ...x, description: e.target.value }))} maxLength={1000} dir="auto" />}</Field>
        </div>
      </Dialog>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} tone="danger" title={t('res.deleteTitle', { name: (deleting ?? lastDel.current)?.title ?? '' })} message={t('res.deleteText')} confirmLabel={t('res.delete')} cancelLabel={t('tr.cancel')} loading={remove.isPending}
        onConfirm={() => remove.mutate(deleting!, { onSettled: () => setDeleting(null) })} />
      <PDFViewer resourceId={pdf?._id ?? null} title={pdf?.title} isOpen={!!pdf} onClose={() => setPdf(null)} />
    </div>
  );
}
