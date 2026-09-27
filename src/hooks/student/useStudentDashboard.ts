import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export interface DashboardStats {
  totalEnrolledCourses: number;
  activeCourses: number;
  completedCourses: number;
  totalSessionsCompleted: number;
  totalSessionHours: number;
  averageProgress: number;
  averageAttendance: number;
  totalPaid: number;
  totalRemaining: number;
  overduePayments: number;
  averageQuizScore: number | null;
  totalQuizzesTaken: number;
  totalAssignmentsSubmitted: number;
  pendingAssignments: number;
}

export interface RecentActivity {
  _id: string;
  type: 'module' | 'quiz' | 'assignment' | 'payment' | 'attendance';
  title: string;
  description: string;
  courseTitle: string;
  timestamp: string;
  status?: 'completed' | 'in_progress' | 'graded' | 'submitted';
  icon?: string;
}

export interface UpcomingDeadline {
  _id: string;
  type: 'assignment' | 'payment' | 'quiz';
  title: string;
  courseTitle: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: string;
}

export interface CourseProgressOverview {
  courseId: string;
  courseTitle: string;
  progress: number;
  completedSessions: number;
  totalSessions: number;
  status: 'active' | 'completed';
}

interface UseStudentDashboardReturn {
  stats: DashboardStats | null;
  recentActivity: RecentActivity[];
  upcomingDeadlines: UpcomingDeadline[];
  progressOverview: CourseProgressOverview[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useStudentDashboard = (): UseStudentDashboardReturn => {
  // Fetch all dashboard data in parallel using React Query
  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ['student', 'dashboard', 'stats'],
    queryFn: async () => {
      const response = await api.get('/student/dashboard/stats');
      return response.data.data || null;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - stats change less frequently
  });

  const {
    data: activityData,
    isLoading: activityLoading,
    error: activityError,
  } = useQuery({
    queryKey: ['student', 'dashboard', 'recent-activity'],
    queryFn: async () => {
      const response = await api.get('/student/dashboard/recent-activity');
      return response.data.data || [];
    },
    staleTime: 1 * 60 * 1000, // 1 minute - activity updates more frequently
  });

  const {
    data: deadlinesData,
    isLoading: deadlinesLoading,
    error: deadlinesError,
  } = useQuery({
    queryKey: ['student', 'dashboard', 'upcoming-deadlines'],
    queryFn: async () => {
      const response = await api.get('/student/dashboard/upcoming-deadlines');
      return response.data.data || [];
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  const {
    data: progressData,
    isLoading: progressLoading,
    error: progressError,
    refetch: refetchProgress,
  } = useQuery({
    queryKey: ['student', 'dashboard', 'progress'],
    queryFn: async () => {
      const response = await api.get('/student/dashboard/progress');
      return response.data.data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const isLoading = statsLoading || activityLoading || deadlinesLoading || progressLoading;
  const error = statsError || activityError || deadlinesError || progressError;

  const refetch = async () => {
    await refetchProgress();
    // React Query will automatically refetch all queries when needed
  };

  return {
    stats: statsData || null,
    recentActivity: activityData || [],
    upcomingDeadlines: deadlinesData || [],
    progressOverview: progressData || [],
    isLoading,
    error: error ? (error as any)?.response?.data?.message || 'Failed to fetch dashboard data' : null,
    refetch,
  };
};
