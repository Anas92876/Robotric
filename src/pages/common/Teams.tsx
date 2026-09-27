import React, { useState, useMemo } from 'react';
import { Search, Users, Plus, Edit2, Trash2, AlertCircle, RefreshCw, Filter } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { useTeamsData, type Team } from '../../hooks';
import { LoadingState, Alert, Button, CardComponent, Badge } from '../../components/ui';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { TeamFormModal } from '../../components/competitions/TeamFormModal';

export default function Teams() {
  const { i18n } = useTranslation(['dashboardCommon', 'dashboardAdmin']);
  const isRTL = i18n.language === 'ar';
  const { user } = useAuth();
  const { teams, competitions, stats, isLoading, error, refetch, actions } = useTeamsData();

  const [searchQuery, setSearchQuery] = useState('');
  const [competitionFilter, setCompetitionFilter] = useState('all');
  // null = closed, 'new' = create, a team = edit
  const [formFor, setFormFor] = useState<Team | 'new' | null>(null);
  const canManage = user?.role === 'admin' || user?.role === 'superadmin';

  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      const matchesSearch = !searchQuery || team.name.toLowerCase().includes(searchQuery.toLowerCase());
      const compId = typeof team.competitionId === 'string' ? team.competitionId : team.competitionId?._id;
      const matchesComp = competitionFilter === 'all' || compId === competitionFilter;
      return matchesSearch && matchesComp;
    });
  }, [teams, searchQuery, competitionFilter]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete team "${name}"?`)) return;
    const result = await actions.delete(id);
    if (!result.success) alert(result.error);
  };

  if (isLoading) return <LoadingState type="skeleton" text="Loading teams..." />;

  if (error) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Alert variant="error">
          <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <AlertCircle className="w-5 h-5" />
            <div className="flex-1">
              <p className="font-semibold">Failed to load teams</p>
              <p className="text-sm">{error}</p>
            </div>
            <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={refetch}>
              Retry
            </Button>
          </div>
        </Alert>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div>
          <h1 className="text-3xl font-bold text-primary">Teams</h1>
          <p className="text-gray-400 mt-1">Manage competition teams and members</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={refetch}>
            Refresh
          </Button>
          {canManage && <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setFormFor('new')}>New Team</Button>}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <CardComponent variant="glass" className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className="text-gray-400 text-xs mb-1">Total Teams</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-primary/50" />
            </div>
          </CardComponent>
          <CardComponent variant="glass" className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className="text-gray-400 text-xs mb-1">Total Members</p>
                <p className="text-2xl font-bold text-secondary">{stats.totalMembers}</p>
              </div>
              <Users className="w-8 h-8 text-secondary/50" />
            </div>
          </CardComponent>
          <CardComponent variant="glass" className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className="text-gray-400 text-xs mb-1">Avg Team Size</p>
                <p className="text-2xl font-bold text-accent">{stats.averageSize}</p>
              </div>
              <Users className="w-8 h-8 text-accent/50" />
            </div>
          </CardComponent>
          <CardComponent variant="glass" className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className="text-gray-400 text-xs mb-1">Largest Team</p>
                <p className="text-2xl font-bold text-green-400">{stats.largestTeam}</p>
              </div>
              <Users className="w-8 h-8 text-green-400/50" />
            </div>
          </CardComponent>
        </div>
      )}

      <CardComponent variant="glass" className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search teams..."
              className="input pl-12 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select className="select" value={competitionFilter} onChange={(e) => setCompetitionFilter(e.target.value)}>
              <option value="all">All Competitions</option>
              {competitions.map(c => (
                <option key={c._id} value={c._id}>{c.title}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400">
            Showing <span className="text-white font-semibold">{filteredTeams.length}</span> of{' '}
            <span className="text-white font-semibold">{teams.length}</span> teams
          </p>
        </div>
      </CardComponent>

      {filteredTeams.length === 0 ? (
        <CardComponent variant="glass" className="p-12 text-center">
          <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No teams found</h3>
          <p className="text-gray-400">{searchQuery || competitionFilter !== 'all' ? 'Try adjusting filters.' : 'Create your first team.'}</p>
        </CardComponent>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map(team => (
            <motion.div key={team._id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <CardComponent variant="glass" hover className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">{team.name}</h3>
                  <Badge variant="primary" size="sm">{team.memberCount} members</Badge>
                </div>
                {team.description && <p className="text-sm text-gray-400 mb-4">{team.description}</p>}
                {canManage && (
                  <div className="flex gap-2 pt-4 border-t border-gray-700">
                    <Button variant="ghost" size="sm" leftIcon={<Edit2 className="w-4 h-4" />} onClick={() => setFormFor(team)}>Edit</Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 className="w-4 h-4" />}
                      onClick={() => handleDelete(team._id, team.name)}
                      className="text-red-400 hover:bg-red-400/10"
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </CardComponent>
            </motion.div>
          ))}
        </div>
      )}

      <TeamFormModal
        isOpen={formFor !== null}
        onClose={() => setFormFor(null)}
        team={formFor === 'new' ? null : formFor}
        competitions={competitions}
        onSubmit={(data) => (formFor && formFor !== 'new' ? actions.update(formFor._id, { name: data.name, members: data.members }) : actions.create(data))}
      />
    </motion.div>
  );
}
