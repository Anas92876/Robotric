import { useCallback, useRef, useState } from "react";
import type { DragEvent, ChangeEvent, Dispatch, SetStateAction } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Image as ImageIcon, Film, Music, X, AlertTriangle } from "lucide-react";
import type { StagedMediaFile } from "./types";
import { kindOfMime, MEDIA_LIMITS, formatBytes, formatDuration } from "./types";

interface MediaDropzoneProps {
  files: StagedMediaFile[];
  // Expects the raw useState setter (not just a plain callback) so the async
  // duration-probe below can patch in results against the *current* state,
  // never a stale closure.
  onFilesChange: Dispatch<SetStateAction<StagedMediaFile[]>>;
  maxFiles?: number;
  disabled?: boolean;
}

function probeDuration(file: File, kind: 'video' | 'audio'): Promise<number | undefined> {
  return new Promise((resolve) => {
    const el = document.createElement(kind);
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      const duration = Number.isFinite(el.duration) ? el.duration : undefined;
      URL.revokeObjectURL(el.src);
      resolve(duration);
    };
    el.onerror = () => resolve(undefined);
    el.src = URL.createObjectURL(file);
  });
}

export default function MediaDropzone({ files, onFilesChange, maxFiles = 8, disabled }: MediaDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);
  const dragCounter = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(async (incoming: FileList | File[]) => {
    setDropError(null);
    const list = Array.from(incoming);
    const room = maxFiles - files.length;

    if (room <= 0) {
      setDropError(`You can attach up to ${maxFiles} files.`);
      return;
    }

    const accepted: StagedMediaFile[] = [];
    const rejected: string[] = [];

    for (const file of list.slice(0, room)) {
      const kind = kindOfMime(file.type);
      if (!kind) {
        rejected.push(`${file.name} — unsupported file type`);
        continue;
      }
      const limit = MEDIA_LIMITS[kind];
      if (file.size > limit) {
        rejected.push(`${file.name} — over the ${formatBytes(limit)} limit`);
        continue;
      }
      accepted.push({
        id: crypto.randomUUID(),
        file,
        kind,
        previewUrl: URL.createObjectURL(file),
        status: 'staged',
        progress: 0,
      });
    }

    if (list.length > room) {
      rejected.push(`Only ${room} more file${room === 1 ? '' : 's'} can be added (max ${maxFiles}).`);
    }

    if (rejected.length > 0) setDropError(rejected.join(' · '));
    if (accepted.length > 0) onFilesChange(prev => [...prev, ...accepted]);

    // Probe duration for video/audio in the background, patch in once known —
    // always against the live state, so this is safe no matter what else changed
    // while the probe was in flight.
    for (const staged of accepted) {
      if (staged.kind === 'video' || staged.kind === 'audio') {
        probeDuration(staged.file, staged.kind).then((durationSeconds) => {
          if (durationSeconds === undefined) return;
          onFilesChange(prev => prev.map(f => f.id === staged.id ? { ...f, durationSeconds } : f));
        });
      }
    }
  }, [files.length, maxFiles, onFilesChange]);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    dragCounter.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    const target = files.find(f => f.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onFilesChange(files.filter(f => f.id !== id));
  };

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) inputRef.current?.click(); }}
        className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer px-4 py-6 text-center
          ${isDragging ? 'border-[#003300] bg-[#003300]/5' : 'border-[#003300]/25 bg-[#003300]/[0.02] hover:bg-[#003300]/5'}
          ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
        <Upload className="w-6 h-6 mx-auto mb-2 text-[#003300]/50" />
        <p className="text-sm font-medium text-[#003300]">
          Drag files here, or click to browse
        </p>
        <p className="text-xs text-[#003300]/50 mt-1">
          Images, video, or audio — up to {formatBytes(MEDIA_LIMITS.video)} for video
        </p>
      </div>

      <AnimatePresence>
        {dropError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
          >
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{dropError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {files.length > 0 && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {files.map(f => (
            <div key={f.id} className="relative group rounded-lg overflow-hidden border border-[#003300]/15 bg-white">
              <div className="aspect-video bg-[#003300]/5 flex items-center justify-center overflow-hidden">
                {f.kind === 'image' && <img src={f.previewUrl} alt={f.file.name} className="w-full h-full object-cover" />}
                {f.kind === 'video' && <video src={f.previewUrl} muted playsInline className="w-full h-full object-cover" />}
                {f.kind === 'audio' && <Music className="w-6 h-6 text-[#003300]/40" />}
              </div>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Remove ${f.file.name}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {f.status === 'uploading' && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-[#003300]/10">
                  <div className="h-full bg-[#003300] transition-all" style={{ width: `${f.progress}%` }} />
                </div>
              )}
              {f.status === 'error' && (
                <div className="absolute inset-0 bg-red-600/80 flex items-center justify-center p-1">
                  <span className="text-white text-[10px] text-center leading-tight">{f.error || 'Upload failed'}</span>
                </div>
              )}

              <div className="px-2 py-1 flex items-center gap-1 text-[10px] text-[#003300]/70">
                {f.kind === 'image' && <ImageIcon className="w-3 h-3 flex-shrink-0" />}
                {f.kind === 'video' && <Film className="w-3 h-3 flex-shrink-0" />}
                {f.kind === 'audio' && <Music className="w-3 h-3 flex-shrink-0" />}
                <span className="truncate flex-1">{f.file.name}</span>
                {f.durationSeconds !== undefined && <span className="flex-shrink-0">{formatDuration(f.durationSeconds)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
