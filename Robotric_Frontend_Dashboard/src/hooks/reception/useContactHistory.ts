/**
 * useContactHistory Hook
 *
 * Custom hook for managing contact history for leads
 * Provides CRUD operations for contact history records
 */

import { useState, useCallback } from 'react';
import { api } from '../../lib/api';

/**
 * Contact History interface
 */
export interface ContactHistory {
  _id: string;
  leadId: string;
  contactType: 'call' | 'meeting' | 'email' | 'other';
  callReason: string;
  outcome: 'successful' | 'no_answer' | 'callback_requested' | 'not_interested' | 'converted' | 'other';
  notes?: string;
  contactDate: string;
  duration?: number;
  scheduledEventId: string; // Required - always created
  nextFollowUpDate?: string;
  createdBy: {
    _id: string;
    name: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Create contact history request
 */
export interface CreateContactHistoryRequest {
  contactType: 'call' | 'meeting' | 'email' | 'other';
  callReason: string;
  outcome: 'successful' | 'no_answer' | 'callback_requested' | 'not_interested' | 'converted' | 'other';
  notes?: string;
  contactDate: string;
  duration?: number;
  nextFollowUpDate?: string;
  eventTitle?: string;
  eventColor?: string;
}

/**
 * Update contact history request
 */
export interface UpdateContactHistoryRequest extends Partial<CreateContactHistoryRequest> {}

/**
 * Contact history stats
 */
export interface ContactHistoryStats {
  total: number;
  byOutcome: {
    successful?: number;
    no_answer?: number;
    callback_requested?: number;
    not_interested?: number;
    converted?: number;
    other?: number;
  };
  byType: {
    call?: number;
    meeting?: number;
    email?: number;
    other?: number;
  };
  averageDuration: number;
}

/**
 * Hook return type
 */
export interface UseContactHistoryReturn {
  contactHistory: ContactHistory[];
  isLoading: boolean;
  error: string | null;
  stats: ContactHistoryStats | null;
  fetchContactHistory: (leadId: string) => Promise<void>;
  createContactHistory: (leadId: string, data: CreateContactHistoryRequest) => Promise<ContactHistory | null>;
  updateContactHistory: (id: string, data: UpdateContactHistoryRequest) => Promise<ContactHistory | null>;
  deleteContactHistory: (id: string) => Promise<boolean>;
  fetchStats: (leadId?: string) => Promise<void>;
}

/**
 * useContactHistory Hook
 */
export const useContactHistory = (): UseContactHistoryReturn => {
  const [contactHistory, setContactHistory] = useState<ContactHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ContactHistoryStats | null>(null);

  /**
   * Fetch contact history for a specific lead
   */
  const fetchContactHistory = useCallback(async (leadId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get(`/reception/leads/${leadId}/contact-history`);
      setContactHistory(response.data.contactHistory || []);
    } catch (err: any) {
      console.error('Error fetching contact history:', err);
      setError(err.response?.data?.message || 'Failed to fetch contact history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create new contact history
   */
  const createContactHistory = async (
    leadId: string,
    data: CreateContactHistoryRequest
  ): Promise<ContactHistory | null> => {
    try {
      setError(null);
      const response = await api.post(`/reception/leads/${leadId}/contact-history`, data);
      
      // Refresh contact history
      await fetchContactHistory(leadId);
      
      return response.data.contactHistory;
    } catch (err: any) {
      console.error('Error creating contact history:', err);
      setError(err.response?.data?.message || 'Failed to create contact history');
      throw err;
    }
  };

  /**
   * Update contact history
   */
  const updateContactHistory = async (
    id: string,
    data: UpdateContactHistoryRequest
  ): Promise<ContactHistory | null> => {
    try {
      setError(null);
      const response = await api.put(`/reception/contact-history/${id}`, data);
      
      // Update in local state
      setContactHistory(prev =>
        prev.map(item => (item._id === id ? response.data.contactHistory : item))
      );
      
      return response.data.contactHistory;
    } catch (err: any) {
      console.error('Error updating contact history:', err);
      setError(err.response?.data?.message || 'Failed to update contact history');
      throw err;
    }
  };

  /**
   * Delete contact history
   */
  const deleteContactHistory = async (id: string): Promise<boolean> => {
    try {
      setError(null);
      await api.delete(`/reception/contact-history/${id}`);
      
      // Remove from local state
      setContactHistory(prev => prev.filter(item => item._id !== id));
      
      return true;
    } catch (err: any) {
      console.error('Error deleting contact history:', err);
      setError(err.response?.data?.message || 'Failed to delete contact history');
      return false;
    }
  };

  /**
   * Fetch contact history statistics
   */
  const fetchStats = useCallback(async (leadId?: string) => {
    try {
      const params = leadId ? `?leadId=${leadId}` : '';
      const response = await api.get(`/reception/contact-history/stats${params}`);
      setStats(response.data.stats);
    } catch (err: any) {
      console.error('Error fetching contact history stats:', err);
    }
  }, []);

  return {
    contactHistory,
    isLoading,
    error,
    stats,
    fetchContactHistory,
    createContactHistory,
    updateContactHistory,
    deleteContactHistory,
    fetchStats
  };
};
