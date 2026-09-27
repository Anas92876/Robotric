import { useState, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle, Loader2, Users } from 'lucide-react';
import { Modal, Button, Input, Alert } from '../ui';

export interface GalleryUploadGroupOption {
  _id: string;
  name: string;
}

interface GalleryUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, title?: string, description?: string) => Promise<void>;
  type?: 'moment' | 'project';
  projectId?: string;
  isLoading?: boolean;
  /** When provided, shows a multi-select list so the image can be uploaded to one or many groups */
  groups?: GalleryUploadGroupOption[];
  selectedGroupIds?: string[];
  onSelectedGroupIdsChange?: (groupIds: string[]) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

export const GalleryUploadModal: React.FC<GalleryUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  type = 'moment',
  projectId,
  isLoading = false,
  groups,
  selectedGroupIds,
  onSelectedGroupIdsChange,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [groupError, setGroupError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showGroupPicker = Array.isArray(groups);

  useEffect(() => {
    if (isOpen) {
      setGroupError(null);
    }
  }, [isOpen]);

  const toggleGroup = (groupId: string) => {
    if (!onSelectedGroupIdsChange) return;
    const current = selectedGroupIds || [];
    if (current.includes(groupId)) {
      onSelectedGroupIdsChange(current.filter((id) => id !== groupId));
    } else {
      onSelectedGroupIdsChange([...current, groupId]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setFileError(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setFileError('Please select a valid image file (JPEG, PNG, WebP)');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`File size must not exceed 10MB. Current file size: ${formatFileSize(file.size)}`);
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setPreview(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    // Validate again before upload
    if (selectedFile.size > MAX_FILE_SIZE) {
      setFileError(`File size must not exceed 10MB. Current file size: ${formatFileSize(selectedFile.size)}`);
      return;
    }

    if (showGroupPicker && (!selectedGroupIds || selectedGroupIds.length === 0)) {
      setGroupError('Please select at least one group');
      return;
    }
    setGroupError(null);

    try {
      setUploadProgress(0);
      // Simulate progress (since we don't have actual upload progress from API)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await onUpload(selectedFile, title || undefined, description || undefined);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Small delay to show 100% before closing
      setTimeout(() => {
        handleClose();
      }, 300);
    } catch (err: any) {
      setFileError(err.message || 'Failed to upload image. Please try again.');
      setUploadProgress(0);
      console.error('Failed to upload:', err);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreview(null);
    setTitle('');
    setDescription('');
    setFileError(null);
    setUploadProgress(0);
    setGroupError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Upload ${type === 'moment' ? 'Moment' : 'Project'} Image`}>
      <div className="space-y-4">
        {/* Group Picker (multi-select) */}
        {showGroupPicker && (
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
              <Users className="w-4 h-4" />
              Upload to Group(s) *
            </label>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-white/20 bg-white/5 divide-y divide-white/10">
              {groups!.length === 0 ? (
                <p className="text-sm text-white/50 px-3 py-3">No groups available</p>
              ) : (
                groups!.map((group) => (
                  <label
                    key={group._id}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={(selectedGroupIds || []).includes(group._id)}
                      onChange={() => toggleGroup(group._id)}
                      disabled={isLoading}
                      className="accent-primary w-4 h-4"
                    />
                    <span className="text-sm text-white/90">{group.name}</span>
                  </label>
                ))
              )}
            </div>
            {groupError && (
              <p className="text-xs text-red-400 mt-1">{groupError}</p>
            )}
            {!!(selectedGroupIds && selectedGroupIds.length > 0) && (
              <p className="text-xs text-white/50 mt-1">
                {selectedGroupIds.length} group{selectedGroupIds.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        )}

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Image * <span className="text-white/50 text-xs">(Max 10MB)</span>
          </label>
          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-48 object-cover rounded-lg border border-white/20"
              />
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setPreview(null);
                  setFileError(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                disabled={isLoading}
                className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
              {selectedFile && (
                <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-sm rounded px-2 py-1">
                  <p className="text-xs text-white truncate">{selectedFile.name}</p>
                  <p className="text-xs text-white/60">{formatFileSize(selectedFile.size)}</p>
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={() => !isLoading && fileInputRef.current?.click()}
              className={`border-2 border-dashed border-white/30 rounded-lg p-8 text-center transition-all ${
                isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              {isLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm text-white/70">Uploading image...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto mb-2 text-white/60" />
                  <p className="text-sm text-white/70 mb-1">Click to upload or drag and drop</p>
                  <p className="text-xs text-white/50">JPEG, PNG, WebP (Max 10MB)</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                disabled={isLoading}
                className="hidden"
              />
            </div>
          )}
          
          {/* File Error */}
          {fileError && (
            <Alert variant="error" className="mt-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{fileError}</p>
              </div>
            </Alert>
          )}

          {/* Upload Progress */}
          {isLoading && uploadProgress > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/60">Uploading...</span>
                <span className="text-xs text-white/60">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Title (Optional)
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter image title"
            className="bg-white/5 border-white/20 text-white"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter image description"
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={isLoading}
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleUpload}
            disabled={!selectedFile || isLoading || !!fileError || (showGroupPicker && (!selectedGroupIds || selectedGroupIds.length === 0))}
            isLoading={isLoading}
            leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            type="button"
          >
            {isLoading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
