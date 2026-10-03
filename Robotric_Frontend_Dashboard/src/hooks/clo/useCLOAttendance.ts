import { useState, useCallback } from 'react';
import { api } from '../../lib/api';

export interface AttendanceRecord {
  student: {
    _id: string;
    name: string;
    email: string;
  };
  status: 'present' | 'absent' | 'late' | 'excused';
  markedBy?: {
    _id: string;
    name: string;
  };
  markedAt: string;
  notes?: string;
  checkInTime?: string;
}

export interface Attendance {
  _id: string;
  course: {
    _id: string;
    title: string;
    category?: string;
    level?: string;
  };
  session: {
    title: string;
    date: string;
    startTime?: string;
    endTime?: string;
    type: 'lecture' | 'lab' | 'workshop' | 'exam' | 'project' | 'other';
    location?: string;
    notes?: string;
  };
  records: AttendanceRecord[];
  stats?: {
    totalStudents: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    attendanceRate: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceStats {
  totalSessions: number;
  totalStudentRecords: number;
  overallAttendanceRate: number;
  statusDistribution: {
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
  averageSessionAttendance: number;
}

interface UseCLOAttendanceReturn {
  attendanceRecords: Attendance[];
  isLoading: boolean;
  error: string | null;
  fetchAttendance: (params?: {
    courseId?: string;
    groupId?: string;
    startDate?: string;
    endDate?: string;
    sessionType?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }) => Promise<void>;
  getAttendanceById: (id: string) => Promise<Attendance>;
  getCourseAttendance: (courseId: string) => Promise<{ attendanceRecords: Attendance[]; stats: any }>;
  getAttendanceStats: (params?: {
    courseId?: string;
    startDate?: string;
    endDate?: string;
  }) => Promise<AttendanceStats>;
}

export const useCLOAttendance = (): UseCLOAttendanceReturn => {
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendance = useCallback(async (params?: {
    courseId?: string;
    groupId?: string;
    startDate?: string;
    endDate?: string;
    sessionType?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    try {
      setIsLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (params?.courseId) queryParams.append('courseId', params.courseId);
      if (params?.groupId) queryParams.append('groupId', params.groupId);
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (params?.sessionType) queryParams.append('sessionType', params.sessionType);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const response = await api.get(`/clo/attendance?${queryParams.toString()}`);
      const attendanceData = response.data.data || [];

      setAttendanceRecords(attendanceData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch attendance');
      console.error('Error fetching attendance:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAttendanceById = useCallback(async (id: string): Promise<Attendance> => {
    try {
      setError(null);
      const response = await api.get(`/clo/attendance/${id}`);
      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch attendance details';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getCourseAttendance = useCallback(async (courseId: string) => {
    try {
      setError(null);
      const response = await api.get(`/clo/attendance/course/${courseId}`);
      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch course attendance';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getAttendanceStats = useCallback(async (params?: {
    courseId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AttendanceStats> => {
    try {
      setError(null);
      const queryParams = new URLSearchParams();
      if (params?.courseId) queryParams.append('courseId', params.courseId);
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);

      const response = await api.get(`/clo/attendance/stats?${queryParams.toString()}`);
      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch attendance stats';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  return {
    attendanceRecords,
    isLoading,
    error,
    fetchAttendance,
    getAttendanceById,
    getCourseAttendance,
    getAttendanceStats,
  };
};
