/**
 * Custom hook for managing session reports (Reception)
 * 
 * Provides operations for creating and viewing session reports
 */

import { useState, useCallback } from 'react';
import {
  createSessionReport,
  getSessionReport,
  getAllSessionRequests,
  getAllSessionReports,
  type SessionRequest,
  type SessionReport,
  type CreateSessionReportRequest,
} from '../../services/subscription.service';

interface UseSessionReportsReturn {
  isLoading: boolean;
  error: string | null;
  reports: SessionReport[];
  createReport: (
    sessionId: string,
    data: CreateSessionReportRequest
  ) => Promise<SessionReport>;
  getReport: (sessionId: string) => Promise<SessionReport | null>;
  getAllReports: () => Promise<void>;
  getApprovedSessions: () => Promise<SessionRequest[]>;
}

export const useSessionReports = (): UseSessionReportsReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<SessionReport[]>([]);

  const createReport = useCallback(async (
    sessionId: string,
    data: CreateSessionReportRequest
  ): Promise<SessionReport> => {
    try {
      setIsLoading(true);
      setError(null);
      const report = await createSessionReport(sessionId, data);
      return report;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create session report';
      setError(errorMessage);
      console.error('Error creating session report:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getReport = useCallback(async (sessionId: string): Promise<SessionReport | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const report = await getSessionReport(sessionId);
      return report;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch session report';
      setError(errorMessage);
      console.error('Error fetching session report:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAllReports = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getAllSessionReports();
      setReports(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch session reports';
      setError(errorMessage);
      console.error('Error fetching session reports:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getApprovedSessions = useCallback(async (): Promise<SessionRequest[]> => {
    try {
      setIsLoading(true);
      setError(null);
      const requests = await getAllSessionRequests({ status: 'approved' });
      return requests;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch approved sessions';
      setError(errorMessage);
      console.error('Error fetching approved sessions:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    reports,
    createReport,
    getReport,
    getAllReports,
    getApprovedSessions,
  };
};
