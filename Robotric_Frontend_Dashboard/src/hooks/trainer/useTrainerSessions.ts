/**
 * useTrainerSessions Hook
 *
 * Custom hook for managing trainer sessions data.
 * Provides functionality to fetch, filter, create, update, and manage sessions.
 *
 * @hook useTrainerSessions
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

/**
 * Session interface matching backend model
 */
export interface TrainerSession {
  _id: string;
  title: string;
  description?: string;
  overrideSchedule?: boolean;
  groupId: {
    _id: string;
    name: string;
    students: string[];
    color?: string;
  };
  courseId: {
    _id: string;
    title: string;
    category?: string;
  };
  scheduledDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  location?: string;
  isOnline: boolean;
  meetingLink?: string;
  type: 'lecture' | 'lab' | 'workshop' | 'exam' | 'project' | 'review' | 'other';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';
  sessionNumber?: number;
  lessonPlan?: {
    objectives?: string[];
    outline?: Array<{
      startTime: string;
      endTime: string;
      duration: number;
      title: string;
      description?: string;
      activities?: string[];
    }>;
    materialsNeeded?: string[];
    attachments?: Array<{
      filename: string;
      url: string;
      fileType: string;
    }>;
    notes?: string;
  };
  attendanceId?: string;
  evaluationId?: string;
  hasAttendance?: boolean;
  hasEvaluation?: boolean;
  studentsCount?: number;
  actualStartTime?: string;
  actualEndTime?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Session filters
 */
export interface SessionFilters {
  groupId?: string;
  status?: 'scheduled' | 'completed' | 'cancelled' | 'in_progress';
  startDate?: string;
  endDate?: string;
  search?: string;
}

/**
 * Calendar event format
 */
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  groupName?: string;
  groupColor?: string;
  status: string;
  location?: string;
  isOnline: boolean;
  studentsCount?: number;
  type: string;
}

/**
 * Hook return type
 */
interface UseTrainerSessionsReturn {
  sessions: TrainerSession[];
  isLoading: boolean;
  error: string | null;
  refetch: (filters?: SessionFilters) => Promise<void>;
  getSessionById: (sessionId: string) => Promise<TrainerSession | null>;
  createSession: (sessionData: Partial<TrainerSession>) => Promise<TrainerSession | null>;
  updateSession: (sessionId: string, updates: Partial<TrainerSession>) => Promise<TrainerSession | null>;
  deleteSession: (sessionId: string, permanent?: boolean, reason?: string) => Promise<boolean>;
  startSession: (sessionId: string) => Promise<boolean>;
  endSession: (sessionId: string) => Promise<boolean>;
  updateLessonPlan: (sessionId: string, lessonPlan: any) => Promise<boolean>;
  getCalendarView: (view: 'day' | 'week' | 'month', date?: Date) => Promise<CalendarEvent[]>;
}

/**
 * Custom hook for managing trainer sessions
 * @param initialFilters - Initial filters to apply
 * @returns Hook utilities and data
 */
export const useTrainerSessions = (initialFilters?: SessionFilters): UseTrainerSessionsReturn => {
  const [sessions, setSessions] = useState<TrainerSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch sessions from API
   */
  const fetchSessions = useCallback(async (filters?: SessionFilters) => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      if (filters?.groupId) params.append('groupId', filters.groupId);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.search) params.append('search', filters.search);

      const queryString = params.toString();
      const url = queryString ? `/trainer/sessions?${queryString}` : '/trainer/sessions';

      const response = await api.get(url);
      setSessions(response.data.data || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch sessions';
      setError(errorMessage);
      console.error('Error fetching sessions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get session by ID
   */
  const getSessionById = useCallback(async (sessionId: string): Promise<TrainerSession | null> => {
    try {
      const response = await api.get(`/trainer/sessions/${sessionId}`);
      return response.data.data || null;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch session';
      setError(errorMessage);
      console.error('Error fetching session:', err);
      return null;
    }
  }, []);

  /**
   * Create new session
   */
  const createSession = useCallback(async (sessionData: Partial<TrainerSession>): Promise<TrainerSession | null> => {
    try {
      const response = await api.post('/trainer/sessions', sessionData);
      const newSession = response.data.data;

      // Add to local state
      setSessions(prev => [newSession, ...prev]);

      return newSession;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create session';
      setError(errorMessage);
      console.error('Error creating session:', err);
      return null;
    }
  }, []);

  /**
   * Update existing session
   */
  const updateSession = useCallback(async (
    sessionId: string,
    updates: Partial<TrainerSession>
  ): Promise<TrainerSession | null> => {
    try {
      const response = await api.put(`/trainer/sessions/${sessionId}`, updates);
      const updatedSession = response.data.data;

      // Update local state
      setSessions(prev =>
        prev.map(session => (session._id === sessionId ? updatedSession : session))
      );

      return updatedSession;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update session';
      setError(errorMessage);
      console.error('Error updating session:', err);
      return null;
    }
  }, []);

  /**
   * Delete session (soft or hard delete)
   */
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
        ? `/trainer/sessions/${sessionId}?${queryString}`
        : `/trainer/sessions/${sessionId}`;

      await api.delete(url);

      // Remove from or update local state
      if (permanent) {
        setSessions(prev => prev.filter(session => session._id !== sessionId));
      } else {
        // Update status to cancelled
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
      console.error('Error deleting session:', err);
      return false;
    }
  }, []);

  /**
   * Start session
   */
  const startSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const response = await api.post(`/trainer/sessions/${sessionId}/start`);
      const updatedSession = response.data.data;

      // Update local state
      setSessions(prev =>
        prev.map(session => (session._id === sessionId ? updatedSession : session))
      );

      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to start session';
      setError(errorMessage);
      console.error('Error starting session:', err);
      return false;
    }
  }, []);

  /**
   * End session
   */
  const endSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const response = await api.post(`/trainer/sessions/${sessionId}/end`);
      const updatedSession = response.data.data;

      // Update local state
      setSessions(prev =>
        prev.map(session => (session._id === sessionId ? updatedSession : session))
      );

      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to end session';
      setError(errorMessage);
      console.error('Error ending session:', err);
      return false;
    }
  }, []);

  /**
   * Update lesson plan
   */
  const updateLessonPlan = useCallback(async (sessionId: string, lessonPlan: any): Promise<boolean> => {
    try {
      const response = await api.put(`/trainer/sessions/${sessionId}/lesson-plan`, lessonPlan);
      const updatedSession = response.data.data;

      // Update local state
      setSessions(prev =>
        prev.map(session => (session._id === sessionId ? updatedSession : session))
      );

      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update lesson plan';
      setError(errorMessage);
      console.error('Error updating lesson plan:', err);
      return false;
    }
  }, []);

  /**
   * Get calendar view
   */
  const getCalendarView = useCallback(async (
    view: 'day' | 'week' | 'month',
    date?: Date
  ): Promise<CalendarEvent[]> => {
    try {
      const params = new URLSearchParams();
      params.append('view', view);
      if (date) {
        params.append('date', date.toISOString());
      }

      const response = await api.get(`/trainer/sessions/calendar?${params.toString()}`);
      const events = response.data.data || [];

      // Convert string dates to Date objects
      return events.map((event: any) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end)
      }));
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch calendar view';
      setError(errorMessage);
      console.error('Error fetching calendar view:', err);
      return [];
    }
  }, []);

  // Initial fetch on mount
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
    startSession,
    endSession,
    updateLessonPlan,
    getCalendarView
  };
};
