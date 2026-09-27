import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { RemoteMediaItem } from "./types";
import { formatDuration } from "./types";

interface MediaLightboxProps {
  items: RemoteMediaItem[];
  index: number;
  isOpen: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export function MediaLightbox({ items, index, isOpen, onClose, onIndexChange }: MediaLightboxProps) {
  const current = items[index];

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1);
      if (e.key === 'ArrowRight' && index < items.length - 1) onIndexChange(index + 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, index, items.length, onClose, onIndexChange]);

  if (!isOpen || !current) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/85 flex flex-col"
        onClick={onClose}
      >
        <div className="flex items-center justify-between px-4 py-3 text-white/80 text-sm">
          <span className="truncate">{current.name}</span>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 min-h-0" onClick={(e) => e.stopPropagation()}>
          {index > 0 && (
            <button
              onClick={() => onIndexChange(index - 1)}
              className="absolute left-2 sm:left-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {current.kind === 'image' && (
            <img src={current.url} alt={current.name} className="max-h-[75vh] max-w-full object-contain rounded-lg" />
          )}
          {current.kind === 'video' && (
            <video src={current.url} controls autoPlay className="max-h-[75vh] max-w-full rounded-lg" />
          )}
          {current.kind === 'audio' && (
            <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-xl p-6 text-center">
              <p className="text-white/70 text-sm mb-4">{current.name}{current.durationSeconds ? ` · ${formatDuration(current.durationSeconds)}` : ''}</p>
              <audio src={current.url} controls autoPlay className="w-full" />
            </div>
          )}

          {index < items.length - 1 && (
            <button
              onClick={() => onIndexChange(index + 1)}
              className="absolute right-2 sm:right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {items.length > 1 && (
          <div className="flex items-center justify-center gap-2 px-4 py-3 overflow-x-auto" onClick={(e) => e.stopPropagation()}>
            {items.map((item, i) => (
              <button
                key={item._id}
                onClick={() => onIndexChange(i)}
                className={`w-12 h-12 flex-shrink-0 rounded-md overflow-hidden border-2 transition-colors ${i === index ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'}`}
              >
                {item.kind === 'image' && <img src={item.url} alt="" className="w-full h-full object-cover" />}
                {item.kind === 'video' && <video src={item.url} muted className="w-full h-full object-cover" />}
                {item.kind === 'audio' && <div className="w-full h-full bg-white/10 flex items-center justify-center text-white text-[10px]">♪</div>}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
