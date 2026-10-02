import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Clock, ExternalLink, FileText, RotateCcw, ShieldCheck, Users, XCircle } from 'lucide-react';
import { api } from '../../../lib/api';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { Badge, Button, Dialog, EmptyState, Field, PageHeader, Panel, PanelTitle, SearchInput, StatTile, TextArea, type BadgeTone } from '../../../ui';

type Status = 'pending' | 'verified' | 'rejected';
interface Summary { _id: string; total: number; pending: number; verified: number; rejected: number; student: { name: string; email: string } }
interface Doc { _id: string; documentType: string; fileUrl: string | null; originalName: string; mimeType: string; verificationStatus: Status; verificationNote?: string | null; verifiedBy?: { name: string } | null; verifiedAt?: string | null; createdAt: string }
const TYPES = ['national_id', 'official_photo', 'civil_registry', 'family_record', 'travel_permission'];
const TONE: Record<Status, BadgeTone> = { pending: 'warning', verified: 'success', rejected: 'danger' };

/** Review the WRO papers students upload: accept them, or ask for a new copy with a reason. */
export default function DocumentsPage() {
  const { t } = useTranslation('dashboardCLO');
  const { t: ts } = useTranslation('dashboardStudent');
  const f = useFormat();
  const toast = useToast();
  const qc = useQueryClient();
  const summary = useQuery({ queryKey: ['clo', 'documents', 'summary'], queryFn: async () => ((await api.get('/clo/documents/students-summary')).data.data ?? []) as Summary[] });
  const [onlyWaiting, setOnlyWaiting] = useState(true);
  const [search, setSearch] = useState('');
  const [studentId, setStudentId] = useState('');
  const docs = useQuery({ queryKey: ['clo', 'documents', 'student', studentId], queryFn: async () => ((await api.get(`/clo/documents/student/${studentId}`)).data.data ?? []) as Doc[], enabled: !!studentId });
  const [rejecting, setRejecting] = useState<Doc | null>(null);
  const lastRej = useRef(rejecting);
  if (rejecting) lastRej.current = rejecting;
  const [note, setNote] = useState('');
  const set = useMutation({
    mutationFn: ({ doc, status, note: n }: { doc: Doc; status: Status; note?: string }) => api.patch(`/clo/documents/${doc._id}/status`, { verificationStatus: status, verificationNote: n ?? '' }),
    onSuccess: (_r, v) => { void qc.invalidateQueries({ queryKey: ['clo', 'documents'] }); toast.success(t(`doc.toast.${v.status}`)); setRejecting(null); },
    onError: (e) => toast.error(t('tr.actionError'), readApiError(e).message),
  });

  const all = summary.data ?? [];
  const sq = search.trim().toLowerCase();
  const students = all.filter((s) => !onlyWaiting || s.pending > 0).filter((s) => !sq || `${s.student.name} ${s.student.email}`.toLowerCase().includes(sq)).sort((a, b) => b.pending - a.pending || a.student.name.localeCompare(b.student.name));
  useEffect(() => { if (!studentId && students.length) setStudentId(students[0]._id); }, [studentId, students]);
  const current = all.find((s) => s._id === studentId);
  const byType = new Map((docs.data ?? []).map((d) => [d.documentType, d]));
  const sum = (k: Status) => all.reduce((n, s) => n + s[k], 0);

  return (
    <div className="space-y-5">
      <PageHeader title={t('doc.title')} description={t('doc.subtitle')} />
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<Clock />} tint="bg-tint-straw" label={t('doc.waiting')} value={sum('pending')} loading={summary.isLoading} onClick={() => setOnlyWaiting(true)} active={onlyWaiting} />
        <StatTile icon={<CheckCircle2 />} tint="bg-tint-leaf" label={t('doc.accepted')} value={sum('verified')} loading={summary.isLoading} />
        <StatTile icon={<XCircle />} tint="bg-tint-sand" label={t('doc.rejected')} value={sum('rejected')} loading={summary.isLoading} />
      </div>
      {summary.isError ? <Panel><EmptyState icon={<ShieldCheck />} title={readApiError(summary.error).message} /></Panel> : (
        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Panel className="p-0 sm:p-0">
            <div className="space-y-3 border-b border-line p-4">
              <SearchInput value={search} onChange={setSearch} placeholder={t('doc.search')} />
              <div role="tablist" aria-label={t('doc.show')} className="flex rounded-pill bg-rail p-1">
                {[true, false].map((w) => <button key={String(w)} type="button" role="tab" aria-selected={onlyWaiting === w} onClick={() => setOnlyWaiting(w)} className={cn('h-8 flex-1 rounded-pill px-3 text-sm font-medium focus-visible:focus-ring', onlyWaiting === w ? 'bg-ink text-white' : 'text-ink-3 hover:text-ink')}>{t(w ? 'doc.waitingTab' : 'doc.allTab')}</button>)}
              </div>
            </div>
            {summary.isLoading ? <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-card bg-rail" />)}</div>
              : students.length === 0 ? <EmptyState icon={<Users />} title={t(onlyWaiting ? 'doc.nothingWaiting' : 'doc.noStudents')} />
              : (
                <ul className="max-h-[560px] overflow-y-auto p-2">
                  {students.map((s) => (
                    <li key={s._id}>
                      <button type="button" onClick={() => setStudentId(s._id)} aria-current={s._id === studentId} className={cn('flex w-full items-center gap-3 rounded-card px-3 py-2.5 text-start focus-visible:focus-ring', s._id === studentId ? 'bg-ink text-white' : 'hover:bg-rail')}>
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium" dir="auto">{s.student.name}</span><span className={cn('block text-xs', s._id === studentId ? 'text-white/70' : 'text-ink-4')}>{t('doc.sentOf', { n: s.total, of: TYPES.length })}</span></span>
                        {s.pending > 0 && <span className={cn('grid min-w-6 place-items-center rounded-full px-1.5 text-xs font-semibold tabular-nums', s._id === studentId ? 'bg-glow text-ink' : 'bg-warning-soft text-warning')}>{s.pending}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </Panel>

          <Panel>
            {!current ? <EmptyState icon={<FileText />} title={t('doc.pick')} /> : (
              <>
                <PanelTitle title={current.student.name} />
                <p className="-mt-2 mb-4 text-sm text-ink-4" dir="ltr">{current.student.email}</p>
                {docs.isLoading ? <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-card bg-rail" />)}</div> : (
                  <ul className="space-y-2">
                    {TYPES.map((type) => {
                      const d = byType.get(type);
                      return (
                        <li key={type} className="rounded-card border border-line p-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-ink">{ts(`doc.type.${type}`)}</span>
                              <span className="block truncate text-xs text-ink-4" dir="auto">{d ? `${d.originalName} · ${f.date(d.createdAt)}` : t('doc.notSent')}</span>
                            </span>
                            {d && <Badge tone={TONE[d.verificationStatus]}>{t(`doc.status.${d.verificationStatus}`)}</Badge>}
                          </div>
                          {d && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {d.fileUrl && <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-pill border border-line-strong px-3 text-sm text-ink hover:border-ink focus-visible:focus-ring"><ExternalLink className="size-3.5" aria-hidden />{t('doc.open')}</a>}
                              {d.verificationStatus !== 'verified' && <Button size="sm" icon={<CheckCircle2 />} loading={set.isPending && set.variables?.doc._id === d._id && set.variables.status === 'verified'} onClick={() => set.mutate({ doc: d, status: 'verified' })}>{t('doc.accept')}</Button>}
                              {d.verificationStatus !== 'rejected' && <Button size="sm" variant="ghost" icon={<XCircle />} className="text-danger" onClick={() => { setNote(''); setRejecting(d); }}>{t('doc.reject')}</Button>}
                              {d.verificationStatus !== 'pending' && <Button size="sm" variant="ghost" icon={<RotateCcw />} onClick={() => set.mutate({ doc: d, status: 'pending' })}>{t('doc.undo')}</Button>}
                              {d.verificationStatus === 'rejected' && d.verificationNote && <span className="w-full text-xs text-danger" dir="auto">{t('doc.because', { note: d.verificationNote })}</span>}
                              {d.verifiedBy && d.verifiedAt && <span className="w-full text-xs text-ink-4">{t('doc.reviewedBy', { name: d.verifiedBy.name, date: f.date(d.verifiedAt) })}</span>}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </Panel>
        </div>
      )}
      <Dialog open={!!rejecting} onClose={() => setRejecting(null)} title={t('doc.rejectTitle')} description={(rejecting ?? lastRej.current) ? ts(`doc.type.${(rejecting ?? lastRej.current)!.documentType}`) : undefined} closeLabel={t('tr.cancel')}
        footer={<><Button variant="ghost" onClick={() => setRejecting(null)}>{t('tr.cancel')}</Button><Button variant="danger" disabled={!note.trim()} loading={set.isPending} onClick={() => set.mutate({ doc: rejecting!, status: 'rejected', note: note.trim() })}>{t('doc.reject')}</Button></>}>
        <Field label={t('doc.reason')} hint={t('doc.reasonHint')}>{(c) => <TextArea {...c} rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} dir="auto" />}</Field>
      </Dialog>
    </div>
  );
}
