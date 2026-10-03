import { useState, useCallback } from 'react';
import { api } from '../../lib/api';
import type { InternalTask, TaskStatus, ClientUrgency, ClientMediaItem } from '../cto/useCTOProjects';

export interface CreateClientTaskData {
  projectId: string;
  title: string;
  description?: string;
  clientUrgency?: ClientUrgency;
}

interface TaskFilters {
  status?: TaskStatus;
  projectId?: string;
}

interface UseClientTasksReturn {
  tasks: InternalTask[];
  isLoading: boolean;
  error: string | null;
  getTasks: (filters?: TaskFilters) => Promise<void>;
  getTaskById: (taskId: string) => Promise<InternalTask>;
  createTask: (data: CreateClientTaskData) => Promise<InternalTask>;
  uploadMedia: (taskId: string, file: File, durationSeconds: number | undefined, onProgress: (percent: number) => void) => Promise<ClientMediaItem>;
  getMedia: (taskId: string) => Promise<ClientMediaItem[]>;
  deleteMedia: (taskId: string, mediaId: string) => Promise<void>;
}

export const useClientTasks = (): UseClientTasksReturn => {
  const [tasks, setTasks] = useState<InternalTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTasks = useCallback(async (filters?: TaskFilters) => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.projectId) params.append('projectId', filters.projectId);
      const response = await api.get(`/client/tasks?${params.toString()}`);
      setTasks(response.data.data || []);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch requests';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTaskById = useCallback(async (taskId: string): Promise<InternalTask> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get(`/client/tasks/${taskId}`);
      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch request';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTask = useCallback(async (data: CreateClientTaskData): Promise<InternalTask> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.post('/client/tasks', data);
      const newTask = response.data.data;
      setTasks(prev => [newTask, ...prev]);
      return newTask;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to submit request';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadMedia = useCallback(async (
    taskId: string,
    file: File,
    durationSeconds: number | undefined,
    onProgress: (percent: number) => void
  ): Promise<ClientMediaItem> => {
    const formData = new FormData();
    formData.append('file', file);
    if (durationSeconds !== undefined) formData.append('durationSeconds', String(Math.round(durationSeconds)));

    const response = await api.post(`/client/tasks/${taskId}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const total = progressEvent.total ?? progressEvent.loaded;
        const percent = total ? Math.round((progressEvent.loaded * 100) / total) : 0;
        onProgress(percent);
      },
    });
    return response.data.data;
  }, []);

  const getMedia = useCallback(async (taskId: string): Promise<ClientMediaItem[]> => {
    const response = await api.get(`/client/tasks/${taskId}/media`);
    return response.data.data || [];
  }, []);

  const deleteMedia = useCallback(async (taskId: string, mediaId: string) => {
    await api.delete(`/client/tasks/${taskId}/media/${mediaId}`);
  }, []);

  return { tasks, isLoading, error, getTasks, getTaskById, createTask, uploadMedia, getMedia, deleteMedia };
};
