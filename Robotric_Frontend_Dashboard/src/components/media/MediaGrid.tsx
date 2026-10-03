import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Play, Music } from "lucide-react";
import { MediaLightbox } from "./MediaLightbox";
import type { RemoteMediaItem } from "./types";
import { formatDuration } from "./types";

interface MediaGridProps {
  items: RemoteMediaItem[];
  emptyLabel?: string;
}

export default function MediaGrid({ items, emptyLabel }: MediaGridProps) {
  const { t } = useTranslation("dashboardCommon");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (items.length === 0) {
    return <p className="text-xs text-ink/40 italic">{emptyLabel ?? t("media.none")}</p>;
  }

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {items.map((item, i) => (
          <button
            key={item._id}
            type="button"
            onClick={() => setLightboxIndex(i)}
            className="relative aspect-square rounded-lg overflow-hidden border border-ink/15 bg-ink/5 group"
          >
            {item.kind === 'image' && (
              <img src={item.url} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
            )}
            {item.kind === 'video' && (
              <>
                <video src={item.url} muted className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <Play className="w-5 h-5 text-white drop-shadow" fill="white" />
                </div>
              </>
            )}
            {item.kind === 'audio' && (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                <Music className="w-5 h-5 text-ink/50" />
                {item.durationSeconds !== undefined && (
                  <span className="text-[10px] text-ink/50 tabular-nums">{formatDuration(item.durationSeconds)}</span>
                )}
              </div>
            )}
          </button>
        ))}
      </div>

      <MediaLightbox
        items={items}
        index={lightboxIndex ?? 0}
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </>
  );
}
