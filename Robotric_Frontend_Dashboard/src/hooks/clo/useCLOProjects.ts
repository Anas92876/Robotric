import { useState, useCallback } from 'react';
import { api } from '../../lib/api';
import { type StudentProject } from '../student/useStudentProjects';

export interface ProjectFilters {
  courseId?: string;
  groupId?: string;
  status?: 'in_progress' | 'completed' | 'submitted';
  page?: number;
  limit?: number;
}

interface UseCLOProjectsReturn {
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
  getAllProjects: (filters?: ProjectFilters) => Promise<void>;
  getProjectDetails: (projectId: string) => Promise<void>;
}

export const useCLOProjects = (): UseCLOProjectsReturn => {
  const [projects, setProjects] = useState<StudentProject[]>([]);
  const [projectDetails, setProjectDetails] = useState<StudentProject | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<UseCLOProjectsReturn['pagination']>(null);

  const getAllProjects = useCallback(async (filters: ProjectFilters = {}) => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.courseId) params.append('courseId', filters.courseId);
      if (filters.groupId) params.append('groupId', filters.groupId);
      if (filters.status) params.append('status', filters.status);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const response = await api.get(`/clo/projects?${params.toString()}`);
      const data = response.data;

      setProjects(data.data || []);
      setPagination(data.pagination || null);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch projects';
      setError(errorMsg);
      console.error('Error fetching projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getProjectDetails = useCallback(async (projectId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get(`/clo/projects/${projectId}`);
      setProjectDetails(response.data.data || null);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch project details';
      setError(errorMsg);
      console.error('Error fetching project details:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    projects,
    projectDetails,
    isLoading,
    error,
    pagination,
    getAllProjects,
    getProjectDetails,
  };
};
