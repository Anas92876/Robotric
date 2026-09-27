/**
 * Custom hook for managing notifications in reception dashboard
 *
 * Provides operations for sending notifications:
 * - Send custom notifications to users
 * - Fetch available courses, groups, and students for target selection
 */

import { useState, useCallback } from 'react';
import { api } from '../../lib/api';

/**
 * Course interface
 */
export interface Course {
  _id: string;
  title: string;
  description?: string;
  category?: string;
  level?: string;
}

/**
 * Group interface
 */
export interface Group {
  _id: string;
  name: string;
  courseId: {
    _id: string;
    title: string;
  };
  trainerId?: {
    _id: string;
    name: string;
  };
  status: string;
}

/**
 * Student interface
 */
export interface Student {
  _id: string;
  name: string;
  email: string;
}

/**
 * Send notification request payload
 */
export interface SendNotificationRequest {
  title: string;
  body: string;
  targetType: 'all' | 'course' | 'group' | 'students';
  targetIds?: string | string[];
  data?: Record<string, any>;
}

/**
 * Send notification response
 */
export interface SendNotificationResponse {
  success: boolean;
  message: string;
  data: {
    usersNotified: number;
    targetType: string;
    targetIds?: string | string[] | null;
    error?: string;
  };
}

/**
 * Return type for the hook
 */
interface UseNotificationsReturn {
  isLoading: boolean;
  error: string | null;
  sendNotification: (data: SendNotificationRequest) => Promise<SendNotificationResponse>;
  courses: Course[];
  groups: Group[];
  students: Student[];
  fetchCourses: () => Promise<void>;
  fetchGroups: (courseId?: string) => Promise<void>;
  fetchStudents: () => Promise<void>;
}

/**
 * Hook to manage notifications
 *
 * @returns Notification functions, helper data, loading state, and error
 */
export const useNotifications = (): UseNotificationsReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  /**
   * Send notification to users
   */
  const sendNotification = useCallback(async (data: SendNotificationRequest): Promise<SendNotificationResponse> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post<SendNotificationResponse>('/reception/notifications/send', data);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to send notification';
      setError(errorMessage);
      console.error('Error sending notification:', err);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch available courses
   */
  const fetchCourses = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/reception/enrollments/available-courses');
      setCourses(response.data.data || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch courses';
      setError(errorMessage);
      console.error('Error fetching courses:', err);
    }
  }, []);

  /**
   * Fetch available groups (optionally filtered by course)
   */
  const fetchGroups = useCallback(async (courseId?: string) => {
    try {
      setError(null);
      let url = '/clo/groups';
      if (courseId) {
        url = `/reception/enrollments/available-groups/${courseId}`;
      } else {
        // Fetch all active groups
        url = '/clo/groups?status=active';
      }
      const response = await api.get(url);
      const groupsData = response.data.data || [];
      setGroups(groupsData);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch groups';
      setError(errorMessage);
      console.error('Error fetching groups:', err);
    }
  }, []);

  /**
   * Fetch available students
   */
  const fetchStudents = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/reception/enrollments/available-students');
      setStudents(response.data.data || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch students';
      setError(errorMessage);
      console.error('Error fetching students:', err);
    }
  }, []);

  return {
    isLoading,
    error,
    sendNotification,
    courses,
    groups,
    students,
    fetchCourses,
    fetchGroups,
    fetchStudents
  };
};
