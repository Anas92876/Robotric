import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';

export interface StudentStats {
  totalEnrolledCourses: number;
  activeCourses: number;
  completedCourses: number;
  totalSessionsCompleted: number;
  totalSessionHours: number;
  averageAttendance: number;
  totalPaid: number;
  totalRemaining: number;
  overduePayments: number;
  pendingAssignments: number;
}
export interface Activity {
  _id: string;
  type: 'session' | 'module' | 'quiz' | 'assignment' | 'payment' | 'attendance' | string;
  title: string;
  courseTitle: string;
  timestamp: string;
  status?: string;
}
export interface Deadline {
  _id: string;
  type: 'payment' | 'assignment' | string;
  title: string;
  courseTitle: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low' | string;
}
export interface CourseProgress {
  courseId: string;
  courseTitle: string;
  completedSessions: number;
  totalSessions: number;
  status: string;
}

const ROOT = ['student', 'overview'] as const;
const get = <T,>(url: string) => async () => ((await api.get(url)).data.data ?? null) as T;

export const useStudentStats = () => useQuery({ queryKey: [...ROOT, 'stats'], queryFn: get<StudentStats>('/student/dashboard/stats'), staleTime: 60_000 });
export const useStudentActivity = () => useQuery({ queryKey: [...ROOT, 'activity'], queryFn: get<Activity[]>('/student/dashboard/recent-activity'), staleTime: 60_000 });
export const useStudentDeadlines = () => useQuery({ queryKey: [...ROOT, 'deadlines'], queryFn: get<Deadline[]>('/student/dashboard/upcoming-deadlines?days=14'), staleTime: 60_000 });
export const useStudentProgress = () => useQuery({ queryKey: [...ROOT, 'progress'], queryFn: get<CourseProgress[]>('/student/dashboard/progress'), staleTime: 60_000 });
