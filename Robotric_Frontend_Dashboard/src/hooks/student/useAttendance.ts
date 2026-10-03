import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

export interface AttendanceRecord {
  _id: string;
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

export interface AttendanceStats {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendancePercentage: number;
}

interface UseAttendanceReturn {
  attendance: AttendanceRecord[];
  stats: AttendanceStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useAttendance = (courseId: string): UseAttendanceReturn => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendance = useCallback(async () => {
    if (!courseId) return;

    try {
      setIsLoading(true);
      setError(null);

      const [attendanceRes, summaryRes] = await Promise.all([
        api.get(`/student/attendance/courses/${courseId}`),
        api.get(`/student/attendance/summary/${courseId}`),
      ]);

      setAttendance(attendanceRes.data.data || []);
      setStats(summaryRes.data.data || null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch attendance');
      console.error('Error fetching attendance:', err);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  return {
    attendance,
    stats,
    isLoading,
    error,
    refetch: fetchAttendance,
  };
};
