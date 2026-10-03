import { useEffect, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';
import { api } from '../../lib/api';
import { readApiError } from '../../app/apiError';
import { useToast } from '../../components/ui/Toast';
import MediaDropzone from '../../components/media/MediaDropzone';
import VoiceRecorder from '../../components/media/VoiceRecorder';
import type { StagedMediaFile } from '../../components/media/types';
import { cn } from '../../lib/utils';
import { Button, Dialog, Field, SelectInput, TextArea, TextInput } from '../../ui';
import { uploadRequestMedia, useClientProjects, type ClientRequest, type ClientUrgency } from './api';

const URGENCY: ClientUrgency[] = ['whenever', 'soon', 'urgent'];

/** Ask the team for something on one of the client's projects, with photos, video or a voice note. */
export function NewRequestDialog({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId?: string }) {
  const { t } = useTranslation('dashboardCommon');
  const toast = useToast();
  const qc = useQueryClient();
  const projects = useClientProjects();
  const [project, setProject] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<ClientUrgency>('whenever');
  const [files, setFiles] = useState<StagedMediaFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setProject(projectId ?? projects.data?.[0]?._id ?? '');
    setTitle(''); setDescription(''); setUrgency('whenever'); setFiles([]); setError('');
  }, [open, projectId, projects.data]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!project) return setError(t('cl.errProject'));
    if (!title.trim()) return setError(t('cl.errTitle'));
    setError('');
    setBusy(true);
    try {
      const task = (await api.post('/client/tasks', { projectId: project, title: title.trim(), description: description.trim(), clientUrgency: urgency })).data.data as ClientRequest;
      let failed = 0;
      for (const f of files) {
        setFiles((p) => p.map((x) => (x.id === f.id ? { ...x, status: 'uploading' } : x)));
        try {
          await uploadRequestMedia(task._id, f.file, f.durationSeconds, (pc) => setFiles((p) => p.map((x) => (x.id === f.id ? { ...x, progress: pc } : x))));
          setFiles((p) => p.map((x) => (x.id === f.id ? { ...x, status: 'done', progress: 100 } : x)));
        } catch (err) {
          failed += 1;
          setFiles((p) => p.map((x) => (x.id === f.id ? { ...x, status: 'error', error: readApiError(err).message } : x)));
        }
      }
      void qc.invalidateQueries({ queryKey: ['client'] });
      if (failed) toast.error(t('cl.someFailed', { count: failed }), t('cl.someFailedText'));
      else toast.success(t('cl.toast.sent'));
      onClose();
    } catch (err) {
      setError(readApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} size="lg" title={t('cl.newTitle')} description={t('cl.newText')} closeLabel={t('cl.cancel')}
      footer={<><Button variant="ghost" onClick={onClose} disabled={busy}>{t('cl.cancel')}</Button><Button type="submit" form="request-form" icon={<Send />} loading={busy}>{t('cl.send')}</Button></>}>
      <form id="request-form" onSubmit={submit} noValidate className="space-y-4">
        {(projects.data?.length ?? 0) > 1 && (
          <Field label={t('cl.project')} required>{(c) => <SelectInput {...c} value={project} onChange={(e) => setProject(e.target.value)} disabled={busy}>{projects.data!.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</SelectInput>}</Field>
        )}
        <Field label={t('cl.title')} required hint={t('cl.titleHint')}>{(c) => <TextInput {...c} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} disabled={busy} dir="auto" />}</Field>
        <Field label={t('cl.details')}>{(c) => <TextArea {...c} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} placeholder={t('cl.detailsHint')} disabled={busy} dir="auto" />}</Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink">{t('cl.urgency')}</legend>
          <div className="flex flex-wrap gap-2">
            {URGENCY.map((u) => (
              <label key={u} className={cn('inline-flex h-9 cursor-pointer items-center rounded-pill border px-3.5 text-sm has-[:focus-visible]:focus-ring', urgency === u ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink-2 hover:border-ink')}>
                <input type="radio" name="urgency" className="sr-only" checked={urgency === u} onChange={() => setUrgency(u)} disabled={busy} />{t(`cl.urg.${u}`)}
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-ink-4">{t('cl.urgencyHint')}</p>
        </fieldset>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink">{t('cl.attachments')}</legend>
          <div className="space-y-2">
            <MediaDropzone files={files} onFilesChange={setFiles} disabled={busy} />
            <VoiceRecorder disabled={busy} onRecorded={(file, durationSeconds) => setFiles((p) => [...p, { id: crypto.randomUUID(), file, kind: 'audio', previewUrl: URL.createObjectURL(file), durationSeconds, status: 'staged', progress: 0 }])} />
          </div>
        </fieldset>
        {error && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      </form>
    </Dialog>
  );
}
