import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

export interface TeamMember {
  _id: string;
  name: string;
  email: string;
  role?: string;
}

export interface Team {
  _id: string;
  name: string;
  members: string[] | TeamMember[];
  competitionId?: string | {
    _id: string;
    title: string;
  };
  description?: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
}

export interface Competition {
  _id: string;
  title: string;
  startDate?: string;
  endDate?: string;
}

export interface TeamsStats {
  total: number;
  totalMembers: number;
  averageSize: number;
  largestTeam: number;
  byCompetition: { [competitionId: string]: number };
}

/**
 * Custom hook for managing teams data
 */
export const useTeamsData = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [stats, setStats] = useState<TeamsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [teamsRes, compsRes] = await Promise.all([
        api.get('/teams'),
        api.get('/competitions')
      ]);

      const teamsData: Team[] = teamsRes.data.map((team: any) => ({
        ...team,
        memberCount: Array.isArray(team.members) ? team.members.length : 0
      }));

      const compsData: Competition[] = compsRes.data;

      setTeams(teamsData);
      setCompetitions(compsData);

      // Calculate stats
      const total = teamsData.length;
      const totalMembers = teamsData.reduce((sum, t) => sum + t.memberCount, 0);
      const averageSize = total > 0 ? Math.round(totalMembers / total) : 0;
      const largestTeam = teamsData.reduce((max, t) => Math.max(max, t.memberCount), 0);

      const byCompetition: { [key: string]: number } = {};
      teamsData.forEach(team => {
        const compId = typeof team.competitionId === 'string'
          ? team.competitionId
          : team.competitionId?._id;
        if (compId) {
          byCompetition[compId] = (byCompetition[compId] || 0) + 1;
        }
      });

      setStats({
        total,
        totalMembers,
        averageSize,
        largestTeam,
        byCompetition
      });

    } catch (err: any) {
      console.error('Error fetching teams:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load teams';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // CRUD operations
  const createTeam = useCallback(async (data: { name: string; members?: string[]; competitionId?: string; description?: string }) => {
    try {
      await api.post('/teams', data);
      await fetchTeams();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.message || 'Failed to create team' };
    }
  }, [fetchTeams]);

  const updateTeam = useCallback(async (teamId: string, data: Partial<Team>) => {
    try {
      await api.put(`/teams/${teamId}`, data);
      await fetchTeams();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.message || 'Failed to update team' };
    }
  }, [fetchTeams]);

  const deleteTeam = useCallback(async (teamId: string) => {
    try {
      await api.delete(`/teams/${teamId}`);
      await fetchTeams();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.message || 'Failed to delete team' };
    }
  }, [fetchTeams]);

  return {
    teams,
    competitions,
    stats,
    isLoading,
    error,
    refetch: fetchTeams,
    actions: {
      create: createTeam,
      update: updateTeam,
      delete: deleteTeam
    }
  };
};
