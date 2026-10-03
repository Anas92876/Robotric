import { useState, useCallback } from 'react';
import { api } from '../../lib/api';
import { type GalleryImage } from '../student/useStudentGallery';

export interface GalleryFilters {
  type?: 'moment' | 'project';
  courseId?: string;
  groupId?: string;
  page?: number;
  limit?: number;
}

interface UseCLOGalleryReturn {
  images: GalleryImage[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    total: number;
  } | null;
  getAllGallery: (filters?: GalleryFilters) => Promise<void>;
}

export const useCLOGallery = (): UseCLOGalleryReturn => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<UseCLOGalleryReturn['pagination']>(null);

  const getAllGallery = useCallback(async (filters: GalleryFilters = {}) => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.courseId) params.append('courseId', filters.courseId);
      if (filters.groupId) params.append('groupId', filters.groupId);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const response = await api.get(`/clo/gallery?${params.toString()}`);
      const data = response.data;

      setImages(data.data || []);
      setPagination(data.pagination || null);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch gallery';
      setError(errorMsg);
      console.error('Error fetching gallery:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    images,
    isLoading,
    error,
    pagination,
    getAllGallery,
  };
};
