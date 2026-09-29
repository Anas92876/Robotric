import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Search,
  Eye,
  BookOpen,
  Users,
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTrainerResources, type TrainerResource } from '../../hooks/trainer/useTrainerResources';
import { formatDate } from "../../utils/dateTime";
import { PDFViewer } from '../../components/ui/PDFViewer';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TrainerResources() {
  const { t, i18n } = useTranslation(['dashboardCommon']);
  const isRTL = i18n.language === 'ar';

  const { resources, groups, isLoading, error, fetchResources, fetchGroups } =
    useTrainerResources();

  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewerResourceId, setViewerResourceId] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();
    fetchResources();
  }, [fetchGroups, fetchResources]);

  // Re-fetch when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResources({ groupId: groupFilter || undefined, search: search || undefined });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, groupFilter, fetchResources]);

  const handleOpenViewer = (resource: TrainerResource) => {
    setViewerResourceId(resource._id);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div>
          <h1 className="text-3xl font-bold text-[#003300]">Resources</h1>
          <p className="text-sm text-[#003300]/50 mt-1">
            Materials assigned to your groups by the CLO
          </p>
        </div>
        <button
          onClick={() => fetchResources({ groupId: groupFilter || undefined, search: search || undefined })}
          className="flex items-center gap-2 px-4 py-2 text-sm text-[#003300]/60 hover:text-[#003300] hover:bg-[#003300]/5 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-[#003300]/10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#003300]/40" />
            <input
              type="text"
              placeholder="Search resources..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#003300]/20 text-[#003300] placeholder-[#003300]/30 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm transition-all"
            />
          </div>

          {/* Group filter */}
          <select
            value={groupFilter}
            onChange={e => setGroupFilter(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-[#003300]/20 bg-white text-[#003300] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm transition-all"
          >
            <option value="">All Groups</option>
            {groups.map(g => (
              <option key={g._id} value={g._id}>
                {g.name} — {g.courseId?.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl p-5 border border-[#003300]/10 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#003300]/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#003300]/10 rounded w-1/3" />
                  <div className="h-3 bg-[#003300]/10 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resources list */}
      {!isLoading && resources.length === 0 && !error && (
        <div className="bg-white rounded-xl p-12 border border-[#003300]/10 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-[#003300]/20" />
          <h3 className="text-lg font-semibold text-[#003300] mb-2">No resources yet</h3>
          <p className="text-sm text-[#003300]/50">
            {search || groupFilter
              ? 'Try adjusting your filters.'
              : 'The CLO hasn\'t assigned any resources to your groups yet.'}
          </p>
        </div>
      )}

      {!isLoading && resources.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-[#003300]/50">{resources.length} resource{resources.length !== 1 ? 's' : ''}</p>
          {resources.map((resource, index) => (
            <motion.div
              key={resource._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="bg-white rounded-xl border border-[#003300]/10 hover:border-[#003300]/20 transition-all overflow-hidden"
            >
              {/* Resource row */}
              <div className="p-5 flex items-center gap-4">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-primary" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#003300] truncate">{resource.title}</h3>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-[#003300]/50">
                      <BookOpen className="w-3 h-3" />
                      {resource.courseId?.title}
                    </span>
                    <span className="text-xs text-[#003300]/40">{formatBytes(resource.fileSize)}</span>
                    <span className="text-xs text-[#003300]/40">{resource.originalName}</span>
                  </div>
                  {resource.description && (
                    <p className="text-xs text-[#003300]/50 mt-1 line-clamp-1">{resource.description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Expand groups */}
                  <button
                    onClick={() => setExpandedId(prev => prev === resource._id ? null : resource._id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#003300]/60 hover:text-[#003300] hover:bg-[#003300]/5 rounded-lg transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" />
                    {resource.assignedTo.length} group{resource.assignedTo.length !== 1 ? 's' : ''}
                    {expandedId === resource._id
                      ? <ChevronUp className="w-3 h-3" />
                      : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {/* View PDF */}
                  <button
                    onClick={() => handleOpenViewer(resource)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View PDF
                  </button>
                </div>
              </div>

              {/* Expanded: groups & sessions */}
              <AnimatePresence>
                {expandedId === resource._id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-[#003300]/10"
                  >
                    <div className="p-4 bg-[#003300]/[0.02] space-y-3">
                      {resource.assignedTo.map(group => (
                        <div key={group.groupId} className="rounded-lg bg-white border border-[#003300]/10 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-primary" />
                            <span className="font-medium text-sm text-[#003300]">{group.groupName}</span>
                            <span className="text-xs text-[#003300]/40">· {group.courseName}</span>
                          </div>
                          {group.sessions.length > 0 ? (
                            <div className="space-y-1 pl-6">
                              {group.sessions.map(s => (
                                <div key={s.sessionId} className="flex items-center gap-2 text-xs text-[#003300]/60">
                                  <Calendar className="w-3 h-3" />
                                  <span>Session {s.sessionNumber}{s.title ? ` — ${s.title}` : ''}</span>
                                  <span className="text-[#003300]/40">
                                    {formatDate(s.scheduledDate)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="pl-6 text-xs text-[#003300]/40">No specific sessions</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* PDF Viewer */}
      <PDFViewer
        resourceId={viewerResourceId}
        isOpen={!!viewerResourceId}
        onClose={() => setViewerResourceId(null)}
        viewerPathPrefix="student/resources"
      />
    </motion.div>
  );
}
