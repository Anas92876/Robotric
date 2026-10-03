import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ImageIcon, ImagePlus, Images, Layers, Wrench } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { useReceptionGallery } from '../../../hooks';
import { GalleryGrid } from '../../../components/gallery/GalleryGrid';
import { GalleryUploadModal } from '../../../components/gallery/GalleryUploadModal';
import { cn } from '../../../lib/utils';
import { readApiError } from '../../../app/apiError';
import { Button, ConfirmDialog, EmptyState, PageHeader, Panel, StatTile } from '../../../ui';

type TypeFilter = 'all' | 'moment' | 'project';

/** Reception: photos of each group's moments and projects — browse by group, upload moments, remove photos. */
export default function GalleryPage() {
  const { t } = useTranslation('dashboardReception');
  const toast = useToast();
  const { images, groups, isLoading, uploadMomentImage, getAllGroups, getGroupsGallery, deleteImage } = useReceptionGallery();
  const [selected, setSelected] = useState<string[] | null>(null); // null = not chosen yet (all groups)
  const [type, setType] = useState<TypeFilter>('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadGroups, setUploadGroups] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const lastDeleting = useRef<string | null>(null);
  if (deleting) lastDeleting.current = deleting;

  useEffect(() => {
    void getAllGroups();
  }, [getAllGroups]);

  // Every group is shown until the person narrows it down
  const shownGroups = selected ?? groups.map((g) => g._id);
  const shownKey = shownGroups.join(',');
  useEffect(() => {
    void getGroupsGallery(shownKey ? shownKey.split(',') : []);
  }, [shownKey, getGroupsGallery]);

  const toggle = (id: string) =>
    setSelected((cur) => {
      const base = cur ?? groups.map((g) => g._id);
      const next = base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
      return next.length === groups.length ? null : next;
    });
  const visible = images.filter((i) => type === 'all' || i.type === type);
  const reload = () => getGroupsGallery(shownGroups);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('photos.title')}
        description={t('photos.subtitle')}
        actions={
          <Button icon={<ImagePlus />} disabled={groups.length === 0} onClick={() => { setUploadGroups(selected ?? []); setUploadOpen(true); }}>
            {t('photos.upload')}
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<Images />} tint="bg-tint-leaf" label={t('photos.all')} value={images.length} loading={isLoading && images.length === 0} onClick={() => setType('all')} active={type === 'all'} />
        <StatTile icon={<ImageIcon />} tint="bg-tint-straw" label={t('photos.moments')} value={images.filter((i) => i.type === 'moment').length} loading={isLoading && images.length === 0} onClick={() => setType('moment')} active={type === 'moment'} />
        <StatTile icon={<Wrench />} tint="bg-tint-sage" label={t('photos.projects')} value={images.filter((i) => i.type === 'project').length} loading={isLoading && images.length === 0} onClick={() => setType('project')} active={type === 'project'} />
      </div>

      <Panel>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <Layers className="size-4 text-ink-3" aria-hidden />
            {t('photos.groups')}
          </p>
          {selected && (
            <button type="button" onClick={() => setSelected(null)} className="rounded-md text-sm font-medium text-ink underline underline-offset-2 focus-visible:focus-ring">
              {t('photos.showAll')}
            </button>
          )}
        </div>
        {groups.length === 0 && !isLoading ? (
          <p className="text-sm text-ink-4">{t('photos.noGroups')}</p>
        ) : (
          <div role="group" aria-label={t('photos.groups')} className="flex flex-wrap gap-2">
            {groups.map((g) => {
              const on = shownGroups.includes(g._id);
              return (
                <button
                  key={g._id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(g._id)}
                  className={cn('inline-flex h-9 items-center gap-1.5 rounded-pill border px-3.5 text-sm transition-colors focus-visible:focus-ring', on ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink-2 hover:border-ink')}
                >
                  {on && <Check className="size-3.5" aria-hidden />}
                  {g.name}
                  {g.courseId?.title && <span className={cn('text-xs', on ? 'text-white/70' : 'text-ink-4')}>· {g.courseId.title}</span>}
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      {shownGroups.length === 0 ? (
        <Panel>
          <EmptyState icon={<Layers />} title={t('photos.pickGroups')} />
        </Panel>
      ) : !isLoading && visible.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Images />}
            title={t('photos.empty')}
            action={<Button variant="secondary" icon={<ImagePlus />} onClick={() => { setUploadGroups(selected ?? []); setUploadOpen(true); }}>{t('photos.upload')}</Button>}
          />
        </Panel>
      ) : (
        <GalleryGrid images={visible} canDelete onDelete={(id) => setDeleting(id)} isLoading={isLoading} />
      )}

      <GalleryUploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        type="moment"
        isLoading={uploading}
        groups={groups.map((g) => ({ _id: g._id, name: g.name }))}
        selectedGroupIds={uploadGroups}
        onSelectedGroupIdsChange={setUploadGroups}
        onUpload={async (file: File, title?: string, description?: string) => {
          if (uploadGroups.length === 0) return;
          setUploading(true);
          try {
            await uploadMomentImage(uploadGroups, file, title, description);
            toast.success(t('photos.toast.uploaded'));
            await reload();
          } catch (err) {
            toast.error(t('enrollments.errorTitle'), readApiError(err).message);
            throw err;
          } finally {
            setUploading(false);
          }
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        tone="danger"
        title={t('photos.deleteTitle')}
        message={t('photos.deleteText')}
        confirmLabel={t('photos.delete')}
        cancelLabel={t('enrollments.cancel')}
        onConfirm={() => {
          const id = deleting!;
          setDeleting(null);
          void deleteImage(id)
            .then(() => { toast.success(t('photos.toast.deleted')); return reload(); })
            .catch((err) => toast.error(t('enrollments.errorTitle'), readApiError(err).message));
        }}
      />
    </div>
  );
}
