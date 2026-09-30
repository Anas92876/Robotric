import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Users,
  Plus,
  AlertCircle,
  RefreshCw,
  Edit,
  Trash2,
  Search,
  X,
} from "lucide-react";
import { useCLOSessions } from "../../hooks/clo/useCLOSessions";
import { useTranslation } from 'react-i18next';
import { formatDate, formatHHMM } from "../../utils/dateTime";
import {
  CardComponent,
  CardBody,
  Button,
  Badge,
  LoadingState,
  Alert,
} from "../../components/ui";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export default function CLOSessions() {
  const navigate = useNavigate();
  const { sessions, isLoading, error, refetch, deleteSession } = useCLOSessions();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardTrainer']);
  const isRTL = i18n.language === 'ar';

  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    const map = new Map<string, { _id: string; name: string; color: string; count: number }>();
    sessions.forEach((s) => {
      const id = s.groupId._id;
      if (!map.has(id)) {
        map.set(id, { _id: id, name: s.groupId.name, color: s.groupId.color || "#30c59b", count: 0 });
      }
      map.get(id)!.count++;
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [sessions]);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (selectedGroupId && s.groupId._id !== selectedGroupId) return false;
      if (selectedStatus && s.status !== selectedStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !s.title.toLowerCase().includes(q) &&
          !s.groupId.name.toLowerCase().includes(q) &&
          !(s.description?.toLowerCase().includes(q))
        )
          return false;
      }
      return true;
    });
  }, [sessions, selectedGroupId, selectedStatus, search]);

  const hasActiveFilters = selectedGroupId || selectedStatus || search;

  const clearFilters = () => {
    setSelectedGroupId("");
    setSelectedStatus("");
    setSearch("");
  };

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t('dashboardTrainer:deleteSessionConfirm'))) return;
    await deleteSession(sessionId, true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "success";
      case "in_progress": return "primary";
      case "scheduled": return "warning";
      case "cancelled": return "error";
      default: return "secondary";
    }
  };


  if (isLoading) {
    return <LoadingState type="skeleton" text={t('dashboardTrainer:loadingSession')} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div>
          <h1 className="text-3xl font-bold inline-block" style={{
            color: '#0f1f33',
            backgroundClip: 'text'
          }}>
            {t('dashboardTrainer:sessions')}
          </h1>
          <p className="mt-1" style={{ color: '#0f1f33CC' }}>
            {t('dashboardTrainer:sessionsSubtitle')}
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-5 h-5" />}
          onClick={() => navigate("/clo/sessions/new")}
        >
          {t('dashboardTrainer:createSession')}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="error">
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={() => refetch()}>
              {t('dashboardCommon:retry')}
            </Button>
          </div>
        </Alert>
      )}

      {/* Filters */}
      <CardComponent variant="glass">
        <CardBody>
          <div className={`flex flex-col sm:flex-row gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
            {/* Search */}
            <div className="relative flex-1">
              <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 ${isRTL ? 'right-3' : 'left-3'}`} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('dashboardCommon:search')}
                className={`w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-primary transition-all ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
              />
            </div>

            {/* Group Filter */}
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-white border border-ink/20 text-ink focus:outline-none focus:border-primary transition-all"
            >
              <option value="">{t('dashboardTrainer:allGroups')}</option>
              {groups.map((g) => (
                <option key={g._id} value={g._id}>
                  {g.name} ({g.count})
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-white border border-ink/20 text-ink focus:outline-none focus:border-primary transition-all"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" leftIcon={<X className="w-4 h-4" />} onClick={clearFilters}>
                {t('dashboardCommon:clear')}
              </Button>
            )}
          </div>
        </CardBody>
      </CardComponent>

      {/* Sessions List */}
      {filtered.length === 0 ? (
        <CardComponent variant="glass">
          <CardBody>
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-white/60">
                {hasActiveFilters ? t('dashboardTrainer:noSessionsFilter') : t('dashboardTrainer:noSessions')}
              </p>
              {!hasActiveFilters && (
                <Button
                  variant="primary"
                  className="mt-4"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => navigate("/clo/sessions/new")}
                >
                  {t('dashboardTrainer:createSession')}
                </Button>
              )}
            </div>
          </CardBody>
        </CardComponent>
      ) : (
        <div className="space-y-4">
          {filtered.map((session) => (
            <motion.div
              key={session._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.005 }}
              className="cursor-pointer"
              onClick={() => navigate(`/clo/sessions/${session._id}`)}
            >
              <CardComponent variant="glass" hover>
                <CardBody>
                  <div className={`flex items-start justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {/* Group Color Indicator + Info */}
                    <div className={`flex items-start gap-4 flex-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div
                        className="w-1 self-stretch rounded-full flex-shrink-0"
                        style={{ backgroundColor: session.groupId.color || "#30c59b" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`flex items-center gap-2 mb-1 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <h3 className="font-semibold text-white truncate">{session.title}</h3>
                          <Badge variant={getStatusColor(session.status) as any} size="sm">
                            {session.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-sm text-white/60 mb-3">{session.groupId.name}</p>

                        <div className={`flex flex-wrap gap-4 text-sm text-white/70 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <span className={`flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Calendar className="w-4 h-4 flex-shrink-0" />
                            {formatDate(session.scheduledDate)}
                          </span>
                          <span className={`flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Clock className="w-4 h-4 flex-shrink-0" />
                            {formatHHMM(session.startTime)} – {formatHHMM(session.endTime)}
                          </span>
                          <span className={`flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Users className="w-4 h-4 flex-shrink-0" />
                            {session.groupId.students?.length || 0} {t('dashboardTrainer:students')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className={`flex items-center gap-2 flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Edit className="w-4 h-4" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/clo/sessions/${session._id}/edit`);
                        }}
                      >
                        {t('dashboardCommon:edit')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Trash2 className="w-4 h-4" />}
                        onClick={(e) => handleDelete(session._id, e)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                      >
                        {t('dashboardCommon:delete')}
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </CardComponent>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
