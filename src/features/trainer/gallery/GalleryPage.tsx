import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ImageIcon, ImagePlus, Images, Wrench } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { useTrainerGallery } from '../../../hooks';
import { GalleryGrid } from '../../../components/gallery/GalleryGrid';
import { GalleryUploadModal } from '../../../components/gallery/GalleryUploadModal';
import { readApiError } from '../../../app/apiError';
import { Button, ConfirmDialog, EmptyState, PageHeader, Panel, SelectInput, StatTile } from '../../../ui';
import { useTrainerGroupOptions } from '../sessions/api';

type TypeFilter = 'all' | 'moment' | 'project';

/** Photos of one of the trainer's groups: class moments and project photos. */
export default function GalleryPage() {
  const { t } = useTranslation('dashboardTrainer');
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const groups = useTrainerGroupOptions();
  const options = (groups.data ?? []).filter((g) => g.status === 'active' || g._id === params.get('group'));
  const groupId = params.get('group') ?? '';
  useEffect(() => {
    if (!groupId && options.length) setParams({ group: options[0]._id }, { replace: true });
  }, [groupId, options, setParams]);
  const { images, isLoading, getGroupGallery, uploadMomentImage, deleteImage } = useTrainerGallery();
  const [type, setType] = useState<TypeFilter>('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (groupId) void getGroupGallery(groupId).catch(() => undefined);
  }, [groupId, getGroupGallery]);
  const visible = images.filter((i) => type === 'all' || i.type === type);
  const loading = (isLoading && images.length === 0) || groups.isLoading;

  return (
    <div className="space-y-5">
      <PageHeader title={t('gal.title')} description={t('gal.subtitle')} actions={<Button icon={<ImagePlus />} disabled={!groupId} onClick={() => setUploadOpen(true)}>{t('gal.upload')}</Button>} />
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<Images />} tint="bg-tint-leaf" label={t('gal.all')} value={images.length} loading={loading} onClick={() => setType('all')} active={type === 'all'} />
        <StatTile icon={<ImageIcon />} tint="bg-tint-straw" label={t('gal.moments')} value={images.filter((i) => i.type === 'moment').length} loading={loading} onClick={() => setType('moment')} active={type === 'moment'} />
        <StatTile icon={<Wrench />} tint="bg-tint-sage" label={t('gal.projects')} value={images.filter((i) => i.type === 'project').length} loading={loading} onClick={() => setType('project')} active={type === 'project'} />
      </div>
      <Panel className="flex flex-wrap items-center gap-3 py-4 sm:py-4">
        <label htmlFor="gal-group" className="text-sm font-medium text-ink">{t('tk.group')}</label>
        <SelectInput id="gal-group" value={groupId} onChange={(e) => { setParams({ group: e.target.value }); setType('all'); }} className="w-auto min-w-52">
          {!options.length && <option value="">{t('tk.noGroups')}</option>}
          {options.map((g) => <option key={g._id} value={g._id}>{g.name}{g.courseId?.title ? ` — ${g.courseId.title}` : ''}</option>)}
        </SelectInput>
      </Panel>
      {!loading && visible.length === 0 ? (
        <Panel><EmptyState icon={<Images />} title={t('gal.empty')} description={t('gal.emptyHint')} action={groupId ? <Button variant="secondary" icon={<ImagePlus />} onClick={() => setUploadOpen(true)}>{t('gal.upload')}</Button> : undefined} /></Panel>
      ) : (
        <GalleryGrid images={visible} canDelete onDelete={(id) => setDeleting(id)} isLoading={loading} />
      )}

      <GalleryUploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        type="moment"
        isLoading={uploading}
        onUpload={async (file: File, title?: string, description?: string) => {
          setUploading(true);
          try {
            await uploadMomentImage(groupId, file, title, description);
            toast.success(t('gal.toast.uploaded'));
            await getGroupGallery(groupId);
          } catch (err) {
            toast.error(t('sp.actionError'), readApiError(err).message);
            throw err;
          } finally {
            setUploading(false);
          }
        }}
      />
      <ConfirmDialog
        open={!!deleting} onClose={() => setDeleting(null)} tone="danger" loading={removing}
        title={t('gal.deleteTitle')} message={t('gal.deleteText')} confirmLabel={t('gal.delete')} cancelLabel={t('sf.cancel')}
        onConfirm={() => {
          setRemoving(true);
          void deleteImage(deleting!)
            .then(() => { toast.success(t('gal.toast.deleted')); return getGroupGallery(groupId); })
            .catch((err) => toast.error(t('sp.actionError'), readApiError(err).message))
            .finally(() => { setRemoving(false); setDeleting(null); });
        }}
      />
    </div>
  );
}
