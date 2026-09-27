import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export interface BundleSubCourse {
  _id: string;
  enrollmentId: string;
  course: {
    _id: string;
    title: string;
    category: string;
    level?: string;
    thumbnail?: string;
    duration?: string;
    price?: number;
  };
  groupId?: string | null;
  groupStatus?: string | null;
  trainer?: { _id: string; name: string } | null;
  progress: { percentageComplete: number; completedSessions: number; totalSessions: number };
  attendance: { percentage: number };
  status: string;
}

export interface EnrolledCourse {
  _id: string;
  enrollmentSource?: 'direct' | 'bundle';
  bundleEnrollmentId?: string | null;
  course: {
    _id: string;
    title: string;
    description: string;
    category: string;
    level: string;
    thumbnail?: string;
    instructor: {
      _id: string;
      name: string;
      email: string;
    };
    startDate?: string;
    endDate?: string;
    duration: string;
    type?: 'single' | 'bundle';
    bundlePrice?: number | null;
    bundleCourses?: { _id: string; title: string; category: string; level?: string; thumbnail?: string; duration?: string; price?: number }[];
    parentBundle?: { _id: string; title: string } | null;
  };
  status: 'active' | 'completed' | 'dropped';
  progress: {
    percentageComplete: number;
    completedModules?: string[];
    completedSessions?: number;
    totalSessions?: number;
  };
  payment: {
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
  };
  attendance: {
    percentage: number;
    totalSessions?: number;
    attendedSessions?: number;
  };
  enrolledAt: string;
  completedAt?: string;
  groupStatus?: 'active' | 'completed' | 'archived' | 'cancelled';
  groupId?: string | null;
  hasCertificate?: boolean;
  certificate?: {
    _id: string;
    certificateNumber: string;
    issuedAt: string;
  } | null;
  bundleSubCourses?: BundleSubCourse[] | null;
}

interface UseStudentCoursesReturn {
  courses: EnrolledCourse[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useStudentCourses = (): UseStudentCoursesReturn => {
  const {
    data: courses = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['student', 'courses'],
    queryFn: async () => {
      const response = await api.get('/student/courses');
      return response.data.data || [];
    },
    staleTime: 3 * 60 * 1000, // 3 minutes - courses don't change frequently
  });

  return {
    courses,
    isLoading,
    error: error ? (error as any)?.response?.data?.message || 'Failed to fetch courses' : null,
    refetch: async () => {
      await refetch();
    },
  };
};
