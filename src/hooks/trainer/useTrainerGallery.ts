import { useState, useCallback } from 'react';
import { api } from '../../lib/api';
import { GalleryImage } from '../student/useStudentGallery';

interface UseTrainerGalleryReturn {
  images: GalleryImage[];
  isLoading: boolean;
  error: string | null;
  uploadMomentImage: (groupId: string, image: File, title?: string, description?: string) => Promise<void>;
  uploadProjectImage: (groupId: string, projectId: string, image: File, title?: string, description?: string) => Promise<void>;
  getGroupGallery: (groupId: string) => Promise<void>;
  deleteImage: (imageId: string) => Promise<void>;
}

export const useTrainerGallery = (): UseTrainerGalleryReturn => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadMomentImage = useCallback(async (
    groupId: string,
    image: File,
    title?: string,
    description?: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('groupId', groupId);
      formData.append('image', image);
      if (title) formData.append('title', title);
      if (description) formData.append('description', description);

      const response = await api.post('/trainer/gallery/moments', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const newImage = response.data.data;
      setImages(prev => [newImage, ...prev]);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to upload image';
      setError(errorMsg);
      console.error('Error uploading moment image:', err);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadProjectImage = useCallback(async (
    groupId: string,
    projectId: string,
    image: File,
    title?: string,
    description?: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('groupId', groupId);
      formData.append('projectId', projectId);
      formData.append('image', image);
      if (title) formData.append('title', title);
      if (description) formData.append('description', description);

      const response = await api.post('/trainer/gallery/projects', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const newImage = response.data.data;
      setImages(prev => [newImage, ...prev]);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to upload image';
      setError(errorMsg);
      console.error('Error uploading project image:', err);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getGroupGallery = useCallback(async (groupId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get(`/trainer/gallery/group/${groupId}`);
      setImages(response.data.data || []);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch gallery';
      setError(errorMsg);
      console.error('Error fetching group gallery:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteImage = useCallback(async (imageId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await api.delete(`/trainer/gallery/${imageId}`);
      setImages(prev => prev.filter(img => img._id !== imageId));
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to delete image';
      setError(errorMsg);
      console.error('Error deleting image:', err);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    images,
    isLoading,
    error,
    uploadMomentImage,
    uploadProjectImage,
    getGroupGallery,
    deleteImage,
  };
};
