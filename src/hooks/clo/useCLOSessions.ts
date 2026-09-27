/**
 * useCLOSessions Hook
 *
 * Custom hook for CLO to manage sessions across all groups and courses.
 * Uses /clo/sessions endpoints which mirror /trainer/sessions but are accessible to CLO role.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import type { TrainerSession, SessionFilters, CalendarEvent } from '../trainer/useTrainerSessions';

export type { TrainerSession, SessionFilters, CalendarEvent };

interface UseCLOSessionsReturn {
  sessions: TrainerSession[];
  isLoading: boolean;
  error: string | null;
  refetch: (filters?: SessionFilters) => Promise<void>;
  getSessionById: (sessionId: string) => Promise<TrainerSession | null>;
  createSession: (sessionData: Partial<TrainerSession>) => Promise<TrainerSession | null>;
  updateSession: (sessionId: string, updates: Partial<TrainerSession>) => Promise<TrainerSession | null>;
  deleteSession: (sessionId: string, permanent?: boolean, reason?: string) => Promise<boolean>;
  updateLessonPlan: (sessionId: string, lessonPlan: any) => Promise<boolean>;
}

export const useCLOSessions = (initialFilters?: SessionFilters): UseCLOSessionsReturn => {
  const [sessions, setSessions] = useState<TrainerSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async (filters?: SessionFilters) => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.groupId) params.append('groupId', filters.groupId);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.search) params.append('search', filters.search);

      const queryString = params.toString();
      const url = queryString ? `/clo/sessions?${queryString}` : '/clo/sessions';

      const response = await api.get(url);
      setSessions(response.data.data || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch sessions';
      setError(errorMessage);
      console.error('Error fetching CLO sessions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSessionById = useCallback(async (sessionId: string): Promise<TrainerSession | null> => {
    try {
      const response = await api.get(`/clo/sessions/${sessionId}`);
      return response.data.data || null;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch session';
      setError(errorMessage);
      console.error('Error fetching CLO session:', err);
      return null;
    }
  }, []);

  const createSession = useCallback(async (sessionData: Partial<TrainerSession>): Promise<TrainerSession | null> => {
    try {
      const response = await api.post('/clo/sessions', sessionData);
      const newSession = response.data.data;
      setSessions(prev => [newSession, ...prev]);
      return newSession;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create session';
      setError(errorMessage);
      console.error('Error creating CLO session:', err);
      return null;
    }
  }, []);

  const updateSession = useCallback(async (
    sessionId: string,
    updates: Partial<TrainerSession>
  ): Promise<TrainerSession | null> => {
    try {
      const response = await api.put(`/clo/sessions/${sessionId}`, updates);
      const updatedSession = response.data.data;
      setSessions(prev =>
        prev.map(session => (session._id === sessionId ? updatedSession : session))
      );
      return updatedSession;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update session';
      setError(errorMessage);
      console.error('Error updating CLO session:', err);
      return null;
    }
  }, []);

  const deleteSession = useCallback(async (
    sessionId: string,
    permanent = false,
    reason?: string
  ): Promise<boolean> => {
    try {
      const params = new URLSearchParams();
      if (permanent) params.append('permanent', 'true');
      if (reason) params.append('reason', reason);

      const queryString = params.toString();
      const url = queryString
        ? `/clo/sessions/${sessionId}?${queryString}`
        : `/clo/sessions/${sessionId}`;

      await api.delete(url);

      if (permanent) {
        setSessions(prev => prev.filter(session => session._id !== sessionId));
      } else {
        setSessions(prev =>
          prev.map(session =>
            session._id === sessionId
              ? { ...session, status: 'cancelled' as const, cancellationReason: reason }
              : session
          )
        );
      }
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to delete session';
      setError(errorMessage);
      console.error('Error deleting CLO session:', err);
      return false;
    }
  }, []);

  const updateLessonPlan = useCallback(async (sessionId: string, lessonPlan: any): Promise<boolean> => {
    try {
      const response = await api.put(`/clo/sessions/${sessionId}/lesson-plan`, lessonPlan);
      const updatedSession = response.data.data;
      setSessions(prev =>
        prev.map(session => (session._id === sessionId ? updatedSession : session))
      );
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update lesson plan';
      setError(errorMessage);
      console.error('Error updating CLO session lesson plan:', err);
      return false;
    }
  }, []);

  useEffect(() => {
    fetchSessions(initialFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    sessions,
    isLoading,
    error,
    refetch: fetchSessions,
    getSessionById,
    createSession,
    updateSession,
    deleteSession,
    updateLessonPlan,
  };
};
