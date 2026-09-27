/**
 * Custom hook for managing session requests
 * 
 * Used by both Students and Reception staff
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getMySessionRequests,
  getAllSessionRequests,
  createSessionRequest,
  cancelSessionRequest,
  approveSessionRequest,
  declineSessionRequest,
  type SessionRequest,
  type CreateSessionRequestRequest,
} from '../../services/subscription.service';

interface UseSessionRequestsReturn {
  requests: SessionRequest[];
  isLoading: boolean;
  error: string | null;
  filters: {
    status?: string;
  };
  setFilters: (filters: { status?: string }) => void;
  fetchRequests: () => Promise<void>;
  createRequest: (data: CreateSessionRequestRequest) => Promise<SessionRequest>;
  cancelRequest: (id: string) => Promise<SessionRequest>;
  approveRequest: (id: string) => Promise<SessionRequest>;
  declineRequest: (id: string, reason?: string) => Promise<SessionRequest>;
}

/**
 * Hook for students to manage their own session requests
 */
export const useMySessionRequests = (): UseSessionRequestsReturn => {
  const [requests, setRequests] = useState<SessionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters] = useState<{ status?: string }>({});

  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getMySessionRequests();
      setRequests(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch session requests');
      console.error('Error fetching session requests:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createRequest = useCallback(async (
    data: CreateSessionRequestRequest
  ): Promise<SessionRequest> => {
    try {
      setIsLoading(true);
      setError(null);
      const newRequest = await createSessionRequest(data);
      setRequests((prev) => [newRequest, ...prev]);
      return newRequest;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create session request';
      setError(errorMessage);
      console.error('Error creating session request:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancelRequest = useCallback(async (id: string): Promise<SessionRequest> => {
    try {
      setIsLoading(true);
      setError(null);
      const canceledRequest = await cancelSessionRequest(id);
      setRequests((prev) =>
        prev.map((req) => (req._id === id ? canceledRequest : req))
      );
      return canceledRequest;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to cancel session request';
      setError(errorMessage);
      console.error('Error canceling session request:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const approveRequest = useCallback(async (): Promise<SessionRequest> => {
    throw new Error('Students cannot approve session requests');
  }, []);

  const declineRequest = useCallback(async (): Promise<SessionRequest> => {
    throw new Error('Students cannot decline session requests');
  }, []);

  const setFilters = useCallback(() => {
    // No-op for students (they only see their own requests)
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return {
    requests,
    isLoading,
    error,
    filters,
    setFilters,
    fetchRequests,
    createRequest,
    cancelRequest,
    approveRequest,
    declineRequest,
  };
};

/**
 * Hook for reception staff to manage all session requests
 */
export const useAllSessionRequests = (): UseSessionRequestsReturn => {
  const [requests, setRequests] = useState<SessionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{ status?: string }>({});

  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getAllSessionRequests(filters);
      setRequests(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch session requests');
      console.error('Error fetching session requests:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const createRequest = useCallback(async (): Promise<SessionRequest> => {
    throw new Error('Reception staff cannot create session requests');
  }, []);

  const cancelRequest = useCallback(async (): Promise<SessionRequest> => {
    throw new Error('Reception staff cannot cancel session requests');
  }, []);

  const approveRequest = useCallback(async (id: string): Promise<SessionRequest> => {
    try {
      setIsLoading(true);
      setError(null);
      const approvedRequest = await approveSessionRequest(id);
      setRequests((prev) =>
        prev.map((req) => (req._id === id ? approvedRequest : req))
      );
      return approvedRequest;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to approve session request';
      setError(errorMessage);
      console.error('Error approving session request:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const declineRequest = useCallback(async (
    id: string,
    reason?: string
  ): Promise<SessionRequest> => {
    try {
      setIsLoading(true);
      setError(null);
      const declinedRequest = await declineSessionRequest(id, reason);
      setRequests((prev) =>
        prev.map((req) => (req._id === id ? declinedRequest : req))
      );
      return declinedRequest;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to decline session request';
      setError(errorMessage);
      console.error('Error declining session request:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return {
    requests,
    isLoading,
    error,
    filters,
    setFilters,
    fetchRequests,
    createRequest,
    cancelRequest,
    approveRequest,
    declineRequest,
  };
};
