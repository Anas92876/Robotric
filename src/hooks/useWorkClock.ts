import { useState, useCallback, useEffect } from 'react';
import { api } from '../lib/api';

export interface WorkSessionUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export interface WorkSession {
  _id: string;
  user: string | WorkSessionUser;
  clockIn: string;
  clockOut: string | null;
  durationMinutes: number;
  autoClosed: boolean;
  createdAt: string;
}

interface UseWorkClockReturn {
  isHourly: boolean;
  active: WorkSession | null;
  sessions: WorkSession[];
  isLoading: boolean;
  isBusy: boolean;
  error: string | null;
  startWork: () => Promise<void>;
  stopWork: () => Promise<void>;
  fetchSessions: (from?: string, to?: string) => Promise<void>;
  refreshStatus: () => Promise<void>;
}

export const useWorkClock = (): UseWorkClockReturn => {
  const [isHourly, setIsHourly] = useState(false);
  const [active, setActive] = useState<WorkSession | null>(null);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/engineer/work/status');
      setIsHourly(!!res.data.data?.isHourly);
      setActive(res.data.data?.active || null);
    } catch (err) {
      console.error('Error fetching work status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSessions = useCallback(async (from?: string, to?: string) => {
    try {
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      const res = await api.get(`/engineer/work/sessions?${params.toString()}`);
      setSessions(res.data.data || []);
    } catch (err) {
      console.error('Error fetching work sessions:', err);
    }
  }, []);

  const startWork = useCallback(async () => {
    try {
      setIsBusy(true);
      setError(null);
      const res = await api.post('/engineer/work/start');
      setActive(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to start work');
    } finally {
      setIsBusy(false);
    }
  }, []);

  const stopWork = useCallback(async () => {
    try {
      setIsBusy(true);
      setError(null);
      const res = await api.post('/engineer/work/stop');
      const closed: WorkSession = res.data.data;
      setActive(null);
      setSessions(prev => [closed, ...prev.filter(s => s._id !== closed._id)]);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to stop work');
    } finally {
      setIsBusy(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { isHourly, active, sessions, isLoading, isBusy, error, startWork, stopWork, fetchSessions, refreshStatus: fetchStatus };
};
