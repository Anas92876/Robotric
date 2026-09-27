/**
 * useCLOInterests Hook
 *
 * Custom hook for managing interests in CLO dashboard
 * Provides CRUD operations for interests
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

export interface CreateInterestData {
  name: string;
  description?: string;
}

export interface UpdateInterestData {
  name?: string;
  description?: string;
  status?: 'active' | 'archived';
}

interface UseCLOInterestsReturn {
  interests: Interest[];
  isLoading: boolean;
  error: string | null;
  fetchInterests: (params?: {
    status?: string;
    search?: string;
  }) => Promise<void>;
  getInterestDetails: (id: string) => Promise<any>;
  createInterest: (data: CreateInterestData) => Promise<Interest>;
  updateInterest: (id: string, data: UpdateInterestData) => Promise<Interest>;
  deleteInterest: (id: string) => Promise<void>;
  archiveInterest: (id: string) => Promise<Interest>;
}

export const useCLOInterests = (): UseCLOInterestsReturn => {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all interests with optional filters
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

      const response = await api.get(`/clo/interests?${queryParams.toString()}`);
      setInterests(response.data.interests || []);
    } catch (err: any) {
      console.error('Error fetching interests:', err);
      setError(err.response?.data?.message || 'Failed to fetch interests');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get interest details by ID
   */
  const getInterestDetails = async (id: string) => {
    try {
      const response = await api.get(`/clo/interests/${id}`);
      return response.data.interest;
    } catch (err: any) {
      console.error('Error fetching interest details:', err);
      throw err;
    }
  };

  /**
   * Create new interest
   */
  const createInterest = async (data: CreateInterestData): Promise<Interest> => {
    try {
      setError(null);
      const response = await api.post('/clo/interests', data);
      await fetchInterests(); // Refresh list
      return response.data.interest;
    } catch (err: any) {
      console.error('Error creating interest:', err);
      setError(err.response?.data?.message || 'Failed to create interest');
      throw err;
    }
  };

  /**
   * Update interest
   */
  const updateInterest = async (id: string, data: UpdateInterestData): Promise<Interest> => {
    try {
      setError(null);
      const response = await api.put(`/clo/interests/${id}`, data);
      await fetchInterests(); // Refresh list
      return response.data.interest;
    } catch (err: any) {
      console.error('Error updating interest:', err);
      setError(err.response?.data?.message || 'Failed to update interest');
      throw err;
    }
  };

  /**
   * Delete interest
   */
  const deleteInterest = async (id: string): Promise<void> => {
    try {
      setError(null);
      await api.delete(`/clo/interests/${id}`);
      await fetchInterests(); // Refresh list
    } catch (err: any) {
      console.error('Error deleting interest:', err);
      setError(err.response?.data?.message || 'Failed to delete interest');
      throw err;
    }
  };

  /**
   * Archive interest
   */
  const archiveInterest = async (id: string): Promise<Interest> => {
    try {
      setError(null);
      const response = await api.put(`/clo/interests/${id}/archive`);
      await fetchInterests(); // Refresh list
      return response.data.interest;
    } catch (err: any) {
      console.error('Error archiving interest:', err);
      setError(err.response?.data?.message || 'Failed to archive interest');
      throw err;
    }
  };

  return {
    interests,
    isLoading,
    error,
    fetchInterests,
    getInterestDetails,
    createInterest,
    updateInterest,
    deleteInterest,
    archiveInterest,
  };
};
