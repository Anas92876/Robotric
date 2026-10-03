import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import type { Resource, ResourceFilters, ResourceListResponse } from '../../types/resource.types';

interface UseResourcesReturn {
  resources: Resource[];
  loading: boolean;
  error: string | null;
  filters: ResourceFilters;
  updateFilters: (newFilters: Partial<ResourceFilters>) => void;
  clearFilters: () => void;
  fetchResources: () => Promise<Resource[]>;
  deleteResource: (resourceId: string, permanent?: boolean) => Promise<boolean>;
  renameResource: (resourceId: string, title: string, description?: string) => Promise<boolean>;
}

export const useResources = (): UseResourcesReturn => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ResourceFilters>({
    courseId: '',
    category: '',
    search: ''
  });

  // Fetch resources from API
  const fetchResources = useCallback(async (): Promise<Resource[]> => {
    try {
      setLoading(true);
      setError(null);

      // Build query params
      const params: Record<string, string> = {};
      if (filters.courseId) params.courseId = filters.courseId;
      if (filters.category) params.category = filters.category;
      if (filters.search) params.search = filters.search;
 
      const response = await api.get<ResourceListResponse>('/clo/resources', { params });

      if (response.data.success) {
        // Handle both direct array and wrapped response; filter out null/undefined entries
        const raw = Array.isArray(response.data.data)
          ? response.data.data
          : (response.data.data as any)?.resources || [];
        const fetchedResources = (Array.isArray(raw) ? raw : []).filter(
          (r: any) => r != null && r._id != null
        ) as Resource[];
        setResources(fetchedResources);
        return fetchedResources;
      }
      return [];
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to load resources';
      setError(errorMessage);
      console.error('Failed to fetch resources:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Delete resource
  const deleteResource = useCallback(async (resourceId: string, permanent: boolean = false): Promise<boolean> => {
    try {
      const response = await api.delete(
        `/clo/resources/${resourceId}?permanent=${permanent}`
      );

      if (response.data.success) {
        // Refresh list
        await fetchResources();
        return true;
      }
      return false;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to delete resource';
      setError(errorMessage);
      console.error('Failed to delete resource:', err);
      return false;
    }
  }, [fetchResources]);

  // Rename resource
  const renameResource = useCallback(async (resourceId: string, title: string, description?: string): Promise<boolean> => {
    try {
      const response = await api.put(`/clo/resources/${resourceId}`, { title, description });
      if (response.data.success) {
        setResources(prev => prev.map(r =>
          r._id === resourceId ? { ...r, title, ...(description !== undefined && { description }) } : r
        ));
        return true;
      }
      return false;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to rename resource';
      setError(errorMessage);
      console.error('Failed to rename resource:', err);
      return false;
    }
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<ResourceFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({ courseId: '', category: '', search: '' });
  }, []);

  // Fetch on mount and filter changes
  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  return {
    resources,
    loading,
    error,
    filters,
    updateFilters,
    clearFilters,
    fetchResources,
    deleteResource,
    renameResource
  };
};
