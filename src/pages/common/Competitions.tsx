import React, { useState, useMemo } from 'react';
import { Search, Trophy, Plus, Edit2, Trash2, AlertCircle, RefreshCw, Filter, Calendar, MapPin } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { useCompetitionsData } from '../../hooks';
import { LoadingState, Alert, Button, CardComponent, Badge } from '../../components/ui';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

type StatusFilter = 'all' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export default function Competitions() {
  const { i18n } = useTranslation(['dashboardCommon', 'dashboardAdmin']);
  const isRTL = i18n.language === 'ar';
  const { user } = useAuth();
  const { competitions, stats, isLoading, error, refetch, actions } = useCompetitionsData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const canManage = user?.role === 'admin' || user?.role === 'superadmin';

  const filteredCompetitions = useMemo(() => {
    return competitions.filter(comp => {
      const matchesSearch = !searchQuery ||
        comp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || comp.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [competitions, searchQuery, statusFilter]);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete competition "${title}"?`)) return;
    const result = await actions.delete(id);
    if (!result.success) alert(result.error);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusVariant = (status?: string): 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info' => {
    switch (status) {
      case 'upcoming': return 'warning';
      case 'ongoing': return 'primary';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'info';
    }
  };

  if (isLoading) return <LoadingState type="skeleton" text="Loading competitions..." />;

  if (error) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Alert variant="error">
          <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <AlertCircle className="w-5 h-5" />
            <div className="flex-1">
              <p className="font-semibold">Failed to load competitions</p>
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
          <h1 className="text-3xl font-bold text-primary">Competitions</h1>
          <p className="text-gray-400 mt-1">Manage robotics competitions and events</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={refetch}>
            Refresh
          </Button>
          {canManage && (
            <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              New Competition
            </Button>
          )}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <CardComponent variant="glass" className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className="text-gray-400 text-xs mb-1">Total</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Trophy className="w-8 h-8 text-primary/50" />
            </div>
          </CardComponent>
          <CardComponent variant="glass" className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className="text-gray-400 text-xs mb-1">Upcoming</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.upcoming}</p>
              </div>
              <Calendar className="w-8 h-8 text-yellow-400/50" />
            </div>
          </CardComponent>
          <CardComponent variant="glass" className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className="text-gray-400 text-xs mb-1">Ongoing</p>
                <p className="text-2xl font-bold text-primary">{stats.ongoing}</p>
              </div>
              <Trophy className="w-8 h-8 text-primary/50" />
            </div>
          </CardComponent>
          <CardComponent variant="glass" className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className="text-gray-400 text-xs mb-1">Completed</p>
                <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
              </div>
              <Trophy className="w-8 h-8 text-green-400/50" />
            </div>
          </CardComponent>
          <CardComponent variant="glass" className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className="text-gray-400 text-xs mb-1">Total Teams</p>
                <p className="text-2xl font-bold text-secondary">{stats.totalTeams}</p>
              </div>
              <Trophy className="w-8 h-8 text-secondary/50" />
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
              placeholder="Search competitions..."
              className="input pl-12 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
              <option value="all">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400">
            Showing <span className="text-white font-semibold">{filteredCompetitions.length}</span> of{' '}
            <span className="text-white font-semibold">{competitions.length}</span> competitions
          </p>
        </div>
      </CardComponent>

      {filteredCompetitions.length === 0 ? (
        <CardComponent variant="glass" className="p-12 text-center">
          <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No competitions found</h3>
          <p className="text-gray-400">{searchQuery || statusFilter !== 'all' ? 'Try adjusting filters.' : 'Create your first competition.'}</p>
        </CardComponent>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompetitions.map(comp => (
            <motion.div key={comp._id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <CardComponent variant="glass" hover className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex-1">{comp.title}</h3>
                  {comp.status && (
                    <Badge variant={getStatusVariant(comp.status)} size="sm">
                      {comp.status}
                    </Badge>
                  )}
                </div>
                {comp.description && <p className="text-sm text-gray-400 mb-4 line-clamp-2">{comp.description}</p>}
                <div className="space-y-2 text-sm text-gray-400 mb-4">
                  {comp.startDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(comp.startDate)} - {formatDate(comp.endDate)}</span>
                    </div>
                  )}
                  {comp.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{comp.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    <span>{comp.teamCount} teams</span>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-2 pt-4 border-t border-gray-700">
                    <Button variant="ghost" size="sm" leftIcon={<Edit2 className="w-4 h-4" />}>Edit</Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 className="w-4 h-4" />}
                      onClick={() => handleDelete(comp._id, comp.title)}
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
    </motion.div>
  );
}
