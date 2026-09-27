import { useState, useCallback } from 'react';
import { api } from '../../lib/api';
import { GalleryImage } from '../student/useStudentGallery';

export interface ReceptionGalleryGroup {
  _id: string;
  name: string;
  courseId?: {
    _id: string;
    title: string;
    category?: string;
    level?: string;
  };
  status: string;
}

interface UseReceptionGalleryReturn {
  images: GalleryImage[];
  groups: ReceptionGalleryGroup[];
  isLoading: boolean;
  error: string | null;
  uploadMomentImage: (groupIds: string[], image: File, title?: string, description?: string) => Promise<void>;
  getAllGroups: () => Promise<void>;
  getGroupGallery: (groupId: string) => Promise<void>;
  getGroupsGallery: (groupIds: string[]) => Promise<void>;
  deleteImage: (imageId: string) => Promise<void>;
}

export const useReceptionGallery = (): UseReceptionGalleryReturn => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [groups, setGroups] = useState<ReceptionGalleryGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAllGroups = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get('/reception/gallery/groups');
      setGroups(response.data.data || []);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch groups';
      setError(errorMsg);
      console.error('Error fetching groups:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadMomentImage = useCallback(async (
    groupIds: string[],
    image: File,
    title?: string,
    description?: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('groupIds', JSON.stringify(groupIds));
      formData.append('image', image);
      if (title) formData.append('title', title);
      if (description) formData.append('description', description);

      const response = await api.post('/reception/gallery/moments', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const newImages: GalleryImage[] = response.data.data || [];
      setImages(prev => [...newImages, ...prev]);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to upload image';
      setError(errorMsg);
      console.error('Error uploading moment image:', err);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getGroupGallery = useCallback(async (groupId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get(`/reception/gallery/group/${groupId}`);
      setImages(response.data.data || []);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch gallery';
      setError(errorMsg);
      console.error('Error fetching group gallery:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getGroupsGallery = useCallback(async (groupIds: string[]) => {
    if (groupIds.length === 0) {
      setImages([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const responses = await Promise.all(
        groupIds.map((groupId) => api.get(`/reception/gallery/group/${groupId}`))
      );

      const merged: GalleryImage[] = [];
      const seen = new Set<string>();
      for (const response of responses) {
        for (const image of response.data.data || []) {
          if (!seen.has(image._id)) {
            seen.add(image._id);
            merged.push(image);
          }
        }
      }
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setImages(merged);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch gallery';
      setError(errorMsg);
      console.error('Error fetching groups gallery:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteImage = useCallback(async (imageId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await api.delete(`/reception/gallery/${imageId}`);
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
    groups,
    isLoading,
    error,
    uploadMomentImage,
    getAllGroups,
    getGroupGallery,
    getGroupsGallery,
    deleteImage,
  };
};
