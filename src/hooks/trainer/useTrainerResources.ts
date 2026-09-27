import { useState, useCallback } from 'react';
import { api } from '../../lib/api';

export interface TrainerResourceSession {
  sessionId: string;
  sessionNumber: number;
  title: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
}

export interface TrainerResourceGroup {
  groupId: string;
  groupName: string;
  courseName: string;
  sessions: TrainerResourceSession[];
}

export interface TrainerResource {
  _id: string;
  title: string;
  description: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  courseId: { _id: string; title: string; category?: string };
  uploadedBy: { _id: string; name: string };
  status: string;
  createdAt: string;
  assignedTo: TrainerResourceGroup[];
}

export interface TrainerGroupOption {
  _id: string;
  name: string;
  courseId: { _id: string; title: string; category?: string };
}

export const useTrainerResources = () => {
  const [resources, setResources] = useState<TrainerResource[]>([]);
  const [groups, setGroups] = useState<TrainerGroupOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResources = useCallback(async (params?: { groupId?: string; search?: string }) => {
    try {
      setIsLoading(true);
      setError(null);
      const query = new URLSearchParams();
      if (params?.groupId) query.append('groupId', params.groupId);
      if (params?.search) query.append('search', params.search);
      const response = await api.get(`/trainer/resources?${query.toString()}`);
      setResources(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load resources');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const response = await api.get('/trainer/resources/groups');
      setGroups(response.data.data || []);
    } catch {
      // non-critical
    }
  }, []);

  return { resources, groups, isLoading, error, fetchResources, fetchGroups };
};
