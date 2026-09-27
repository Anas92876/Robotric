/**
 * CertificateVerify — /verify/:certNumber
 * Public page — no login required.
 * Anyone with a cert ID (or QR scan) lands here to verify authenticity.
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, CheckCircle, XCircle, Calendar, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { CertificateA4 } from '../../components/certificate/CertificateRenderer';
import { LandingHeader } from '../../components/layout/LandingHeader';
import { Footer } from '../../components/layout/Footer';

const GREEN = '#003300';
const GOLD  = '#b8960c';

interface VerifyResult {
  valid: boolean;
  certificate?: {
    certificateNumber: string;
    studentName:   string;
    courseName:    string;
    courseLevel?:  string;
    trainingHours: number;
    gender:        'male' | 'female';
    issuedAt:      string;
    issuedBy:      string;
  };
  message?: string;
}

export default function CertificateVerify() {
  const { certNumber } = useParams<{ certNumber: string }>();
  const [result, setResult]   = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verify = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/certificates/verify/${certNumber?.toUpperCase()}`);
        setResult(res.data);
      } catch (err: any) {
        const data = err.response?.data;
        setResult({ valid: false, message: data?.message || 'Certificate not found' });
      } finally {
        setLoading(false);
      }
    };
    if (certNumber) verify();
  }, [certNumber]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', display: 'flex', flexDirection: 'column' }}>
      <LandingHeader />

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
        {loading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center' }}>
            <RefreshCw style={{ width: '32px', height: '32px', color: GREEN, margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: `${GREEN}80`, fontFamily: 'sans-serif', fontSize: '14px' }}>Verifying certificate…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </motion.div>
        ) : result?.valid && result.certificate ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ width: '100%', maxWidth: '860px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}
          >
            {/* Verified badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: '40px', padding: '10px 20px',
            }}>
              <CheckCircle style={{ width: '20px', height: '20px', color: '#16a34a' }} />
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#15803d', fontFamily: 'sans-serif' }}>
                Certificate Verified ✓
              </span>
            </div>

            {/* Certificate preview — scaled to fit screen */}
            <div style={{
              width: '100%',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 8px 48px rgba(0,51,0,0.18)',
              position: 'relative',
            }}>
              <div style={{
                width: '1123px',
                height: '794px',
                transform: `scale(${Math.min(1, (Math.min(window.innerWidth - 32, 860)) / 1123)})`,
                transformOrigin: 'top left',
              }}>
                <CertificateA4 cert={{
                  certificateNumber: result.certificate.certificateNumber,
                  studentName:   result.certificate.studentName,
                  courseName:    result.certificate.courseName,
                  courseLevel:   result.certificate.courseLevel,
                  trainingHours: result.certificate.trainingHours || 0,
                  gender:        result.certificate.gender || 'male',
                  issuedAt:      result.certificate.issuedAt,
                }} />
              </div>
            </div>

            {/* Meta strip */}
            <div style={{
              display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center',
              background: 'white', borderRadius: '14px', padding: '14px 24px',
              boxShadow: '0 2px 12px rgba(0,51,0,0.07)', width: '100%',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar style={{ width: '14px', height: '14px', color: `${GREEN}60`, flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontFamily: 'sans-serif', color: `${GREEN}80` }}>
                  Issued: <strong style={{ color: GREEN }}>{formatDate(result.certificate.issuedAt)}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award style={{ width: '14px', height: '14px', color: GOLD, flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontFamily: 'sans-serif', color: `${GREEN}80` }}>
                  ID: <strong style={{ color: GREEN, fontFamily: 'monospace' }}>{result.certificate.certificateNumber}</strong>
                </span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'white', borderRadius: '20px', overflow: 'hidden',
              maxWidth: '440px', width: '100%', textAlign: 'center',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ padding: '48px 32px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: '#fef2f2', margin: '0 auto 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <XCircle style={{ width: '28px', height: '28px', color: '#dc2626' }} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: GREEN, fontFamily: 'sans-serif', margin: '0 0 8px' }}>
                Certificate Not Found
              </h2>
              <p style={{ fontSize: '13px', color: `${GREEN}70`, fontFamily: 'sans-serif', lineHeight: 1.6, margin: '0 0 24px' }}>
                The certificate ID <strong style={{ fontFamily: 'monospace' }}>{certNumber}</strong> could not be verified.
                It may be invalid or does not exist in our system.
              </p>
              <Link
                to="/"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: GREEN, color: '#cccc99', padding: '10px 20px',
                  borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                  textDecoration: 'none', fontFamily: 'sans-serif',
                }}
              >
                Back to Home
              </Link>
            </div>
          </motion.div>
        )}
      </div>
      <Footer />
    </div>
  );
}
