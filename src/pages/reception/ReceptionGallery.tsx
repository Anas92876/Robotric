import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Image as ImageIcon,
  Plus,
  Filter,
  Users,
  Check,
} from "lucide-react";
import { useReceptionGallery } from "../../hooks";
import {
  CardComponent,
  CardBody,
  Button,
  LoadingState,
  Select,
} from "../../components/ui";
import { GalleryGrid } from "../../components/gallery/GalleryGrid";
import { GalleryUploadModal } from "../../components/gallery/GalleryUploadModal";
import { useTranslation } from 'react-i18next';

export default function ReceptionGallery() {
  const {
    images,
    groups,
    isLoading,
    getAllGroups,
    getGroupsGallery,
    uploadMomentImage,
    deleteImage,
  } = useReceptionGallery();
  const { i18n } = useTranslation(['dashboardCommon', 'dashboardReception']);
  const isRTL = i18n.language === 'ar';
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [uploadGroupIds, setUploadGroupIds] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    getAllGroups();
  }, [getAllGroups]);

  useEffect(() => {
    getGroupsGallery(selectedGroupIds);
  }, [selectedGroupIds, getGroupsGallery]);

  const filteredImages = images.filter((image) => {
    if (typeFilter === "all") return true;
    return image.type === typeFilter;
  });

  const toggleSelectedGroup = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const handleOpenUpload = () => {
    setUploadGroupIds(selectedGroupIds);
    setShowUploadModal(true);
  };

  const handleUpload = async (file: File, title?: string, description?: string) => {
    if (uploadGroupIds.length === 0) return;

    try {
      setIsUploading(true);
      await uploadMomentImage(uploadGroupIds, file, title, description);
      await getGroupsGallery(selectedGroupIds);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    try {
      await deleteImage(imageId);
      await getGroupsGallery(selectedGroupIds);
    } catch (err) {
      console.error("Failed to delete image:", err);
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

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <h1 className="text-4xl font-bold inline-block" style={{
              color: '#0f1f33',
              backgroundClip: 'text'
            }}>
              Gallery
            </h1>
            <p className="mt-2 transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>
              Manage gallery images for any group
            </p>
          </div>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-5 h-5" />}
            onClick={handleOpenUpload}
          >
            Upload Image
          </Button>
        </div>
      </motion.div>

      {/* Group Picker */}
      <motion.div>
        <CardComponent variant="glass">
          <CardBody>
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setShowGroupPicker((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium transition-colors"
                style={{ color: '#0f1f33' }}
              >
                <Users className="w-4 h-4" />
                {selectedGroupIds.length === 0
                  ? "All Groups"
                  : `${selectedGroupIds.length} group${selectedGroupIds.length > 1 ? "s" : ""} selected`}
              </button>
              <div className="flex items-center gap-2">
                {selectedGroupIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedGroupIds([])}
                    className="text-xs underline transition-colors"
                    style={{ color: '#0f1f33' + '99' }}
                  >
                    Clear selection
                  </button>
                )}
                {selectedGroupIds.length > 0 && (
                  <Select
                    value={typeFilter}
                    onChange={(value) => setTypeFilter(value)}
                    options={[
                      { value: "all", label: "All Types" },
                      { value: "moment", label: "Moments" },
                      { value: "project", label: "Projects" },
                    ]}
                    leftIcon={<Filter className="w-4 h-4" />}
                  />
                )}
              </div>
            </div>

            {showGroupPicker && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                {(groups || []).map((group) => {
                  const isSelected = selectedGroupIds.includes(group._id);
                  return (
                    <button
                      type="button"
                      key={group._id}
                      onClick={() => toggleSelectedGroup(group._id)}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm transition-colors text-left ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                      style={{
                        borderColor: isSelected ? '#0f1f33' : '#0f1f3333',
                        backgroundColor: isSelected ? '#0f1f331A' : 'transparent',
                        color: '#0f1f33',
                      }}
                    >
                      <span className="truncate">
                        {group.name}
                        {group.courseId?.title ? ` — ${group.courseId.title}` : ''}
                      </span>
                      {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
                    </button>
                  );
                })}
                {(groups || []).length === 0 && !isLoading && (
                  <p className="text-sm col-span-full text-center py-4" style={{ color: '#0f1f33' + '99' }}>
                    No groups found
                  </p>
                )}
              </div>
            )}
          </CardBody>
        </CardComponent>
      </motion.div>

      {/* Gallery */}
      {isLoading && images.length === 0 ? (
        <LoadingState type="skeleton" text="Loading gallery..." />
      ) : selectedGroupIds.length === 0 ? (
        <motion.div>
          <CardComponent variant="glass">
            <CardBody>
              <div className="text-center py-12">
                <ImageIcon className="w-16 h-16 mx-auto mb-4" style={{ color: '#0f1f33' + '33' }} />
                <p className="text-lg mb-2 transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>Select one or more groups</p>
                <p className="text-sm transition-colors duration-300" style={{ color: '#0f1f33' + '99' }}>
                  Choose groups above to view their gallery images
                </p>
              </div>
            </CardBody>
          </CardComponent>
        </motion.div>
      ) : (
        <motion.div>
          <GalleryGrid
            images={filteredImages}
            onDelete={handleDelete}
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
        type="moment"
        isLoading={isUploading}
        groups={groups?.map((g) => ({ _id: g._id, name: g.name }))}
        selectedGroupIds={uploadGroupIds}
        onSelectedGroupIdsChange={setUploadGroupIds}
      />
    </motion.div>
  );
}
