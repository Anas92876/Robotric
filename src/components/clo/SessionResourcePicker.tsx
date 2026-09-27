/**
 * SessionResourcePicker
 *
 * Shows all resources for a given courseId.
 * User selects which ones to attach to a session.
 * Exposes selectedIds via onChange — parent owns the assignment call.
 * Also has an inline "Upload new file" button.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Upload, CheckCircle, Search, RefreshCw,
  AlertCircle, File, Tag, HardDrive, X, Loader,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useResourceUpload } from '../../hooks/trainer/useResourceUpload';
import type { Resource } from '../../types/resource.types';

// ─── helpers ──────────────────────────────────────────────────────────────────
function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const CAT_COLOR: Record<string, string> = {
  lecture:    'bg-blue-100 text-blue-700',
  assignment: 'bg-amber-100 text-amber-700',
  lab:        'bg-emerald-100 text-emerald-700',
  exam:       'bg-red-100 text-red-700',
  reference:  'bg-purple-100 text-purple-700',
  other:      'bg-zinc-100 text-zinc-600',
};

// ─── Inline upload panel ──────────────────────────────────────────────────────
interface InlineUploadProps {
  courseId: string;
  onUploaded: (resource: Resource) => void;
  onCancel: () => void;
}

function InlineUpload({ courseId, onUploaded, onCancel }: InlineUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploading, progress, error, uploadedResource, uploadResource, validateFile, reset } = useResourceUpload();

  const [file, setFile]       = useState<File | null>(null);
  const [title, setTitle]     = useState('');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (uploadedResource) {
      onUploaded(uploadedResource as any);
      reset();
    }
  }, [uploadedResource]);

  const handleFile = (f: File) => {
    const err = validateFile(f);
    if (err) { alert(err); return; }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.pdf$/i, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;
    await uploadResource({ file, title: title.trim(), description: '', courseId });
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-amber-800">Upload new file to this course</p>
          <button onClick={onCancel} className="text-amber-500 hover:text-amber-700 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {error && <p className="text-xs text-red-600 mb-2 bg-red-50 px-2 py-1 rounded">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-2">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
            onClick={() => !file && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${isDragging ? 'border-amber-400 bg-amber-100' : file ? 'border-amber-300 bg-amber-50' : 'border-amber-200 hover:border-amber-300'}`}
          >
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-medium text-amber-800 truncate max-w-[200px]">{file.name}</span>
                <span className="text-xs text-amber-600">({formatBytes(file.size)})</span>
                <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }} className="text-amber-400 hover:text-amber-600"><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <p className="text-xs text-amber-600">Drop PDF here or <span className="underline">browse</span></p>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

          {/* Title */}
          <input
            type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="File title *"
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-amber-200 bg-white text-[#003300] placeholder-[#003300]/35 outline-none focus:border-amber-400 transition-colors"
          />

          {/* Progress */}
          {uploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-amber-700">
                <span>Uploading…</span><span>{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-amber-200 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="text-xs text-amber-600 hover:text-amber-800 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors">Cancel</button>
            <button
              type="submit"
              disabled={uploading || !file || !title.trim()}
              className="text-xs font-semibold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              {uploading ? <><Loader className="w-3 h-3 animate-spin" /> Uploading…</> : <><Upload className="w-3 h-3" /> Upload</>}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface SessionResourcePickerProps {
  courseId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export const SessionResourcePicker: React.FC<SessionResourcePickerProps> = ({
  courseId,
  selectedIds,
  onChange,
}) => {
  const [resources, setResources]       = useState<Resource[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [search, setSearch]             = useState('');
  const [showUpload, setShowUpload]     = useState(false);

  const fetchResources = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/clo/resources', { params: { courseId } });
      const raw = res.data.data;
      const list = Array.isArray(raw) ? raw : raw?.resources || [];
      setResources(list.filter((r: any) => r != null && r._id != null));
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) fetchResources();
  }, [courseId]);

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);
  };

  const handleUploaded = (resource: Resource) => {
    setResources(prev => [resource, ...prev]);
    setShowUpload(false);
    // Auto-select the newly uploaded file
    onChange([...selectedIds, resource._id]);
  };

  const filtered = resources.filter(r =>
    !search || r.title.toLowerCase().includes(search.toLowerCase())
  );

  if (!courseId) return null;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#003300]/35" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search files…"
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-[#003300]/3 rounded-lg border border-transparent focus:border-[#003300]/20 focus:bg-white outline-none text-[#003300] placeholder-[#003300]/35 transition-all"
          />
        </div>
        <button onClick={() => fetchResources()} className="p-1.5 rounded-lg hover:bg-[#003300]/5 text-[#003300]/40 hover:text-[#003300]/70 transition-colors" title="Refresh">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setShowUpload(v => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 px-3 py-1.5 rounded-lg border border-primary/20 hover:bg-primary/5 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" /> Upload new
        </button>
      </div>

      {/* Inline upload */}
      <AnimatePresence>
        {showUpload && (
          <InlineUpload courseId={courseId} onUploaded={handleUploaded} onCancel={() => setShowUpload(false)} />
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{error}
        </div>
      )}

      {/* File list */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-[#003300]/40">
          <Loader className="w-4 h-4 animate-spin mr-2" />
          <span className="text-sm">Loading files…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-[#003300]/40">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">{search ? 'No files match your search.' : 'No files uploaded for this course yet.'}</p>
          {!search && (
            <button onClick={() => setShowUpload(true)} className="mt-2 text-xs text-primary underline underline-offset-2">
              Upload a file
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {filtered.map(r => {
            const selected = selectedIds.includes(r._id);
            return (
              <button
                key={r._id}
                type="button"
                onClick={() => toggle(r._id)}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 ${
                  selected
                    ? 'border-primary/40 bg-primary/5 shadow-sm'
                    : 'border-[#003300]/8 bg-white hover:border-[#003300]/20 hover:bg-[#003300]/2'
                }`}
              >
                {/* Checkbox */}
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected ? 'border-primary bg-primary' : 'border-[#003300]/20'}`}>
                  {selected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                </div>

                {/* Icon */}
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/80 to-primary-dark flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4.5 h-4.5 text-white" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#003300] truncate">{r.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {r.category && (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${CAT_COLOR[r.category] ?? CAT_COLOR.other}`}>
                        {r.category}
                      </span>
                    )}
                    <span className="text-[10px] text-[#003300]/40">{formatBytes(r.fileSize)}</span>
                  </div>
                </div>

                {selected && <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Selection summary */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 bg-primary/8 rounded-lg">
          <span className="text-xs font-semibold text-primary">
            {selectedIds.length} file{selectedIds.length !== 1 ? 's' : ''} selected
          </span>
          <button onClick={() => onChange([])} className="text-xs text-primary/70 hover:text-primary underline underline-offset-2 transition-colors">
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};
