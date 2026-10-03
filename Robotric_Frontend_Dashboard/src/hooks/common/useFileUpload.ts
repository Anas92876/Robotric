import { useState, useCallback } from 'react';
import { api } from '../../lib/api';

interface UseFileUploadReturn {
  files: File[];
  uploading: boolean;
  progress: number;
  error: string | null;
  uploadFiles: (assignmentId: string) => Promise<any>;
  setFiles: (files: File[]) => void;
  removeFile: (index: number) => void;
  reset: () => void;
}

export const useFileUpload = (): UseFileUploadReturn => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = useCallback(
    async (assignmentId: string) => {
      if (files.length === 0) {
        setError('No files selected');
        return;
      }

      try {
        setUploading(true);
        setError(null);
        setProgress(0);

        const formData = new FormData();
        files.forEach((file) => {
          formData.append('files', file);
        });

        const response = await api.post(
          `/student/assignments/${assignmentId}/submit`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total
                );
                setProgress(percentCompleted);
              }
            },
          }
        );

        // Reset state after successful upload
        setFiles([]);
        setProgress(0);

        return response.data;
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to upload files');
        console.error('Error uploading files:', err);
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [files]
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const reset = useCallback(() => {
    setFiles([]);
    setUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  return {
    files,
    uploading,
    progress,
    error,
    uploadFiles,
    setFiles,
    removeFile,
    reset,
  };
};
