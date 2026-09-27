/**
 * useStudentEvaluations Hook
 *
 * Custom hook for managing student evaluations.
 * Handles CRUD operations, session evaluations, student progress, and statistics.
 *
 * @hook useStudentEvaluations
 * @version 1.0.0
 */

import { useState, useCallback } from 'react';
import { api } from '../../lib/api';
import type {
  StudentEvaluation,
  EvaluationInput,
  EvaluationFilters,
  SessionEvaluationsData,
  StudentProgressData,
  EvaluationStats,
  FlaggedStudent,
  BulkEvaluationInput,
  ShareEvaluationInput,
  QuickEvaluationInput,
  PaginatedEvaluationResponse,
  EvaluationResponse
} from '../../types/evaluation.types';

interface UseStudentEvaluationsReturn {
  // State
  evaluations: StudentEvaluation[];
  isLoading: boolean;
  error: string | null;

  // CRUD Operations
  createEvaluation: (data: EvaluationInput | QuickEvaluationInput) => Promise<StudentEvaluation | null>;
  updateEvaluation: (id: string, data: Partial<EvaluationInput>) => Promise<StudentEvaluation | null>;
  getEvaluationById: (id: string) => Promise<StudentEvaluation | null>;
  getEvaluations: (filters?: EvaluationFilters) => Promise<StudentEvaluation[]>;
  deleteEvaluation: (id: string) => Promise<boolean>;

  // Specialized Queries
  getSessionEvaluations: (sessionId: string) => Promise<SessionEvaluationsData | null>;
  getStudentProgress: (studentId: string, groupId?: string) => Promise<StudentProgressData | null>;
  getEvaluationStats: (filters?: EvaluationFilters) => Promise<EvaluationStats | null>;
  getFlaggedStudents: (groupId?: string) => Promise<FlaggedStudent[]>;

  // Bulk Operations
  bulkCreateEvaluations: (data: BulkEvaluationInput) => Promise<StudentEvaluation[]>;

  // Actions
  shareEvaluation: (id: string, data: ShareEvaluationInput) => Promise<StudentEvaluation | null>;

  // Utility
  clearError: () => void;
}

export const useStudentEvaluations = (): UseStudentEvaluationsReturn => {
  const [evaluations, setEvaluations] = useState<StudentEvaluation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Create a new evaluation
   */
  const createEvaluation = useCallback(async (
    data: EvaluationInput | QuickEvaluationInput
  ): Promise<StudentEvaluation | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post<EvaluationResponse<StudentEvaluation>>(
        '/trainer/evaluations',
        data
      );

      const evaluation = response.data.data;

      // Add to local state
      setEvaluations(prev => [evaluation, ...prev]);

      return evaluation;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create evaluation';
      setError(errorMessage);
      console.error('Error creating evaluation:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update an existing evaluation
   */
  const updateEvaluation = useCallback(async (
    id: string,
    data: Partial<EvaluationInput>
  ): Promise<StudentEvaluation | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.put<EvaluationResponse<StudentEvaluation>>(
        `/trainer/evaluations/${id}`,
        data
      );

      const evaluation = response.data.data;

      // Update local state
      setEvaluations(prev =>
        prev.map(e => (e._id === id ? evaluation : e))
      );

      return evaluation;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update evaluation';
      setError(errorMessage);
      console.error('Error updating evaluation:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get a single evaluation by ID
   */
  const getEvaluationById = useCallback(async (id: string): Promise<StudentEvaluation | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get<EvaluationResponse<StudentEvaluation>>(
        `/trainer/evaluations/${id}`
      );

      return response.data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch evaluation';
      setError(errorMessage);
      console.error('Error fetching evaluation:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get all evaluations with optional filters
   */
  const getEvaluations = useCallback(async (
    filters?: EvaluationFilters
  ): Promise<StudentEvaluation[]> => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query string
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const url = params.toString()
        ? `/trainer/evaluations?${params.toString()}`
        : '/trainer/evaluations';

      const response = await api.get<PaginatedEvaluationResponse>(url);

      setEvaluations(response.data.data);
      return response.data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch evaluations';
      setError(errorMessage);
      console.error('Error fetching evaluations:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Delete an evaluation
   */
  const deleteEvaluation = useCallback(async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      await api.delete(`/trainer/evaluations/${id}`);

      // Remove from local state
      setEvaluations(prev => prev.filter(e => e._id !== id));

      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete evaluation';
      setError(errorMessage);
      console.error('Error deleting evaluation:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get all evaluations for a specific session
   */
  const getSessionEvaluations = useCallback(async (
    sessionId: string
  ): Promise<SessionEvaluationsData | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get<EvaluationResponse<SessionEvaluationsData>>(
        `/trainer/evaluations/session/${sessionId}`
      );

      setEvaluations(response.data.data.evaluations);
      return response.data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch session evaluations';
      setError(errorMessage);
      console.error('Error fetching session evaluations:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get all evaluations and progress for a specific student
   */
  const getStudentProgress = useCallback(async (
    studentId: string,
    groupId?: string
  ): Promise<StudentProgressData | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const url = groupId
        ? `/trainer/evaluations/student/${studentId}?groupId=${groupId}`
        : `/trainer/evaluations/student/${studentId}`;

      const response = await api.get<EvaluationResponse<StudentProgressData>>(url);

      return response.data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch student progress';
      setError(errorMessage);
      console.error('Error fetching student progress:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get evaluation statistics
   */
  const getEvaluationStats = useCallback(async (
    filters?: EvaluationFilters
  ): Promise<EvaluationStats | null> => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query string
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const url = params.toString()
        ? `/trainer/evaluations/stats?${params.toString()}`
        : '/trainer/evaluations/stats';

      const response = await api.get<EvaluationResponse<EvaluationStats>>(url);

      return response.data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch evaluation statistics';
      setError(errorMessage);
      console.error('Error fetching evaluation statistics:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get students flagged for attention
   */
  const getFlaggedStudents = useCallback(async (
    groupId?: string
  ): Promise<FlaggedStudent[]> => {
    try {
      setIsLoading(true);
      setError(null);

      const url = groupId
        ? `/trainer/evaluations/flagged?groupId=${groupId}`
        : '/trainer/evaluations/flagged';

      const response = await api.get<EvaluationResponse<FlaggedStudent[]>>(url);

      return response.data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch flagged students';
      setError(errorMessage);
      console.error('Error fetching flagged students:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create multiple evaluations at once
   */
  const bulkCreateEvaluations = useCallback(async (
    data: BulkEvaluationInput
  ): Promise<StudentEvaluation[]> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post<EvaluationResponse<{ created: StudentEvaluation[], errors?: any[] }>>(
        '/trainer/evaluations/bulk',
        data
      );

      const createdEvaluations = response.data.data.created;

      // Add to local state
      setEvaluations(prev => [...createdEvaluations, ...prev]);

      return createdEvaluations;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create bulk evaluations';
      setError(errorMessage);
      console.error('Error creating bulk evaluations:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Share evaluation with student/parent
   */
  const shareEvaluation = useCallback(async (
    id: string,
    data: ShareEvaluationInput
  ): Promise<StudentEvaluation | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post<EvaluationResponse<StudentEvaluation>>(
        `/trainer/evaluations/${id}/share`,
        data
      );

      const evaluation = response.data.data;

      // Update local state
      setEvaluations(prev =>
        prev.map(e => (e._id === id ? evaluation : e))
      );

      return evaluation;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to share evaluation';
      setError(errorMessage);
      console.error('Error sharing evaluation:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // State
    evaluations,
    isLoading,
    error,

    // CRUD Operations
    createEvaluation,
    updateEvaluation,
    getEvaluationById,
    getEvaluations,
    deleteEvaluation,

    // Specialized Queries
    getSessionEvaluations,
    getStudentProgress,
    getEvaluationStats,
    getFlaggedStudents,

    // Bulk Operations
    bulkCreateEvaluations,

    // Actions
    shareEvaluation,

    // Utility
    clearError
  };
};
