/**
 * Custom hook for managing enrollments in reception dashboard
 *
 * Provides operations for enrollments:
 * - Fetch all enrollments with filters
 * - Create new enrollment (register student in course)
 * - Update enrollment status
 * - Get available courses, groups, and students for enrollment form
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

/**
 * Enrollment interface
 */
export interface SubEnrollmentBrief {
  _id: string;
  course: { _id: string; title: string; category?: string; level?: string };
  status: string;
  enrolledAt: string;
  group?: { _id: string; name: string; status: string; enrolledCount: number; maxStudents: number } | null;
}

export interface Enrollment {
  _id: string;
  student: {
    _id: string;
    name: string;
    email: string;
  };
  course: {
    _id: string;
    title: string;
    price?: number;
    type?: 'single' | 'bundle';
    bundlePrice?: number;
  };
  enrolledAt: string;
  status: 'active' | 'completed' | 'dropped' | 'suspended';
  enrollmentSource?: 'direct' | 'bundle';
  bundleEnrollmentId?: string | null;
  payment: {
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    installments: Installment[];
  };
  transportation?: {
    enabled: boolean;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    installments: Installment[];
  };
  progress: {
    percentageComplete: number;
  };
  attendance: {
    percentage: number;
  };
  notes?: string;
}

/**
 * Installment interface
 */
export interface Installment {
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'pending' | 'paid' | 'overdue';
}

/**
 * Course interface
 */
export interface Course {
  _id: string;
  title: string;
  description?: string;
  price: number;
  category?: string;
  level?: string;
  type?: 'single' | 'bundle';
  bundlePrice?: number;
  instructor?: {
    _id: string;
    name: string;
  };
}

/**
 * Group interface
 */
export interface Group {
  _id: string;
  name?: string;
  trainerId: {
    _id: string;
    name: string;
  };
  maxStudents: number;
  students: string[];
  availableSeats: number;
  isFull: boolean;
  schedule?: any[];
}

/**
 * Student interface (simplified)
 */
export interface Student {
  _id: string;
  name: string;
  email: string;
}

/**
 * Pagination information
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/**
 * Filters for enrollment search
 */
export interface EnrollmentFilters {
  course?: string;
  student?: string;
  status?: string;
  paymentStatus?: 'paid' | 'partial' | 'unpaid' | '';
  hasDiscount?: 'true' | 'false' | '';
  transportationFilter?: 'enabled' | 'disabled' | 'paid' | 'pending' | '';
  page?: number;
  limit?: number;
}

/**
 * Create enrollment request payload
 */
export interface CreateEnrollmentRequest {
  studentId: string;
  courseId: string;
  groupId: string; // Required - students must be enrolled in a group
  totalAmount: number;
  installmentPlan?: {
    numberOfInstallments: number;
    startDate?: string;
  };
  installments?: Array<{
    amount: number;
    dueDate: string;
  }>;
  discount?: number;
  notes?: string;
  transportation?: {
    enabled: boolean;
    totalAmount: number;
    paidNow?: number;
    installments?: Array<{
      amount: number;
      dueDate: string;
    }>;
  };
}

/**
 * Update enrollment request payload
 */
export interface UpdateEnrollmentRequest {
  status?: 'active' | 'completed' | 'dropped' | 'suspended';
  notes?: string;
  transportation?: {
    enabled: boolean;
    totalAmount?: number;
    installments?: Array<{
      amount: number;
      dueDate: string;
    }>;
  };
}

/**
 * Return type for the hook
 */
interface UseReceptionEnrollmentsReturn {
  enrollments: Enrollment[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  filters: EnrollmentFilters;
  setFilters: (filters: EnrollmentFilters) => void;
  fetchEnrollments: () => Promise<void>;
  getEnrollmentById: (id: string) => Promise<Enrollment>;
  createEnrollment: (data: CreateEnrollmentRequest) => Promise<any>;
  updateEnrollment: (id: string, data: UpdateEnrollmentRequest) => Promise<void>;
  updateEnrollmentStatus: (id: string, status: string, reason?: string) => Promise<void>;
  deleteEnrollment: (id: string) => Promise<void>;
  recordPayment: (id: string, amount: number, paymentMethod?: string, notes?: string) => Promise<any>;
  recordTransportationPayment: (id: string, amount: number, paymentMethod?: string, notes?: string) => Promise<any>;
  deleteTransportation: (id: string) => Promise<any>;
  downloadReceipt: (receiptId: string, receiptNumber: string) => Promise<void>;

  // Helper data
  availableCourses: Course[];
  availableGroups: Group[];
  availableStudents: Student[];
  fetchAvailableCourses: () => Promise<void>;
  fetchAvailableGroups: (courseId: string) => Promise<void>;
  fetchAvailableStudents: (courseId?: string) => Promise<void>;
  checkEnrollment: (studentId: string, courseId: string, groupId?: string) => Promise<any>;
}

/**
 * Hook to manage enrollments with CRUD operations
 *
 * @returns Enrollments list, helper data, CRUD functions, loading state, and error
 *
 * @example
 * const { enrollments, createEnrollment, availableCourses } = useReceptionEnrollments();
 */
export const useReceptionEnrollments = (): UseReceptionEnrollmentsReturn => {
  // State management
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EnrollmentFilters>({
    page: 1,
    limit: 20
  });

  // Helper data states
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);

  /**
   * Fetch enrollments from API with current filters
   */
  const fetchEnrollments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      if (filters.course) params.append('course', filters.course);
      if (filters.student) params.append('student', filters.student);
      if (filters.status) params.append('status', filters.status);
      if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
      if (filters.hasDiscount) params.append('hasDiscount', filters.hasDiscount);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      // Fetch enrollments
      const response = await api.get(`/reception/enrollments?${params.toString()}`);

      setEnrollments(response.data.data || []);
      setPagination(response.data.pagination || null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch enrollments');
      console.error('Error fetching enrollments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  /**
   * Get single enrollment by ID
   */
  const getEnrollmentById = useCallback(async (id: string): Promise<Enrollment> => {
    try {
      setError(null);
      const response = await api.get(`/reception/enrollments/${id}`);
      return response.data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch enrollment';
      setError(errorMessage);
      console.error('Error fetching enrollment:', err);
      throw new Error(errorMessage);
    }
  }, []);

  /**
   * Create a new enrollment
   */
  const createEnrollment = useCallback(async (data: CreateEnrollmentRequest) => {
    try {
      setError(null);

      const response = await api.post('/reception/enrollments', data);

      // Refresh enrollment list
      await fetchEnrollments();

      return response.data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create enrollment';
      setError(errorMessage);
      console.error('Error creating enrollment:', err);
      throw new Error(errorMessage);
    }
  }, [fetchEnrollments]);

  /**
   * Update an enrollment
   */
  const updateEnrollment = useCallback(async (id: string, data: UpdateEnrollmentRequest) => {
    try {
      setError(null);

      await api.put(`/reception/enrollments/${id}`, data);

      // Refresh enrollment list
      await fetchEnrollments();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update enrollment';
      setError(errorMessage);
      console.error('Error updating enrollment:', err);
      throw new Error(errorMessage);
    }
  }, [fetchEnrollments]);

  /**
   * Delete an enrollment
   */
  const deleteEnrollment = useCallback(async (id: string) => {
    try {
      setError(null);

      await api.delete(`/reception/enrollments/${id}`);

      // Refresh enrollment list
      await fetchEnrollments();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to delete enrollment';
      setError(errorMessage);
      console.error('Error deleting enrollment:', err);
      throw new Error(errorMessage);
    }
  }, [fetchEnrollments]);

  /**
   * Update enrollment status with reason
   */
  const updateEnrollmentStatus = useCallback(async (id: string, status: string, reason?: string) => {
    try {
      setError(null);

      await api.put(`/reception/enrollments/${id}/status`, { status, reason });

      // Refresh enrollment list
      await fetchEnrollments();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update enrollment status';
      setError(errorMessage);
      console.error('Error updating enrollment status:', err);
      throw new Error(errorMessage);
    }
  }, [fetchEnrollments]);

  /**
   * Record a payment for an enrollment
   * @param options - Optional: { paymentCurrency: 'sp', amountInSP } when paid in Syrian Pounds
   */
  const recordPayment = useCallback(async (
    id: string,
    amount: number,
    paymentMethod: string = 'cash',
    notes: string = '',
    options?: { paymentCurrency?: 'usd' | 'sp'; amountInSP?: number }
  ) => {
    try {
      setError(null);

      const body: Record<string, unknown> = {
        amount,
        paymentMethod,
        notes
      };
      if (options?.paymentCurrency === 'sp' && options?.amountInSP != null) {
        body.paymentCurrency = 'sp';
        body.amountInSP = options.amountInSP;
      }

      const response = await api.post(`/reception/enrollments/${id}/payment`, body);

      // Refresh enrollment list
      await fetchEnrollments();

      // Return receipt data if available
      return response.data.receipt || null;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to record payment';
      setError(errorMessage);
      console.error('Error recording payment:', err);
      throw new Error(errorMessage);
    }
  }, [fetchEnrollments]);

  /**
   * Record a transportation payment for an enrollment
   */
  const recordTransportationPayment = useCallback(async (
    id: string,
    amount: number,
    paymentMethod: string = 'cash',
    notes: string = ''
  ) => {
    try {
      setError(null);

      const response = await api.post(`/reception/enrollments/${id}/transportation-payment`, {
        amount,
        paymentMethod,
        notes
      });

      // Refresh enrollment list
      await fetchEnrollments();

      // Return receipt data if available
      return response.data.data?.receipt || null;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to record transportation payment';
      setError(errorMessage);
      console.error('Error recording transportation payment:', err);
      throw new Error(errorMessage);
    }
  }, [fetchEnrollments]);

  /**
   * Delete transportation from an enrollment
   */
  const deleteTransportation = useCallback(async (id: string) => {
    try {
      setError(null);

      const response = await api.delete(`/reception/enrollments/${id}/transportation`);

      // Refresh enrollment list
      await fetchEnrollments();

      return response.data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to delete transportation';
      setError(errorMessage);
      console.error('Error deleting transportation:', err);
      throw new Error(errorMessage);
    }
  }, [fetchEnrollments]);

  /**
   * Download receipt PDF
   */
  const downloadReceipt = useCallback(async (receiptId: string, receiptNumber: string) => {
    try {
      const response = await api.get(`/reception/receipts/${receiptId}/download`, {
        responseType: 'blob'
      });

      // Create blob URL
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Extract filename from Content-Disposition header or use receiptNumber as fallback
      const contentDisposition = response.headers['content-disposition'];
      let filename = `${receiptNumber}.pdf`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        } else {
          // Try without quotes
          const filenameMatch2 = contentDisposition.match(/filename=(.+)/);
          if (filenameMatch2) {
            filename = filenameMatch2[1];
          }
        }
      }
      
      // Create download link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 
                          err.response?.data?.message || 
                          'Failed to download receipt';
      setError(errorMessage);
      console.error('Error downloading receipt:', err);
      throw new Error(errorMessage);
    }
  }, []);

  /**
   * Fetch available courses
   */
  const fetchAvailableCourses = useCallback(async () => {
    try {
      // includeBundles=true so the enrollment list's course-filter dropdown shows bundles too.
      // EnrollmentForm filters bundles out of its own picker before display.
      const response = await api.get('/reception/enrollments/available-courses?includeBundles=true');
      setAvailableCourses(response.data.data || []);
    } catch (err: any) {
      console.error('Error fetching available courses:', err);
    }
  }, []);

  /**
   * Fetch available groups for a course
   */
  const fetchAvailableGroups = useCallback(async (courseId: string) => {
    try {
      const response = await api.get(`/reception/enrollments/available-groups/${courseId}`);
      setAvailableGroups(response.data.data || []);
    } catch (err: any) {
      console.error('Error fetching available groups:', err);
      setAvailableGroups([]);
    }
  }, []);

  /**
   * Fetch available students (optionally filter by course to exclude enrolled)
   */
  const fetchAvailableStudents = useCallback(async (courseId?: string) => {
    try {
      const params = courseId ? `?courseId=${courseId}` : '';
      const response = await api.get(`/reception/enrollments/available-students${params}`);
      setAvailableStudents(response.data.data || []);
    } catch (err: any) {
      console.error('Error fetching available students:', err);
      setAvailableStudents([]);
    }
  }, []);

  /**
   * Fetch enrollments when filters change
   */
  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  /**
   * Check if student is already enrolled in course/group
   */
  const checkEnrollment = useCallback(async (studentId: string, courseId: string, groupId?: string) => {
    try {
      const params: any = { studentId, courseId };
      if (groupId) {
        params.groupId = groupId;
      }
      const response = await api.get('/reception/enrollments/check', { params });
      return response.data.data;
    } catch (err: any) {
      console.error('Error checking enrollment:', err);
      return null;
    }
  }, []);

  return {
    enrollments,
    pagination,
    isLoading,
    error,
    filters,
    setFilters,
    fetchEnrollments,
    getEnrollmentById,
    createEnrollment,
    updateEnrollment,
    updateEnrollmentStatus,
    deleteEnrollment,
    recordPayment,
    recordTransportationPayment,
    deleteTransportation,
    downloadReceipt,
    availableCourses,
    availableGroups,
    availableStudents,
    fetchAvailableCourses,
    fetchAvailableGroups,
    fetchAvailableStudents,
    checkEnrollment,
  };
};
