import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FileCheck,
  Upload,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  RefreshCw,
  Eye,
  Lock,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useStudentDocuments,
  type DocumentType,
  ALL_DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  type StudentDocument,
} from '../../hooks/student/useStudentDocuments';

const TEXT_PRIMARY   = '#0f1f33';
const TEXT_SECONDARY = '#0f1f33CC';
const TEXT_TERTIARY  = '#0f1f3380';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, isRTL }: { status: StudentDocument['verificationStatus']; isRTL: boolean }) {
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        <CheckCircle className="w-3 h-3" />
        {isRTL ? 'تم التحقق' : 'Verified'}
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        <XCircle className="w-3 h-3" />
        {isRTL ? 'مرفوض' : 'Rejected'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
      <Clock className="w-3 h-3" />
      {isRTL ? 'قيد المراجعة' : 'Pending'}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {ALL_DOCUMENT_TYPES.map((type) => (
        <div key={type} className="bg-white rounded-2xl border border-ink/8 overflow-hidden">
          <div className="h-1 bg-amber-200" />
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-ink/8 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-ink/10 rounded w-3/4" />
                <div className="h-3 bg-ink/6 rounded w-1/2" />
              </div>
            </div>
            <div className="h-1 bg-ink/6 rounded" />
            <div className="h-28 bg-ink/5 rounded-xl" />
            <div className="h-9 bg-ink/8 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Single document card ─────────────────────────────────────────────────────
interface DocumentCardProps {
  type: DocumentType;
  doc: StudentDocument | null;
  uploading: boolean;
  uploadProgress: number;
  isRTL: boolean;
  onUpload: (file: File, type: DocumentType) => void;
  onDelete: (docId: string, type: DocumentType) => void;
}

function DocumentCard({ type, doc, uploading, uploadProgress, isRTL, onUpload, onDelete }: DocumentCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const labels = DOCUMENT_TYPE_LABELS[type];
  const isImage = doc?.mimeType?.startsWith('image/');

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onUpload(files[0], type);
  };

  const accentClass = !doc
    ? 'bg-gray-200'
    : doc.verificationStatus === 'verified'
    ? 'bg-green-500'
    : doc.verificationStatus === 'rejected'
    ? 'bg-red-500'
    : 'bg-amber-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-ink/10 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Status-colored top accent */}
      <div className={`h-1 ${accentClass}`} />

      <div className="p-4">
        {/* Header */}
        <div className={`flex items-center justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: doc ? 'rgba(184,150,12,0.12)' : 'rgba(15, 31, 51,0.06)' }}>
              <FileText className="w-5 h-5" style={{ color: doc ? '#B8960C' : TEXT_TERTIARY }} />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="font-bold text-sm leading-tight" style={{ color: TEXT_PRIMARY }}>{labels.ar}</p>
              <p className="text-xs mt-0.5" style={{ color: TEXT_TERTIARY }}>{labels.en}</p>
            </div>
          </div>
          {doc ? (
            <StatusBadge status={doc.verificationStatus} isRTL={isRTL} />
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
              {isRTL ? 'لم يُرفع' : 'Not uploaded'}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="h-px mb-3" style={{ backgroundColor: 'rgba(15, 31, 51,0.06)' }} />

        {/* Content area */}
        {doc ? (
          <div className="space-y-3">
            {/* Preview */}
            <div className="rounded-xl overflow-hidden border border-ink/6 bg-[#faf8f0] flex items-center justify-center" style={{ minHeight: 110 }}>
              {isImage ? (
                <img
                  src={doc.fileUrl}
                  alt={labels.en}
                  className="max-h-36 object-contain w-full"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 py-5 text-gray-400">
                  <FileText className="w-9 h-9" />
                  <span className="text-xs text-center px-3 leading-relaxed">{doc.originalName}</span>
                </div>
              )}
            </div>

            {/* File info */}
            <div className={`flex items-center justify-between text-xs ${isRTL ? 'flex-row-reverse' : ''}`}
              style={{ color: TEXT_TERTIARY }}>
              <span className="truncate max-w-[60%]">{doc.originalName}</span>
              <span>{formatBytes(doc.fileSize)}</span>
            </div>

            {/* Rejection note */}
            {doc.verificationStatus === 'rejected' && doc.verificationNote && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">
                <span className="font-semibold">{isRTL ? 'ملاحظة: ' : 'Note: '}</span>
                {doc.verificationNote}
              </div>
            )}

            {/* Verified by */}
            {doc.verificationStatus === 'verified' && doc.verifiedBy && (
              <p className="text-xs text-green-600">
                {isRTL ? `تحقق بواسطة ${doc.verifiedBy.name}` : `Verified by ${doc.verifiedBy.name}`}
              </p>
            )}

            {/* Actions */}
            <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border border-ink/15 hover:bg-ink/4 transition-colors"
                style={{ color: TEXT_PRIMARY }}
              >
                <Eye className="w-3.5 h-3.5" />
                {isRTL ? 'عرض' : 'View'}
              </a>
              {doc.verificationStatus !== 'verified' && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                  style={{ backgroundColor: TEXT_PRIMARY, color: '#fff' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#081424'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = TEXT_PRIMARY; }}
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isRTL ? 'استبدال' : 'Replace'}
                </button>
              )}
              {doc.verificationStatus === 'pending' && (
                <button
                  onClick={() => onDelete(doc._id, type)}
                  className="flex items-center justify-center p-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                  title={isRTL ? 'حذف' : 'Delete'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          // Drop zone
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors py-7 ${
              dragging
                ? 'border-ink bg-green-50'
                : 'border-ink/15 hover:border-ink/40 hover:bg-ink/3'
            }`}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(15, 31, 51,0.06)' }}>
              <Upload className="w-5 h-5" style={{ color: TEXT_TERTIARY }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: TEXT_SECONDARY }}>
                {isRTL ? 'انقر أو اسحب للرفع' : 'Click or drag to upload'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: TEXT_TERTIARY }}>
                JPG, PNG, WebP, PDF — max 10 MB
              </p>
            </div>
          </div>
        )}

        {/* Upload progress */}
        {uploading && (
          <div className="mt-3 space-y-1.5">
            <div className={`flex justify-between text-xs ${isRTL ? 'flex-row-reverse' : ''}`}
              style={{ color: TEXT_SECONDARY }}>
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 animate-spin" />
                {uploadProgress >= 100
                  ? (isRTL ? 'جارٍ المعالجة…' : 'Processing…')
                  : (isRTL ? 'جارٍ الرفع…' : 'Uploading…')}
              </span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(15, 31, 51,0.08)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: uploadProgress >= 100 ? '#ca8a04' : TEXT_PRIMARY }}
                initial={{ width: 0 }}
                animate={{ width: uploadProgress >= 100 ? '100%' : `${uploadProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function StudentDocuments() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const {
    documents,
    wroRequired,
    loading,
    uploading,
    uploadProgress,
    error,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
    getDocumentByType,
  } = useStudentDocuments();

  const [localError, setLocalError]     = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  const handleUpload = async (file: File, type: DocumentType) => {
    setLocalError(null);
    setLocalSuccess(null);
    try {
      await uploadDocument(file, type);
      setLocalSuccess(isRTL ? 'تم رفع الوثيقة بنجاح' : 'Document uploaded successfully');
      setTimeout(() => setLocalSuccess(null), 3000);
    } catch (err: any) {
      setLocalError(err.message);
    }
  };

  const handleDelete = async (docId: string, type: DocumentType) => {
    setLocalError(null);
    try {
      await deleteDocument(docId, type);
    } catch (err: any) {
      setLocalError(err.message);
    }
  };

  const uploadedCount = documents.length;
  const verifiedCount = documents.filter((d) => d.verificationStatus === 'verified').length;
  const pendingCount  = documents.filter((d) => d.verificationStatus === 'pending').length;

  return (
    <div className="space-y-4 sm:space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Header */}
      <div>
        <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(184,150,12,0.12)' }}>
            <FileCheck className="w-4 h-4 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: TEXT_PRIMARY }}>
            {isRTL ? 'وثائق WRO' : 'WRO Documents'}
          </h1>
        </div>
        <p className="text-sm" style={{ color: TEXT_TERTIARY }}>
          {isRTL
            ? 'ارفع وثائقك الحكومية الرسمية للمشاركة في بطولة WRO'
            : 'Upload your official government documents to participate in WRO competition'}
        </p>
      </div>

      {/* Not required gate */}
      {!loading && wroRequired === false && (
        <div className="text-center py-20 bg-white rounded-2xl border border-ink/8">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(15, 31, 51,0.06)' }}>
            <Lock className="w-8 h-8" style={{ color: TEXT_TERTIARY }} />
          </div>
          <p className="font-semibold text-base mb-2" style={{ color: TEXT_PRIMARY }}>
            {isRTL ? 'غير مطلوب لدورتك' : 'Not required for your course'}
          </p>
          <p className="text-sm max-w-xs mx-auto" style={{ color: TEXT_TERTIARY }}>
            {isRTL
              ? 'تقديم وثائق WRO غير مطلوب حالياً للدورة التي أنت مسجّل فيها.'
              : 'WRO document submission is not currently required for your enrolled course.'}
          </p>
        </div>
      )}

      {/* All content below is only shown when WRO docs are required (or still loading) */}
      {(loading || wroRequired !== false) && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: isRTL ? 'مرفوعة' : 'Uploaded',       value: `${uploadedCount}/5`, color: TEXT_PRIMARY },
              { label: isRTL ? 'تم التحقق' : 'Verified',    value: verifiedCount,         color: '#16a34a' },
              { label: isRTL ? 'قيد المراجعة' : 'Pending',  value: pendingCount,          color: '#ca8a04' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl border border-ink/10 px-4 py-3 text-center shadow-sm">
                <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-xs mt-0.5" style={{ color: TEXT_TERTIARY }}>{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Alerts */}
          {(error || localError) && (
            <div className={`flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="flex-1">{localError || error}</span>
              <button onClick={fetchDocuments} className="flex items-center gap-1 text-xs font-semibold hover:underline flex-shrink-0">
                <RefreshCw className="w-3.5 h-3.5" />
                {isRTL ? 'إعادة المحاولة' : 'Retry'}
              </button>
            </div>
          )}

          {localSuccess && (
            <div className={`flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{localSuccess}</span>
            </div>
          )}

          {/* Cards grid */}
          {loading ? (
            <Skeleton />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ALL_DOCUMENT_TYPES.map((type, i) => (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <DocumentCard
                    type={type}
                    doc={getDocumentByType(type)}
                    uploading={uploading === type}
                    uploadProgress={uploading === type ? uploadProgress : 0}
                    isRTL={isRTL}
                    onUpload={handleUpload}
                    onDelete={handleDelete}
                  />
                </motion.div>
              ))}
            </div>
          )}

          {/* Info note */}
          {!loading && (
            <div className={`flex items-start gap-2 text-xs ${isRTL ? 'flex-row-reverse text-right' : ''}`}
              style={{ color: TEXT_TERTIARY }}>
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <p>
                {isRTL
                  ? 'بعد رفع الوثائق، سيقوم المسؤول بمراجعتها والتحقق منها. يمكنك حذف الوثائق التي لم يتم مراجعتها بعد.'
                  : 'After uploading, the CLO will review and verify your documents. You can delete documents that are still pending review.'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
