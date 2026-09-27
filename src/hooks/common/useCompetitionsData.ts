import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

export interface Competition {
  _id: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  teams?: any[];
  createdAt: string;
  updatedAt: string;
  teamCount: number;
}

export interface CompetitionsStats {
  total: number;
  upcoming: number;
  ongoing: number;
  completed: number;
  totalTeams: number;
}

export const useCompetitionsData = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [stats, setStats] = useState<CompetitionsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompetitions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get('/competitions');
      const data: Competition[] = response.data.map((comp: any) => ({
        ...comp,
        teamCount: comp.teams?.length || 0
      }));

      setCompetitions(data);

      const stats = {
        total: data.length,
        upcoming: data.filter(c => c.status === 'upcoming').length,
        ongoing: data.filter(c => c.status === 'ongoing').length,
        completed: data.filter(c => c.status === 'completed').length,
        totalTeams: data.reduce((sum, c) => sum + c.teamCount, 0)
      };

      setStats(stats);
    } catch (err: any) {
      console.error('Error fetching competitions:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load competitions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompetitions();
  }, [fetchCompetitions]);

  const createCompetition = useCallback(async (data: Partial<Competition>) => {
    try {
      await api.post('/competitions', data);
      await fetchCompetitions();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.message || 'Failed to create competition' };
    }
  }, [fetchCompetitions]);

  const updateCompetition = useCallback(async (id: string, data: Partial<Competition>) => {
    try {
      await api.put(`/competitions/${id}`, data);
      await fetchCompetitions();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.message || 'Failed to update competition' };
    }
  }, [fetchCompetitions]);

  const deleteCompetition = useCallback(async (id: string) => {
    try {
      await api.delete(`/competitions/${id}`);
      await fetchCompetitions();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.message || 'Failed to delete competition' };
    }
  }, [fetchCompetitions]);

  return {
    competitions,
    stats,
    isLoading,
    error,
    refetch: fetchCompetitions,
    actions: {
      create: createCompetition,
      update: updateCompetition,
      delete: deleteCompetition
    }
  };
};
