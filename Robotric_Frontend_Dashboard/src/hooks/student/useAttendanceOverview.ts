import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

export interface CourseAttendance {
  courseId: string;
  courseTitle: string;
  courseThumbnail?: string;
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendancePercentage: number;
}

export interface OverallAttendanceStats {
  totalCourses: number;
  averageAttendance: number;
  totalSessions: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
}

export interface RecentAttendanceRecord {
  _id: string;
  courseTitle: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  checkInTime?: string;
  session: {
    title: string;
    date: string;
    startTime?: string;
    endTime?: string;
    type: 'lecture' | 'lab' | 'workshop' | 'exam';
  };
}

export interface AttendanceOverviewData {
  courses: CourseAttendance[];
  overallStats: OverallAttendanceStats;
  recentAttendance: RecentAttendanceRecord[];
}

interface UseAttendanceOverviewReturn {
  data: AttendanceOverviewData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useAttendanceOverview = (): UseAttendanceOverviewReturn => {
  const [data, setData] = useState<AttendanceOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get('/student/attendance/overview');
      setData(response.data.data || null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch attendance overview');
      console.error('Error fetching attendance overview:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchOverview,
  };
};
