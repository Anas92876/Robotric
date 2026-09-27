import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Link2,
  Loader2,
  X,
  ZoomIn,
  Plus,
  Check,
  Paperclip,
} from "lucide-react";
import { api } from "../../lib/api";

interface SubmissionImage {
  url: string;
  publicId: string;
  uploadedBy?: string;
}

interface Submission {
  images: SubmissionImage[];
  links: string[];
  note: string;
}

interface SubmissionPanelProps {
  taskId: string;
  mode: "employee" | "cto";
  initialSubmission?: Submission;
}

const emptySubmission: Submission = { images: [], links: [], note: "" };

export default function SubmissionPanel({ taskId, mode, initialSubmission }: SubmissionPanelProps) {
  const [open, setOpen] = useState(false);
  // Every task list the panel is opened from already includes the submission.
  const [submission, setSubmission] = useState<Submission>(initialSubmission || emptySubmission);

  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const [linkInput, setLinkInput] = useState("");
  const [linkError, setLinkError] = useState("");
  const [savingLinks, setSavingLinks] = useState(false);

  const [note, setNote] = useState(initialSubmission?.note || "");
  const [savingNote, setSavingNote] = useState(false);

  const [uploadError, setUploadError] = useState("");

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError("");
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append("images", f));
      const res = await api.post(`/engineer/tasks/${taskId}/submission/images`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSubmission(prev => ({ ...prev, images: res.data.data.images }));
    } catch (e: any) {
      setUploadError(e.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (publicId: string) => {
    setDeletingId(publicId);
    try {
      await api.delete(`/engineer/tasks/${taskId}/submission/images/${encodeURIComponent(publicId)}`);
      setSubmission(prev => ({ ...prev, images: prev.images.filter(i => i.publicId !== publicId) }));
    } catch { /* silent */ } finally {
      setDeletingId(null);
    }
  };

  const handleAddLink = async () => {
    const trimmed = linkInput.trim();
    if (!trimmed) return;
    if (!/^https:\/\/.+/.test(trimmed)) {
      setLinkError("Link must start with https://");
      return;
    }
    setLinkError("");
    setSavingLinks(true);
    try {
      const newLinks = [...submission.links, trimmed];
      const res = await api.patch(`/engineer/tasks/${taskId}/submission/links`, { links: newLinks, note });
      setSubmission(prev => ({ ...prev, links: res.data.data.links }));
      setLinkInput("");
    } catch (e: any) {
      setLinkError(e.response?.data?.message || "Failed to add link");
    } finally {
      setSavingLinks(false);
    }
  };

  const handleRemoveLink = async (idx: number) => {
    const newLinks = submission.links.filter((_, i) => i !== idx);
    setSavingLinks(true);
    try {
      const res = await api.patch(`/engineer/tasks/${taskId}/submission/links`, { links: newLinks, note });
      setSubmission(prev => ({ ...prev, links: res.data.data.links }));
    } catch { /* silent */ } finally {
      setSavingLinks(false);
    }
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      await api.patch(`/engineer/tasks/${taskId}/submission/links`, { links: submission.links, note });
    } catch { /* silent */ } finally {
      setSavingNote(false);
    }
  };

  const hasContent = submission.images.length > 0 || submission.links.length > 0 || submission.note;
  const isEmployee = mode === "employee";

  return (
    <div className="mt-2 border-t border-[#003300]/8 pt-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-xs text-[#003300]/50 hover:text-[#003300]/80 transition-colors w-full"
      >
        <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="font-medium">
          {isEmployee ? "My Submission" : "Submission"}
          {hasContent && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[#003300]/10 text-[#003300]/60">
              {submission.images.length + submission.links.length}
            </span>
          )}
        </span>
        {open ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-3">
              {/* Images section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-[#003300]/50 uppercase tracking-wide">Images</span>
                  {isEmployee && (
                    <label className={`flex items-center gap-1 text-[10px] cursor-pointer px-2 py-0.5 rounded border border-[#003300]/15 text-[#003300]/50 hover:border-[#003300]/30 hover:text-[#003300] transition-colors ${uploading ? "opacity-40 pointer-events-none" : ""}`}>
                      {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
                      {uploading ? "Uploading…" : "Upload"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={e => handleImageUpload(e.target.files)}
                      />
                    </label>
                  )}
                </div>
                {uploadError && <p className="text-[10px] text-red-500 mb-1">{uploadError}</p>}
                {submission.images.length === 0 ? (
                  <p className="text-[10px] text-[#003300]/25 py-1">No images.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {submission.images.map(img => (
                      <div key={img.publicId} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-[#003300]/10 bg-[#003300]/4">
                        <img src={img.url} alt="submission" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                          <button type="button" onClick={() => setLightbox(img.url)} className="p-1 bg-white/90 rounded-full">
                            <ZoomIn className="w-3 h-3 text-[#003300]" />
                          </button>
                          {isEmployee && (
                            <button type="button" onClick={() => handleDeleteImage(img.publicId)} disabled={!!deletingId} className="p-1 bg-white/90 rounded-full">
                              {deletingId === img.publicId ? <Loader2 className="w-3 h-3 animate-spin text-red-400" /> : <X className="w-3 h-3 text-red-400" />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Links section */}
              <div>
                <span className="text-[10px] font-semibold text-[#003300]/50 uppercase tracking-wide block mb-1.5">Links</span>
                {submission.links.length === 0 && !isEmployee && (
                  <p className="text-[10px] text-[#003300]/25 py-1">No links.</p>
                )}
                {submission.links.map((link, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 mb-1">
                    <Link2 className="w-3 h-3 text-[#003300]/30 flex-shrink-0" />
                    <a href={link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline truncate flex-1">{link}</a>
                    {isEmployee && (
                      <button type="button" onClick={() => handleRemoveLink(idx)} disabled={savingLinks} className="text-[#003300]/20 hover:text-red-400 transition-colors flex-shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                {isEmployee && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <input
                      type="url"
                      placeholder="https://..."
                      value={linkInput}
                      onChange={e => { setLinkInput(e.target.value); setLinkError(""); }}
                      onKeyDown={e => e.key === "Enter" && handleAddLink()}
                      className="flex-1 text-[10px] px-2 py-1 rounded border border-[#003300]/15 bg-white text-[#003300] focus:outline-none focus:ring-1 focus:ring-[#003300]/25"
                    />
                    <button
                      type="button"
                      onClick={handleAddLink}
                      disabled={savingLinks || !linkInput.trim()}
                      className="p-1.5 rounded bg-[#003300]/8 hover:bg-[#003300]/15 transition-colors disabled:opacity-40"
                    >
                      {savingLinks ? <Loader2 className="w-3 h-3 animate-spin text-[#003300]" /> : <Plus className="w-3 h-3 text-[#003300]" />}
                    </button>
                  </div>
                )}
                {linkError && <p className="text-[10px] text-red-500 mt-1">{linkError}</p>}
              </div>

              {/* Note section */}
              <div>
                <span className="text-[10px] font-semibold text-[#003300]/50 uppercase tracking-wide block mb-1.5">Note</span>
                {isEmployee ? (
                  <div className="space-y-1">
                    <textarea
                      rows={2}
                      placeholder="Any notes for the manager…"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      className="w-full text-xs px-2 py-1.5 rounded border border-[#003300]/15 bg-white text-[#003300] focus:outline-none focus:ring-1 focus:ring-[#003300]/25 resize-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveNote}
                      disabled={savingNote}
                      className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-[#003300]/8 hover:bg-[#003300]/15 transition-colors disabled:opacity-40 text-[#003300]/60"
                    >
                      {savingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Save note
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-[#003300]/60">{submission.note || <span className="text-[#003300]/25">No note.</span>}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="preview" className="max-w-full max-h-full rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
