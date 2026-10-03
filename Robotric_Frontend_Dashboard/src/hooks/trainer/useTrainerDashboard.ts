import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

export interface TrainerDashboardStats {
  activeGroups: number;
  todaysSessions: number;
  completedToday: number;
  weekSessions: number;
  totalStudents: number;
  upcomingSessions: number;
  averageRating: number;
  todaysSessionsList?: TodaySession[];
}

export interface TodaySession {
  _id: string;
  title: string;
  groupName: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  location?: string;
}

export interface TrainerActivity {
  type: 'session_completed' | 'evaluation_submitted' | 'resource_uploaded';
  icon: string;
  title: string;
  description: string;
  timestamp: string;
  link?: string;
}

interface UseTrainerDashboardReturn {
  stats: TrainerDashboardStats | null;
  todaysSchedule: TodaySession[];
  recentActivities: TrainerActivity[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useTrainerDashboard = (): UseTrainerDashboardReturn => {
  const [stats, setStats] = useState<TrainerDashboardStats | null>(null);
  const [todaysSchedule, setTodaysSchedule] = useState<TodaySession[]>([]);
  const [recentActivities, setRecentActivities] = useState<TrainerActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all dashboard data in parallel
      const [statsRes, scheduleRes, activitiesRes] = await Promise.all([
        api.get('/trainer/dashboard/stats'),
        api.get('/trainer/dashboard/schedule'),
        api.get('/trainer/dashboard/activities'),
      ]);

      setStats(statsRes.data.data || null);
      setTodaysSchedule(scheduleRes.data.data || []);
      setRecentActivities(activitiesRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch dashboard data');
      console.error('Error fetching trainer dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    stats,
    todaysSchedule,
    recentActivities,
    isLoading,
    error,
    refetch: fetchDashboardData,
  };
};
