import { useRef, useState } from "react";
import { ImagePlus, X, Loader2, ZoomIn } from "lucide-react";
import { api } from "../../lib/api";

interface UploadedImage {
  url: string;
  publicId: string;
  name?: string;
}

interface TaskImageUploadProps {
  taskId: string;
  images: UploadedImage[];
  uploadUrl: string;      // e.g. /cto/internal/tasks/:id/attachments
  deleteUrl: (publicId: string) => string; // returns the DELETE url
  onChanged: (images: UploadedImage[]) => void;
  readonly?: boolean;
  label?: string;
}

export default function TaskImageUpload({
  taskId,
  images,
  uploadUrl,
  deleteUrl,
  onChanged,
  readonly = false,
  label = "Attachments",
}: TaskImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append("images", f));
      const res = await api.post(uploadUrl, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChanged(res.data.data);
    } catch (e: any) {
      setError(e.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (publicId: string) => {
    setDeletingId(publicId);
    try {
      await api.delete(deleteUrl(encodeURIComponent(publicId)));
      onChanged(images.filter(i => i.publicId !== publicId));
    } catch (e: any) {
      setError(e.response?.data?.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-ink">{label}</label>
        {!readonly && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border border-ink/20 text-ink/60 hover:border-ink/40 hover:text-ink transition-colors disabled:opacity-40"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
            {uploading ? "Uploading…" : "Add images"}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {images.length === 0 && (
        <p className="text-xs text-ink/30 py-1">No images yet.</p>
      )}

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map(img => (
            <div key={img.publicId} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-ink/10 bg-ink/4">
              <img
                src={img.url}
                alt={img.name || "attachment"}
                className="w-full h-full object-cover"
              />
              {/* Overlay actions */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => setLightbox(img.url)}
                  className="p-1 bg-white/90 rounded-full hover:bg-white transition-colors"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-ink" />
                </button>
                {!readonly && (
                  <button
                    type="button"
                    onClick={() => handleDelete(img.publicId)}
                    disabled={deletingId === img.publicId}
                    className="p-1 bg-white/90 rounded-full hover:bg-red-50 transition-colors"
                  >
                    {deletingId === img.publicId
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                      : <X className="w-3.5 h-3.5 text-red-500" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="preview"
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
