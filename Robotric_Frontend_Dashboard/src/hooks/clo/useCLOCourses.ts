import { useState, useCallback } from 'react';
import { api } from '../../lib/api';

export interface CourseStats {
  totalGroups: number;
  activeGroups: number;
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  completionRate: number;
  trainersCount: number;
  // Bundle stats
  individualTotal?: number;
  savings?: number;
  discountPct?: number;
  subCourseCount?: number;
}

export interface SubCourse {
  _id: string;
  title: string;
  price: number;
  level?: string;
  status: string;
  duration?: number;
  totalHours?: number;
  instructor?: { _id: string; name: string; email: string };
}

export interface Course {
  _id: string;
  title: string;
  description?: string;
  category: string;
  level?: string;
  duration?: number;
  price?: number;
  instructor?: {
    _id: string;
    name: string;
    email: string;
  };
  thumbnail?: string;
  syllabus?: any[];
  objectives?: string[];
  prerequisites?: string[];
  status: string;
  wroDocumentsRequired?: boolean;
  stats?: CourseStats;
  createdAt: string;
  // Bundle fields
  type?: 'single' | 'bundle';
  bundlePrice?: number;
  bundleCourses?: SubCourse[];
  parentBundle?: { _id: string; title: string } | string | null;
  totalHours?: number;
}

export interface CreateCourseData {
  title: string;
  description?: string;
  category: string;
  level?: string;
  duration?: number;
  price?: number;
  instructor?: string;
  thumbnail?: string;
  syllabus?: any[];
  objectives?: string[];
  prerequisites?: string[];
  type?: 'single' | 'bundle';
  bundlePrice?: number;
  parentBundle?: string;
}

export interface UpdateCourseData {
  title?: string;
  description?: string;
  category?: string;
  level?: string;
  duration?: number;
  price?: number;
  instructor?: string;
  thumbnail?: string;
  syllabus?: any[];
  objectives?: string[];
  prerequisites?: string[];
  status?: string;
  wroDocumentsRequired?: boolean;
  bundlePrice?: number;
  type?: 'single' | 'bundle';
}

interface UseCLOCoursesReturn {
  courses: Course[];
  isLoading: boolean;
  error: string | null;
  fetchCourses: (params?: {
    status?: string;
    category?: string;
    search?: string;
    sortBy?: string;
    order?: string;
    type?: string;
    includeSubCourses?: boolean;
  }) => Promise<void>;
  getCourseDetails: (id: string) => Promise<any>;
  createCourse: (data: CreateCourseData) => Promise<Course>;
  updateCourse: (id: string, data: UpdateCourseData) => Promise<Course>;
  deleteCourse: (id: string) => Promise<void>;
  archiveCourse: (id: string, action?: 'archive' | 'unarchive') => Promise<void>;
  getCourseStatistics: (id: string, period?: number) => Promise<any>;
  addSubCourse: (bundleId: string, courseId: string) => Promise<Course>;
  removeSubCourse: (bundleId: string, courseId: string) => Promise<void>;
  getBundleSubCourses: (bundleId: string) => Promise<{ subCourses: SubCourse[]; pricing: any }>;
}

export const useCLOCourses = (): UseCLOCoursesReturn => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async (params?: {
    status?: string;
    category?: string;
    search?: string;
    sortBy?: string;
    order?: string;
    type?: string;
    includeSubCourses?: boolean;
  }) => {
    try {
      setIsLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.category) queryParams.append('category', params.category);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params?.order) queryParams.append('order', params.order);
      if (params?.type) queryParams.append('type', params.type);
      if (params?.includeSubCourses) queryParams.append('includeSubCourses', 'true');

      const response = await api.get(`/clo/courses?${queryParams.toString()}`);
      const raw = response.data.data || [];
      const list = Array.isArray(raw) ? raw.filter((c: any) => c != null && c._id != null) : [];
      setCourses(list);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch courses');
      console.error('Error fetching courses:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCourseDetails = useCallback(async (id: string) => {
    try {
      setError(null);
      const response = await api.get(`/clo/courses/${id}`);
      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch course details';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const createCourse = useCallback(async (data: CreateCourseData): Promise<Course> => {
    try {
      setError(null);
      const response = await api.post('/clo/courses', data);
      const newCourse = response.data.data;
      setCourses(prev => [newCourse, ...prev]);
      return newCourse;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to create course';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const updateCourse = useCallback(async (id: string, data: UpdateCourseData): Promise<Course> => {
    try {
      setError(null);
      const response = await api.put(`/clo/courses/${id}`, data);
      const updatedCourse = response.data.data;
      setCourses(prev => prev.map(c => c._id === id ? updatedCourse : c));
      return updatedCourse;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to update course';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const deleteCourse = useCallback(async (id: string) => {
    try {
      setError(null);
      await api.delete(`/clo/courses/${id}`);
      // Remove from local state
      setCourses(prev => prev.filter(c => c._id !== id));
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to delete course';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const archiveCourse = useCallback(async (id: string, action: 'archive' | 'unarchive' = 'archive') => {
    try {
      setError(null);
      await api.put(`/clo/courses/${id}/archive`, { action });
      // Update local state
      setCourses(prev => prev.map(c => {
        if (c._id === id) {
          return {
            ...c,
            status: action === 'archive' ? 'archived' : 'published'
          };
        }
        return c;
      }));
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to update course status';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getCourseStatistics = useCallback(async (id: string, period: number = 30) => {
    try {
      setError(null);
      const response = await api.get(`/clo/courses/${id}/statistics?period=${period}`);
      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch course statistics';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const addSubCourse = useCallback(async (bundleId: string, courseId: string): Promise<Course> => {
    try {
      setError(null);
      const response = await api.post(`/clo/courses/${bundleId}/sub-courses`, { courseId });
      const updated = response.data.data;
      setCourses(prev => prev.map(c => c._id === bundleId ? { ...c, bundleCourses: updated.bundleCourses } : c));
      return updated;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to add sub-course';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const removeSubCourse = useCallback(async (bundleId: string, courseId: string): Promise<void> => {
    try {
      setError(null);
      await api.delete(`/clo/courses/${bundleId}/sub-courses/${courseId}`);
      setCourses(prev => prev.map(c =>
        c._id === bundleId
          ? { ...c, bundleCourses: (c.bundleCourses || []).filter(sc => sc._id !== courseId) }
          : c
      ));
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to remove sub-course';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getBundleSubCourses = useCallback(async (bundleId: string) => {
    try {
      setError(null);
      const response = await api.get(`/clo/courses/${bundleId}/sub-courses`);
      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch sub-courses';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  return {
    courses,
    isLoading,
    error,
    fetchCourses,
    getCourseDetails,
    createCourse,
    updateCourse,
    deleteCourse,
    archiveCourse,
    getCourseStatistics,
    addSubCourse,
    removeSubCourse,
    getBundleSubCourses,
  };
};
