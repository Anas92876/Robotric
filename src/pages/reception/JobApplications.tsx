import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, RefreshCw, AlertCircle, Eye, Trash2, Filter,
  Briefcase, User, Phone, Mail, MapPin, Calendar, Star,
  Link, Clock, CheckCircle, XCircle, MessageSquare, ChevronDown,
  FileText, Sparkles, Users, TrendingUp, Download
} from 'lucide-react';
import {
  getAllJobApplications, updateJobApplication, deleteJobApplication,
  getJobApplicationById, downloadJobApplicationCv,
  type JobApplication, type JobApplicationFilters
} from '../../services/job.application.service';
import {
  LoadingState, Alert, Button, Input, Modal,
  CardComponent, CardBody, StatsCard, Badge
} from '../../components/ui';
import { useToast } from '../../components/ui';
import { useTranslation } from 'react-i18next';

const STATUS_CONFIG: Record<string, { label: string; labelAr: string; color: string; bg: string; icon: React.ReactNode }> = {
  new:      { label: 'New',      labelAr: 'جديد',         color: '#1d4ed8', bg: '#dbeafe', icon: <Sparkles className="w-3 h-3" /> },
  reviewed: { label: 'Reviewed', labelAr: 'تمت المراجعة', color: '#7c3aed', bg: '#ede9fe', icon: <Eye className="w-3 h-3" /> },
  interview:{ label: 'Interview',labelAr: 'مقابلة',       color: '#d97706', bg: '#fef3c7', icon: <Users className="w-3 h-3" /> },
  accepted: { label: 'Accepted', labelAr: 'مقبول',        color: '#15803d', bg: '#dcfce7', icon: <CheckCircle className="w-3 h-3" /> },
  rejected: { label: 'Rejected', labelAr: 'مرفوض',        color: '#dc2626', bg: '#fee2e2', icon: <XCircle className="w-3 h-3" /> },
};

const EXP_LABEL: Record<string, { en: string; ar: string }> = {
  none:         { en: 'No Experience', ar: 'بدون خبرة' },
  beginner:     { en: 'Beginner',      ar: 'مبتدئ' },
  intermediate: { en: 'Intermediate',  ar: 'متوسط' },
  professional: { en: 'Professional',  ar: 'محترف' },
};

const AVAIL_LABEL: Record<string, { en: string; ar: string }> = {
  full_time: { en: 'Full Time', ar: 'دوام كامل' },
  part_time: { en: 'Part Time', ar: 'دوام جزئي' },
  flexible:  { en: 'Flexible',  ar: 'مرن' },
};

export default function JobApplications() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const toast = useToast();

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, new: 0, reviewed: 0, interview: 0, accepted: 0, rejected: 0 });
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 20 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<JobApplicationFilters>({ page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');

  // Modals
  const [selected, setSelected] = useState<JobApplication | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<JobApplication | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloadingCv, setIsDownloadingCv] = useState(false);

  const fetchApplications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getAllJobApplications(filters);
      setApplications(res.data);
      setPagination(res.pagination);
      setStats(res.stats);
      setPositions(res.positions || []);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to load applications';
      setError(msg);
      toast.error('Error', msg);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const applyFilters = () => {
    setFilters({ page: 1, limit: 20, search: searchInput || undefined, status: statusFilter || undefined, position: positionFilter || undefined });
  };

  const clearFilters = () => {
    setSearchInput(''); setStatusFilter(''); setPositionFilter('');
    setFilters({ page: 1, limit: 20 });
  };

  const openDetail = async (app: JobApplication) => {
    try {
      const full = await getJobApplicationById(app._id);
      setSelected(full);
      setNoteInput(full.notes || '');
      setIsDetailOpen(true);
    } catch {
      setSelected(app);
      setNoteInput(app.notes || '');
      setIsDetailOpen(true);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      setIsUpdating(true);
      await updateJobApplication(id, { status });
      toast.success('Updated', 'Status updated successfully');
      fetchApplications();
      if (selected?._id === id) setSelected(prev => prev ? { ...prev, status: status as any } : prev);
    } catch (err: any) {
      toast.error('Error', err.response?.data?.message || 'Failed to update');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selected) return;
    try {
      setIsUpdating(true);
      await updateJobApplication(selected._id, { notes: noteInput });
      toast.success('Saved', 'Notes saved');
      setSelected(prev => prev ? { ...prev, notes: noteInput } : prev);
      fetchApplications();
    } catch (err: any) {
      toast.error('Error', err.response?.data?.message || 'Failed to save notes');
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmDelete = (app: JobApplication) => { setToDelete(app); setIsDeleteOpen(true); };
  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      setIsDeleting(true);
      await deleteJobApplication(toDelete._id);
      toast.success('Deleted', 'Application deleted');
      setIsDeleteOpen(false);
      setToDelete(null);
      if (selected?._id === toDelete._id) setIsDetailOpen(false);
      fetchApplications();
    } catch (err: any) {
      toast.error('Error', err.response?.data?.message || 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadCv = async (id: string) => {
    try {
      setIsDownloadingCv(true);
      const { signedUrl, filename } = await downloadJobApplicationCv(id);
      const a = document.createElement('a');
      a.href = signedUrl;
      a.download = filename;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      toast.error('Error', err.response?.data?.message || 'Failed to download CV');
    } finally {
      setIsDownloadingCv(false);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
        style={{ backgroundColor: cfg.bg, color: cfg.color }}>
        {cfg.icon}
        {isRTL ? cfg.labelAr : cfg.label}
      </span>
    );
  };

  if (isLoading && applications.length === 0) return <LoadingState />;

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-primary flex items-center gap-2">
          <Briefcase className="w-7 h-7" />
          {isRTL ? 'طلبات التوظيف' : 'Job Applications'}
        </h1>
        <p className="text-sm text-primary/60 mt-1">
          {isRTL ? 'إدارة جميع طلبات التوظيف الواردة' : 'Manage all incoming job applications'}
        </p>
      </div>

      {error && (
        <Alert variant="error">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { key: 'total',     labelEn: 'Total',     labelAr: 'المجموع',      color: '#003300', icon: <Briefcase className="w-4 h-4" /> },
          { key: 'new',       labelEn: 'New',       labelAr: 'جديد',         color: '#1d4ed8', icon: <Sparkles className="w-4 h-4" /> },
          { key: 'reviewed',  labelEn: 'Reviewed',  labelAr: 'تمت المراجعة', color: '#7c3aed', icon: <Eye className="w-4 h-4" /> },
          { key: 'interview', labelEn: 'Interview', labelAr: 'مقابلة',       color: '#d97706', icon: <Users className="w-4 h-4" /> },
          { key: 'accepted',  labelEn: 'Accepted',  labelAr: 'مقبول',        color: '#15803d', icon: <CheckCircle className="w-4 h-4" /> },
          { key: 'rejected',  labelEn: 'Rejected',  labelAr: 'مرفوض',        color: '#dc2626', icon: <XCircle className="w-4 h-4" /> },
        ].map(s => (
          <div key={s.key} className="bg-white rounded-2xl p-4 shadow-sm border border-[#003300]/8">
            <div className="flex items-center justify-between mb-1">
              <span style={{ color: s.color }}>{s.icon}</span>
              <span className="text-2xl font-black text-primary">{stats[s.key as keyof typeof stats] ?? 0}</span>
            </div>
            <p className="text-xs text-primary/60 font-medium">{isRTL ? s.labelAr : s.labelEn}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#003300]/8 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
            <input
              type="text"
              placeholder={isRTL ? 'بحث...' : 'Search name, phone, position...'}
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
              className="w-full ps-9 pe-4 py-2.5 rounded-xl border border-[#003300]/15 text-sm text-primary placeholder-primary/30 focus:outline-none focus:ring-2 focus:ring-[#003300]/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-[#003300]/15 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-[#003300]/20 bg-white"
          >
            <option value="">{isRTL ? 'كل الحالات' : 'All Statuses'}</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{isRTL ? v.labelAr : v.label}</option>
            ))}
          </select>
          <select
            value={positionFilter}
            onChange={e => setPositionFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-[#003300]/15 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-[#003300]/20 bg-white"
          >
            <option value="">{isRTL ? 'كل الوظائف' : 'All Positions'}</option>
            {positions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="primary" leftIcon={<Search className="w-4 h-4" />} onClick={applyFilters}>
            {isRTL ? 'بحث' : 'Search'}
          </Button>
          <Button size="sm" variant="ghost" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={clearFilters}>
            {isRTL ? 'مسح' : 'Clear'}
          </Button>
          <Button size="sm" variant="ghost" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={fetchApplications}>
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#003300]/8 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-primary/40 mx-auto" />
          </div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="w-12 h-12 text-primary/20 mx-auto mb-3" />
            <p className="text-primary/50 font-medium">{isRTL ? 'لا توجد طلبات' : 'No applications found'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#003300]/8 bg-[#003300]/3">
                  {[
                    { en: 'Applicant',  ar: 'المتقدم' },
                    { en: 'Position',   ar: 'الوظيفة' },
                    { en: 'Contact',    ar: 'التواصل' },
                    { en: 'Experience', ar: 'الخبرة' },
                    { en: 'Date',       ar: 'التاريخ' },
                    { en: 'Status',     ar: 'الحالة' },
                    { en: 'Actions',    ar: 'الإجراءات' },
                  ].map(h => (
                    <th key={h.en} className="px-4 py-3 text-start text-xs font-bold text-primary/60 uppercase tracking-wide whitespace-nowrap">
                      {isRTL ? h.ar : h.en}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#003300]/6">
                {applications.map((app, i) => (
                  <motion.tr
                    key={app._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-[#003300]/2 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#003300]/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">{app.fullName[0]?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-primary text-sm">{app.fullName}</p>
                          {app.location && <p className="text-xs text-primary/50">{app.location}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#003300]/8 text-primary">
                        <Briefcase className="w-3 h-3" />
                        {app.position}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <p className="text-sm text-primary flex items-center gap-1"><Phone className="w-3 h-3 text-primary/40" />{app.phone}</p>
                        {app.email && <p className="text-xs text-primary/50 flex items-center gap-1"><Mail className="w-3 h-3 text-primary/30" />{app.email}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {app.experienceLevel ? (
                        <span className="text-xs font-medium text-primary/70">
                          {isRTL ? EXP_LABEL[app.experienceLevel]?.ar : EXP_LABEL[app.experienceLevel]?.en}
                        </span>
                      ) : <span className="text-xs text-primary/30">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-primary/50 whitespace-nowrap">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {app.cvUrl && (
                          <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[#003300]/50" title={isRTL ? 'سيرة ذاتية مرفقة' : 'CV attached'}>
                            <FileText className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <button onClick={() => openDetail(app)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-primary/60 hover:bg-[#003300]/8 hover:text-primary transition-colors"
                          title={isRTL ? 'عرض' : 'View'}>
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => confirmDelete(app)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title={isRTL ? 'حذف' : 'Delete'}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-[#003300]/8 flex items-center justify-between">
            <p className="text-xs text-primary/50">
              {isRTL
                ? `${pagination.total} طلب — صفحة ${pagination.page} من ${pagination.pages}`
                : `${pagination.total} applications — Page ${pagination.page} of ${pagination.pages}`}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" disabled={pagination.page <= 1}
                onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) - 1 }))}>
                {isRTL ? 'السابق' : 'Prev'}
              </Button>
              <Button size="sm" variant="ghost" disabled={pagination.page >= pagination.pages}
                onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) + 1 }))}>
                {isRTL ? 'التالي' : 'Next'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)}
        title={isRTL ? 'تفاصيل الطلب' : 'Application Details'}
        size="lg">
        {selected && (
          <div className="space-y-5" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-[#003300]/5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#003300]/15 flex items-center justify-center">
                  <span className="text-lg font-black text-primary">{selected.fullName[0]?.toUpperCase()}</span>
                </div>
                <div>
                  <h3 className="font-black text-primary text-lg">{selected.fullName}</h3>
                  <p className="text-sm text-primary/60">{selected.position}</p>
                </div>
              </div>
              <StatusBadge status={selected.status} />
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Phone className="w-4 h-4" />, label: isRTL ? 'الهاتف' : 'Phone', value: selected.phone },
                { icon: <Mail className="w-4 h-4" />, label: isRTL ? 'البريد' : 'Email', value: selected.email || '—' },
                { icon: <MapPin className="w-4 h-4" />, label: isRTL ? 'المنطقة' : 'Location', value: selected.location || '—' },
                { icon: <User className="w-4 h-4" />, label: isRTL ? 'العمر' : 'Age', value: selected.age ? `${selected.age}` : '—' },
                { icon: <Clock className="w-4 h-4" />, label: isRTL ? 'التوفر' : 'Availability',
                  value: selected.availability ? (isRTL ? AVAIL_LABEL[selected.availability]?.ar : AVAIL_LABEL[selected.availability]?.en) : '—' },
                { icon: <TrendingUp className="w-4 h-4" />, label: isRTL ? 'مستوى الخبرة' : 'Experience',
                  value: selected.experienceLevel ? (isRTL ? EXP_LABEL[selected.experienceLevel]?.ar : EXP_LABEL[selected.experienceLevel]?.en) : '—' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-2 p-3 rounded-xl bg-[#003300]/4">
                  <span className="text-primary/40 mt-0.5">{item.icon}</span>
                  <div>
                    <p className="text-xs text-primary/50">{item.label}</p>
                    <p className="text-sm font-semibold text-primary">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Skills */}
            {selected.skills && selected.skills.length > 0 && (
              <div>
                <p className="text-xs font-bold text-primary/50 uppercase tracking-wide mb-2">{isRTL ? 'المهارات' : 'Skills'}</p>
                <div className="flex flex-wrap gap-2">
                  {selected.skills.map(s => (
                    <span key={s} className="px-3 py-1 rounded-full bg-[#003300]/8 text-primary text-xs font-semibold">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Experience details */}
            {selected.experienceDetails && (
              <div>
                <p className="text-xs font-bold text-primary/50 uppercase tracking-wide mb-2">{isRTL ? 'تفاصيل الخبرة' : 'Experience Details'}</p>
                <p className="text-sm text-primary/80 bg-[#003300]/4 rounded-xl p-3 leading-relaxed">{selected.experienceDetails}</p>
              </div>
            )}

            {/* Why us */}
            {selected.whyUs && (
              <div>
                <p className="text-xs font-bold text-primary/50 uppercase tracking-wide mb-2">{isRTL ? 'لماذا روبوتريك؟' : 'Why Robotrick?'}</p>
                <p className="text-sm text-primary/80 bg-[#003300]/4 rounded-xl p-3 leading-relaxed">{selected.whyUs}</p>
              </div>
            )}

            {/* Portfolio */}
            {selected.portfolioLink && (
              <div>
                <p className="text-xs font-bold text-primary/50 uppercase tracking-wide mb-2">{isRTL ? 'رابط الأعمال' : 'Portfolio'}</p>
                <a href={selected.portfolioLink} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                  <Link className="w-3.5 h-3.5" />{selected.portfolioLink}
                </a>
              </div>
            )}

            {/* Additional info */}
            {selected.additionalInfo && (
              <div>
                <p className="text-xs font-bold text-primary/50 uppercase tracking-wide mb-2">{isRTL ? 'معلومات إضافية' : 'Additional Info'}</p>
                <p className="text-sm text-primary/80 bg-[#003300]/4 rounded-xl p-3 leading-relaxed">{selected.additionalInfo}</p>
              </div>
            )}

            {/* CV Download */}
            {selected.cvUrl ? (
              <div className="flex items-center justify-between p-3 rounded-xl border border-[#003300]/15 bg-[#003300]/3">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-[#003300]/60 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-primary">{isRTL ? 'السيرة الذاتية مرفقة' : 'CV Attached'}</p>
                    <p className="text-xs text-primary/50">{isRTL ? 'انقر للتنزيل' : 'Click to download'}</p>
                  </div>
                </div>
                <Button size="sm" variant="primary"
                  leftIcon={<Download className="w-4 h-4" />}
                  isLoading={isDownloadingCv}
                  onClick={() => handleDownloadCv(selected._id)}>
                  {isRTL ? 'تنزيل' : 'Download'}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-[#003300]/8 bg-[#003300]/2 text-primary/40">
                <FileText className="w-4 h-4" />
                <span className="text-xs">{isRTL ? 'لا توجد سيرة ذاتية مرفقة' : 'No CV attached'}</span>
              </div>
            )}

            {/* Change status */}
            <div>
              <p className="text-xs font-bold text-primary/50 uppercase tracking-wide mb-2">{isRTL ? 'تغيير الحالة' : 'Change Status'}</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <button key={k}
                    onClick={() => handleStatusChange(selected._id, k)}
                    disabled={isUpdating || selected.status === k}
                    className="px-3 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-40"
                    style={{
                      backgroundColor: selected.status === k ? v.color : v.bg,
                      color: selected.status === k ? '#fff' : v.color,
                      border: `1.5px solid ${v.color}30`
                    }}>
                    {isRTL ? v.labelAr : v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* HR Notes */}
            <div>
              <p className="text-xs font-bold text-primary/50 uppercase tracking-wide mb-2">{isRTL ? 'ملاحظات HR' : 'HR Notes'}</p>
              <textarea
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                rows={3}
                placeholder={isRTL ? 'أضف ملاحظاتك هنا...' : 'Add internal notes...'}
                className="w-full px-3 py-2.5 rounded-xl border border-[#003300]/15 text-sm text-primary placeholder-primary/30 focus:outline-none focus:ring-2 focus:ring-[#003300]/20 resize-none"
              />
              <div className="flex justify-end mt-2">
                <Button size="sm" variant="primary" onClick={handleSaveNotes} isLoading={isUpdating}>
                  {isRTL ? 'حفظ الملاحظات' : 'Save Notes'}
                </Button>
              </div>
            </div>

            <div className="flex justify-between pt-2 border-t border-[#003300]/8">
              <Button size="sm" variant="danger" leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={() => { setIsDetailOpen(false); confirmDelete(selected); }}>
                {isRTL ? 'حذف' : 'Delete'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsDetailOpen(false)}>
                {isRTL ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)}
        title={isRTL ? 'تأكيد الحذف' : 'Confirm Delete'} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-primary/70">
            {isRTL
              ? `هل أنت متأكد من حذف طلب "${toDelete?.fullName}"؟ لا يمكن التراجع عن هذا الإجراء.`
              : `Are you sure you want to delete the application from "${toDelete?.fullName}"? This cannot be undone.`}
          </p>
          <div className="flex gap-3 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setIsDeleteOpen(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button size="sm" variant="danger" isLoading={isDeleting} onClick={handleDelete}>
              {isRTL ? 'حذف' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
