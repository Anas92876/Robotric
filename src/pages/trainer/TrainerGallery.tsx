import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Image as ImageIcon,
  Plus,
  Search,
  Filter,
  AlertCircle,
  RefreshCw,
  Users,
  Trash2,
} from "lucide-react";
import { useTrainerGallery } from "../../hooks";
import { useTrainerGroups } from "../../hooks/trainer/useTrainerGroups";
import {
  CardComponent,
  CardBody,
  Button,
  LoadingState,
  Alert,
  Input,
  Select,
  Modal,
} from "../../components/ui";
import { GalleryGrid } from "../../components/gallery/GalleryGrid";
import { GalleryUploadModal } from "../../components/gallery/GalleryUploadModal";
import { useTranslation } from 'react-i18next';

export default function TrainerGallery() {
  const { images, isLoading, error, getGroupGallery, uploadMomentImage, uploadProjectImage, deleteImage } = useTrainerGallery();
  const { groups } = useTrainerGroups({});
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardTrainer']);
  const isRTL = i18n.language === 'ar';
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<"moment" | "project">("moment");
  const [isUploading, setIsUploading] = useState(false);
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (selectedGroup) {
      getGroupGallery(selectedGroup);
    }
  }, [selectedGroup, getGroupGallery]);

  const filteredImages = images.filter((image) => {
    if (typeFilter === "all") return true;
    return image.type === typeFilter;
  });

  const handleUpload = async (file: File, title?: string, description?: string) => {
    if (!selectedGroup) return;

    try {
      setIsUploading(true);
      if (uploadType === "moment") {
        await uploadMomentImage(selectedGroup, file, title, description);
      } else {
        // For project images, we'd need projectId - this would need to be passed or selected
        // For now, just upload as moment
        await uploadMomentImage(selectedGroup, file, title, description);
      }
      await getGroupGallery(selectedGroup);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteImageId) return;

    try {
      setIsDeleting(true);
      await deleteImage(deleteImageId);
      setDeleteImageId(null);
      if (selectedGroup) {
        await getGroupGallery(selectedGroup);
      }
    } catch (err) {
      console.error("Failed to delete image:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  if (isLoading && images.length === 0 && selectedGroup) {
    return <LoadingState type="skeleton" text={t('dashboardTrainer:loadingGallery')} />;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-4xl font-bold inline-block group-hover:scale-105 transition-transform duration-300" style={{ 
              color: '#003300',
              backgroundClip: 'text'
            }}>
              {t('dashboardTrainer:gallery')}
            </h1>
            <p className="mt-2 transition-colors duration-300" style={{ color: '#003300' + 'CC' }}>
              {t('dashboardTrainer:gallerySubtitle')}
            </p>
          </div>
          {selectedGroup && (
            <Button
              variant="primary"
              leftIcon={<Plus className="w-5 h-5" />}
              onClick={() => {
                setUploadType("moment");
                setShowUploadModal(true);
              }}
            >
              {t('dashboardTrainer:uploadImage')}
            </Button>
          )}
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div className="flex gap-4 flex-wrap">
        <Select
          value={selectedGroup}
          onChange={(value) => setSelectedGroup(value)}
          options={[
            { value: "", label: t('dashboardTrainer:selectGroup') },
            ...(groups || []).map((group) => ({
              value: group._id,
              label: group.name,
            })),
          ]}
          leftIcon={<Users className="w-4 h-4" />}
        />
        {selectedGroup && (
          <Select
            value={typeFilter}
            onChange={(value) => setTypeFilter(value)}
            options={[
              { value: "all", label: t('dashboardTrainer:allTypes') },
              { value: "moment", label: t('dashboardTrainer:moments') },
              { value: "project", label: t('dashboardTrainer:projects') },
            ]}
            leftIcon={<Filter className="w-4 h-4" />}
          />
        )}
      </motion.div>

      {/* Gallery */}
      {!selectedGroup ? (
        <motion.div>
          <CardComponent variant="glass">
            <CardBody>
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-white/20" />
                <p className="text-white/60 text-lg mb-2">{t('dashboardTrainer:selectGroupForGallery')}</p>
                <p className="text-white/40 text-sm">
                  {t('dashboardTrainer:selectGroupForGalleryLabel')}
                </p>
              </div>
            </CardBody>
          </CardComponent>
        </motion.div>
      ) : (
        <motion.div>
          <GalleryGrid
            images={filteredImages}
            onDelete={(imageId) => setDeleteImageId(imageId)}
            canDelete={true}
            isLoading={isLoading}
          />
        </motion.div>
      )}

      {/* Upload Modal */}
      <GalleryUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        type={uploadType}
        isLoading={isUploading}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteImageId}
        onClose={() => setDeleteImageId(null)}
        title={t('dashboardTrainer:deleteImageTitle')}
      >
        <div className="space-y-4">
          <p className="text-white/80">
            {t('dashboardTrainer:deleteImageConfirmText')}
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteImageId(null)}
              disabled={isDeleting}
            >
              {t('dashboardCommon:cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={isDeleting}
              isLoading={isDeleting}
            >
              {t('dashboardCommon:delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
