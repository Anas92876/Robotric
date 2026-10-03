/**
 * useTrainerGroups Hook
 *
 * Custom hook for managing trainer groups data.
 * Provides functionality to fetch, filter, and manage groups.
 *
 * @hook useTrainerGroups
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

/**
 * Group interface matching backend model
 */
export interface TrainerGroup {
  _id: string;
  name: string;
  description?: string;
  courseId: {
    _id: string;
    title: string;
    category?: string;
    level?: string;
    thumbnail?: string;
  };
  students: Array<{
    _id: string;
    name: string;
    email: string;
  }>;
  schedule: Array<{
    day: string;
    startTime: string;
    endTime: string;
    location?: string;
  }>;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'archived' | 'cancelled';
  maxStudents: number;
  thumbnail?: string;
  color: string;
  progress: {
    completedSessions: number;
    totalSessions: number;
    percentageComplete: number;
  };
  stats: {
    averageAttendance: number;
    averagePerformance: number;
    totalAssignments: number;
    totalQuizzes: number;
  };
  isFull: boolean;
  enrolledCount: number;
  isCurrentlyActive: boolean;
  availableSeats: number;
  boardEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
  nextSession?: {
    _id: string;
    title: string;
    scheduledDate: string;
    startTime: string;
    endTime: string;
  };
}

/**
 * Group filters
 */
export interface GroupFilters {
  status?: 'active' | 'completed' | 'archived' | 'cancelled';
  courseId?: string;
  search?: string;
}

/**
 * Hook return type
 */
interface UseTrainerGroupsReturn {
  groups: TrainerGroup[];
  isLoading: boolean;
  error: string | null;
  refetch: (filters?: GroupFilters) => Promise<void>;
  getGroupById: (groupId: string) => Promise<TrainerGroup | null>;
  addStudent: (groupId: string, studentId: string) => Promise<boolean>;
  removeStudent: (groupId: string, studentId: string) => Promise<boolean>;
}

/**
 * Custom hook for managing trainer groups
 * @param initialFilters - Initial filters to apply
 * @returns Hook utilities and data
 */
export const useTrainerGroups = (initialFilters?: GroupFilters): UseTrainerGroupsReturn => {
  const [groups, setGroups] = useState<TrainerGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch groups from API
   */
  const fetchGroups = useCallback(async (filters?: GroupFilters) => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.courseId) params.append('courseId', filters.courseId);
      if (filters?.search) params.append('search', filters.search);

      const queryString = params.toString();
      const url = queryString ? `/trainer/groups?${queryString}` : '/trainer/groups';

      const response = await api.get(url);
      setGroups(response.data.data || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch groups';
      setError(errorMessage);
      console.error('Error fetching groups:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Groups are created, edited and deleted by the CLO only.

  /**
   * Add student to group
   */
  const addStudent = useCallback(async (groupId: string, studentId: string): Promise<boolean> => {
    try {
      const response = await api.post(`/trainer/groups/${groupId}/students`, { studentId });
      const updatedGroup = response.data.data;

      // Update local state
      setGroups(prev =>
        prev.map(group => (group._id === groupId ? updatedGroup : group))
      );

      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to add student';
      setError(errorMessage);
      console.error('Error adding student:', err);
      return false;
    }
  }, []);

  /**
   * Remove student from group
   */
  const removeStudent = useCallback(async (groupId: string, studentId: string): Promise<boolean> => {
    try {
      const response = await api.delete(`/trainer/groups/${groupId}/students/${studentId}`);
      const updatedGroup = response.data.data;

      // Update local state
      setGroups(prev =>
        prev.map(group => (group._id === groupId ? updatedGroup : group))
      );

      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to remove student';
      setError(errorMessage);
      console.error('Error removing student:', err);
      return false;
    }
  }, []);

  /**
   * Get single group by ID
   */
  const getGroupById = useCallback(async (groupId: string): Promise<TrainerGroup | null> => {
    try {
      const response = await api.get(`/trainer/groups/${groupId}`);
      return response.data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch group';
      setError(errorMessage);
      console.error('Error fetching group by ID:', err);
      throw new Error(errorMessage);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchGroups(initialFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    groups,
    isLoading,
    error,
    refetch: fetchGroups,
    getGroupById,
    addStudent,
    removeStudent
  };
};
