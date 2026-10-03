import { useState, useCallback } from 'react';
import { api } from '../../lib/api';

export interface SessionEvaluation {
  _id: string;
  sessionId: {
    _id: string;
    title: string;
    scheduledDate: string;
    type: string;
    duration?: number;
    location?: string;
  };
  trainerId: {
    _id: string;
    name: string;
    email: string;
  };
  groupId: {
    _id: string;
    name: string;
    courseId?: {
      _id: string;
      title: string;
      category?: string;
    };
  };
  overallRating: number;
  engagementLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  objectivesAchievement: number;
  topicsCovered?: Array<{
    topic: string;
    covered: boolean;
    notes?: string;
  }>;
  sessionNotes?: string;
  challenges?: string;
  followUpActions?: string[];
  studentPerformance?: {
    overallPerformance: 'poor' | 'below_average' | 'average' | 'good' | 'excellent';
    participationRate: number;
    comprehensionLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
    notes?: string;
  };
  effectiveness?: {
    timeManagement: number;
    materialQuality: number;
    studentInteraction: number;
    learningOutcomes: number;
  };
  improvements?: string[];
  evaluationDate: string;
  createdAt: string;
}

export interface EvaluationStats {
  total: number;
  averageRating: number;
  averageObjectivesAchievement: number;
  engagementDistribution: {
    very_low: number;
    low: number;
    medium: number;
    high: number;
    very_high: number;
  };
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

interface UseCLOEvaluationsReturn {
  evaluations: SessionEvaluation[];
  isLoading: boolean;
  error: string | null;
  fetchEvaluations: (params?: {
    groupId?: string;
    trainerId?: string;
    startDate?: string;
    endDate?: string;
    minRating?: number;
    maxRating?: number;
    engagementLevel?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }) => Promise<SessionEvaluation[]>;
  getEvaluationById: (id: string) => Promise<SessionEvaluation>;
  getGroupEvaluations: (groupId: string) => Promise<{ evaluations: SessionEvaluation[]; stats: any }>;
  getEvaluationStats: (params?: {
    groupId?: string;
    trainerId?: string;
    startDate?: string;
    endDate?: string;
  }) => Promise<EvaluationStats>;
}

export const useCLOEvaluations = (): UseCLOEvaluationsReturn => {
  const [evaluations, setEvaluations] = useState<SessionEvaluation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvaluations = useCallback(async (params?: {
    groupId?: string;
    trainerId?: string;
    startDate?: string;
    endDate?: string;
    minRating?: number;
    maxRating?: number;
    engagementLevel?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<SessionEvaluation[]> => {
    try {
      setIsLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (params?.groupId) queryParams.append('groupId', params.groupId);
      if (params?.trainerId) queryParams.append('trainerId', params.trainerId);
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (params?.minRating) queryParams.append('minRating', params.minRating.toString());
      if (params?.maxRating) queryParams.append('maxRating', params.maxRating.toString());
      if (params?.engagementLevel) queryParams.append('engagementLevel', params.engagementLevel);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const response = await api.get(`/clo/evaluations?${queryParams.toString()}`);
      const evaluationsData = response.data.data || [];

      setEvaluations(evaluationsData);
      return evaluationsData;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch evaluations');
      console.error('Error fetching evaluations:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getEvaluationById = useCallback(async (id: string): Promise<SessionEvaluation> => {
    try {
      setError(null);
      const response = await api.get(`/clo/evaluations/${id}`);
      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch evaluation details';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getGroupEvaluations = useCallback(async (groupId: string) => {
    try {
      setError(null);
      const response = await api.get(`/clo/evaluations/group/${groupId}`);
      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch group evaluations';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getEvaluationStats = useCallback(async (params?: {
    groupId?: string;
    trainerId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<EvaluationStats> => {
    try {
      setError(null);
      const queryParams = new URLSearchParams();
      if (params?.groupId) queryParams.append('groupId', params.groupId);
      if (params?.trainerId) queryParams.append('trainerId', params.trainerId);
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);

      const response = await api.get(`/clo/evaluations/stats?${queryParams.toString()}`);
      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch evaluation stats';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  return {
    evaluations,
    isLoading,
    error,
    fetchEvaluations,
    getEvaluationById,
    getGroupEvaluations,
    getEvaluationStats,
  };
};
