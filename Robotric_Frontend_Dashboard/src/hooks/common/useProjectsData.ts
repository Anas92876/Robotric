import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

export interface ProjectPart {
  partId: string | {
    _id: string;
    name: string;
    sku?: string;
  };
  qty: number;
  _id?: string;
}

export interface Project {
  _id: string;
  title: string;
  description?: string;
  parts: ProjectPart[];
  status?: 'planning' | 'active' | 'completed' | 'archived';
  teamId?: {
    _id: string;
    name: string;
  };
  createdBy?: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  totalParts: number;
}

export interface Part {
  _id: string;
  name: string;
  sku?: string;
  category?: string;
}

export interface ProjectsStats {
  total: number;
  planning: number;
  active: number;
  completed: number;
  archived: number;
  totalParts: number;
  recentProjects: Project[];
}

/**
 * Custom hook for managing projects data
 * Fetches projects and parts, calculates stats, and provides CRUD operations
 */
export const useProjectsData = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [stats, setStats] = useState<ProjectsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch projects and parts in parallel
      const [projectsRes, partsRes] = await Promise.all([
        api.get('/projects'),
        api.get('/parts')
      ]);

      // Transform projects data
      const projectsData: Project[] = projectsRes.data.map((project: any) => ({
        ...project,
        totalParts: project.parts?.length || 0
      }));

      // Transform parts data (just extract what we need)
      const partsData: Part[] = partsRes.data.map((part: any) => ({
        _id: part._id,
        name: part.name,
        sku: part.sku,
        category: part.category
      }));

      setProjects(projectsData);
      setParts(partsData);

      // Calculate statistics
      const total = projectsData.length;
      const planning = projectsData.filter(p => p.status === 'planning').length;
      const active = projectsData.filter(p => p.status === 'active').length;
      const completed = projectsData.filter(p => p.status === 'completed').length;
      const archived = projectsData.filter(p => p.status === 'archived').length;
      const totalParts = projectsData.reduce((sum, p) => sum + (p.parts?.length || 0), 0);

      // Get recent projects (last 5)
      const recentProjects = [...projectsData]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      setStats({
        total,
        planning,
        active,
        completed,
        archived,
        totalParts,
        recentProjects
      });

    } catch (err: any) {
      console.error('Error fetching projects:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load projects';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // CRUD operations
  const createProject = useCallback(async (data: { title: string; description?: string; parts?: any[] }) => {
    try {
      await api.post('/projects', { ...data, parts: data.parts || [] });
      await fetchProjects();
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create project';
      return { success: false, error: errorMessage };
    }
  }, [fetchProjects]);

  const updateProject = useCallback(async (projectId: string, data: Partial<Project>) => {
    try {
      await api.put(`/projects/${projectId}`, data);
      await fetchProjects();
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update project';
      return { success: false, error: errorMessage };
    }
  }, [fetchProjects]);

  const deleteProject = useCallback(async (projectId: string) => {
    try {
      await api.delete(`/projects/${projectId}`);
      await fetchProjects();
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to delete project';
      return { success: false, error: errorMessage };
    }
  }, [fetchProjects]);

  const updateProjectParts = useCallback(async (projectId: string, parts: ProjectPart[]) => {
    try {
      await api.put(`/projects/${projectId}/parts`, { parts });
      await fetchProjects();
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update project parts';
      return { success: false, error: errorMessage };
    }
  }, [fetchProjects]);

  return {
    projects,
    parts,
    stats,
    isLoading,
    error,
    refetch: fetchProjects,
    actions: {
      create: createProject,
      update: updateProject,
      delete: deleteProject,
      updateParts: updateProjectParts
    }
  };
};
