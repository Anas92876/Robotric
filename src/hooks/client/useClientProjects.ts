import { useState, useCallback } from 'react';
import { api } from '../../lib/api';
import type { InternalProject } from '../cto/useCTOProjects';

interface UseClientProjectsReturn {
  projects: InternalProject[];
  currentProject: InternalProject | null;
  isLoading: boolean;
  error: string | null;
  getProjects: () => Promise<void>;
  getProjectById: (projectId: string) => Promise<void>;
}

export const useClientProjects = (): UseClientProjectsReturn => {
  const [projects, setProjects] = useState<InternalProject[]>([]);
  const [currentProject, setCurrentProject] = useState<InternalProject | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get('/client/projects');
      setProjects(response.data.data || []);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch projects';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getProjectById = useCallback(async (projectId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get(`/client/projects/${projectId}`);
      setCurrentProject(response.data.data || null);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch project';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { projects, currentProject, isLoading, error, getProjects, getProjectById };
};
