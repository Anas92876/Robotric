/**
 * Custom hook for fetching reception dashboard statistics
 *
 * Fetches:
 * - Total students, trainers, enrollments
 * - Recent enrollments
 * - Pending payments (count and total amount)
 * - Active groups
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

/**
 * Interface for reception dashboard statistics
 */
export interface ReceptionDashboardStats {
  totalStudents: number;
  totalTrainers: number;
  totalEnrollments: number;
  recentEnrollments: number;
  pendingPayments: number;
  pendingPaymentsAmount: number;
  activeGroups: number;
}

/**
 * Return type for the hook
 */
interface UseReceptionDashboardReturn {
  stats: ReceptionDashboardStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage reception dashboard data
 *
 * @returns Dashboard stats, loading state, error, and refetch function
 *
 * @example
 * const { stats, isLoading, error, refetch } = useReceptionDashboard();
 */
export const useReceptionDashboard = (): UseReceptionDashboardReturn => {
  const [stats, setStats] = useState<ReceptionDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch dashboard statistics from API
   */
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch dashboard stats from reception endpoint
      const response = await api.get('/reception/dashboard');

      // Set stats from API response
      setStats(response.data.data || null);
    } catch (err: any) {
      // Handle errors
      setError(err.response?.data?.message || 'Failed to fetch dashboard data');
      console.error('Error fetching reception dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch data on mount
   */
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchDashboardData,
  };
};
