import { useState, useCallback } from 'react';
import { api } from '../../lib/api';
import { type Task } from '../student/useTasks';

export interface TaskFilters {
  courseId?: string;
  groupId?: string;
  sessionId?: string;
  status?: 'open' | 'closed';
  page?: number;
  limit?: number;
}

export interface TaskResults {
  taskId: string;
  taskTitle: string;
  statistics: {
    totalSubmissions: number;
    gradedSubmissions: number;
    pendingSubmissions: number;
    averageScore: number;
    completionRate: number;
    lateSubmissions: number;
    totalStudents: number;
  };
  submissions: any[];
}

export interface CreateQuestionData {
  questionText: string;
  questionTextAr?: string;
  answerType: 'mcq' | 'text' | 'image';
  type?: 'single_choice' | 'multiple_choice';
  options?: string[];
  correctAnswers?: number[];
  points: number;
  order: number;
  required: boolean;
  maxLength?: number;
  maxImages?: number;
  allowedImageTypes?: string[];
  maxImageSize?: number;
}

export interface CreateCLOTaskData {
  sessionIds: string[];
  title: string;
  titleAr?: string;
  description: string;
  descriptionAr?: string;
  deadline: string;
  maxScore?: number;
  questions: CreateQuestionData[];
  allowLateSubmission?: boolean;
  status?: 'draft' | 'open';
}

export interface GroupSession {
  _id: string;
  title: string;
  sessionNumber?: number;
  scheduledDate?: string;
  status: string;
}

interface UseCLOTasksReturn {
  tasks: Task[];
  taskDetails: Task | null;
  taskResults: TaskResults | null;
  groupSessions: GroupSession[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    total: number;
  } | null;
  getAllTasks: (filters?: TaskFilters) => Promise<void>;
  getTaskDetails: (taskId: string) => Promise<void>;
  getTaskResults: (taskId: string) => Promise<void>;
  getGroupSessions: (groupId: string) => Promise<GroupSession[]>;
  createTask: (data: CreateCLOTaskData) => Promise<Task>;
  updateTask: (taskId: string, data: Partial<CreateCLOTaskData>) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  publishTask: (taskId: string) => Promise<Task>;
  duplicateTask: (taskId: string) => Promise<Task>;
}

export const useCLOTasks = (): UseCLOTasksReturn => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskDetails, setTaskDetails] = useState<Task | null>(null);
  const [taskResults, setTaskResults] = useState<TaskResults | null>(null);
  const [groupSessions, setGroupSessions] = useState<GroupSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<UseCLOTasksReturn['pagination']>(null);

  const getAllTasks = useCallback(async (filters: TaskFilters = {}) => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.courseId) params.append('courseId', filters.courseId);
      if (filters.groupId) params.append('groupId', filters.groupId);
      if (filters.sessionId) params.append('sessionId', filters.sessionId);
      if (filters.status) params.append('status', filters.status);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const response = await api.get(`/clo/tasks?${params.toString()}`);
      const data = response.data;

      setTasks(data.data || []);
      setPagination(data.pagination || null);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch tasks';
      setError(errorMsg);
      console.error('Error fetching tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTaskDetails = useCallback(async (taskId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get(`/clo/tasks/${taskId}`);
      setTaskDetails(response.data.data?.task || null);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch task details';
      setError(errorMsg);
      console.error('Error fetching task details:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTaskResults = useCallback(async (taskId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get(`/clo/tasks/${taskId}/results`);
      setTaskResults(response.data.data || null);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch task results';
      setError(errorMsg);
      console.error('Error fetching task results:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getGroupSessions = useCallback(async (groupId: string): Promise<GroupSession[]> => {
    try {
      const response = await api.get(`/clo/groups/${groupId}/sessions`);
      const sessions = response.data?.data?.sessions || [];
      setGroupSessions(sessions);
      return sessions;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch group sessions';
      setError(errorMsg);
      console.error('Error fetching group sessions:', err);
      setGroupSessions([]);
      return [];
    }
  }, []);

  const createTask = useCallback(async (data: CreateCLOTaskData): Promise<Task> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post('/clo/tasks', data);
      const newTask = response.data.data;
      setTasks(prev => [newTask, ...prev]);
      return newTask;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to create task';
      setError(errorMsg);
      console.error('Error creating task:', err);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateTask = useCallback(async (taskId: string, data: Partial<CreateCLOTaskData>): Promise<Task> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.put(`/clo/tasks/${taskId}`, data);
      const updatedTask = response.data.data;
      setTasks(prev => prev.map(t => t._id === taskId ? updatedTask : t));
      return updatedTask;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to update task';
      setError(errorMsg);
      console.error('Error updating task:', err);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await api.delete(`/clo/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t._id !== taskId));
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to delete task';
      setError(errorMsg);
      console.error('Error deleting task:', err);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const publishTask = useCallback(async (taskId: string): Promise<Task> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.patch(`/clo/tasks/${taskId}/publish`);
      const publishedTask = response.data.data;
      setTasks(prev => prev.map(t => t._id === taskId ? publishedTask : t));
      return publishedTask;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to publish task';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const duplicateTask = useCallback(async (taskId: string): Promise<Task> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post(`/clo/tasks/${taskId}/duplicate`);
      const newTask = response.data.data;
      setTasks(prev => [newTask, ...prev]);
      return newTask;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to duplicate task';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    tasks,
    taskDetails,
    taskResults,
    groupSessions,
    isLoading,
    error,
    pagination,
    getAllTasks,
    getTaskDetails,
    getTaskResults,
    getGroupSessions,
    createTask,
    updateTask,
    deleteTask,
    publishTask,
    duplicateTask,
  };
};
