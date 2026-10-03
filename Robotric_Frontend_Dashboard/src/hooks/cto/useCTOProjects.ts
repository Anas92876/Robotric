import { useState, useCallback } from 'react';
import { api } from '../../lib/api';

export interface InternalProject {
  _id: string;
  name: string;
  description?: string;
  priority: 1 | 2 | 3;
  createdBy: { _id: string; name: string; email: string };
  assignedEngineers: { _id: string; name: string; email: string }[];
  clients?: { _id: string; name: string; email: string }[];
  parentProject?: { _id: string; name: string; priority: number } | null;
  taskCounts?: { total: number; todo: number; in_progress: number; done: number };
  subProjectCount?: number;
  createdAt: string;
}

export type TaskStatus = 'pending_review' | 'todo' | 'in_progress' | 'done' | 'declined';
export type ClientUrgency = 'whenever' | 'soon' | 'urgent';

export interface TaskAttachment {
  url: string;
  publicId: string;
  name?: string;
}

export interface TaskSubmission {
  images: { url: string; publicId: string; uploadedBy?: string }[];
  links: string[];
  note: string;
}

export interface ClientMediaItem {
  _id: string;
  kind: 'image' | 'video' | 'audio';
  name: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds?: number;
  uploadedAt: string;
  url: string;
}

export interface InternalTask {
  _id: string;
  projectId: { _id: string; name: string; priority: number } | string;
  subProjectId?: { _id: string; name: string; priority: number } | string | null;
  title: string;
  description?: string;
  priority: 1 | 2 | 3;
  status: TaskStatus;
  assignedTo: { _id: string; name: string; email: string }[];
  createdBy: { _id: string; name: string; email: string };
  dueDate?: string;
  hardDeadline?: string;
  completedAt?: string;
  attachments?: TaskAttachment[];
  submission?: TaskSubmission;
  createdAt: string;
  // Client request fields — only meaningful when source === 'client'
  source?: 'internal' | 'client';
  clientId?: { _id: string; name: string; email: string } | string | null;
  clientUrgency?: ClientUrgency | null;
  rejectedReason?: string;
  clientMedia?: ClientMediaItem[];
}

export interface CreateProjectData {
  name: string;
  description?: string;
  priority: 1 | 2 | 3;
  assignedEngineers: string[];
  clients?: string[];
  parentProject?: string;
}

export interface CreateTaskData {
  projectId: string;
  subProjectId?: string;
  title: string;
  description?: string;
  priority: 1 | 2 | 3;
  assignedTo?: string[];
  dueDate?: string;
  hardDeadline?: string;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: 1 | 2 | 3;
  projectId?: string;
  subProjectId?: string;
  assignedTo?: string;
}

interface UseCTOProjectsReturn {
  projects: InternalProject[];
  subProjects: InternalProject[];
  tasks: InternalTask[];
  currentProject: InternalProject | null;
  isLoading: boolean;
  error: string | null;
  createProject: (data: CreateProjectData) => Promise<InternalProject>;
  getProjects: () => Promise<void>;
  getProjectById: (projectId: string) => Promise<void>;
  getSubProjects: (projectId: string) => Promise<void>;
  moveProject: (projectId: string, parentProjectId: string) => Promise<void>;
  updateProject: (projectId: string, data: Partial<CreateProjectData>) => Promise<InternalProject>;
  deleteProject: (projectId: string) => Promise<void>;
  createTask: (data: CreateTaskData) => Promise<InternalTask>;
  getTasks: (filters?: TaskFilters) => Promise<void>;
  getTaskById: (taskId: string) => Promise<InternalTask>;
  updateTask: (taskId: string, data: Partial<CreateTaskData> & { status?: TaskStatus; hardDeadline?: string }) => Promise<InternalTask>;
  deleteTask: (taskId: string) => Promise<void>;
  declineTask: (taskId: string, rejectedReason: string) => Promise<InternalTask>;
}

export const useCTOProjects = (): UseCTOProjectsReturn => {
  const [projects, setProjects] = useState<InternalProject[]>([]);
  const [subProjects, setSubProjects] = useState<InternalProject[]>([]);
  const [tasks, setTasks] = useState<InternalTask[]>([]);
  const [currentProject, setCurrentProject] = useState<InternalProject | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProject = useCallback(async (data: CreateProjectData): Promise<InternalProject> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.post('/cto/internal/projects', data);
      const newProject = response.data.data;
      if (data.parentProject) {
        setSubProjects(prev => [newProject, ...prev]);
      } else {
        setProjects(prev => [newProject, ...prev]);
      }
      return newProject;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to create project';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get('/cto/internal/projects');
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
      const response = await api.get(`/cto/internal/projects/${projectId}`);
      setCurrentProject(response.data.data?.project || response.data.data || null);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch project';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSubProjects = useCallback(async (projectId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get(`/cto/internal/projects/${projectId}/sub-projects`);
      setSubProjects(response.data.data || []);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch sub-projects';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const moveProject = useCallback(async (projectId: string, parentProjectId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await api.post(`/cto/internal/projects/${projectId}/move`, { parentProject: parentProjectId });
      setProjects(prev => prev.filter(p => p._id !== projectId));
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to move project';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProject = useCallback(async (projectId: string, data: Partial<CreateProjectData>): Promise<InternalProject> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.put(`/cto/internal/projects/${projectId}`, data);
      const updatedProject = response.data.data;
      setProjects(prev => prev.map(p => p._id === projectId ? updatedProject : p));
      setSubProjects(prev => prev.map(p => p._id === projectId ? updatedProject : p));
      if (currentProject?._id === projectId) setCurrentProject(updatedProject);
      return updatedProject;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to update project';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [currentProject]);

  const deleteProject = useCallback(async (projectId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await api.delete(`/cto/internal/projects/${projectId}`);
      setProjects(prev => prev.filter(p => p._id !== projectId));
      setSubProjects(prev => prev.filter(p => p._id !== projectId));
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to delete project';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTask = useCallback(async (data: CreateTaskData): Promise<InternalTask> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.post('/cto/internal/tasks', data);
      const newTask = response.data.data;
      setTasks(prev => [newTask, ...prev]);
      return newTask;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to create task';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTasks = useCallback(async (filters?: TaskFilters) => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.priority) params.append('priority', filters.priority.toString());
      if (filters?.projectId) params.append('projectId', filters.projectId);
      if (filters?.subProjectId) params.append('subProjectId', filters.subProjectId);
      if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
      const response = await api.get(`/cto/internal/tasks?${params.toString()}`);
      setTasks(response.data.data || []);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch tasks';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTaskById = useCallback(async (taskId: string): Promise<InternalTask> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get(`/cto/internal/tasks/${taskId}`);
      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch task';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateTask = useCallback(async (
    taskId: string,
    data: Partial<CreateTaskData> & { status?: TaskStatus }
  ): Promise<InternalTask> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.put(`/cto/internal/tasks/${taskId}`, data);
      const updatedTask = response.data.data;
      setTasks(prev => prev.map(t => t._id === taskId ? updatedTask : t));
      return updatedTask;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to update task';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await api.delete(`/cto/internal/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t._id !== taskId));
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to delete task';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const declineTask = useCallback(async (taskId: string, rejectedReason: string): Promise<InternalTask> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.patch(`/cto/internal/tasks/${taskId}/decline`, { rejectedReason });
      const updatedTask = response.data.data;
      setTasks(prev => prev.map(t => t._id === taskId ? updatedTask : t));
      return updatedTask;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to decline request';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    projects,
    subProjects,
    tasks,
    currentProject,
    isLoading,
    error,
    createProject,
    getProjects,
    getProjectById,
    getSubProjects,
    moveProject,
    updateProject,
    deleteProject,
    createTask,
    getTasks,
    getTaskById,
    updateTask,
    deleteTask,
    declineTask,
  };
};
