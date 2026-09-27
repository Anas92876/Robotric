/**
 * StudentCertificates — /student/certificates
 *
 * Lists all certificates earned by the student.
 * Each card has:
 *   - Visual preview of the cert
 *   - Download PDF  (A4 landscape, print-ready)
 *   - Download Image (1080×1080 Instagram square)
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Award, Download, FileText, ImageIcon, AlertCircle, RefreshCw, ExternalLink,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useTranslation } from 'react-i18next';
import { CertificateA4, CertificateSquare, type CertData } from '../../components/certificate/CertificateRenderer';
import { useCertificateDownload } from '../../hooks/useCertificateDownload';

const TEXT_PRIMARY   = '#003300';
const TEXT_SECONDARY = '#003300CC';
const TEXT_TERTIARY  = '#00330080';

interface CertRecord {
  _id: string;
  certificateNumber: string;
  issuedAt: string;
  studentName: string;
  courseName: string;
  courseLevel?: string;
  trainingHours?: number;
  gender?: 'male' | 'female';
}

// ─── Single certificate card ──────────────────────────────────────────────────
function CertCard({ cert }: { cert: CertRecord }) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const a4Ref     = useRef<HTMLDivElement>(null);
  const squareRef = useRef<HTMLDivElement>(null);
  const { downloadPDF, downloadImage, generating } = useCertificateDownload();

  const certData: CertData = {
    certificateNumber: cert.certificateNumber,
    studentName:   cert.studentName,
    courseName:    cert.courseName,
    courseLevel:   cert.courseLevel,
    trainingHours: cert.trainingHours,
    gender:        cert.gender,
    issuedAt:      cert.issuedAt,
  };

  const safeName = cert.studentName.replace(/\s+/g, '-');
  const pdfName  = `Robotrick-Certificate-${safeName}`;
  const imgName  = `Robotrick-Certificate-${safeName}-Instagram`;

  const issuedDate = new Date(cert.issuedAt).toLocaleDateString(
    isRTL ? 'ar-SA' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-[#003300]/10 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Gold top accent */}
      <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400" />

      {/* Preview thumbnail — scaled down A4, fills full card width */}
      <div className="relative overflow-hidden bg-[#faf8f0] border-b border-[#003300]/6" style={{ height: '180px' }}>
        {/*
          A4 cert is 1123×794. We want to fill the card width (~340px at lg).
          Scale = container_width / 1123. We use transform-origin top left and
          let CSS clamp the height via the container overflow:hidden.
          Use width:100% on the outer div so scale is relative to card width.
        */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <div
            style={{
              transform: 'scale(0.302)',
              transformOrigin: 'top left',
              width: '1123px',
              height: '794px',
              pointerEvents: 'none',
              flexShrink: 0,
            }}
          >
            <CertificateA4 cert={certData} />
          </div>
        </div>
        {/* Overlay gradient for clean fade at bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#faf8f0]/70 pointer-events-none" />
        {/* Cert ID badge */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 border border-[#003300]/10">
          <p className="text-[10px] font-mono font-bold text-[#003300]/60">{cert.certificateNumber}</p>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-base leading-tight mb-0.5" style={{ color: TEXT_PRIMARY }}>
          {cert.courseName}
        </h3>
        {cert.courseLevel && (
          <p className="text-xs font-semibold text-amber-600 mb-1">{cert.courseLevel}</p>
        )}
        <p className="text-xs mb-4" style={{ color: TEXT_TERTIARY }}>
          Issued {issuedDate}
        </p>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            onClick={() => downloadPDF(a4Ref, pdfName)}
            disabled={!!generating}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#003300]/15 text-xs font-semibold hover:bg-[#003300]/4 transition-colors disabled:opacity-50"
            style={{ color: TEXT_PRIMARY }}
          >
            {generating === 'pdf' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            {generating === 'pdf' ? 'Generating…' : 'Download PDF'}
          </button>

          <button
            onClick={() => downloadImage(squareRef, imgName)}
            disabled={!!generating}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-xs font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50 text-amber-800"
          >
            {generating === 'image' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5" />
            )}
            {generating === 'image' ? 'Generating…' : 'Instagram Share'}
          </button>
        </div>

        {/* Verify link */}
        <a
          href={`/verify/${cert.certificateNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full text-xs py-1.5 rounded-lg hover:bg-[#003300]/4 transition-colors"
          style={{ color: TEXT_TERTIARY }}
        >
          <ExternalLink className="w-3 h-3" />
          Verify certificate
        </a>
      </div>

      {/* Hidden renderers — must be in viewport for html2canvas to layout correctly */}
      <div style={{ position: 'fixed', top: 0, left: 0, opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
        <CertificateA4 ref={a4Ref} cert={certData} />
        <CertificateSquare ref={squareRef} cert={certData} />
      </div>
    </motion.div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {[1,2].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-[#003300]/8 overflow-hidden">
          <div className="h-1 bg-amber-200" />
          <div className="h-44 bg-[#003300]/5" />
          <div className="p-4 space-y-2">
            <div className="h-4 bg-[#003300]/10 rounded w-3/4" />
            <div className="h-3 bg-[#003300]/6 rounded w-1/2" />
            <div className="h-8 bg-[#003300]/6 rounded mt-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function StudentCertificates() {
  const { t, i18n } = useTranslation(['dashboardStudent', 'dashboardCommon']);
  const isRTL = i18n.language === 'ar';

  const [certs, setCerts]     = useState<CertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchCerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/student/certificates');
      setCerts(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCerts(); }, []);

  return (
    <div className="space-y-4 sm:space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(184,150,12,0.12)' }}>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: TEXT_PRIMARY }}>
            {isRTL ? 'شهاداتي' : 'My Certificates'}
          </h1>
        </div>
        <p className="text-sm" style={{ color: TEXT_TERTIARY }}>
          {isRTL
            ? 'شهادات إتمام الدورات التي حصلت عليها'
            : 'Your earned course completion certificates'}
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <Skeleton />
      ) : error ? (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={fetchCerts} className="flex items-center gap-1 text-xs font-semibold hover:underline">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      ) : certs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#003300]/8">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(184,150,12,0.1)' }}>
            <Award className="w-8 h-8 text-amber-400" />
          </div>
          <p className="font-semibold text-base mb-1" style={{ color: TEXT_PRIMARY }}>
            {isRTL ? 'لا توجد شهادات بعد' : 'No certificates yet'}
          </p>
          <p className="text-sm" style={{ color: TEXT_TERTIARY }}>
            {isRTL
              ? 'أكمل دوراتك للحصول على شهادات'
              : 'Complete your courses to earn certificates'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {certs.map(cert => (
            <CertCard key={cert._id} cert={cert} />
          ))}
        </div>
      )}
    </div>
  );
}
