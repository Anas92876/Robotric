import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCheck,
  ChevronDown,
  ChevronUp,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  FileText,
  User,
  Filter,
  Search,
  Trophy,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCLODocuments, type CLODocument, type StudentSummary } from '../../hooks/clo/useCLODocuments';
import {
  DOCUMENT_TYPE_LABELS,
  ALL_DOCUMENT_TYPES,
  type DocumentType,
} from '../../hooks/student/useStudentDocuments';
import {
  CardComponent,
  CardBody,
  Badge,
  Button,
  LoadingState,
  Alert,
  Input,
  Select,
} from '../../components/ui';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: CLODocument['verificationStatus'] }) {
  if (status === 'verified') {
    return (
      <Badge variant="success" size="sm" rounded>
        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Verified</span>
      </Badge>
    );
  }
  if (status === 'rejected') {
    return (
      <Badge variant="error" size="sm" rounded>
        <span className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</span>
      </Badge>
    );
  }
  return (
    <Badge variant="warning" size="sm" rounded>
      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>
    </Badge>
  );
}

// ─── Status change dropdown ───────────────────────────────────────────────────
interface StatusSelectProps {
  current: CLODocument['verificationStatus'];
  onUpdate: (status: string, note?: string) => Promise<void>;
  isRTL: boolean;
}

function StatusSelect({ current, onUpdate, isRTL }: StatusSelectProps) {
  const [open, setOpen]         = useState(false);
  const [note, setNote]         = useState('');
  const [saving, setSaving]     = useState(false);
  const [selected, setSelected] = useState(current);

  useEffect(() => {
    setSelected(current);
  }, [current]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(selected, note || undefined);
      setOpen(false);
      setNote('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-[#003300]/15 hover:border-[#003300]/30 hover:bg-[#003300]/4 transition-colors"
      >
        <StatusBadge status={current} />
        <ChevronDown className="w-3 h-3 text-[#003300]/40 flex-shrink-0" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-30 top-full mt-1.5 w-52 rounded-2xl bg-white border border-[#003300]/15 shadow-xl p-3 space-y-2 ${isRTL ? 'left-0' : 'right-0'}`}
          >
            <p className="text-xs text-[#003300]/40 font-medium px-1">
              {isRTL ? 'تغيير الحالة' : 'Change status'}
            </p>
            {(['pending', 'verified', 'rejected'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSelected(s)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  selected === s
                    ? 'bg-[#003300]/8 border border-[#003300]/15'
                    : 'hover:bg-[#003300]/4'
                }`}
              >
                <StatusBadge status={s} />
                {selected === s && <CheckCircle className="w-3 h-3 text-[#003300]/40 ml-auto" />}
              </button>
            ))}
            {selected === 'rejected' && (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={isRTL ? 'ملاحظة الرفض (اختياري)' : 'Rejection note (optional)'}
                rows={2}
                className="w-full bg-[#003300]/4 border border-[#003300]/15 rounded-xl px-3 py-2 text-xs text-[#003300] placeholder:text-[#003300]/30 resize-none focus:outline-none focus:border-[#003300]/40 transition-colors"
              />
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setOpen(false); setSelected(current); setNote(''); }}
                className="flex-1 py-1.5 rounded-xl text-xs text-[#003300]/50 hover:bg-[#003300]/5 transition-colors border border-[#003300]/10"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || selected === current}
                className="flex-1 py-1.5 rounded-xl text-xs font-semibold bg-[#003300] text-[#ffffcc] hover:bg-[#004400] disabled:opacity-40 transition-colors"
              >
                {saving
                  ? <RefreshCw className="w-3 h-3 animate-spin mx-auto" />
                  : (isRTL ? 'حفظ' : 'Save')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Document row ─────────────────────────────────────────────────────────────
interface DocumentRowProps {
  doc: CLODocument;
  onUpdateStatus: (docId: string, status: string, note?: string) => Promise<void>;
  onDownload: (docId: string, originalName: string) => Promise<void>;
  isRTL: boolean;
}

function DocumentRow({ doc, onUpdateStatus, onDownload, isRTL }: DocumentRowProps) {
  const [downloading, setDownloading] = useState(false);
  const labels = DOCUMENT_TYPE_LABELS[doc.documentType as DocumentType];

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await onDownload(doc._id, doc.originalName);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border border-[#003300]/10 bg-[#003300]/3 hover:bg-[#003300]/6 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}>
      {/* Thumbnail */}
      <div className="flex-shrink-0">
        {doc.mimeType?.startsWith('image/') ? (
          <img
            src={doc.fileUrl}
            alt={labels?.en}
            className="w-10 h-10 rounded-lg object-cover border border-[#003300]/15"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-[#003300]/8 flex items-center justify-center">
            <FileText className="w-5 h-5 text-[#003300]/40" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
        <p className="text-sm font-semibold text-[#003300] leading-tight">
          {labels?.ar}
          <span className="text-[#003300]/40 text-xs font-normal"> — {labels?.en}</span>
        </p>
        <p className="text-xs text-[#003300]/40 truncate mt-0.5">
          {doc.originalName} · {formatBytes(doc.fileSize)}
        </p>
        {doc.verificationNote && (
          <p className="text-xs text-red-600 mt-0.5 truncate">
            {isRTL ? 'ملاحظة: ' : 'Note: '}{doc.verificationNote}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className={`flex items-center gap-2 flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="p-2 rounded-lg border border-[#003300]/15 hover:bg-[#003300]/8 transition-colors text-[#003300]/60 disabled:opacity-50"
          title={isRTL ? 'تحميل' : 'Download'}
        >
          {downloading
            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            : <Download className="w-3.5 h-3.5" />}
        </button>
        <StatusSelect
          current={doc.verificationStatus}
          onUpdate={(status, note) => onUpdateStatus(doc._id, status, note)}
          isRTL={isRTL}
        />
      </div>
    </div>
  );
}

// ─── Student expandable card ──────────────────────────────────────────────────
interface StudentCardProps {
  summary: StudentSummary;
  isRTL: boolean;
  onFetchStudentDocs: (studentId: string) => Promise<CLODocument[]>;
  onUpdateStatus: (docId: string, status: string, note?: string) => Promise<void>;
  onDownload: (docId: string, name: string) => Promise<void>;
}

function StudentCard({ summary, isRTL, onFetchStudentDocs, onUpdateStatus, onDownload }: StudentCardProps) {
  const [expanded, setExpanded]       = useState(false);
  const [docs, setDocs]               = useState<CLODocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const handleExpand = async () => {
    if (!expanded && docs.length === 0) {
      setLoadingDocs(true);
      try {
        const fetched = await onFetchStudentDocs(summary._id);
        setDocs(fetched);
      } finally {
        setLoadingDocs(false);
      }
    }
    setExpanded((v) => !v);
  };

  const handleUpdateStatus = async (docId: string, status: string, note?: string) => {
    await onUpdateStatus(docId, status, note);
    const refreshed = await onFetchStudentDocs(summary._id);
    setDocs(refreshed);
  };

  const completionPct = Math.round((summary.total / 5) * 100);

  return (
    <CardComponent variant="glass" animated={false} className="overflow-hidden">
      {/* Header row */}
      <button
        onClick={handleExpand}
        className={`w-full flex items-center gap-4 p-4 hover:bg-[#003300]/3 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm text-white"
          style={{ background: 'linear-gradient(135deg, #003300 0%, #004d00 100%)' }}
        >
          {summary.student.name.charAt(0).toUpperCase()}
        </div>

        {/* Name + progress */}
        <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
          <p className="font-semibold text-[#003300] text-sm truncate">{summary.student.name}</p>
          <div className={`flex items-center gap-2 mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="flex-1 h-1.5 rounded-full bg-[#003300]/10 overflow-hidden max-w-[80px]">
              <div
                className="h-full rounded-full bg-[#003300] transition-all"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <span className="text-xs text-[#003300]/40">{summary.total}/5</span>
          </div>
        </div>

        {/* Status pills */}
        <div className={`flex items-center gap-2 flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {summary.pending > 0 && (
            <Badge variant="warning" size="sm" rounded>
              {summary.pending} {isRTL ? 'معلق' : 'pending'}
            </Badge>
          )}
          {summary.verified > 0 && (
            <Badge variant="success" size="sm" rounded>
              {summary.verified} {isRTL ? 'تم' : 'verified'}
            </Badge>
          )}
          {summary.rejected > 0 && (
            <Badge variant="error" size="sm" rounded>
              {summary.rejected} {isRTL ? 'مرفوض' : 'rejected'}
            </Badge>
          )}
          {expanded
            ? <ChevronUp className="w-4 h-4 text-[#003300]/30" />
            : <ChevronDown className="w-4 h-4 text-[#003300]/30" />}
        </div>
      </button>

      {/* Expanded docs */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-3 border-t border-[#003300]/10 space-y-2">
              {loadingDocs ? (
                <div className="text-center py-6 text-[#003300]/40 text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 opacity-50" />
                  {isRTL ? 'جارٍ التحميل…' : 'Loading documents…'}
                </div>
              ) : docs.length === 0 ? (
                <div className="text-center py-6 text-[#003300]/40 text-sm">
                  {isRTL ? 'لا توجد وثائق بعد' : 'No documents uploaded yet'}
                </div>
              ) : (
                <>
                  {docs.map((doc) => (
                    <DocumentRow
                      key={doc._id}
                      doc={doc}
                      onUpdateStatus={handleUpdateStatus}
                      onDownload={onDownload}
                      isRTL={isRTL}
                    />
                  ))}
                  {/* Empty slots */}
                  {ALL_DOCUMENT_TYPES.filter(
                    (type) => !docs.find((d) => d.documentType === type)
                  ).map((type) => (
                    <div
                      key={type}
                      className={`flex items-center gap-3 p-3 rounded-xl border border-dashed border-[#003300]/15 ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <div className="w-10 h-10 rounded-lg border border-dashed border-[#003300]/15 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-[#003300]/20" />
                      </div>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <p className="text-sm text-[#003300]/30">{DOCUMENT_TYPE_LABELS[type].ar}</p>
                        <p className="text-xs text-[#003300]/20">{DOCUMENT_TYPE_LABELS[type].en} — {isRTL ? 'لم يُرفع' : 'Not uploaded'}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </CardComponent>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CLOStudentDocuments() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const {
    documents,
    studentsSummary,
    loading,
    error,
    pagination,
    statusFilter,
    typeFilter,
    setStatusFilter,
    setTypeFilter,
    fetchDocuments,
    fetchStudentDocuments,
    updateStatus,
    getDownloadUrl,
  } = useCLODocuments();

  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [activeTab, setActiveTab]         = useState<'by-student' | 'all-docs'>('by-student');
  const [searchQuery, setSearchQuery]     = useState('');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const handleDownload = useCallback(async (docId: string, originalName: string) => {
    setDownloadError(null);
    try {
      const url = await getDownloadUrl(docId);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      setDownloadError(isRTL ? 'فشل إنشاء رابط التحميل' : 'Failed to generate download link');
    }
  }, [getDownloadUrl, isRTL]);

  const handleUpdateStatus = useCallback(
    async (docId: string, status: string, note?: string) => {
      await updateStatus(docId, status, note);
    },
    [updateStatus]
  );

  const totalPending  = studentsSummary.reduce((acc, s) => acc + s.pending, 0);
  const totalVerified = studentsSummary.reduce((acc, s) => acc + s.verified, 0);
  const totalStudents = studentsSummary.length;

  const filteredStudents = studentsSummary.filter((s) =>
    s.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={isRTL ? 'text-right' : ''}>
            <h1
              className="text-4xl font-bold mb-2"
              style={{
                background: 'linear-gradient(135deg, #003300 0%, #004d00 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {isRTL ? 'وثائق WRO' : 'WRO Documents'}
            </h1>
            <p style={{ color: '#003300CC' }}>
              {isRTL
                ? 'مراجعة وثائق الطلاب الحكومية للمشاركة في البطولة'
                : 'Review and verify student government documents for WRO competition'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={() => fetchDocuments()}
          >
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : ''}>
                <p className="text-sm text-[#003300]/60 mb-1">{isRTL ? 'الطلاب المشاركون' : 'Students with docs'}</p>
                <p className="text-2xl font-bold text-[#003300]">{totalStudents}</p>
              </div>
              <User className="w-8 h-8 text-primary" />
            </div>
          </CardBody>
        </CardComponent>

        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : ''}>
                <p className="text-sm text-[#003300]/60 mb-1">{isRTL ? 'قيد المراجعة' : 'Pending review'}</p>
                <p className="text-2xl font-bold text-[#003300]">{totalPending}</p>
              </div>
              <Clock className="w-8 h-8 text-accent" />
            </div>
          </CardBody>
        </CardComponent>

        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : ''}>
                <p className="text-sm text-[#003300]/60 mb-1">{isRTL ? 'تم التحقق' : 'Verified'}</p>
                <p className="text-2xl font-bold text-[#003300]">{totalVerified}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </CardBody>
        </CardComponent>
      </motion.div>

      {/* Error */}
      {(error || downloadError) && (
        <motion.div variants={itemVariants}>
          <Alert variant="error">
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-sm">{downloadError || error}</span>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={() => { setDownloadError(null); fetchDocuments(); }}
              >
                {isRTL ? 'إعادة المحاولة' : 'Retry'}
              </Button>
            </div>
          </Alert>
        </motion.div>
      )}

      {/* Tabs */}
      <motion.div variants={itemVariants} className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {([
          { key: 'by-student' as const, labelAr: 'حسب الطالب',   labelEn: 'By Student',      icon: User },
          { key: 'all-docs'   as const, labelAr: 'جميع الوثائق', labelEn: 'All Documents',   icon: FileCheck },
        ]).map(({ key, labelAr, labelEn, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${isRTL ? 'flex-row-reverse' : ''} ${
              activeTab === key
                ? 'bg-[#003300] text-[#ffffcc] shadow-sm'
                : 'bg-[#003300]/8 text-[#003300]/70 hover:bg-[#003300]/15 hover:text-[#003300]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {isRTL ? labelAr : labelEn}
          </button>
        ))}
      </motion.div>

      {/* Tab: By Student */}
      {activeTab === 'by-student' && (
        <motion.div variants={itemVariants} className="space-y-4">
          {/* Search */}
          <Input
            placeholder={isRTL ? 'بحث عن طالب…' : 'Search students…'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />

          {loading ? (
            <LoadingState type="skeleton" text={isRTL ? 'جارٍ التحميل…' : 'Loading students…'} />
          ) : filteredStudents.length === 0 ? (
            <CardComponent variant="glass">
              <CardBody>
                <div className="text-center py-12">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-[#003300]/20" />
                  <p className="text-[#003300]/60 text-lg mb-2">
                    {isRTL ? 'لا يوجد طلاب' : 'No students found'}
                  </p>
                  <p className="text-[#003300]/40 text-sm">
                    {searchQuery
                      ? (isRTL ? 'جرّب تعديل كلمة البحث' : 'Try adjusting your search')
                      : (isRTL ? 'لم يرفع أي طالب وثائق بعد' : 'No students have uploaded documents yet')}
                  </p>
                </div>
              </CardBody>
            </CardComponent>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map((summary) => (
                <StudentCard
                  key={summary._id}
                  summary={summary}
                  isRTL={isRTL}
                  onFetchStudentDocs={fetchStudentDocuments}
                  onUpdateStatus={handleUpdateStatus}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Tab: All Documents */}
      {activeTab === 'all-docs' && (
        <motion.div variants={itemVariants} className="space-y-4">
          {/* Filters */}
          <div className={`flex gap-3 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder={isRTL ? 'بحث عن وثيقة…' : 'Search documents…'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
              options={[
                { value: '', label: isRTL ? 'جميع الحالات' : 'All statuses' },
                { value: 'pending',  label: isRTL ? 'قيد المراجعة' : 'Pending' },
                { value: 'verified', label: isRTL ? 'تم التحقق' : 'Verified' },
                { value: 'rejected', label: isRTL ? 'مرفوض' : 'Rejected' },
              ]}
              leftIcon={<Filter className="w-4 h-4" />}
            />
            <Select
              value={typeFilter}
              onChange={(v) => setTypeFilter(v)}
              options={[
                { value: '', label: isRTL ? 'جميع الأنواع' : 'All types' },
                ...ALL_DOCUMENT_TYPES.map((type) => ({
                  value: type,
                  label: `${DOCUMENT_TYPE_LABELS[type].ar} — ${DOCUMENT_TYPE_LABELS[type].en}`,
                })),
              ]}
            />
            <span className="text-sm text-[#003300]/40 self-center">
              {pagination.total} {isRTL ? 'وثيقة' : 'documents'}
            </span>
          </div>

          {loading ? (
            <LoadingState type="skeleton" text={isRTL ? 'جارٍ التحميل…' : 'Loading documents…'} />
          ) : documents.length === 0 ? (
            <CardComponent variant="glass">
              <CardBody>
                <div className="text-center py-12">
                  <FileCheck className="w-16 h-16 mx-auto mb-4 text-[#003300]/20" />
                  <p className="text-[#003300]/60 text-lg mb-2">{isRTL ? 'لا توجد وثائق' : 'No documents found'}</p>
                  <p className="text-[#003300]/40 text-sm">{isRTL ? 'جرّب تعديل الفلاتر' : 'Try adjusting the filters'}</p>
                </div>
              </CardBody>
            </CardComponent>
          ) : (
            <CardComponent variant="glass" animated={false}>
              <CardBody>
                <div className="space-y-2">
                  {documents.map((doc, i) => (
                    <motion.div
                      key={doc._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`flex items-center gap-4 p-4 rounded-xl border border-[#003300]/10 hover:bg-[#003300]/3 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      {/* Thumbnail */}
                      <div className="flex-shrink-0">
                        {doc.mimeType?.startsWith('image/') ? (
                          <img
                            src={doc.fileUrl}
                            alt=""
                            className="w-12 h-12 rounded-xl object-cover border border-[#003300]/10"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-[#003300]/8 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-[#003300]/40" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <p className="font-semibold text-[#003300] text-sm">
                            {DOCUMENT_TYPE_LABELS[doc.documentType as DocumentType]?.ar}
                          </p>
                          <StatusBadge status={doc.verificationStatus} />
                        </div>
                        <p className="text-xs text-[#003300]/50 mt-0.5 truncate">
                          {doc.studentId?.name} · {doc.originalName} · {formatBytes(doc.fileSize)}
                        </p>
                        {doc.verificationNote && (
                          <p className="text-xs text-red-600 mt-0.5 truncate">
                            {isRTL ? 'ملاحظة: ' : 'Note: '}{doc.verificationNote}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className={`flex items-center gap-2 flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <button
                          onClick={() => handleDownload(doc._id, doc.originalName)}
                          className="p-2 rounded-lg border border-[#003300]/15 hover:bg-[#003300]/8 transition-colors text-[#003300]/60"
                          title={isRTL ? 'تحميل' : 'Download'}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <StatusSelect
                          current={doc.verificationStatus}
                          onUpdate={(status, note) => handleUpdateStatus(doc._id, status, note)}
                          isRTL={isRTL}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className={`flex items-center gap-2 justify-center pt-4 border-t border-[#003300]/10 mt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => fetchDocuments(p)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                          p === pagination.page
                            ? 'bg-[#003300] text-[#ffffcc]'
                            : 'bg-[#003300]/8 text-[#003300]/60 hover:bg-[#003300]/15'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </CardBody>
            </CardComponent>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
