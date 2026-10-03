/**
 * useReceptionLeads Hook
 *
 * Custom hook for managing leads (interested customers) in reception dashboard
 * Provides CRUD operations and filtering
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

/**
 * Lead interface
 */
export interface Lead {
  _id: string;
  fullName: string;
  englishName?: string;
  firstName?: string;
  lastName?: string;
  gender?: 'male' | 'female' | 'other';
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string;
  age?: number;
  residence?: string;
  schoolName?: string;
  mobileNumber: string;
  mobileNumberLabel?: string;
  additionalNumbers?: Array<{
    number: string;
    label: string;
  }>;
  socialMedia?: Array<{
    platform: string;
    handle: string;
  }>;
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
  };
  interestField?: string;
  referralSource?: string;
  notes?: string;
  status: 'interest' | 'waiting' | 'student' | 'blacklist';
  waitingInfo?: {
    courseId?: { _id: string; title: string; price: number } | string;
    depositAmount?: number;
    depositPaidAt?: string;
    depositMethod?: 'cash' | 'sham_cash_app' | 'other';
    depositNotes?: string;
  };
  followUps?: Array<{
    note: string;
    date: string;
    by: string;
  }>;
  nextFollowUpDate?: string;
  statusHistory?: Array<{
    fromStatus?: string;
    toStatus: string;
    reason: string;
    changedBy?: string;
    changedAt: string;
  }>;
  isBannedFromPlatform?: boolean;
  blacklistReason?: string;
  convertedToStudent?: {
    _id: string;
    name: string;
    email: string;
  };
  convertedAt?: string;
  leadDate?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create lead request
 */
export interface CreateLeadRequest {
  fullName: string;
  englishName?: string;
  firstName?: string;
  lastName?: string;
  gender?: 'male' | 'female' | 'other';
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string;
  age?: number;
  residence?: string;
  schoolName?: string;
  mobileNumber: string;
  mobileNumberLabel?: string;
  additionalNumbers?: Array<{
    number: string;
    label: string;
  }>;
  socialMedia?: Array<{
    platform: string;
    handle: string;
  }>;
  assignedTo?: string;
  interestField?: string;
  referralSource?: string;
  notes?: string;
  leadDate?: string;
  status?: 'interest' | 'waiting' | 'student' | 'blacklist';
}

/**
 * Update lead request
 */
export interface UpdateLeadRequest extends Partial<CreateLeadRequest> {}

/**
 * Lead filters
 */
export interface LeadFilters {
  page?: number;
  limit?: number;
  status?: string;
  interestField?: string;
  referralSource?: string;
  assignedTo?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: 'leadDate' | 'createdAt' | 'fullName';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Pagination
 */
export interface Pagination {
  total: number;
  page: number;
  pages: number;
  limit: number;
}

/**
 * Lead stats
 */
export interface LeadStats {
  total: number;
  interest: number;
  waiting: number;
  student: number;
  blacklist: number;
  recentLeads: number;
  needsFollowUp: number;
}

export interface SetWaitingRequest {
  email: string;
  password: string;
  courseId: string;
  depositAmount?: number;
  depositMethod?: 'cash' | 'sham_cash_app' | 'other';
  depositNotes?: string;
}

/**
 * Hook return type
 */
export interface UseReceptionLeadsReturn {
  leads: Lead[];
  pagination: Pagination | null;
  stats: LeadStats | null;
  isLoading: boolean;
  error: string | null;
  filters: LeadFilters;
  setFilters: (filters: LeadFilters) => void;
  fetchLeads: () => Promise<void>;
  fetchStats: () => Promise<void>;
  createLead: (data: CreateLeadRequest) => Promise<Lead | null>;
  updateLead: (id: string, data: UpdateLeadRequest) => Promise<Lead | null>;
  deleteLead: (id: string) => Promise<boolean>;
  convertToStudent: (id: string, email: string, password: string) => Promise<any>;
  setWaiting: (id: string, data: SetWaitingRequest) => Promise<any>;
  addFollowUp: (id: string, note: string, nextFollowUpDate?: string) => Promise<Lead | null>;
  changeLeadStatus: (id: string, data: {
    newStatus: string;
    reason: string;
    isBannedFromPlatform?: boolean;
  }) => Promise<Lead | null>;
}

/**
 * useReceptionLeads Hook
 */
export const useReceptionLeads = (): UseReceptionLeadsReturn => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LeadFilters>({
    page: 1,
    limit: 20
  });

  /**
   * Fetch leads with filters
   */
  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await api.get(`/reception/leads?${params.toString()}`);
      setLeads(response.data.leads || []);
      setPagination(response.data.pagination || null);
    } catch (err: any) {
      console.error('Error fetching leads:', err);
      setError(err.response?.data?.message || 'Failed to fetch leads');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  /**
   * Fetch lead statistics
   */
  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/reception/leads/stats');
      setStats(response.data);
    } catch (err: any) {
      console.error('Error fetching lead stats:', err);
    }
  }, []);

  /**
   * Create new lead
   */
  const createLead = async (data: CreateLeadRequest): Promise<Lead | null> => {
    try {
      setError(null);
      const response = await api.post('/reception/leads', data);
      await fetchLeads(); // Refresh list
      await fetchStats(); // Refresh stats
      return response.data.lead;
    } catch (err: any) {
      console.error('Error creating lead:', err);
      setError(err.response?.data?.message || 'Failed to create lead');
      throw err;
    }
  };

  /**
   * Update lead
   */
  const updateLead = async (id: string, data: UpdateLeadRequest): Promise<Lead | null> => {
    try {
      setError(null);
      const response = await api.put(`/reception/leads/${id}`, data);
      await fetchLeads(); // Refresh list
      await fetchStats(); // Refresh stats
      return response.data.lead;
    } catch (err: any) {
      console.error('Error updating lead:', err);
      setError(err.response?.data?.message || 'Failed to update lead');
      throw err;
    }
  };

  /**
   * Delete lead
   */
  const deleteLead = async (id: string): Promise<boolean> => {
    try {
      setError(null);
      await api.delete(`/reception/leads/${id}`);
      await fetchLeads(); // Refresh list
      await fetchStats(); // Refresh stats
      return true;
    } catch (err: any) {
      console.error('Error deleting lead:', err);
      setError(err.response?.data?.message || 'Failed to delete lead');
      return false;
    }
  };

  /**
   * Convert lead to student
   */
  const convertToStudent = async (id: string, email: string, password: string): Promise<any> => {
    try {
      setError(null);
      const response = await api.post(`/reception/leads/${id}/convert`, {
        email,
        password
      });
      await fetchLeads(); // Refresh list
      await fetchStats(); // Refresh stats
      return response.data;
    } catch (err: any) {
      console.error('Error converting lead to student:', err);
      setError(err.response?.data?.message || 'Failed to convert lead to student');
      throw err;
    }
  };

  /**
   * Set lead to waiting list — creates User account + records deposit
   */
  const setWaiting = async (id: string, data: SetWaitingRequest): Promise<any> => {
    try {
      setError(null);
      const response = await api.post(`/reception/leads/${id}/set-waiting`, data);
      await fetchLeads();
      await fetchStats();
      return response.data;
    } catch (err: any) {
      console.error('Error setting lead to waiting:', err);
      setError(err.response?.data?.message || 'Failed to set lead to waiting');
      throw err;
    }
  };

  /**
   * Add follow-up note
   */
  const addFollowUp = async (
    id: string,
    note: string,
    nextFollowUpDate?: string
  ): Promise<Lead | null> => {
    try {
      setError(null);
      const response = await api.post(`/reception/leads/${id}/follow-up`, {
        note,
        nextFollowUpDate
      });
      await fetchLeads(); // Refresh list
      return response.data.lead;
    } catch (err: any) {
      console.error('Error adding follow-up:', err);
      setError(err.response?.data?.message || 'Failed to add follow-up');
      throw err;
    }
  };

  /**
   * Change lead status with reason
   */
  const changeLeadStatus = async (
    id: string,
    data: {
      newStatus: string;
      reason: string;
      isBannedFromPlatform?: boolean;
    }
  ): Promise<Lead | null> => {
    try {
      setError(null);
      const response = await api.post(`/reception/leads/${id}/change-status`, data);
      await fetchLeads(); // Refresh list
      return response.data.lead;
    } catch (err: any) {
      console.error('Error changing lead status:', err);
      setError(err.response?.data?.message || 'Failed to change lead status');
      throw err;
    }
  };

  /**
   * Fetch leads on mount and when filters change
   */
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  /**
   * Fetch stats on mount
   */
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    leads,
    pagination,
    stats,
    isLoading,
    error,
    filters,
    setFilters,
    fetchLeads,
    fetchStats,
    createLead,
    updateLead,
    deleteLead,
    convertToStudent,
    setWaiting,
    addFollowUp,
    changeLeadStatus
  };
};
