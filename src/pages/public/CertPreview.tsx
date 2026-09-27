/**
 * DEV-ONLY preview page — /cert-preview
 * Just renders the certificate visually. No downloads, no jspdf.
 */

import { CertificateA4, CertificateSquare, type CertData } from '../../components/certificate/CertificateRenderer';

const SAMPLE: CertData = {
  certificateNumber: 'CERT-2026-000001',
  studentName: 'Mohammed Al-Ahmad',
  courseName: 'Introduction to Robotics',
  courseLevel: 'Beginner',
  trainingHours: 36,
  gender: 'male',
  issuedAt: new Date().toISOString(),
};

export default function CertPreview() {
  return (
    <div style={{ background: '#1a1a1a', minHeight: '100vh', padding: '40px 24px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        <h1 style={{ color: '#fff', fontSize: '20px', marginBottom: '8px' }}>Certificate Preview</h1>
        <p style={{ color: '#888', fontSize: '13px', marginBottom: '32px' }}>A4 Landscape (PDF layout)</p>

        {/* A4 — scales to fit screen width */}
        <div style={{
          width: '100%',
          position: 'relative',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          marginBottom: '48px',
        }}>
          <div style={{
            width: '1123px',
            height: '794px',
            transform: `scale(${Math.min(1, (window.innerWidth - 48) / 1123)})`,
            transformOrigin: 'top left',
          }}>
            <CertificateA4 cert={SAMPLE} />
          </div>
        </div>

        <p style={{ color: '#888', fontSize: '13px', marginBottom: '16px' }}>Instagram Square (1080×1080)</p>

        {/* Square — max 600px wide */}
        <div style={{
          width: '600px',
          position: 'relative',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        }}>
          <div style={{
            width: '1080px',
            height: '1080px',
            transform: 'scale(0.555)',
            transformOrigin: 'top left',
          }}>
            <CertificateSquare cert={SAMPLE} />
          </div>
        </div>

      </div>
    </div>
  );
}
