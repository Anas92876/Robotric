import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

export interface DashboardStats {
  trainers: {
    total: number;
    active: number;
    inactive: number;
  };
  courses: {
    total: number;
    published: number;
    draft: number;
  };
  groups: {
    total: number;
    active: number;
    completed: number;
  };
  students: {
    total: number;
  };
  enrollments: {
    total: number;
    active: number;
    recent: number;
  };
  performance: {
    attendanceRate: number;
    completionRate: number;
  };
}

export interface TopTrainer {
  _id: string;
  trainerName: string;
  trainerEmail: string;
  totalGroups: number;
  avgAttendance: number;
}

export interface RecentActivity {
  groups: any[];
  courses: any[];
}

interface UseCLODashboardReturn {
  stats: DashboardStats | null;
  topTrainers: TopTrainer[];
  recentActivity: RecentActivity | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useCLODashboard = (): UseCLODashboardReturn => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topTrainers, setTopTrainers] = useState<TopTrainer[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get('/clo/dashboard');
      const data = response.data.data;

      setStats(data.stats);
      setTopTrainers(data.topTrainers || []);
      setRecentActivity(data.recentActivity);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch dashboard data');
      console.error('Error fetching CLO dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    stats,
    topTrainers,
    recentActivity,
    isLoading,
    error,
    refetch: fetchDashboard,
  };
};
