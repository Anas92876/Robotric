/**
 * UploadModal Component
 * Phase 1: Upload PDF with basic info only (no groups/sessions)
 * Updated to match CLO light theme design
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, CheckCircle, AlertCircle, Loader, Info } from 'lucide-react';
import { Modal, Button, Input, Alert } from '../ui';
import { useResourceUpload } from '../../hooks/trainer/useResourceUpload';
import type { UploadFormData } from '../../types/resource.types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (resourceId: string, courseId: string) => void;
  courses: Array<{ _id: string; title: string; level?: string }>;
  defaultCourseId?: string;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  courses,
  defaultCourseId,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploading, progress, error: uploadError, uploadedResource, uploadResource, validateFile, reset } = useResourceUpload();

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<Omit<UploadFormData, 'file'>>({
    title: '',
    description: '',
    courseId: ''
  });

  // Reset on close / pre-fill courseId when opened from within a course
  useEffect(() => {
    if (!isOpen) {
      handleReset();
    } else if (defaultCourseId) {
      setFormData(prev => ({ ...prev, courseId: defaultCourseId }));
    }
  }, [isOpen, defaultCourseId]);

  // Handle upload success
  useEffect(() => {
    if (uploadedResource) {
      setTimeout(() => {
        onSuccess(uploadedResource._id, uploadedResource.courseId);
        handleReset();
        onClose();
      }, 1500);
    }
  }, [uploadedResource, onSuccess, onClose]);

  const handleReset = () => {
    setSelectedFile(null);
    setFormData({
      title: '',
      description: '',
      courseId: ''
    });
    setIsDragging(false);
    reset();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    const error = validateFile(file);
    if (error) {
      alert(error);
      return;
    }

    setSelectedFile(file);

    // Auto-fill title from filename if empty
    if (!formData.title) {
      const fileName = file.name.replace('.pdf', '');
      setFormData(prev => ({ ...prev, title: fileName }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      alert('Please select a file');
      return;
    }

    if (!formData.title || !formData.courseId) {
      alert('Please fill in all required fields');
      return;
    }

    const uploadData: UploadFormData = {
      file: selectedFile,
      title: formData.title,
      description: formData.description || '',
      courseId: formData.courseId
    };

    await uploadResource(uploadData);
  };

  const handleClose = () => {
    if (!uploading) {
      handleReset();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      closeOnOverlayClick={false}
      title="Upload Resource"
      description="Step 1: Upload PDF and add basic information"
    >
      {/* Upload Success */}
      {uploadedResource && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Alert variant="success">
            <CheckCircle className="w-5 h-5" />
            <div>
              <p className="font-semibold">Upload Successful!</p>
              <p className="text-sm">Proceeding to assignment step...</p>
            </div>
          </Alert>
        </motion.div>
      )}

      {/* Upload Error */}
      {uploadError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Alert variant="error">
            <AlertCircle className="w-5 h-5" />
            <div>
              <p className="font-semibold">Upload Failed</p>
              <p className="text-sm">{uploadError}</p>
            </div>
          </Alert>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload Area */}
        <div>
          <label className="block text-sm font-medium text-[#003300] mb-2">
            PDF File <span className="text-red-500">*</span>
          </label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
              ${isDragging
                ? 'border-primary bg-primary/5'
                : selectedFile
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-[#003300]/20 hover:border-primary/40 bg-[#003300]/5'
              }
            `}
          >
            {selectedFile ? (
              <div className="flex items-center justify-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center">
                  <FileText className="w-7 h-7 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-[#003300]">{selectedFile.name}</p>
                  <p className="text-sm text-[#003300]/60">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {!uploading && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="text-xs text-primary hover:text-primary-dark mt-1"
                    >
                      Click to change file
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="w-16 h-16 rounded-xl bg-[#003300]/10 flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-[#003300]/40" />
                </div>
                <p className="text-[#003300] font-semibold mb-1">
                  Drop your PDF here or click to browse
                </p>
                <p className="text-sm text-[#003300]/60">
                  Maximum file size: 50MB
                </p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Upload Progress */}
        {uploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 bg-primary/5 rounded-xl border border-primary/20"
          >
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-[#003300]/70 font-medium">Uploading resource...</span>
              <span className="text-primary font-bold">{progress}%</span>
            </div>
            <div className="w-full h-2.5 bg-[#003300]/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
                className="h-full bg-primary rounded-full"
              />
            </div>
          </motion.div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-[#003300] mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Enter resource title"
            disabled={uploading}
            required
          />
          <p className="text-xs text-[#003300]/50 mt-1.5">
            {formData.title.length}/200 characters
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-[#003300] mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Enter resource description (optional)"
            rows={3}
            disabled={uploading}
            className="w-full px-4 py-2.5 rounded-lg border border-[#003300]/20 bg-white text-[#003300] placeholder-[#003300]/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:bg-gray-50 transition-all"
          />
        </div>

        {/* Course Selection */}
        <div>
          <label className="block text-sm font-medium text-[#003300] mb-2">
            Course <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.courseId}
            onChange={(e) => setFormData(prev => ({ ...prev, courseId: e.target.value }))}
            disabled={uploading}
            required
            className="w-full px-4 py-2.5 rounded-lg border border-[#003300]/20 bg-white text-[#003300] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:bg-gray-50 transition-all"
          >
            <option value="">Select a course</option>
            {(courses || []).filter((c) => c != null && c._id != null).map((course) => (
              <option key={course._id} value={course._id}>
                {course.title}{course.level ? ` — ${course.level}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Info Message */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Next Step: Assignment</p>
              <p>After uploading, you'll be able to assign this resource to multiple groups and sessions.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#003300]/10">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={uploading || !selectedFile || !formData.title || !formData.courseId}
            leftIcon={uploading ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          >
            {uploading ? `Uploading... ${progress}%` : 'Upload & Continue'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
