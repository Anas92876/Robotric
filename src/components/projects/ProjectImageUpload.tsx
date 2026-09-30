import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button, CardComponent, CardBody } from '../ui';

interface ProjectImageUploadProps {
  images: File[];
  onImagesChange: (images: File[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export const ProjectImageUpload: React.FC<ProjectImageUploadProps> = ({
  images,
  onImagesChange,
  maxImages = 10,
  disabled = false,
}) => {
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !e.target.files) return;

    const files = Array.from(e.target.files);
    const remainingSlots = maxImages - images.length;
    const validFiles = files.slice(0, remainingSlots);

    const newFiles = [...images, ...validFiles];
    onImagesChange(newFiles);

    // Create previews
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreviews((prev) => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    if (disabled) return;

    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    onImagesChange(newImages);
    setPreviews(newPreviews);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {previews.map((preview, index) => (
          <div key={index} className="relative group">
            <div className="relative border border-primary/20 rounded-lg overflow-hidden">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-48 object-cover"
              />
              {!disabled && (
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="mt-1 text-xs text-ink/60 truncate">
              {images[index]?.name}
            </div>
            <div className="text-xs text-ink/40">
              {formatFileSize(images[index]?.size || 0)}
            </div>
          </div>
        ))}

        {images.length < maxImages && (
          <div
            onClick={() => !disabled && fileInputRef.current?.click()}
            className={`border-2 border-dashed border-primary/30 rounded-lg p-6 text-center cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5 ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-primary/60" />
            <p className="text-sm text-ink/70 mb-1">
              Click to upload
            </p>
            <p className="text-xs text-ink/50">
              {maxImages - images.length} slot{maxImages - images.length !== 1 ? 's' : ''} remaining
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              disabled={disabled}
              className="hidden"
            />
          </div>
        )}
      </div>

      {images.length >= maxImages && (
        <p className="text-sm text-ink/60 text-center">
          Maximum {maxImages} images reached
        </p>
      )}
    </div>
  );
};
