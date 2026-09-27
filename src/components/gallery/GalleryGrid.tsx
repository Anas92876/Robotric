import React from 'react';
import { GalleryImage } from '../../hooks/student/useStudentGallery';
import { GalleryImageCard } from './GalleryImageCard';
import { motion } from 'framer-motion';

interface GalleryGridProps {
  images: GalleryImage[];
  onDelete?: (imageId: string) => void;
  canDelete?: boolean;
  isLoading?: boolean;
}

export const GalleryGrid: React.FC<GalleryGridProps> = ({
  images,
  onDelete,
  canDelete = false,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="aspect-square bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-white/60">No images found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
      {images.map((image, index) => (
        <motion.div
          key={image._id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: Math.min(index * 0.01, 0.3) }}
        >
          <GalleryImageCard
            image={image}
            onDelete={onDelete ? () => onDelete(image._id) : undefined}
            canDelete={canDelete}
          />
        </motion.div>
      ))}
    </div>
  );
};
