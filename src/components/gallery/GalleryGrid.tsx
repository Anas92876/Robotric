import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ImageOff, Trash2 } from 'lucide-react';
import { type GalleryImage } from '../../hooks/student/useStudentGallery';
import { useFormat } from '../../app/format';
import { Badge, Button, Dialog } from '../../ui';

interface GalleryGridProps {
  images: GalleryImage[];
  onDelete?: (imageId: string) => void;
  canDelete?: boolean;
  isLoading?: boolean;
}

/** One photo tile: the picture, its title, group and type; opens the viewer. */
function Tile({ image, onOpen, onDelete }: { image: GalleryImage; onOpen: () => void; onDelete?: () => void }) {
  const { t } = useTranslation('dashboardCommon');
  const [broken, setBroken] = useState(false);
  return (
    <figure className="group relative overflow-hidden rounded-card border border-line bg-paper shadow-card">
      <button type="button" onClick={onOpen} className="block w-full focus-visible:focus-ring" aria-label={t('photoGrid.open', { title: image.title || t('photoGrid.photo') })}>
        {broken ? (
          <span className="grid aspect-[4/3] w-full place-items-center bg-rail text-ink-4"><ImageOff className="size-7" aria-hidden /></span>
        ) : (
          <img src={image.thumbnailUrl || image.cloudinaryUrl} alt="" loading="lazy" onError={() => setBroken(true)} className="aspect-[4/3] w-full object-cover" />
        )}
      </button>
      <figcaption className="flex items-center gap-2 px-3 py-2.5">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink" dir="auto">{image.title || t('photoGrid.untitled')}</span>
          {image.groupId?.name && <span className="block truncate text-xs text-ink-4" dir="auto">{image.groupId.name}</span>}
        </span>
        <Badge tone={image.type === 'project' ? 'info' : 'neutral'}>{t(`photoGrid.type.${image.type}`)}</Badge>
      </figcaption>
      {onDelete && (
        // Always visible on touch screens; on desktop shown on hover or keyboard focus
        <button type="button" onClick={onDelete} aria-label={t('photoGrid.delete', { title: image.title || t('photoGrid.photo') })}
          className="absolute end-2 top-2 grid size-9 place-items-center rounded-full bg-paper/95 text-danger shadow-card focus-visible:focus-ring sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100">
          <Trash2 className="size-4" />
        </button>
      )}
    </figure>
  );
}

/** Grid of class photos with a full-size viewer (previous / next). */
export function GalleryGrid({ images, onDelete, canDelete = false, isLoading = false }: GalleryGridProps) {
  const { t } = useTranslation('dashboardCommon');
  const f = useFormat();
  const [open, setOpen] = useState<number | null>(null);
  const shown = open !== null ? images[open] : null;

  if (isLoading) {
    return <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="aspect-[4/3] animate-pulse rounded-card bg-rail" />)}</div>;
  }
  if (images.length === 0) return <p className="py-12 text-center text-sm text-ink-4">{t('photoGrid.none')}</p>;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {images.map((image, i) => (
          <Tile key={image._id} image={image} onOpen={() => setOpen(i)} onDelete={canDelete && onDelete ? () => onDelete(image._id) : undefined} />
        ))}
      </div>
      <Dialog open={!!shown} onClose={() => setOpen(null)} size="lg" title={shown?.title || t('photoGrid.photo')} description={shown ? [shown.groupId?.name, shown.uploadedBy?.name, f.date(shown.createdAt)].filter(Boolean).join(' · ') : ''} closeLabel={t('close')}>
        {shown && (
          <div>
            <img src={shown.cloudinaryUrl} alt={shown.title ?? ''} className="max-h-[65vh] w-full rounded-input bg-rail object-contain" />
            {shown.description && <p className="mt-3 whitespace-pre-line text-sm text-ink-2" dir="auto">{shown.description}</p>}
            {images.length > 1 && (
              <div className="mt-3 flex items-center justify-between">
                <Button variant="ghost" size="sm" icon={<ChevronLeft className="rtl:rotate-180" />} disabled={open === 0} onClick={() => setOpen((o) => (o ?? 1) - 1)}>{t('previous')}</Button>
                <span className="text-sm tabular-nums text-ink-3">{(open ?? 0) + 1} / {images.length}</span>
                <Button variant="ghost" size="sm" disabled={open === images.length - 1} onClick={() => setOpen((o) => (o ?? 0) + 1)}>{t('next')} <ChevronRight className="size-4 rtl:rotate-180" aria-hidden /></Button>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
}
