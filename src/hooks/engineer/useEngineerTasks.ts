import { useState, useCallback } from 'react';
import { api } from '../../lib/api';
import { type InternalProject, type InternalTask } from '../cto/useCTOProjects';

export interface TaskFilters {
  status?: 'todo' | 'in_progress' | 'done';
  priority?: 1 | 2 | 3;
  projectId?: string;
  completionFilter?: 'today' | 'week' | 'month';
}

interface UseEngineerTasksReturn {
  projects: InternalProject[];
  tasks: InternalTask[];
  isLoading: boolean;
  error: string | null;
  getMyProjects: () => Promise<void>;
  getMyTasks: (filters?: TaskFilters) => Promise<void>;
  updateTaskStatus: (taskId: string, status: 'todo' | 'in_progress' | 'done') => Promise<void>;
}

export const useEngineerTasks = (): UseEngineerTasksReturn => {
  const [projects, setProjects] = useState<InternalProject[]>([]);
  const [tasks, setTasks] = useState<InternalTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getMyProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get('/engineer/projects');
      setProjects(response.data.data || []);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch projects';
      setError(errorMsg);
      console.error('Error fetching engineer projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getMyTasks = useCallback(async (filters?: TaskFilters) => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.priority) params.append('priority', filters.priority.toString());
      if (filters?.projectId) params.append('projectId', filters.projectId);
      if (filters?.completionFilter) params.append('completionFilter', filters.completionFilter);
      const response = await api.get(`/engineer/tasks?${params.toString()}`);
      setTasks(response.data.data || []);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch tasks';
      setError(errorMsg);
      console.error('Error fetching engineer tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateTaskStatus = useCallback(async (taskId: string, status: 'todo' | 'in_progress' | 'done') => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.patch(`/engineer/tasks/${taskId}/status`, { status });
      const updatedTask = response.data.data;
      setTasks(prev => prev.map(t => t._id === taskId ? updatedTask : t));
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to update task status';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    projects,
    tasks,
    isLoading,
    error,
    getMyProjects,
    getMyTasks,
    updateTaskStatus,
  };
};
