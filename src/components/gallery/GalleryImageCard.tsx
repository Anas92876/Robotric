import { useState, useEffect } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import { GalleryImage } from '../../hooks/student/useStudentGallery';
import { CardComponent, CardBody, Badge, Button } from '../ui';
import { motion } from 'framer-motion';

interface GalleryImageCardProps {
  image: GalleryImage;
  onDelete?: () => void;
  canDelete?: boolean;
}

export const GalleryImageCard: React.FC<GalleryImageCardProps> = ({
  image,
  onDelete,
  canDelete = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [currentThumbnailUrl, setCurrentThumbnailUrl] = useState<string | null>(null);
  const [fallbackAttempted, setFallbackAttempted] = useState(false);

  // Generate thumbnail URL from cloudinaryUrl if thumbnailUrl is missing or fails
  const getThumbnailUrl = (useFallback = false) => {
    // First try: Use thumbnailUrl if available and not using fallback
    if (!useFallback && image.thumbnailUrl) {
      const cleanUrl = image.thumbnailUrl.trim();
      console.log('[GalleryImageCard] Using thumbnailUrl:', cleanUrl, 'for image:', image._id);
      return cleanUrl;
    }
    
    // Fallback: Generate thumbnail from cloudinaryUrl
    if (image.cloudinaryUrl) {
      if (image.cloudinaryUrl.includes('res.cloudinary.com')) {
        // Insert transformation before the filename
        // This creates a 300x300 cropped thumbnail with auto quality and format
        const generated = image.cloudinaryUrl.replace(
          '/upload/',
          '/upload/w_300,h_300,c_fill,q_auto,f_auto/'
        );
        console.log('[GalleryImageCard] Generated thumbnail from cloudinaryUrl:', generated, 'for image:', image._id);
        return generated;
      }
      console.log('[GalleryImageCard] Using cloudinaryUrl directly:', image.cloudinaryUrl, 'for image:', image._id);
      return image.cloudinaryUrl;
    }
    
    console.warn('[GalleryImageCard] No thumbnailUrl or cloudinaryUrl available for image:', image._id);
    return null;
  };

  // Initialize thumbnail URL on mount and when image changes
  useEffect(() => {
    const initialUrl = getThumbnailUrl();
    setCurrentThumbnailUrl(initialUrl);
    setImageLoading(true);
    setImageError(false);
    setFallbackAttempted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image.thumbnailUrl, image.cloudinaryUrl, image._id]);

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.03, y: -4 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative group cursor-pointer"
        onClick={() => setShowLightbox(true)}
      >
        <CardComponent variant="glass" hover className="overflow-hidden border border-white/10 hover:border-primary/30 transition-all duration-300">
          <CardBody padding="none">
            <div className="relative aspect-square bg-gradient-to-br from-white/5 to-white/[0.02]">
              {imageLoading && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                </div>
              )}
              {currentThumbnailUrl && !imageError ? (
                <img
                  src={currentThumbnailUrl}
                  alt={image.title || 'Gallery image'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onLoad={() => {
                    console.log('[GalleryImageCard] Thumbnail loaded successfully:', currentThumbnailUrl, 'for image:', image._id);
                    setImageLoading(false);
                    setImageError(false);
                  }}
                  onError={(e) => {
                    console.error('[GalleryImageCard] Thumbnail failed to load:', currentThumbnailUrl, 'for image:', image._id);
                    console.error('[GalleryImageCard] Image object:', image);
                    
                    // Try fallback if we haven't already
                    if (!fallbackAttempted && image.thumbnailUrl && image.cloudinaryUrl) {
                      console.log('[GalleryImageCard] Attempting fallback to generated thumbnail from cloudinaryUrl');
                      setFallbackAttempted(true);
                      const fallbackUrl = getThumbnailUrl(true);
                      setCurrentThumbnailUrl(fallbackUrl);
                      setImageLoading(true);
                      setImageError(false);
                    } else {
                      // Both thumbnailUrl and fallback failed
                      console.error('[GalleryImageCard] Both thumbnailUrl and fallback failed. Showing placeholder.');
                      setImageError(true);
                      setImageLoading(false);
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <ImageIcon className="w-12 h-12 text-white/40" />
                  {imageError && (
                    <p className="text-xs text-white/40 text-center px-2">
                      Image unavailable
                    </p>
                  )}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileHover={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <ImageIcon className="w-10 h-10 text-white drop-shadow-lg" />
                </motion.div>
              </div>
              {canDelete && onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {image.title && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-3">
                  <p className="text-white font-medium text-sm truncate">{image.title}</p>
                  {image.type && (
                    <Badge variant="secondary" size="sm" className="mt-1.5">
                      {image.type}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardBody>
        </CardComponent>
      </motion.div>

      {/* Lightbox */}
      {showLightbox && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8"
          onClick={() => setShowLightbox(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative max-w-6xl max-h-full w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={image.cloudinaryUrl}
              alt={image.title || 'Gallery image'}
              className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-xl shadow-2xl"
              loading="lazy"
            />
            {(image.title || image.description) && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6 rounded-b-lg">
                {image.title && (
                  <h3 className="text-white font-semibold text-xl mb-2">{image.title}</h3>
                )}
                {image.description && (
                  <p className="text-white/90 text-sm leading-relaxed">{image.description}</p>
                )}
                {image.type && (
                  <Badge variant="secondary" size="sm" className="mt-3">
                    {image.type}
                  </Badge>
                )}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLightbox(false)}
              className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 border border-white/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </motion.div>
        </motion.div>
      )}
    </>
  );
};
