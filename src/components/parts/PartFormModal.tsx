import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, Save, Loader, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api';
import { Modal, Button } from '../ui';

interface Part {
  _id?: string;
  name: string;
  category: string;
  description?: string;
  sku: string;
  group?: string;
  partNumber?: string;
}

interface PartFormModalProps {
  part?: Partial<Part>; // Use Partial since _id might not exist for new parts
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Part Form Modal Component
 * Handles creating new parts and editing existing ones
 * Includes image upload functionality and form validation
 */
export const PartFormModal: React.FC<PartFormModalProps> = ({ 
  part, 
  onClose, 
  onSaved 
}) => {
  const [formData, setFormData] = useState({
    name: part?.name || '',
    category: part?.category || '',
    description: part?.description || '',
    sku: part?.sku || '',
    group: part?.group || '',
    partNumber: (part as any)?.partNumber || '',
  });

  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  // Predefined categories based on group selection
  const legoCategories = [
    "Bricks",
    "Plates", 
    "Tiles",
    "Slopes",
    "Modified Bricks & Plates",
    "Technic",
    "Wedges",
    "Wheels & Tires",
    "Minifigures & Accessories",
    "Windows & Doors",
    "Panels",
    "Hinges & Turntables",
    "Plants & Animals",
    "Tools & Equipment",
    "Baseplates",
    "Special Assemblies"
  ];

  const arduinoCategories = [
    "Sensors",
    "Controllers", 
    "Cables"
  ];

  const xiaomiCategories = [
    "Sensors",
    "Controllers",
    "Cables"
  ];

  // Get categories based on selected group
  const getCategoriesForGroup = (group: string) => {
    switch (group.toLowerCase()) {
      case 'lego':
        return legoCategories;
      case 'arduino':
        return arduinoCategories;
      case 'xiaomi':
        return xiaomiCategories;
      default:
        return [];
    }
  };

  // Initialize custom category state when editing
  React.useEffect(() => {
    if (part?.category && part?.group) {
      const groupCategories = getCategoriesForGroup(part.group);
      if (!groupCategories.includes(part.category)) {
        setCustomCategory(part.category);
        setShowCustomCategory(true);
      }
    }
  }, [part]);
  
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialFormDataRef = useRef<typeof formData | null>(null);
  const initialImagesRef = useRef<File[]>([]);

  const isEditing = !!part;

  // Store initial form data when component mounts or part changes
  useEffect(() => {
    const initialData = {
      name: part?.name || '',
      category: part?.category || '',
      description: part?.description || '',
      sku: part?.sku || '',
      group: part?.group || '',
      partNumber: (part as any)?.partNumber || '',
    };
    initialFormDataRef.current = initialData;
    initialImagesRef.current = [];
    setShowConfirmDialog(false);
  }, [part]);

  // Handle form field changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle image selection (multiple)
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validFiles: File[] = [];
    const readers: Promise<string>[] = [];

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        continue;
      }
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        continue;
      }
      validFiles.push(file);
      readers.push(new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      }));
    }

    Promise.all(readers).then((previews) => {
      setSelectedImages((prev) => [...prev, ...validFiles]);
      setImagePreviews((prev) => [...prev, ...previews]);
    });
  };

  const removeImageAt = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Part name is required';
    }
    
    if (!formData.group.trim()) {
      newErrors.group = 'Group is required';
    }
    
    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }
    
    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required';
    }

    if (formData.group && formData.group.toLowerCase() === 'lego') {
      if (!formData.partNumber.trim()) {
        newErrors.partNumber = 'Part Number is required for Lego parts';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      if (isEditing) {
        let savedPart;
        // Update existing part
        const response = await api.put(`/parts/${part._id}`, formData);
        savedPart = response.data;
        // If images selected in edit, upload all to this part
        if (selectedImages.length && savedPart) {
          for (const file of selectedImages) {
            const imageFormData = new FormData();
            imageFormData.append('image', file);
            imageFormData.append('imageType', 'part');
            imageFormData.append('associatedId', savedPart._id);
            imageFormData.append('associatedModel', 'Part');
            try {
              await api.post('/images/upload', imageFormData, {
                headers: { 'Content-Type': 'multipart/form-data' },
              });
            } catch (imageError) {
              console.error('Error uploading image:', imageError);
            }
          }
        }
      } else {
        // Create new part(s)
        if (selectedImages.length > 0) {
          for (const file of selectedImages) {
            try {
              const createRes = await api.post('/parts', formData);
              const createdPart = createRes.data;
              const imageFormData = new FormData();
              imageFormData.append('image', file);
              imageFormData.append('imageType', 'part');
              imageFormData.append('associatedId', createdPart._id);
              imageFormData.append('associatedModel', 'Part');
              try {
                await api.post('/images/upload', imageFormData, {
                  headers: { 'Content-Type': 'multipart/form-data' },
                });
              } catch (imageError) {
                console.error('Error uploading image:', imageError);
              }
            } catch (createError) {
              console.error('Error creating part for image:', createError);
            }
          }
        } else {
          // No images: create single part
          await api.post('/parts', formData);
        }
      }

      setShowConfirmDialog(false);
      onSaved();
    } catch (error: any) {
      console.error('Error saving part:', error);
      alert(error.response?.data?.message || 'Failed to save part. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const hasUnsavedChanges = (): boolean => {
    if (!initialFormDataRef.current) return false;
    const initial = initialFormDataRef.current;
    const current = formData;
    
    return (
      initial.name !== current.name ||
      initial.category !== current.category ||
      initial.description !== current.description ||
      initial.sku !== current.sku ||
      initial.group !== current.group ||
      initial.partNumber !== current.partNumber ||
      selectedImages.length > 0
    );
  };

  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setShowConfirmDialog(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowConfirmDialog(false);
    onClose();
  };

  const handleCancelClose = () => {
    setShowConfirmDialog(false);
  };

  const availableCategories = getCategoriesForGroup(formData.group);
  const allCategories = [...availableCategories, ...(customCategory ? [customCategory] : [])];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-surface border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-primary">
            {isEditing ? 'Edit Part' : 'Add New Part'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Part Image
              </label>
              
              <div className="space-y-4">
                {/* Image Previews Grid */}
                {imagePreviews.length === 0 ? (
                  <div className="aspect-square bg-gray-800 rounded-xl border-2 border-dashed border-gray-600 overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">No images selected</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {imagePreviews.map((src, idx) => (
                      <div key={idx} className="relative aspect-square bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                        <img src={src} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImageAt(idx)}
                          className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
                          aria-label="Remove image"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-outline w-full flex items-center justify-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  {imagePreviews.length > 0 ? 'Add More Images' : 'Upload Images'}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />

                <p className="text-xs text-gray-500">
                  Supported: JPG, PNG, WebP. Max size per image: 5MB
                </p>
              </div>
            </div>

            {/* Right Column - Form Fields */}
            <div className="space-y-6">
              {/* Part Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Part Name *
                </label>
                <input
                  type="text"
                  className={`input w-full ${errors.name ? 'border-red-500' : ''}`}
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter part name..."
                />
                {errors.name && (
                  <p className="text-red-400 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category *
                </label>
                {!formData.group ? (
                  <div className="text-gray-400 text-sm italic">
                    Please select a group first
                  </div>
                ) : (
                  <>
                    <select
                      className={`select w-full ${errors.category ? 'border-red-500' : ''}`}
                      value={formData.category}
                      onChange={(e) => {
                        if (e.target.value === 'Other') {
                          setShowCustomCategory(true);
                          handleInputChange('category', '');
                        } else {
                          setShowCustomCategory(false);
                          handleInputChange('category', e.target.value);
                        }
                      }}
                    >
                      <option value="">Select category...</option>
                      {allCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="Other">Other (Custom)</option>
                    </select>
                    
                    {showCustomCategory && (
                      <div className="mt-2">
                        <input
                          type="text"
                          className="input w-full"
                          value={customCategory}
                          onChange={(e) => {
                            setCustomCategory(e.target.value);
                            handleInputChange('category', e.target.value);
                          }}
                          placeholder="Enter custom category..."
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          This category will be added to the list for future use
                        </p>
                      </div>
                    )}
                    
                    {errors.category && (
                      <p className="text-red-400 text-sm mt-1">{errors.category}</p>
                    )}
                  </>
                )}
              </div>

              {/* SKU */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  SKU *
                </label>
                <input
                  type="text"
                  className={`input w-full ${errors.sku ? 'border-red-500' : ''}`}
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value.toUpperCase())}
                  placeholder="Enter SKU..."
                />
                {errors.sku && (
                  <p className="text-red-400 text-sm mt-1">{errors.sku}</p>
                )}
              </div>

              {/* Lego Part Number (Conditional) */}
              {formData.group && formData.group.toLowerCase() === 'lego' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Part Number (Lego) *
                  </label>
                  <input
                    type="text"
                    className={`input w-full ${errors.partNumber ? 'border-red-500' : ''}`}
                    value={formData.partNumber}
                    onChange={(e) => handleInputChange('partNumber', e.target.value)}
                    placeholder="Enter Lego part number..."
                  />
                  {errors.partNumber && (
                    <p className="text-red-400 text-sm mt-1">{errors.partNumber}</p>
                  )}
                </div>
              )}

              {/* Group */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Group *
                </label>
                <select
                  className={`select w-full ${errors.group ? 'border-red-500' : ''}`}
                  value={formData.group}
                  onChange={(e) => {
                    handleInputChange('group', e.target.value);
                    // Reset category when group changes
                    handleInputChange('category', '');
                    setShowCustomCategory(false);
                    setCustomCategory('');
                  }}
                >
                  <option value="">Select group...</option>
                  <option value="Arduino">Arduino</option>
                  <option value="Lego">Lego</option>
                  <option value="Xiaomi">Xiaomi</option>
                </select>
                {errors.group && (
                  <p className="text-red-400 text-sm mt-1">{errors.group}</p>
                )}
              </div>
            </div>
          </div>

          {/* Full Width Fields */}
          <div className="mt-6 space-y-6">
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                className="input w-full h-24 resize-none"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter part description..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end mt-8 pt-6 border-t border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="btn-outline px-6"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn px-6 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {isEditing ? 'Update Part' : 'Create Part'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Dialog */}
      <Modal
        isOpen={showConfirmDialog}
        onClose={handleCancelClose}
        title="Unsaved Changes"
        size="sm"
        closeOnOverlayClick={true}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-ink font-medium">Are you sure you want to leave?</p>
              <p className="text-sm text-ink/60 mt-1">
                You have unsaved changes. If you leave now, your changes will be lost.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancelClose}
            >
              Continue Editing
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmClose}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Discard Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};