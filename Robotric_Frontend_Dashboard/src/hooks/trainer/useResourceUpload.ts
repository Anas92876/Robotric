/**
 * useResourceUpload Hook
 * Phase 1: Upload PDF file with basic info only (no groups/sessions)
 */

import { useState, useCallback } from 'react';
import { api } from '../../lib/api';
import type { ResourceUploadFormData, ResourceUploadResponse, Resource } from '../../types/resource.types';

interface UseResourceUploadReturn {
  uploading: boolean;
  progress: number;
  error: string | null;
  uploadedResource: Resource | null;
  uploadResource: (formData: ResourceUploadFormData) => Promise<Resource | null>;
  validateFile: (file: File | null) => string | null;
  validateForm: (formData: ResourceUploadFormData) => string | null;
  reset: () => void;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export const useResourceUpload = (): UseResourceUploadReturn => {
  const [uploading, setUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedResource, setUploadedResource] = useState<Resource | null>(null);

  // File validation
  const validateFile = useCallback((file: File | null): string | null => {
    if (!file) {
      return 'Please select a file';
    }

    // Type validation
    if (file.type !== 'application/pdf') {
      return 'Only PDF files are allowed';
    }

    // Extension validation
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return 'File must have .pdf extension';
    }

    // Size validation
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must not exceed 100 MB';
    }

    return null;
  }, []);

  // Form validation
  const validateForm = useCallback((formData: ResourceUploadFormData): string | null => {
    if (!formData.file) {
      return 'Please select a PDF file';
    }

    if (!formData.title || formData.title.trim().length < 3) {
      return 'Title must be at least 3 characters';
    }

    if (formData.title.trim().length > 200) {
      return 'Title must not exceed 200 characters';
    }

    if (!formData.courseId) {
      return 'Please select a course';
    }

    if (formData.description && formData.description.length > 2000) {
      return 'Description must not exceed 2000 characters';
    }

    return null;
  }, []);

  // Upload function
  const uploadResource = useCallback(async (formData: ResourceUploadFormData): Promise<Resource | null> => {
    setUploading(true);
    setProgress(0);
    setError(null);
    setUploadedResource(null);

    try {
      // Validate file
      const fileError = validateFile(formData.file);
      if (fileError) {
        setError(fileError);
        setUploading(false);
        return null;
      }

      // Validate form
      const formError = validateForm(formData);
      if (formError) {
        setError(formError);
        setUploading(false);
        return null;
      }

      // Create FormData for multipart upload
      const apiFormData = new FormData();
      apiFormData.append('pdf', formData.file!);
      apiFormData.append('title', formData.title.trim());
      apiFormData.append('description', formData.description.trim());
      apiFormData.append('courseId', formData.courseId);

      // Upload with progress tracking — 5 minute timeout for large files on slow connections
      const response = await api.post<ResourceUploadResponse>(
        '/clo/resources/upload',
        apiFormData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 300000, // 5 minutes
          onUploadProgress: (progressEvent: any) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setProgress(percentCompleted);
            }
          }
        }
      );

      if (response.data.success) {
        setUploadedResource(response.data.data);
        setProgress(100);
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }

    } catch (err: any) {
      const errorMessage = 
        err.response?.status === 403 ? 'You do not have permission to upload resources' :
        err.response?.status === 413 ? 'File is too large. Maximum size is 100MB' :
        err.response?.status === 429 ? 'Too many uploads. Please try again later' :
        err.response?.data?.error?.message || err.message || 'Failed to upload resource';
      
      setError(errorMessage);
      setProgress(0);
      return null;
    } finally {
      setUploading(false);
    }
  }, [validateFile, validateForm]);

  // Reset state
  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setError(null);
    setUploadedResource(null);
  }, []);

  return {
    uploading,
    progress,
    error,
    uploadedResource,
    uploadResource,
    validateFile,
    validateForm,
    reset
  };
};
