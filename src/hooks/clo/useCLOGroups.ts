import { useState, useCallback } from 'react';
import { api } from '../../lib/api';

export interface GroupStats {
  studentsCount: number;
  enrollments: number;
  avgAttendance: number;
}

export interface Group {
  _id: string;
  name: string;
  courseId: {
    _id: string;
    title: string;
    category?: string;
    level?: string;
  };
  trainerId: {
    _id: string;
    name: string;
    email: string;
  };
  students: any[];
  startDate?: string;
  endDate?: string;
  schedule?: any[];
  maxStudents?: number;
  maxCapacity?: number; // Keep for backward compatibility
  startingSessionNumber?: number;
  description?: string;
  status: string;
  boardEnabled?: boolean;
  stats?: GroupStats;
  createdAt: string;
}

export interface CreateGroupData {
  name: string;
  courseId: string;
  trainerId: string;
  startDate?: string;
  endDate?: string;
  schedule?: any[];
  maxStudents?: number;
  startingSessionNumber?: number;
  description?: string;
}

export interface UpdateGroupData {
  name?: string;
  courseId?: string;
  trainerId?: string;
  startDate?: string;
  endDate?: string;
  schedule?: any[];
  maxStudents?: number;
  startingSessionNumber?: number;
  description?: string;
  status?: string;
}

interface UseCLOGroupsReturn {
  groups: Group[];
  isLoading: boolean;
  error: string | null;
  fetchGroups: (params?: {
    status?: string;
    courseId?: string;
    trainerId?: string;
    search?: string;
    sortBy?: string;
    order?: string;
  }) => Promise<void>;
  getGroupDetails: (id: string) => Promise<any>;
  createGroup: (data: CreateGroupData) => Promise<Group>;
  updateGroup: (id: string, data: UpdateGroupData) => Promise<Group>;
  deleteGroup: (id: string) => Promise<void>;
  closeGroup: (id: string, action?: 'close' | 'reopen') => Promise<void>;
  assignTrainerToGroup: (groupId: string, trainerId: string) => Promise<void>;
  getGroupStudents: (groupId: string) => Promise<any[]>;
  addStudentToGroup: (groupId: string, studentId: string) => Promise<void>;
  removeStudentFromGroup: (groupId: string, studentId: string) => Promise<void>;
  toggleGroupBoard: (groupId: string) => Promise<void>;
}

export const useCLOGroups = (): UseCLOGroupsReturn => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async (params?: {
    status?: string;
    courseId?: string;
    trainerId?: string;
    search?: string;
    sortBy?: string;
    order?: string;
  }) => {
    try {
      setIsLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.courseId) queryParams.append('courseId', params.courseId);
      if (params?.trainerId) queryParams.append('trainerId', params.trainerId);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params?.order) queryParams.append('order', params.order);

      const response = await api.get(`/clo/groups?${queryParams.toString()}`);
      const groupsData = response.data.data || [];

      // Debug: Log first group to check what frontend receives
      if (groupsData.length > 0) {
        console.log('Frontend received group:', groupsData[0]);
        console.log('courseId type:', typeof groupsData[0].courseId);
        console.log('courseId value:', groupsData[0].courseId);
        console.log('courseId has title?', 'title' in groupsData[0].courseId);
        console.log('courseId.title:', groupsData[0].courseId?.title);
        console.log('trainerId.name:', groupsData[0].trainerId?.name);
      }

      setGroups(groupsData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch groups');
      console.error('Error fetching groups:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getGroupDetails = useCallback(async (id: string) => {
    try {
      setError(null);
      const response = await api.get(`/clo/groups/${id}`);
      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch group details';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const createGroup = useCallback(async (data: CreateGroupData): Promise<Group> => {
    try {
      setError(null);
      const response = await api.post('/clo/groups', data);
      const newGroup = response.data.data;
      setGroups(prev => [newGroup, ...prev]);
      return newGroup;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to create group';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const updateGroup = useCallback(async (id: string, data: UpdateGroupData): Promise<Group> => {
    try {
      setError(null);
      const response = await api.put(`/clo/groups/${id}`, data);
      const updatedGroup = response.data.data;
      setGroups(prev => prev.map(g => g._id === id ? updatedGroup : g));
      return updatedGroup;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to update group';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const deleteGroup = useCallback(async (id: string) => {
    try {
      setError(null);
      await api.delete(`/clo/groups/${id}`);
      // Remove from local state
      setGroups(prev => prev.filter(g => g._id !== id));
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to delete group';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const closeGroup = useCallback(async (id: string, action: 'close' | 'reopen' = 'close') => {
    try {
      setError(null);
      await api.put(`/clo/groups/${id}/status`, { action });
      // Update local state
      setGroups(prev => prev.map(g => {
        if (g._id === id) {
          return {
            ...g,
            status: action === 'close' ? 'completed' : 'active'
          };
        }
        return g;
      }));
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to update group status';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const assignTrainerToGroup = useCallback(async (groupId: string, trainerId: string) => {
    try {
      setError(null);
      const response = await api.post(`/clo/groups/${groupId}/assign-trainer`, { trainerId });
      const updatedGroup = response.data.data;
      setGroups(prev => prev.map(g => g._id === groupId ? updatedGroup : g));
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to assign trainer';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getGroupStudents = useCallback(async (groupId: string) => {
    try {
      setError(null);
      const response = await api.get(`/clo/groups/${groupId}/students`);
      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch group students';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const addStudentToGroup = useCallback(async (groupId: string, studentId: string) => {
    try {
      setError(null);
      await api.post(`/clo/groups/${groupId}/students`, { studentId });
      // Optionally refetch the group to update students list
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to add student to group';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const removeStudentFromGroup = useCallback(async (groupId: string, studentId: string) => {
    try {
      setError(null);
      await api.delete(`/clo/groups/${groupId}/students/${studentId}`);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to remove student from group';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const toggleGroupBoard = useCallback(async (groupId: string) => {
    try {
      setError(null);
      const response = await api.patch(`/clo/groups/${groupId}/board`);
      const { boardEnabled } = response.data.data;
      setGroups(prev => prev.map(g => g._id === groupId ? { ...g, boardEnabled } : g));
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to toggle board';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  return {
    groups,
    isLoading,
    error,
    fetchGroups,
    getGroupDetails,
    createGroup,
    updateGroup,
    deleteGroup,
    closeGroup,
    assignTrainerToGroup,
    getGroupStudents,
    addStudentToGroup,
    removeStudentFromGroup,
    toggleGroupBoard,
  };
};
