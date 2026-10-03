import { useState, useCallback } from 'react';
import { api } from '../../lib/api';

export interface TrainerStats {
  totalGroups: number;
  activeGroups: number;
  totalStudents: number;
  coursesCount: number;
  avgAttendance: number;
}

export interface Trainer {
  _id: string;
  name: string;
  email: string;
  role: string;
  profile?: {
    isActive?: boolean;
    specialization?: string;
    bio?: string;
    phone?: string;
    authorizedCourses?: string[];
  };
  stats?: TrainerStats;
  createdAt: string;
}

export interface CreateTrainerData {
  name: string;
  email: string;
  password: string;
  profile?: {
    specialization?: string;
    bio?: string;
    phone?: string;
  };
}

export interface UpdateTrainerData {
  name?: string;
  email?: string;
  password?: string;
  profile?: {
    isActive?: boolean;
    specialization?: string;
    bio?: string;
    phone?: string;
  };
}

interface UseCLOTrainersReturn {
  trainers: Trainer[];
  isLoading: boolean;
  error: string | null;
  fetchTrainers: (params?: {
    status?: string;
    search?: string;
    sortBy?: string;
    order?: string;
  }) => Promise<void>;
  createTrainer: (data: CreateTrainerData) => Promise<Trainer>;
  updateTrainer: (id: string, data: UpdateTrainerData) => Promise<Trainer>;
  deactivateTrainer: (id: string, action?: 'deactivate' | 'activate') => Promise<void>;
  getTrainerPerformance: (id: string, period?: number) => Promise<any>;
  assignTrainerToCourse: (trainerId: string, courseId: string) => Promise<void>;
  removeTrainerFromCourse: (trainerId: string, courseId: string) => Promise<void>;
}

export const useCLOTrainers = (): UseCLOTrainersReturn => {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrainers = useCallback(async (params?: {
    status?: string;
    search?: string;
    sortBy?: string;
    order?: string;
  }) => {
    try {
      setIsLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params?.order) queryParams.append('order', params.order);

      const response = await api.get(`/clo/trainers?${queryParams.toString()}`);
      setTrainers(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch trainers');
      console.error('Error fetching trainers:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTrainer = useCallback(async (data: CreateTrainerData): Promise<Trainer> => {
    try {
      setError(null);
      const response = await api.post('/clo/trainers', data);
      const newTrainer = response.data.data;
      setTrainers(prev => [newTrainer, ...prev]);
      return newTrainer;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to create trainer';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const updateTrainer = useCallback(async (id: string, data: UpdateTrainerData): Promise<Trainer> => {
    try {
      setError(null);
      const response = await api.put(`/clo/trainers/${id}`, data);
      const updatedTrainer = response.data.data;
      setTrainers(prev => prev.map(t => t._id === id ? updatedTrainer : t));
      return updatedTrainer;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to update trainer';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const deactivateTrainer = useCallback(async (id: string, action: 'deactivate' | 'activate' = 'deactivate') => {
    try {
      setError(null);
      await api.delete(`/clo/trainers/${id}`, { data: { action } });
      // Update local state
      setTrainers(prev => prev.map(t => {
        if (t._id === id) {
          return {
            ...t,
            profile: {
              ...t.profile,
              isActive: action === 'activate'
            }
          };
        }
        return t;
      }));
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to update trainer status';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getTrainerPerformance = useCallback(async (id: string, period: number = 30) => {
    try {
      setError(null);
      const response = await api.get(`/clo/trainers/${id}/performance?period=${period}`);
      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch trainer performance';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const assignTrainerToCourse = useCallback(async (trainerId: string, courseId: string) => {
    try {
      setError(null);
      await api.post(`/clo/trainers/${trainerId}/assign-course`, { courseId });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to assign trainer to course';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const removeTrainerFromCourse = useCallback(async (trainerId: string, courseId: string) => {
    try {
      setError(null);
      await api.delete(`/clo/trainers/${trainerId}/courses/${courseId}`);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to remove trainer from course';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  return {
    trainers,
    isLoading,
    error,
    fetchTrainers,
    createTrainer,
    updateTrainer,
    deactivateTrainer,
    getTrainerPerformance,
    assignTrainerToCourse,
    removeTrainerFromCourse,
  };
};
