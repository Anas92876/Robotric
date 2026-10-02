import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';

export interface CourseInfo {
  id: string;
  title: string;
  description?: string | null;
  groupStatus?: string | null;
  boardEnabled?: boolean;
  groupId?: string | null;
  hasCertificate?: boolean;
  trainer?: { _id: string; name: string } | null;
  studentStats: { evaluationAverage: number | null; attendanceAverage: number | null; completedSessions: number; totalSessions: number };
  sessions: { id: string; attendance?: { status: AttendanceStatus } | null; evaluationAverage?: number | null }[];
}

export interface CourseSession {
  _id: string;
  title: string;
  description?: string | null;
  sessionNumber: number;
  startTime: string;
  endTime: string;
  scheduledStartDateTime: string;
  isToday: boolean;
  isUpcoming: boolean;
  isPast: boolean;
  isLocked: boolean;
  isOnline?: boolean;
  status: string;
  quiz?: { _id: string; title: string } | null;
  quizAttempt?: { passed?: boolean; score?: number } | null;
}

/** One course of the signed-in student: header facts, their attendance per class, and every class. */
export function useCourse(courseId: string) {
  const info = useQuery({
    queryKey: ['student', 'course', courseId],
    queryFn: async () => (await api.get(`/student/courses/${courseId}`)).data.course as CourseInfo,
    enabled: !!courseId,
  });
  const sessions = useQuery({
    queryKey: ['student', 'course', courseId, 'sessions'],
    queryFn: async () => ((await api.get(`/student/courses/${courseId}/sessions`)).data.data ?? []) as CourseSession[],
    enabled: !!courseId,
  });
  return { info, sessions };
}
