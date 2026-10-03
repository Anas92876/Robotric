import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export interface ProjectImage {
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  order: number;
}

export interface StudentProject {
  _id: string;
  studentId: string | {
    _id: string;
    name: string;
    email?: string;
  };
  groupId: {
    _id: string;
    name: string;
  };
  courseId?: {
    _id: string;
    title: string;
  };
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  images: ProjectImage[];
  components?: string[];
  technologies?: string[];
  status: 'in_progress' | 'completed' | 'submitted';
  grade?: number;
  feedback?: string;
  createdBy: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFilters {
  courseId?: string;
  status?: 'in_progress' | 'completed' | 'submitted';
  page?: number;
  limit?: number;
}

interface UseStudentProjectsReturn {
  projects: StudentProject[];
  projectDetails: StudentProject | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    total: number;
  } | null;
  getMyProjects: (filters?: ProjectFilters) => Promise<void>;
  getProjectDetails: (projectId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export const useStudentProjects = (initialFilters: ProjectFilters = {}) => {
  const [currentFilters, setCurrentFilters] = useState<ProjectFilters>({
    page: 1,
    limit: 10, // Reduced from 20 for faster initial load
    ...initialFilters,
  });
  const [projectDetails, setProjectDetails] = useState<StudentProject | null>(null);

  // Query for projects list with pagination
  const {
    data: projectsData,
    isLoading,
    error,
    refetch: refetchProjects,
  } = useQuery({
    queryKey: ['student', 'projects', currentFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentFilters.courseId) params.append('courseId', currentFilters.courseId);
      if (currentFilters.status) params.append('status', currentFilters.status);
      if (currentFilters.page) params.append('page', currentFilters.page.toString());
      if (currentFilters.limit) params.append('limit', currentFilters.limit.toString());

      const response = await api.get(`/student/projects?${params.toString()}`);
      return {
        projects: response.data.data || [],
        pagination: response.data.pagination || null,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const getMyProjects = useCallback(async (filters: ProjectFilters = {}) => {
    setCurrentFilters((prev) => ({
      ...prev,
      ...filters,
      page: filters.page ?? prev.page ?? 1,
      limit: filters.limit ?? prev.limit ?? 10,
    }));
  }, []);

  const getProjectDetails = useCallback(async (projectId: string) => {
    try {
      const response = await api.get(`/student/projects/${projectId}`);
      setProjectDetails(response.data.data || null);
      return response.data.data || null;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch project details';
      console.error('Error fetching project details:', err);
      throw err;
    }
  }, []);

  const refetch = useCallback(async () => {
    await refetchProjects();
  }, [refetchProjects]);

  return {
    projects: projectsData?.projects || [],
    projectDetails,
    isLoading,
    error: error ? (error as any)?.response?.data?.message || 'Failed to fetch projects' : null,
    pagination: projectsData?.pagination || null,
    getMyProjects,
    getProjectDetails,
    refetch,
  } as UseStudentProjectsReturn;
};
