import { useState } from "react";
import { Send, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Modal, Button, Input, Select, useToast } from "../ui";
import MediaDropzone from "../media/MediaDropzone";
import VoiceRecorder from "../media/VoiceRecorder";
import type { StagedMediaFile } from "../media/types";
import { useClientTasks } from "../../hooks/client/useClientTasks";
import type { InternalProject, InternalTask, ClientUrgency } from "../../hooks/cto/useCTOProjects";

interface NewTaskRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: InternalProject[];
  defaultProjectId?: string;
  onCreated: (task: InternalTask) => void;
}

const URGENCY_OPTIONS: { value: ClientUrgency; label: string }[] = [
  { value: 'whenever', label: 'Whenever works' },
  { value: 'soon', label: 'Soon' },
  { value: 'urgent', label: 'Urgent' },
];

export default function NewTaskRequestModal({ isOpen, onClose, projects, defaultProjectId, onCreated }: NewTaskRequestModalProps) {
  const { createTask, uploadMedia } = useClientTasks();
  const toast = useToast();

  const [projectId, setProjectId] = useState(defaultProjectId || projects[0]?._id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<ClientUrgency>('whenever');
  const [files, setFiles] = useState<StagedMediaFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'form' | 'uploading' | 'done'>('form');

  const reset = () => {
    files.forEach(f => URL.revokeObjectURL(f.previewUrl));
    setProjectId(defaultProjectId || projects[0]?._id || '');
    setTitle('');
    setDescription('');
    setUrgency('whenever');
    setFiles([]);
    setSubmitError(null);
    setPhase('form');
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!projectId) { setSubmitError('Choose a project for this request.'); return; }
    if (!title.trim()) { setSubmitError('Give your request a short title.'); return; }

    setSubmitError(null);
    setSubmitting(true);

    try {
      const task = await createTask({ projectId, title: title.trim(), description: description.trim(), clientUrgency: urgency });

      if (files.length > 0) {
        setPhase('uploading');
        for (const f of files) {
          setFiles(prev => prev.map(x => x.id === f.id ? { ...x, status: 'uploading' } : x));
          try {
            await uploadMedia(task._id, f.file, f.durationSeconds, (percent) => {
              setFiles(prev => prev.map(x => x.id === f.id ? { ...x, progress: percent } : x));
            });
            setFiles(prev => prev.map(x => x.id === f.id ? { ...x, status: 'done', progress: 100 } : x));
          } catch (err: any) {
            const msg = err.response?.data?.message || 'Upload failed';
            setFiles(prev => prev.map(x => x.id === f.id ? { ...x, status: 'error', error: msg } : x));
          }
        }
      }

      setPhase('done');
      toast.success('Request sent', `"${task.title}" is on its way to our team.`);
      onCreated(task);
      setTimeout(() => { reset(); onClose(); }, 900);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit your request. Please try again.');
      setPhase('form');
    } finally {
      setSubmitting(false);
    }
  };

  const failedUploads = files.filter(f => f.status === 'error').length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="New Task Request"
      description="Tell us what you need — attach a photo, video, or voice note if it helps."
      size="lg"
      closeOnOverlayClick={!submitting}
      showCloseButton={!submitting}
    >
      {phase === 'done' ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
          <p className="text-ink font-semibold">Request sent</p>
          <p className="text-sm text-ink/60 mt-1">Our team will review it shortly.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Project</label>
              <Select
                value={projectId}
                onChange={setProjectId}
                disabled={submitting}
                options={projects.map(p => ({ value: p._id, label: p.name }))}
                placeholder="Choose a project"
              />
            </div>
          )}

          <Input
            label="Title"
            placeholder="e.g. Add obstacle-avoidance to the south aisle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
            maxLength={300}
          />

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              rows={4}
              maxLength={5000}
              placeholder="What's happening, and what would you like changed?"
              className="w-full px-4 py-2.5 rounded-lg bg-white border border-ink/20 text-ink placeholder:text-ink/35 focus:outline-none focus:border-ink/50 focus:ring-2 focus:ring-ink/20 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">How urgent is this to you?</label>
            <Select
              value={urgency}
              onChange={(v) => setUrgency(v as ClientUrgency)}
              disabled={submitting}
              options={URGENCY_OPTIONS}
            />
            <p className="text-xs text-ink/45 mt-1.5">Our team sets the final priority and deadline after reviewing your request.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Attachments</label>
            <div className="space-y-2">
              <MediaDropzone files={files} onFilesChange={setFiles} disabled={submitting} />
              <VoiceRecorder
                disabled={submitting}
                onRecorded={(file, durationSeconds) => {
                  setFiles(prev => [...prev, {
                    id: crypto.randomUUID(),
                    file,
                    kind: 'audio',
                    previewUrl: URL.createObjectURL(file),
                    durationSeconds,
                    status: 'staged',
                    progress: 0,
                  }]);
                }}
              />
            </div>
          </div>

          {submitError && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {phase === 'uploading' && (
            <div className="flex items-center gap-2 text-sm text-ink/70">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sending request{files.length > 0 ? ' and uploading attachments' : ''}…</span>
            </div>
          )}

          {failedUploads > 0 && phase !== 'uploading' && (
            <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{failedUploads} attachment{failedUploads > 1 ? 's' : ''} failed to upload, but your request was submitted. You can follow up with our team directly.</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={handleClose} disabled={submitting}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} isLoading={submitting} leftIcon={<Send className="w-4 h-4" />}>
              Send Request
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
