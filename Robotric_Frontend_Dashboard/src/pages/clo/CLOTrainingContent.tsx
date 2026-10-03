import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Save, Plus, Trash2, Edit2, ChevronDown, ChevronUp,
  Sun, Snowflake, CalendarDays, Trophy, Check, X, GripVertical,
  ImagePlus, Loader2, ZoomIn, HelpCircle, Award, Clock, Users,
  Languages, BarChart3, BookOpen,
} from "lucide-react";
import { api } from "../../lib/api";
import {
  useCLOTrainingContent,
  buildContentFromI18n,
  type TrainingProgram,
  type ProgramImage,
  type FaqItem,
  type TrainingDepartment,
  type TrainingPageContentData,
  type TrackBase,
} from "../../hooks/clo/useCLOTrainingContent";

/* ── design tokens ────────────────────────────────────────────── */
const G     = "#0f1f33";
const G10   = "rgba(15, 31, 51,0.10)";
const G6    = "rgba(15, 31, 51,0.06)";
const G3    = "rgba(15, 31, 51,0.03)";
const CREAM = "#3fd360";

const inputCls    = `w-full px-3 py-2.5 text-sm rounded-xl border bg-white text-[${G}] placeholder-[${G}]/30 focus:outline-none transition-all focus:ring-2 focus:ring-[${G}]/20 border-[${G}]/15 focus:border-[${G}]/40`;
const labelCls    = "block text-[11px] font-bold text-ink/50 mb-1.5 uppercase tracking-wider";
const sectionHead = "text-sm font-black text-ink mb-3 flex items-center gap-2";
const cardCls     = "bg-white rounded-2xl border border-ink/10 overflow-hidden shadow-sm";
const pill = (active: boolean) =>
  `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
    active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
  }`;

/* ── track metadata ───────────────────────────────────────────── */
const TRACK_IDS = ["summer", "winter", "yearRound", "competitions"] as const;
type TrackId = typeof TRACK_IDS[number];

const TRACK_META: Record<TrackId, { Icon: React.ElementType; label: string; shortLabel: string; color: string }> = {
  summer:       { Icon: Sun,          label: "Summer",       shortLabel: "Summer",  color: "#f59e0b" },
  winter:       { Icon: Snowflake,    label: "Winter",       shortLabel: "Winter",  color: "#3b82f6" },
  yearRound:    { Icon: CalendarDays, label: "Year-Round",   shortLabel: "Annual",  color: G },
  competitions: { Icon: Trophy,       label: "Competitions", shortLabel: "Comp.",   color: "#7c3aed" },
};

/* ══════════════════════════════════════════════════════════════
   SHARED: Lightbox
══════════════════════════════════════════════════════════════ */
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4" onClick={onClose}>
      <img src={src} alt="" className="max-w-full max-h-[88vh] rounded-2xl shadow-2xl object-contain" onClick={e => e.stopPropagation()} />
      <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/15 rounded-full hover:bg-white/25 transition-colors cursor-pointer">
        <X className="w-5 h-5 text-white" />
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SHARED: ImageGrid — thumbnail row with upload + delete
══════════════════════════════════════════════════════════════ */
interface ImageGridProps {
  images: ProgramImage[];
  uploading: boolean;
  deletingId: string | null;
  error: string;
  onUploadClick: () => void;
  onDelete: (publicId: string) => void;
  onPreview: (url: string) => void;
  emptyLabel?: string;
}
function ImageGrid({ images, uploading, deletingId, error, onUploadClick, onDelete, onPreview, emptyLabel }: ImageGridProps) {
  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded-lg">{error}</p>}
      <div className="flex flex-wrap gap-2 items-start">
        {images.map(img => (
          <div key={img.publicId} className="relative group w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-ink/10 flex-shrink-0">
            <img src={img.url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
              <button type="button" onClick={() => onPreview(img.url)} className="p-1 bg-white/90 rounded-full cursor-pointer hover:bg-white transition-colors">
                <ZoomIn className="w-3 h-3 text-ink" />
              </button>
              <button type="button" onClick={() => onDelete(img.publicId)} disabled={deletingId === img.publicId} className="p-1 bg-white/90 rounded-full cursor-pointer hover:bg-red-50 transition-colors">
                {deletingId === img.publicId ? <Loader2 className="w-3 h-3 animate-spin text-red-500" /> : <X className="w-3 h-3 text-red-500" />}
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={onUploadClick}
          disabled={uploading}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 border-dashed border-ink/20 flex flex-col items-center justify-center gap-0.5 hover:border-ink/40 hover:bg-ink/3 transition-all cursor-pointer disabled:opacity-40 flex-shrink-0"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin text-ink/40" /> : <ImagePlus className="w-4 h-4 text-ink/30" />}
          {!uploading && <span className="text-[9px] font-bold text-ink/30">Add</span>}
        </button>
      </div>
      {images.length === 0 && !uploading && (
        <p className="text-[11px] text-ink/30">{emptyLabel ?? "No images yet."}</p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Program image manager (summer / winter / competitions)
══════════════════════════════════════════════════════════════ */
function ProgramImageManager({ trackId, programIndex, images, onChanged }: {
  trackId: string; programIndex: number; images: ProgramImage[]; onChanged: (imgs: ProgramImage[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [error, setError] = useState("");

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(""); setUploading(true);
    try {
      const fd = new FormData(); fd.append("image", files[0]);
      const res = await api.post(`/clo/training-content/programs/${trackId}/${programIndex}/images`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      onChanged([...images, res.data.data]);
    } catch (e: any) { setError(e.response?.data?.message || "Upload failed"); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  };

  const remove = async (publicId: string) => {
    setDeletingId(publicId);
    try {
      await api.delete(`/clo/training-content/programs/${trackId}/${programIndex}/images/${encodeURIComponent(publicId)}`);
      onChanged(images.filter(i => i.publicId !== publicId));
    } catch (e: any) { setError(e.response?.data?.message || "Delete failed"); }
    finally { setDeletingId(null); }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => upload(e.target.files)} />
      <ImageGrid images={images} uploading={uploading} deletingId={deletingId} error={error}
        onUploadClick={() => inputRef.current?.click()} onDelete={remove} onPreview={setLightbox} />
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   Department cover image manager
══════════════════════════════════════════════════════════════ */
function DeptCoverManager({ deptIndex, coverImage, onChanged }: {
  deptIndex: number; coverImage: { url: string; publicId: string }; onChanged: (img: { url: string; publicId: string }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [error, setError] = useState("");

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(""); setUploading(true);
    try {
      const fd = new FormData(); fd.append("image", files[0]);
      const res = await api.post(`/clo/training-content/departments/${deptIndex}/cover`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      onChanged(res.data.data);
    } catch (e: any) { setError(e.response?.data?.message || "Upload failed"); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  };

  const remove = async () => {
    setDeleting(true);
    try { await api.delete(`/clo/training-content/departments/${deptIndex}/cover`); onChanged({ url: "", publicId: "" }); }
    catch (e: any) { setError(e.response?.data?.message || "Delete failed"); }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => upload(e.target.files)} />
      {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded-lg">{error}</p>}
      {coverImage.url ? (
        <div className="relative group rounded-xl overflow-hidden border border-ink/10" style={{ height: 100 }}>
          <img src={coverImage.url} alt="cover" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button type="button" onClick={() => setLightbox(true)} className="p-1.5 bg-white/90 rounded-full cursor-pointer"><ZoomIn className="w-4 h-4 text-ink" /></button>
            <button type="button" onClick={() => inputRef.current?.click()} className="p-1.5 bg-white/90 rounded-full cursor-pointer"><ImagePlus className="w-4 h-4 text-ink" /></button>
            <button type="button" onClick={remove} disabled={deleting} className="p-1.5 bg-white/90 rounded-full cursor-pointer">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin text-red-500" /> : <Trash2 className="w-4 h-4 text-red-500" />}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="w-full h-20 rounded-xl border-2 border-dashed border-ink/15 flex flex-col items-center justify-center gap-1 hover:border-ink/30 hover:bg-ink/3 transition-all cursor-pointer disabled:opacity-40">
          {uploading ? <Loader2 className="w-5 h-5 animate-spin text-ink/40" /> : <ImagePlus className="w-5 h-5 text-ink/25" />}
          <span className="text-[11px] font-bold text-ink/30">{uploading ? "Uploading…" : "Upload cover image"}</span>
        </button>
      )}
      {lightbox && <Lightbox src={coverImage.url} onClose={() => setLightbox(false)} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Dept program image manager
══════════════════════════════════════════════════════════════ */
function DeptProgramImageManager({ deptIndex, programIndex, images, onChanged }: {
  deptIndex: number; programIndex: number; images: ProgramImage[]; onChanged: (imgs: ProgramImage[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [error, setError] = useState("");

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(""); setUploading(true);
    try {
      const fd = new FormData(); fd.append("image", files[0]);
      const res = await api.post(`/clo/training-content/departments/${deptIndex}/programs/${programIndex}/images`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      onChanged([...images, res.data.data]);
    } catch (e: any) { setError(e.response?.data?.message || "Upload failed"); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  };

  const remove = async (publicId: string) => {
    setDeletingId(publicId);
    try {
      await api.delete(`/clo/training-content/departments/${deptIndex}/programs/${programIndex}/images/${encodeURIComponent(publicId)}`);
      onChanged(images.filter(i => i.publicId !== publicId));
    } catch (e: any) { setError(e.response?.data?.message || "Delete failed"); }
    finally { setDeletingId(null); }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => upload(e.target.files)} />
      <ImageGrid images={images} uploading={uploading} deletingId={deletingId} error={error}
        onUploadClick={() => inputRef.current?.click()} onDelete={remove} onPreview={setLightbox} />
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   ProgramForm — inline edit/add form
══════════════════════════════════════════════════════════════ */
interface ProgramFormProps {
  initial?: Partial<TrainingProgram>;
  showHours?: boolean;
  yearRoundMode?: boolean;
  onSave: (p: TrainingProgram) => void;
  onCancel: () => void;
}

function ProgramForm({ initial, showHours, yearRoundMode, onSave, onCancel }: ProgramFormProps) {
  const [form, setForm] = useState<TrainingProgram>({
    title:         initial?.title         ?? "",
    age:           initial?.age           ?? "",
    description:   initial?.description   ?? "",
    hours:         initial?.hours         ?? "",
    hoursPerLevel: initial?.hoursPerLevel ?? "",
    levels:        initial?.levels        ?? "",
    available:     initial?.available !== false,
    prerequisite:  initial?.prerequisite  ?? "",
    certificate:   initial?.certificate   ?? false,
    whatYouLearn:  initial?.whatYouLearn  ?? [],
    images:        initial?.images        ?? [],
  });
  const [wylInput, setWylInput] = useState("");
  const set = (k: keyof TrainingProgram, v: any) => setForm(f => ({ ...f, [k]: v }));

  const addWyl = () => {
    const item = wylInput.trim();
    if (!item) return;
    set("whatYouLearn", [...(form.whatYouLearn ?? []), item]);
    setWylInput("");
  };

  const canSave = form.title.trim() && form.age.trim();

  return (
    <div className="rounded-2xl border-2 border-ink/15 bg-ink/3 p-3 sm:p-4 space-y-3">

      {/* row 1: title + age */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Program Title *</label>
          <input className={inputCls} value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Alpha Robot" />
        </div>
        <div>
          <label className={labelCls}>Age Group *</label>
          <input className={inputCls} value={form.age} onChange={e => set("age", e.target.value)} placeholder="e.g. 6–9 years" />
        </div>
      </div>

      {/* row 2: durations — 2 cols on mobile, up to 4 on desktop */}
      <div className="grid grid-cols-2 gap-3">
        {showHours && (
          <div>
            <label className={labelCls}>Total Hours</label>
            <input className={inputCls} value={form.hours} onChange={e => set("hours", e.target.value)} placeholder="100 hrs" />
          </div>
        )}
        <div>
          <label className={labelCls}>Hrs / Level</label>
          <input className={inputCls} value={form.hoursPerLevel} onChange={e => set("hoursPerLevel", e.target.value)} placeholder="~14 hrs" />
        </div>
        <div>
          <label className={labelCls}>Levels</label>
          <input className={inputCls} value={form.levels} onChange={e => set("levels", e.target.value)} placeholder="3 levels" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Prerequisite</label>
          <input className={inputCls} value={form.prerequisite} onChange={e => set("prerequisite", e.target.value)} placeholder="None / Basic coding…" />
        </div>
      </div>

      {/* description */}
      <div>
        <label className={labelCls}>Description</label>
        <textarea className={inputCls} rows={2} value={form.description} onChange={e => set("description", e.target.value)} placeholder="1–2 sentences about this program…" />
      </div>

      {/* What You'll Learn */}
      <div>
        <label className={labelCls}>What You'll Learn</label>
        <div className="flex gap-2 mb-2">
          <input
            className={`${inputCls} flex-1`}
            value={wylInput}
            onChange={e => setWylInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addWyl(); } }}
            placeholder="Type a point and press Enter"
          />
          <button type="button" onClick={addWyl}
            className="px-3 py-2 rounded-xl text-xs font-bold cursor-pointer hover:opacity-90 transition-all flex-shrink-0"
            style={{ backgroundColor: G, color: CREAM }}>
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {(form.whatYouLearn ?? []).length > 0 && (
          <ul className="space-y-1.5">
            {(form.whatYouLearn ?? []).map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs bg-white border border-ink/10 rounded-lg px-3 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-ink/30 flex-shrink-0 mt-1" />
                <span className="flex-1 text-ink/80 break-words min-w-0">{item}</span>
                <button type="button" onClick={() => set("whatYouLearn", (form.whatYouLearn ?? []).filter((_, i) => i !== idx))}
                  className="text-red-400 hover:text-red-600 cursor-pointer flex-shrink-0 mt-0.5"><X className="w-3 h-3" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* toggles row */}
      <div className="flex items-center gap-4 flex-wrap pt-1">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={form.available} onChange={e => set("available", e.target.checked)}
            className="w-4 h-4 rounded accent-ink" />
          <span className="text-xs font-semibold text-ink/70">Available</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={!!form.certificate} onChange={e => set("certificate", e.target.checked)}
            className="w-4 h-4 rounded accent-ink" />
          <span className="text-xs font-semibold text-ink/70">Certificate</span>
        </label>
      </div>

      {/* action buttons */}
      <div className="flex gap-2 border-t border-ink/10 pt-3">
        <button
          onClick={() => canSave && onSave(form)}
          disabled={!canSave}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-40"
          style={{ backgroundColor: G, color: CREAM }}>
          <Check className="w-3.5 h-3.5" /> Save Program
        </button>
        <button onClick={onCancel}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold border border-ink/20 text-ink/60 hover:bg-ink/5 transition-all cursor-pointer">
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ProgramRow — compact row with edit/image/delete
══════════════════════════════════════════════════════════════ */
function ProgramRow({ prog, index, trackId, deptIndex, yearRoundMode, onEdit, onDelete, onImagesChange }: {
  prog: TrainingProgram;
  index: number;
  trackId: string;
  deptIndex?: number;
  yearRoundMode?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onImagesChange: (imgs: ProgramImage[]) => void;
}) {
  const [showImages, setShowImages] = useState(false);

  return (
    <div className={cardCls}>
      <div className="flex items-center gap-2 px-3 py-3 sm:px-4">
        <GripVertical className="w-4 h-4 text-ink/20 flex-shrink-0 hidden sm:block" />
        <div className="flex-1 min-w-0">
          {/* title + badges line */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-ink leading-tight truncate">{prog.title}</span>
            <span className={pill(prog.available ?? true)}>{prog.available !== false ? "Live" : "Soon"}</span>
            {prog.certificate && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                <Award className="w-2.5 h-2.5" /> Cert
              </span>
            )}
            {(prog.images?.length ?? 0) > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-ink/8 text-ink/50">
                {prog.images!.length}🖼
              </span>
            )}
          </div>
          {/* meta line */}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {prog.age && <span className="text-[11px] text-ink/45 flex items-center gap-0.5"><Users className="w-3 h-3 flex-shrink-0" />{prog.age}</span>}
            {(prog.hoursPerLevel || prog.hours) && <span className="text-[11px] text-ink/45 flex items-center gap-0.5"><Clock className="w-3 h-3 flex-shrink-0" />{prog.hoursPerLevel || prog.hours}</span>}
            {prog.levels && <span className="text-[11px] text-ink/45">{prog.levels}</span>}
          </div>
        </div>
        {/* action buttons — always visible, touch-friendly */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => setShowImages(v => !v)}
            title="Images"
            className={`p-2 rounded-lg transition-colors cursor-pointer ${showImages ? "bg-ink/10" : "hover:bg-ink/6"}`}
          >
            <ImagePlus className="w-4 h-4 text-ink/50" />
          </button>
          <button onClick={onEdit} className="p-2 rounded-lg hover:bg-ink/6 transition-colors cursor-pointer">
            <Edit2 className="w-4 h-4 text-ink/50" />
          </button>
          <button onClick={onDelete} className="p-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer">
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showImages && (
          <motion.div key="imgs" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="px-3 sm:px-4 pb-3 pt-2 border-t border-ink/8 bg-ink/2">
              <p className={labelCls + " mb-2"}>Program Images</p>
              {yearRoundMode && deptIndex !== undefined ? (
                <DeptProgramImageManager deptIndex={deptIndex} programIndex={index} images={prog.images ?? []} onChanged={onImagesChange} />
              ) : (
                <ProgramImageManager trackId={trackId} programIndex={index} images={prog.images ?? []} onChanged={onImagesChange} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ProgramList (summer / winter / competitions)
══════════════════════════════════════════════════════════════ */
function ProgramList({ programs, trackId, showHours, onChange }: {
  programs: TrainingProgram[]; trackId: string; showHours?: boolean; onChange: (p: TrainingProgram[]) => void;
}) {
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  const save = (idx: number, p: TrainingProgram) => {
    const next = [...programs]; next[idx] = p; onChange(next); setEditIdx(null);
  };
  const add = (p: TrainingProgram) => { onChange([...programs, p]); setAdding(false); };
  const remove = (idx: number) => onChange(programs.filter((_, i) => i !== idx));
  const updateImages = (idx: number, imgs: ProgramImage[]) => {
    const next = [...programs]; next[idx] = { ...next[idx], images: imgs }; onChange(next);
  };

  return (
    <div className="space-y-2">
      {programs.map((p, i) => (
        <div key={i}>
          {editIdx === i ? (
            <ProgramForm initial={p} showHours={showHours} onSave={pp => save(i, pp)} onCancel={() => setEditIdx(null)} />
          ) : (
            <ProgramRow prog={p} index={i} trackId={trackId} onEdit={() => setEditIdx(i)} onDelete={() => remove(i)} onImagesChange={imgs => updateImages(i, imgs)} />
          )}
        </div>
      ))}
      {adding ? (
        <ProgramForm showHours={showHours} onSave={add} onCancel={() => setAdding(false)} />
      ) : (
        <AddButton label="Add Program" onClick={() => setAdding(true)} />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   FAQ Editor
══════════════════════════════════════════════════════════════ */
function FaqEditor({ faq, onChange }: { faq: FaqItem[]; onChange: (faq: FaqItem[]) => void }) {
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<FaqItem>({ question: "", answer: "" });

  const startEdit = (i: number) => { setForm({ ...faq[i] }); setEditIdx(i); setAdding(false); };
  const saveEdit = () => {
    if (!form.question || !form.answer) return;
    const next = [...faq]; next[editIdx!] = form; onChange(next); setEditIdx(null);
  };
  const saveNew = () => {
    if (!form.question || !form.answer) return;
    onChange([...faq, form]); setAdding(false); setForm({ question: "", answer: "" });
  };
  const remove = (i: number) => onChange(faq.filter((_, idx) => idx !== i));

  const FaqForm = ({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) => (
    <div className="rounded-2xl border-2 border-ink/15 bg-ink/3 p-3 sm:p-4 space-y-3">
      <div>
        <label className={labelCls}>Question</label>
        <input autoFocus className={inputCls} value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} placeholder="e.g. Does my child need prior experience?" />
      </div>
      <div>
        <label className={labelCls}>Answer</label>
        <textarea className={inputCls} rows={3} value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} placeholder="Detailed answer…" />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onSave} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:opacity-90" style={{ backgroundColor: G, color: CREAM }}><Check className="w-3.5 h-3.5" /> Save</button>
        <button onClick={onCancel} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold border border-ink/20 text-ink/60 hover:bg-ink/5 cursor-pointer"><X className="w-3.5 h-3.5" /> Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      {faq.map((item, i) => (
        <div key={i}>
          {editIdx === i ? (
            <FaqForm onSave={saveEdit} onCancel={() => setEditIdx(null)} />
          ) : (
            <div className={`${cardCls} flex items-start gap-3 px-3 sm:px-4 py-3`}>
              <HelpCircle className="w-4 h-4 text-ink/25 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink leading-tight break-words">{item.question}</p>
                <p className="text-xs text-ink/45 mt-1 line-clamp-2 leading-relaxed break-words">{item.answer}</p>
              </div>
              <div className="flex gap-0.5 flex-shrink-0">
                <button onClick={() => startEdit(i)} className="p-2 rounded-lg hover:bg-ink/6 cursor-pointer"><Edit2 className="w-4 h-4 text-ink/40" /></button>
                <button onClick={() => remove(i)} className="p-2 rounded-lg hover:bg-red-50 cursor-pointer"><Trash2 className="w-4 h-4 text-red-400" /></button>
              </div>
            </div>
          )}
        </div>
      ))}
      {adding ? (
        <FaqForm onSave={saveNew} onCancel={() => { setAdding(false); setForm({ question: "", answer: "" }); }} />
      ) : (
        <AddButton label="Add FAQ Item" onClick={() => { setAdding(true); setForm({ question: "", answer: "" }); setEditIdx(null); }} />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   DepartmentCard — single card for a year-round dept
══════════════════════════════════════════════════════════════ */
function DepartmentCard({ dept, deptIndex, onUpdate, onRemove }: {
  dept: TrainingDepartment;
  deptIndex: number;
  onUpdate: (patch: Partial<TrainingDepartment>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingProgIdx, setEditingProgIdx] = useState<number | null>(null);
  const [addingProg, setAddingProg] = useState(false);
  const [editingName, setEditingName] = useState(false);

  const saveProgram = (progIdx: number | null, prog: TrainingProgram) => {
    const progs = [...(dept.programs ?? [])];
    if (progIdx === null) progs.push(prog); else progs[progIdx] = prog;
    onUpdate({ programs: progs });
    setEditingProgIdx(null);
    setAddingProg(false);
  };

  const removeProgram = (progIdx: number) => onUpdate({ programs: dept.programs.filter((_, i) => i !== progIdx) });

  const updateProgImages = (progIdx: number, imgs: ProgramImage[]) => {
    const progs = [...(dept.programs ?? [])];
    progs[progIdx] = { ...progs[progIdx], images: imgs };
    onUpdate({ programs: progs });
  };

  const programCount = dept.programs?.length ?? 0;
  const hasCover = !!dept.coverImage?.url;

  return (
    <div className={`${cardCls} transition-shadow hover:shadow-md`}>
      {/* ── header bar ── */}
      <div className="flex items-center gap-2 px-3 sm:px-4 py-3" style={{ backgroundColor: G3 }}>
        <GripVertical className="w-4 h-4 text-ink/20 flex-shrink-0 hidden sm:block" />

        {editingName ? (
          <input
            autoFocus
            defaultValue={dept.name}
            className={`${inputCls} flex-1 py-1.5 text-sm font-bold`}
            onBlur={e => { onUpdate({ name: e.target.value }); setEditingName(false); }}
            onKeyDown={e => {
              if (e.key === "Enter") { onUpdate({ name: (e.target as HTMLInputElement).value }); setEditingName(false); }
              if (e.key === "Escape") setEditingName(false);
            }}
          />
        ) : (
          <button onClick={() => setEditingName(true)} className="flex-1 min-w-0 text-start cursor-pointer group">
            <span className="text-sm font-black text-ink group-hover:text-ink/70 transition-colors truncate block">{dept.name}</span>
          </button>
        )}

        {/* badges — hide text on mobile, keep pill */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[10px] font-bold text-ink/40 hidden sm:inline">{programCount}p</span>
          {hasCover && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
              <span className="hidden sm:inline">Cover </span>✓
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={onRemove} className="p-2 rounded-lg hover:bg-red-50 cursor-pointer transition-colors">
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
          <button onClick={() => setExpanded(v => !v)} className="p-2 rounded-lg hover:bg-ink/6 cursor-pointer transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4 text-ink/50" /> : <ChevronDown className="w-4 h-4 text-ink/50" />}
          </button>
        </div>
      </div>

      {/* ── expanded body ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }} className="overflow-hidden">
            <div className="p-3 sm:p-4 space-y-4 border-t border-ink/8">

              {/* info fields */}
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Tagline</label>
                  <input className={inputCls} value={dept.tagline ?? ""} onChange={e => onUpdate({ tagline: e.target.value })} placeholder="e.g. Build real robots from day one" />
                </div>
                <div>
                  <label className={labelCls}>Description</label>
                  <textarea className={inputCls} rows={2} value={dept.description ?? ""} onChange={e => onUpdate({ description: e.target.value })} placeholder="What makes this department unique…" />
                </div>
              </div>

              {/* cover image */}
              <div>
                <p className={labelCls}>Cover Image</p>
                <DeptCoverManager deptIndex={deptIndex} coverImage={dept.coverImage ?? { url: "", publicId: "" }} onChanged={img => onUpdate({ coverImage: img })} />
              </div>

              {/* programs */}
              <div>
                <p className={sectionHead}><BookOpen className="w-4 h-4 text-ink/40" /> Programs in this department</p>
                <div className="space-y-2">
                  {(dept.programs ?? []).map((prog, pi) => (
                    <div key={pi}>
                      {editingProgIdx === pi ? (
                        <ProgramForm initial={prog} yearRoundMode onSave={p => saveProgram(pi, p)} onCancel={() => setEditingProgIdx(null)} />
                      ) : (
                        <ProgramRow
                          prog={prog}
                          index={pi}
                          trackId="yearRound"
                          deptIndex={deptIndex}
                          yearRoundMode
                          onEdit={() => { setEditingProgIdx(pi); setAddingProg(false); }}
                          onDelete={() => removeProgram(pi)}
                          onImagesChange={imgs => updateProgImages(pi, imgs)}
                        />
                      )}
                    </div>
                  ))}
                  {addingProg ? (
                    <ProgramForm yearRoundMode onSave={p => saveProgram(null, p)} onCancel={() => setAddingProg(false)} />
                  ) : (
                    <AddButton label="Add Program" onClick={() => { setAddingProg(true); setEditingProgIdx(null); }} />
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   YearRoundEditor
══════════════════════════════════════════════════════════════ */
function YearRoundEditor({ departments, faq, onDeptChange, onFaqChange }: {
  departments: TrainingDepartment[];
  faq: FaqItem[];
  onDeptChange: (d: TrainingDepartment[]) => void;
  onFaqChange: (f: FaqItem[]) => void;
}) {
  const [showFaq, setShowFaq] = useState(false);
  const [addingDept, setAddingDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");

  const updateDept = (i: number, patch: Partial<TrainingDepartment>) =>
    onDeptChange(departments.map((d, idx) => idx === i ? { ...d, ...patch } : d));
  const removeDept = (i: number) => onDeptChange(departments.filter((_, idx) => idx !== i));
  const addDept = () => {
    if (!newDeptName.trim()) return;
    onDeptChange([...departments, { name: newDeptName.trim(), tagline: "", description: "", coverImage: { url: "", publicId: "" }, programs: [] }]);
    setNewDeptName(""); setAddingDept(false);
  };

  return (
    <div className="space-y-3">

      {/* FAQ card */}
      <div className={cardCls}>
        <button onClick={() => setShowFaq(v => !v)}
          className="w-full flex items-center justify-between gap-3 px-3 sm:px-4 py-3 hover:bg-ink/3 transition-colors cursor-pointer">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: G }}>
              <HelpCircle className="w-4 h-4" style={{ color: CREAM }} />
            </div>
            <div className="text-start min-w-0">
              <p className="text-sm font-black text-ink">Shared FAQ</p>
              <p className="text-[11px] text-ink/40 truncate">{faq.length} question{faq.length !== 1 ? "s" : ""} — all department pages</p>
            </div>
          </div>
          {showFaq ? <ChevronUp className="w-4 h-4 text-ink/40 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-ink/40 flex-shrink-0" />}
        </button>
        <AnimatePresence initial={false}>
          {showFaq && (
            <motion.div key="faq" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="px-3 sm:px-4 pb-4 pt-1 border-t border-ink/8">
                <FaqEditor faq={faq} onChange={onFaqChange} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Departments */}
      {departments.map((dept, di) => (
        <DepartmentCard key={di} dept={dept} deptIndex={di} onUpdate={patch => updateDept(di, patch)} onRemove={() => removeDept(di)} />
      ))}

      {/* Add department */}
      {addingDept ? (
        <div className="flex gap-2">
          <input autoFocus className={`${inputCls} flex-1`} value={newDeptName} onChange={e => setNewDeptName(e.target.value)}
            placeholder="Department name" onKeyDown={e => { if (e.key === "Enter") addDept(); if (e.key === "Escape") setAddingDept(false); }} />
          <button onClick={addDept} className="px-4 py-2 rounded-xl text-sm font-bold cursor-pointer hover:opacity-90 flex-shrink-0" style={{ backgroundColor: G, color: CREAM }}><Check className="w-4 h-4" /></button>
          <button onClick={() => setAddingDept(false)} className="px-4 py-2 rounded-xl text-sm font-bold border border-ink/20 text-ink/60 hover:bg-ink/5 cursor-pointer flex-shrink-0"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <AddButton label="Add Department" onClick={() => setAddingDept(true)} icon={<Plus className="w-4 h-4" />} large />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TrackEditor — handles one track's fields + content
══════════════════════════════════════════════════════════════ */
function TrackEditor({ trackId, content, onChange }: { trackId: TrackId; content: TrainingPageContentData; onChange: (c: TrainingPageContentData) => void }) {
  const track = content.tracks[trackId] as any;

  const setField = (field: keyof TrackBase, value: string) =>
    onChange({ ...content, tracks: { ...content.tracks, [trackId]: { ...track, [field]: value } } });

  const setPrograms = (programs: TrainingProgram[]) =>
    onChange({ ...content, tracks: { ...content.tracks, [trackId]: { ...track, programs } } });

  const setDepartments = (departments: TrainingDepartment[]) =>
    onChange({ ...content, tracks: { ...content.tracks, [trackId]: { ...track, departments } } });

  const setFaq = (faq: FaqItem[]) =>
    onChange({ ...content, tracks: { ...content.tracks, [trackId]: { ...track, faq } } });

  return (
    <div className="space-y-4 pt-1">
      {/* Track meta fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Track Title</label>
          <input className={inputCls} value={track.title} onChange={e => setField("title", e.target.value)} placeholder="e.g. Summer Programs" />
        </div>
        <div>
          <label className={labelCls}>Subtitle</label>
          <input className={inputCls} value={track.subtitle} onChange={e => setField("subtitle", e.target.value)} placeholder="Short subtitle" />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Description</label>
          <textarea className={inputCls} rows={2} value={track.description} onChange={e => setField("description", e.target.value)} placeholder="1–2 sentences describing this track…" />
        </div>
      </div>

      <div className="border-t border-ink/8" />

      <p className={sectionHead}>
        {trackId === "yearRound"
          ? <><CalendarDays className="w-4 h-4 text-ink/40" /> Departments &amp; FAQ</>
          : <><BookOpen className="w-4 h-4 text-ink/40" /> Programs</>}
      </p>

      {trackId === "yearRound" ? (
        <YearRoundEditor
          departments={track.departments ?? []}
          faq={track.faq ?? []}
          onDeptChange={setDepartments}
          onFaqChange={setFaq}
        />
      ) : (
        <ProgramList
          programs={track.programs ?? []}
          trackId={trackId}
          showHours={trackId === "winter"}
          onChange={setPrograms}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   AddButton — reusable dashed add button
══════════════════════════════════════════════════════════════ */
function AddButton({ label, onClick, icon, large }: { label: string; onClick: () => void; icon?: React.ReactNode; large?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 font-bold border-2 border-dashed border-ink/20 text-ink/45 hover:border-ink/40 hover:text-ink/65 transition-all w-full justify-center cursor-pointer rounded-xl ${large ? "px-4 py-3 text-sm" : "px-3 py-2.5 text-xs"}`}
    >
      {icon ?? <Plus className={large ? "w-4 h-4" : "w-3.5 h-3.5"} />}
      {label}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function CLOTrainingContent() {
  const { content, setContent, isLoading, isSaving, error, fetchContent, saveContent } = useCLOTrainingContent();
  const [activeLang, setActiveLang] = useState<"ar" | "en">("ar");
  const [activeTrack, setActiveTrack] = useState<TrackId>("summer");
  const [saved, setSaved] = useState(false);

  const { t: tAr } = useTranslation("training", { lng: "ar" });
  const { t: tEn } = useTranslation("training", { lng: "en" });
  const getI18nFallback = (lang: "ar" | "en") => buildContentFromI18n(lang, lang === "ar" ? tAr : tEn);

  useEffect(() => {
    fetchContent(activeLang, getI18nFallback(activeLang));
  }, [activeLang, fetchContent]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchLang = (lang: "ar" | "en") => {
    setActiveLang(lang);
    setActiveTrack("summer");
    setSaved(false);
  };

  const setStatsValue = (key: keyof TrainingPageContentData["statsValues"], value: string) => {
    if (!content) return;
    setContent({ ...content, statsValues: { ...content.statsValues, [key]: value } });
  };

  const handleSave = async () => {
    if (!content) return;
    try {
      await saveContent(activeLang, content);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* error in hook */ }
  };

  const wc = content ?? getI18nFallback(activeLang);

  const STATS_META: { key: keyof TrainingPageContentData["statsValues"]; label: string; shortLabel: string; icon: React.ElementType }[] = [
    { key: "studentsTrained", label: "Students Trained", shortLabel: "Students",  icon: Users },
    { key: "programTracks",   label: "Program Tracks",   shortLabel: "Tracks",    icon: BarChart3 },
    { key: "yearsExperience", label: "Years Experience", shortLabel: "Years Exp", icon: Award },
    { key: "handsOnLearning", label: "Hands-On",         shortLabel: "Hands-On",  icon: Check },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f5f4ef" }}>

      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-30 border-b border-ink/10 shadow-sm" style={{ backgroundColor: "#fff" }}>
        <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">

          {/* left: icon + title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: G }}>
              <FileText className="w-4 h-4" style={{ color: CREAM }} />
            </div>
            <div className="hidden sm:block min-w-0">
              <p className="text-sm font-black text-ink leading-tight">Training Content</p>
              <p className="text-[11px] text-ink/40 leading-tight">Public training page editor</p>
            </div>
          </div>

          {/* center: lang toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl flex-shrink-0" style={{ backgroundColor: G6 }}>
            {(["ar", "en"] as const).map(lang => (
              <button key={lang} onClick={() => switchLang(lang)}
                className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer"
                style={activeLang === lang
                  ? { backgroundColor: G, color: CREAM }
                  : { color: `${G}80` }
                }>
                <Languages className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {lang === "ar" ? "العربية" : "English"}
              </button>
            ))}
          </div>

          {/* right: save */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer hover:opacity-90 disabled:opacity-50 flex-shrink-0"
            style={{ backgroundColor: saved ? "#16a34a" : G, color: CREAM }}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span className="hidden sm:inline">{isSaving ? "Saving…" : saved ? "Saved!" : "Save"}</span>
          </button>
        </div>
      </div>

      {/* ── main content ── */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">

        {/* error */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-24 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
            <span className="text-sm font-semibold text-ink/40">Loading content…</span>
          </div>
        ) : (
          <motion.div key={activeLang} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-4">

            {/* ── Hero Stats card ── */}
            <div className={cardCls}>
              <div className="px-4 py-3 border-b border-ink/8 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-ink/40 flex-shrink-0" />
                <h2 className="text-sm font-black text-ink">Hero Stats</h2>
                <span className="text-[11px] text-ink/35 font-medium hidden sm:inline">Numbers shown in the hero section</span>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {STATS_META.map(({ key, label, shortLabel, icon: Icon }) => (
                  <div key={key} className="space-y-1.5">
                    <label className={labelCls + " flex items-center gap-1"}>
                      <Icon className="w-3 h-3 flex-shrink-0" />
                      <span className="sm:hidden">{shortLabel}</span>
                      <span className="hidden sm:inline">{label}</span>
                    </label>
                    <input className={inputCls + " text-center font-bold text-base"} value={wc.statsValues[key]} onChange={e => setStatsValue(key, e.target.value)} placeholder="2200+" />
                  </div>
                ))}
              </div>
            </div>

            {/* ── Track tab bar ── */}
            <div className={cardCls}>
              {/* tabs — icon+short on mobile, icon+full on desktop */}
              <div className="flex border-b border-ink/8 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {TRACK_IDS.map(id => {
                  const { Icon, label, shortLabel, color } = TRACK_META[id];
                  const isActive = activeTrack === id;
                  const count = id === "yearRound"
                    ? (wc.tracks.yearRound.departments?.length ?? 0)
                    : ((wc.tracks[id] as any).programs?.length ?? 0);
                  return (
                    <button
                      key={id}
                      onClick={() => setActiveTrack(id)}
                      className="flex-1 sm:flex-none flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 px-2 sm:px-5 py-2.5 sm:py-3.5 text-xs sm:text-sm font-bold transition-all cursor-pointer relative border-b-2 min-w-0"
                      style={isActive
                        ? { borderBottomColor: color, color: G }
                        : { borderBottomColor: "transparent", color: `${G}50` }
                      }
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: isActive ? color : undefined }} />
                      <span className="sm:hidden text-[10px] font-bold truncate">{shortLabel}</span>
                      <span className="hidden sm:inline">{label}</span>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={isActive
                          ? { backgroundColor: `${color}20`, color }
                          : { backgroundColor: G10, color: `${G}50` }
                        }
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* track body */}
              <div className="p-3 sm:p-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTrack}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                  >
                    <TrackEditor
                      trackId={activeTrack}
                      content={wc}
                      onChange={setContent}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* ── Bottom save ── */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-6">
              <p className="text-xs text-ink/35 text-center sm:text-left">
                Editing: <span className="font-bold">{activeLang === "ar" ? "Arabic" : "English"}</span> content
              </p>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 px-8 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer hover:opacity-90 disabled:opacity-50 shadow-md"
                style={{ backgroundColor: saved ? "#16a34a" : G, color: CREAM }}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {isSaving ? "Saving…" : saved ? "Saved!" : "Save All Changes"}
              </button>
            </div>

          </motion.div>
        )}
      </div>
    </div>
  );
}
