import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export interface GalleryImage {
  _id: string;
  groupId: {
    _id: string;
    name: string;
  };
  type: 'moment' | 'project';
  cloudinaryUrl: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  uploadedBy: {
    _id: string;
    name: string;
  };
  order: number;
  createdAt: string;
}

export interface GalleryFilters {
  type?: 'moment' | 'project';
  courseId?: string;
  page?: number;
  limit?: number;
}

interface UseStudentGalleryReturn {
  images: GalleryImage[];
  imageDetails: GalleryImage | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    total: number;
  } | null;
  getGallery: (filters?: GalleryFilters) => Promise<void>;
  getImageDetails: (imageId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export const useStudentGallery = (initialFilters: GalleryFilters = {}) => {
  const [currentFilters, setCurrentFilters] = useState<GalleryFilters>({
    page: 1,
    limit: 10, // Reduced from 20 for faster initial load
    ...initialFilters,
  });
  const [imageDetails, setImageDetails] = useState<GalleryImage | null>(null);

  // Query for gallery images with pagination
  const {
    data: galleryData,
    isLoading,
    error,
    refetch: refetchGallery,
  } = useQuery({
    queryKey: ['student', 'gallery', currentFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentFilters.type) params.append('type', currentFilters.type);
      if (currentFilters.courseId) params.append('courseId', currentFilters.courseId);
      if (currentFilters.page) params.append('page', currentFilters.page.toString());
      if (currentFilters.limit) params.append('limit', currentFilters.limit.toString());

      const response = await api.get(`/student/gallery?${params.toString()}`);
      return {
        images: response.data.data || [],
        pagination: response.data.pagination || null,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const getGallery = useCallback(async (filters: GalleryFilters = {}) => {
    setCurrentFilters((prev) => ({
      ...prev,
      ...filters,
      page: filters.page ?? prev.page ?? 1,
      limit: filters.limit ?? prev.limit ?? 10,
    }));
  }, []);

  const getImageDetails = useCallback(async (imageId: string) => {
    try {
      const response = await api.get(`/student/gallery/${imageId}`);
      setImageDetails(response.data.data || null);
      return response.data.data || null;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch image details';
      console.error('Error fetching image details:', err);
      throw err;
    }
  }, []);

  const refetch = useCallback(async () => {
    await refetchGallery();
  }, [refetchGallery]);

  return {
    images: galleryData?.images || [],
    imageDetails,
    isLoading,
    error: error ? (error as any)?.response?.data?.message || 'Failed to fetch gallery' : null,
    pagination: galleryData?.pagination || null,
    getGallery,
    getImageDetails,
    refetch,
  } as UseStudentGalleryReturn;
};
