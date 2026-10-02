import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

/** Lists the CLO pages pick from (courses, trainers, groups). */
export interface CourseOption { _id: string; title: string; status: string; category?: string; isBundle?: boolean }
export interface TrainerOption { _id: string; name: string; email: string; profile?: { status?: string } | null }
export interface GroupSlot { _id?: string; day: string; startTime: string; endTime: string; location?: string | null }
export interface CloGroup {
  _id: string;
  name: string;
  description?: string | null;
  courseId: { _id: string; title: string; category?: string } | null;
  trainerId: { _id: string; name: string; email: string } | null;
  students: { _id: string; name: string; email: string }[] | string[];
  maxStudents: number;
  schedule: GroupSlot[];
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'archived' | 'cancelled';
  boardEnabled: boolean;
  startingSessionNumber?: number;
  progress: { completedSessions: number; totalSessions: number; percentageComplete: number };
  stats: { studentsCount?: number; avgAttendance?: number };
  enrolledCount: number;
}

export const useCloCourseOptions = () =>
  useQuery({ queryKey: ['clo', 'courses', 'options'], queryFn: async () => ((await api.get('/clo/courses?limit=500')).data.data ?? []) as CourseOption[], staleTime: 60_000 });

export const useCloTrainerOptions = () =>
  useQuery({ queryKey: ['clo', 'trainers', 'list'], queryFn: async () => ((await api.get('/clo/trainers')).data.data ?? []) as TrainerOption[], staleTime: 60_000 });

export const useCloGroups = (filter: { courseId?: string } = {}) =>
  useQuery({
    queryKey: ['clo', 'groups', 'list', filter.courseId ?? ''],
    queryFn: async () => ((await api.get(`/clo/groups${filter.courseId ? `?courseId=${filter.courseId}` : ''}`)).data.data ?? []) as CloGroup[],
  });
