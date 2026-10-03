/**
 * useReceptionInterests Hook
 *
 * Custom hook for fetching interests in Reception dashboard (read-only)
 */

import { useState, useCallback } from 'react';
import { api } from '../../lib/api';

export interface Interest {
  _id: string;
  name: string;
  description?: string;
  status: 'active' | 'archived';
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface UseReceptionInterestsReturn {
  interests: Interest[];
  isLoading: boolean;
  error: string | null;
  fetchInterests: (params?: {
    status?: string;
    search?: string;
  }) => Promise<void>;
}

export const useReceptionInterests = (): UseReceptionInterestsReturn => {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all interests with optional filters (read-only for reception)
   */
  const fetchInterests = useCallback(async (params?: {
    status?: string;
    search?: string;
  }) => {
    try {
      setIsLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.search) queryParams.append('search', params.search);

      const response = await api.get(`/reception/interests?${queryParams.toString()}`);
      setInterests(response.data.interests || []);
    } catch (err: any) {
      console.error('Error fetching interests:', err);
      setError(err.response?.data?.message || 'Failed to fetch interests');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    interests,
    isLoading,
    error,
    fetchInterests,
  };
};
