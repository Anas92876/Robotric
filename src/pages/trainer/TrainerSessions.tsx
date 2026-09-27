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
import { useTrainerSessions } from "../../hooks/trainer/useTrainerSessions";
import { useTranslation } from 'react-i18next';
import { formatDate } from "../../utils/dateTime";
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

const GREEN      = '#003300';
const GREEN_MID  = '#003300CC';
const GREEN_SOFT = '#00330080';
const GREEN_PALE = '#00330033';

export default function TrainerSessions() {
  const navigate = useNavigate();
  const { sessions, isLoading, error, refetch, deleteSession } = useTrainerSessions();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardTrainer']);
  const isRTL = i18n.language === 'ar';

  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [search, setSearch] = useState("");

  // Derive unique groups from loaded sessions
  const groups = useMemo(() => {
    const map = new Map<string, { _id: string; name: string; color: string; count: number }>();
    sessions.forEach((s) => {
      if (!s.groupId?._id) return;
      const id = s.groupId._id;
      if (!map.has(id)) {
        map.set(id, { _id: id, name: s.groupId.name, color: s.groupId.color || "#30c59b", count: 0 });
      }
      map.get(id)!.count++;
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [sessions]);

  // Client-side filtering
  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (!s.groupId?._id) return false;
      if (selectedGroupId && s.groupId._id !== selectedGroupId) return false;
      if (selectedStatus && s.status !== selectedStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !s.title.toLowerCase().includes(q) &&
          !(s.groupId?.name?.toLowerCase().includes(q)) &&
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

  // Handle delete
  const handleDelete = async (sessionId: string, sessionTitle: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      !confirm(
        `Are you sure you want to delete "${sessionTitle}"? This will permanently delete the session and all related records (attendance, evaluations, etc.). This action cannot be undone.`
      )
    ) {
      return;
    }

    const success = await deleteSession(sessionId, true);
    if (success) {
      refetch();
    }
  };

  if (isLoading) return <LoadingState type="skeleton" text="Loading sessions..." />;

  if (error) {
    return (
      <Alert variant="error">
        <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold mb-1">Failed to load sessions</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </div>
      </Alert>
    );
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
          <h1 className="text-3xl font-bold" style={{ color: GREEN }}>
            {t('dashboardTrainer:trainingSessions')}
          </h1>
          <p className="mt-1 text-sm" style={{ color: GREEN_MID }}>
            {t('dashboardTrainer:sessionsSubtitle')}
          </p>
        </div>
        <Link to="/trainer/sessions/new">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <div className="px-6 py-3 bg-gradient-to-r from-primary to-accent rounded-xl font-semibold text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {t('dashboardTrainer:createSession')}
            </div>
          </motion.div>
        </Link>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────── */}
      {sessions.length > 0 && (
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: GREEN_SOFT }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('dashboardTrainer:searchSessions')}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border text-sm focus:outline-none transition-all"
              style={{ borderColor: `${GREEN}33`, color: GREEN }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: GREEN_SOFT }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Group filter chips */}
          {groups.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedGroupId("")}
                className="px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-all"
                style={!selectedGroupId
                  ? { backgroundColor: GREEN, borderColor: GREEN, color: '#fff' }
                  : { backgroundColor: 'transparent', borderColor: `${GREEN}33`, color: GREEN_MID }
                }
              >
                {t('dashboardTrainer:allGroups')}
                <span className="ml-1.5 text-xs opacity-60">({sessions.length})</span>
              </button>

              {groups.map((group) => (
                <button
                  key={group._id}
                  onClick={() =>
                    setSelectedGroupId(selectedGroupId === group._id ? "" : group._id)
                  }
                  className="px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-all flex items-center gap-2"
                  style={
                    selectedGroupId === group._id
                      ? { backgroundColor: group.color + "22", borderColor: group.color + "88", color: group.color }
                      : { backgroundColor: 'transparent', borderColor: `${GREEN}33`, color: GREEN_MID }
                  }
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: group.color }}
                  />
                  {group.name}
                  <span className="text-xs opacity-60">({group.count})</span>
                </button>
              ))}
            </div>
          )}

          {/* Status filter chips */}
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedStatus(opt.value)}
                className="px-3 py-1 rounded-lg text-xs font-medium border transition-all"
                style={selectedStatus === opt.value
                  ? { backgroundColor: GREEN, borderColor: GREEN, color: '#fff' }
                  : { backgroundColor: 'transparent', borderColor: `${GREEN}33`, color: GREEN_MID }
                }
              >
                {opt.label}
              </button>
            ))}

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-1 rounded-lg text-xs font-medium border border-red-300 text-red-600 hover:bg-red-50 transition-all flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                {t('dashboardTrainer:clearFilters')}
              </button>
            )}
          </div>

          {/* Result count */}
          <p className="text-xs" style={{ color: GREEN_SOFT }}>
            {t('dashboardTrainer:showingSessions', { filtered: filtered.length, total: sessions.length })}
            {selectedGroupId && ` · ${groups.find((g) => g._id === selectedGroupId)?.name}`}
            {selectedStatus && ` · ${selectedStatus.replace("_", " ")}`}
          </p>
        </div>
      )}

      {/* ── Sessions list ───────────────────────────────────────── */}
      {filtered.length > 0 ? (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
          }}
          className="space-y-5"
        >
          {filtered.map((session) => (
            <motion.div
              key={session._id}
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
            >
              <Link to={`/trainer/sessions/${session._id}`} className="block">
                <CardComponent variant="default" hover>
                  <CardBody>
                    <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {/* Group-color icon */}
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${session.groupId?.color ?? '#30c59b'}33, ${session.groupId?.color ?? '#30c59b'}11)`,
                          border: `1px solid ${session.groupId?.color ?? '#30c59b'}44`,
                        }}
                      >
                        <Calendar className="w-6 h-6" style={{ color: session.groupId?.color ?? '#30c59b' }} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-lg" style={{ color: GREEN }}>{session.title}</h3>
                          <Badge
                            variant={
                              session.status === "completed"
                                ? "success"
                                : session.status === "in_progress"
                                ? "warning"
                                : session.status === "cancelled"
                                ? "error"
                                : "primary"
                            }
                            size="sm"
                          >
                            {session.status.replace("_", " ")}
                          </Badge>
                          {session.sessionNumber && (
                            <Badge variant="secondary" size="sm">
                              #{session.sessionNumber}
                            </Badge>
                          )}
                        </div>

                        {session.description && (
                          <p className="text-sm mb-3 truncate" style={{ color: GREEN_MID }}>
                            {session.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" style={{ color: GREEN_MID }}>
                          {/* Group chip */}
                          <span
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium"
                            style={{
                              backgroundColor: (session.groupId?.color ?? '#30c59b') + "22",
                              color: session.groupId?.color ?? '#30c59b',
                              border: `1px solid ${session.groupId?.color ?? '#30c59b'}44`,
                            }}
                          >
                            <Users className="w-3 h-3" />
                            {session.groupId?.name ?? 'Unknown Group'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(session.scheduledDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {session.startTime} – {session.endTime}
                          </span>
                          <span style={{ color: GREEN_SOFT }}>
                            {session.duration} mins
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/trainer/sessions/${session._id}/edit`);
                          }}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDelete(session._id, session.title, e)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                </CardComponent>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      ) : sessions.length > 0 ? (
        // Has sessions but none match filters
        <CardComponent variant="default">
          <CardBody className="text-center py-14">
            <Search className="w-10 h-10 mx-auto mb-4" style={{ color: GREEN_SOFT }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: GREEN }}>{t('dashboardTrainer:noSessionsMatchFilters')}</h3>
            <p className="text-sm mb-5" style={{ color: GREEN_MID }}>{t('dashboardTrainer:tryAdjustingFilters')}</p>
            <Button variant="outline" size="sm" onClick={clearFilters} leftIcon={<X className="w-4 h-4" />}>
              {t('dashboardTrainer:clearFilters')}
            </Button>
          </CardBody>
        </CardComponent>
      ) : (
        // No sessions at all
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <CardComponent variant="default">
            <CardBody className="text-center py-20">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="relative w-24 h-24 mx-auto mb-8"
              >
                <div className="absolute inset-0 rounded-full blur-xl animate-pulse" style={{ background: `${GREEN}22` }} />
                <div className="relative w-full h-full rounded-full flex items-center justify-center border" style={{ background: `${GREEN}18`, borderColor: `${GREEN}44` }}>
                  <Calendar className="w-12 h-12" style={{ color: GREEN }} />
                </div>
              </motion.div>
              <h3 className="text-2xl font-bold mb-3" style={{ color: GREEN }}>{t('dashboardTrainer:noSessions')}</h3>
              <p className="mb-8 max-w-md mx-auto" style={{ color: GREEN_MID }}>
                {t('dashboardTrainer:noSessionsDesc')}
              </p>
              <Link to="/trainer/sessions/new" className="inline-block">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <div className="px-8 py-4 bg-gradient-to-r from-primary to-accent rounded-xl font-semibold text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 flex items-center gap-3">
                    <Plus className="w-5 h-5" />
                    {t('dashboardTrainer:createFirstSession')}
                  </div>
                </motion.div>
              </Link>
            </CardBody>
          </CardComponent>
        </motion.div>
      )}
    </motion.div>
  );
}
