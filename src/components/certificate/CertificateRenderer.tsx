/**
 * CertificateRenderer
 *
 * Faithfully replicates the official Robotrick HTML certificate template.
 * Two variants:
 *   CertificateA4     — 1123 × 794 px landscape  (PDF print)
 *   CertificateSquare — 1080 × 1080 px square     (Instagram)
 */

import React from 'react';
import {
  corner_png,
  bottom_corner_png,
  logo_png,
  sig1_nour_png,
  sig2_png,
  stamp_new_png,
} from './certAssets';

const ASSETS: Record<string, string> = {
  'corner.png':        corner_png,
  'bottom-corner.png': bottom_corner_png,
  'logo.png':          logo_png,
  'sig1-nour.png':     sig1_nour_png,
  'sig2.png':          sig2_png,
  'stamp-new.png':     stamp_new_png,
};

const asset = (name: string) => ASSETS[name] ?? `${import.meta.env.BASE_URL}assets/${name}`;

export interface CertData {
  certificateNumber: string;
  studentName: string;
  courseName: string;
  courseLevel?: string;
  trainingHours?: number;
  issuedAt: string;
  gender?: 'male' | 'female';
}

// ── Token colours (exact match to HTML :root vars) ──────────────────────────
const C = {
  green:  '#003300',
  green2: '#0a4a1f',
  beige:  '#cccc99',
  beige2: '#e8e6cf',
  paper:  '#eeecdf',
  gold:   '#b8962e',
  ink:    '#1d2a1d',
};

// ── Google Fonts injected once ───────────────────────────────────────────────
const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Fira+Sans:wght@300;400;500;600&display=swap');
`;

function injectFonts() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('rt-cert-fonts')) return;
  const style = document.createElement('style');
  style.id = 'rt-cert-fonts';
  style.textContent = FONTS;
  document.head.appendChild(style);
}

function formatDate(iso: string) {
  return new Date(iso)
    .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    .toUpperCase();
}

// ── Paper texture overlay (replicates ::before in the HTML) ─────────────────
const PaperTexture: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 0,
      backgroundImage: `
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='0.12'/%3E%3C/svg%3E"),
        repeating-linear-gradient(90deg, rgba(0,51,0,0.012) 0 1px, transparent 1px 60px),
        repeating-linear-gradient(0deg,  rgba(0,51,0,0.012) 0 1px, transparent 1px 60px)
      `,
      backgroundSize: '400px 400px, 60px 60px, 60px 60px',
      mixBlendMode: 'multiply',
    }}
  />
);

// ── Gold divider (matches .divider in HTML) ──────────────────────────────────
const GoldDivider: React.FC<{ width?: string }> = ({ width = '60%' }) => (
  <div
    style={{
      width,
      maxWidth: 500,
      height: 1,
      margin: '16px auto 14px',
      background: `linear-gradient(to right, transparent, ${C.gold} 20%, ${C.gold} 80%, transparent)`,
      opacity: 0.7,
    }}
  />
);

// ── Signature block ──────────────────────────────────────────────────────────
interface SigProps {
  sigSrc: string;
  name: string;
  role: string;
  scale?: number;
}

const Sig: React.FC<SigProps> = ({ sigSrc, name, role, scale = 1 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 * scale }}>
    <img
      src={sigSrc}
      alt={name}
      style={{
        height: 90 * scale,
        width: 260 * scale,
        objectFit: 'contain',
        objectPosition: 'center bottom',
      }}
    />
    <div style={{ width: 260 * scale, height: 2, background: C.gold }} />
    <div style={{
      fontFamily: "'Fira Sans', sans-serif",
      fontWeight: 700,
      fontSize: 13 * scale,
      letterSpacing: '0.12em',
      color: C.green,
      textTransform: 'uppercase',
      textAlign: 'center',
    }}>
      {name}
    </div>
    <div style={{
      fontFamily: "'Fira Sans', sans-serif",
      fontSize: 13 * scale,
      color: '#5a6450',
      letterSpacing: '0.05em',
    }}>
      {role}
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// CertificateA4 — 1123 × 794 px landscape
// ════════════════════════════════════════════════════════════════════════════
export const CertificateA4 = React.forwardRef<HTMLDivElement, { cert: CertData }>(
  ({ cert }, ref) => {
    injectFonts();
    const pronoun = cert.gender === 'female' ? 'she' : 'he';
    const possessive = cert.gender === 'female' ? 'her' : 'his';

    return (
      <div
        ref={ref}
        style={{
          width: 1123,
          height: 794,
          background: C.paper,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 30px 60px -20px rgba(0,0,0,.5), 0 10px 25px -10px rgba(0,0,0,.3)',
        }}
      >
        <PaperTexture />

        {/* ── Corner images ── */}
        <img
          src={asset('corner.png')} alt=""
          style={{ position: 'absolute', top: 0, left: 0, width: 680, pointerEvents: 'none', transform: 'scaleX(-1)', zIndex: 1 }}
        />
        <img
          src={asset('corner.png')} alt=""
          style={{ position: 'absolute', top: 0, right: 0, width: 680, pointerEvents: 'none', zIndex: 1 }}
        />
        <img
          src={asset('bottom-corner.png')} alt=""
          style={{ position: 'absolute', bottom: 0, left: 0, width: 440, pointerEvents: 'none', transform: 'scaleX(-1)', mixBlendMode: 'multiply', zIndex: 3 }}
        />
        <img
          src={asset('bottom-corner.png')} alt=""
          style={{ position: 'absolute', bottom: 0, right: 0, width: 440, pointerEvents: 'none', mixBlendMode: 'multiply', zIndex: 3 }}
        />

        {/* ── Main content ── (exact match to .cert in test.html) */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '30px 100px 55px',
          textAlign: 'center',
          zIndex: 2,
        }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100, marginBottom: 6 }}>
            <img
              src={asset('logo.png')}
              alt="RoboTrick"
              style={{ height: 160, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 1px 2px rgba(0,51,0,.15))' }}
            />
          </div>

          {/* .conta wrapper — full width so text-align:center works on the full cert width */}
          <div style={{ marginTop: 50, width: 923 }}>

            {/* Title block */}
            <div style={{ marginTop: 4 }}>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: 72,
                letterSpacing: '0.16em',
                color: C.green,
                lineHeight: 1,
                textAlign: 'center',
              }}>
                CERTIFICATE
              </div>
              <div style={{
                fontFamily: "'Fira Sans', sans-serif",
                fontWeight: 500,
                letterSpacing: '0.44em',
                fontSize: 15,
                color: C.gold,
                textAlign: 'center',
                marginTop: 20,
              }}>
                OF COMPLETION
              </div>
            </div>

            {/* Eyebrow */}
            <div style={{
              marginTop: 10,
              fontSize: 17,
              color: C.ink,
              letterSpacing: '0.03em',
              fontFamily: "'Fira Sans', sans-serif",
            }}>
              This is to certify that:
            </div>

            {/* Student name */}
            <div style={{
              marginTop: 10,
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 700,
              fontSize: 50,
              letterSpacing: '0.03em',
              color: C.green,
              textTransform: 'uppercase',
              lineHeight: 1,
              WebkitTextStroke: `0.5px ${C.green}`,
            }}>
              {cert.studentName}
            </div>

            {/* Body */}
            <div style={{
              margin: '14px auto 0',
              maxWidth: 820,
              fontSize: 15.5,
              lineHeight: 1.7,
              color: '#2d3a2d',
              fontFamily: "'Fira Sans', sans-serif",
            }}>
              has successfully completed the{' '}
              <span style={{ color: C.green, fontWeight: 600 }}>
                {cert.courseName}{cert.courseLevel ? ` — ${cert.courseLevel}` : ''}
              </span>
              {' '}course, totaling{' '}
              <span style={{ color: C.green, fontWeight: 600 }}>
                {cert.trainingHours ?? 0} training hours
              </span>
              {' '}at RoboTrick. During this program, {pronoun} demonstrated outstanding technical
              proficiency and completed all assigned projects with exceptional creativity. We are proud
              of {possessive} commitment and wish {pronoun} a distinguished and innovative technical future.
            </div>

            {/* Footer */}
            <div style={{ marginTop: 18, width: '100%' }}>
              <GoldDivider />

              <div style={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'end',
                gap: 20,
                paddingBottom: 8,
              }}>
                <Sig
                  sigSrc={asset('sig1-nour.png')}
                  name="ENG. NOUR ALDIEN ALHOOT"
                  role="Chief Executive Officer"
                />

                {/* Seal */}
                <div style={{ width: 120, height: 120, display: 'grid', placeItems: 'center' }}>
                  <img
                    src={asset('stamp-new.png')}
                    alt="Seal"
                    style={{ width: 120, height: 120, objectFit: 'contain' }}
                  />
                </div>

                <Sig
                  sigSrc={asset('sig2.png')}
                  name="ENG. FEDAA AFDAL"
                  role="Head of Training"
                />
              </div>
            </div>
          </div>

          {/* Meta */}
          <div style={{
            position: 'absolute',
            left: 440,
            right: 440,
            bottom: 20,
            display: 'flex',
            justifyContent: 'center',
            gap: 20,
            fontSize: 9,
            letterSpacing: '0.1em',
            color: C.green,
            opacity: 0.75,
            fontWeight: 600,
            textTransform: 'uppercase',
            zIndex: 5,
            fontFamily: "'Fira Sans', sans-serif",
          }}>
            <span>ID · {cert.certificateNumber}</span>
            <span>ISSUED · {formatDate(cert.issuedAt)}</span>
          </div>
        </div>
      </div>
    );
  }
);
CertificateA4.displayName = 'CertificateA4';

// ════════════════════════════════════════════════════════════════════════════
// CertificateSquare — 1080 × 1080 px (Instagram)
// Same template, scaled proportionally for a square canvas.
// ════════════════════════════════════════════════════════════════════════════
export const CertificateSquare = React.forwardRef<HTMLDivElement, { cert: CertData }>(
  ({ cert }, ref) => {
    injectFonts();
    const pronoun   = cert.gender === 'female' ? 'she' : 'he';
    const possessive = cert.gender === 'female' ? 'her' : 'his';

    // Scale factor: square is taller than A4 landscape, so we scale up ~1.36×
    const S = 1.36;

    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1080,
          background: C.paper,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 30px 60px -20px rgba(0,0,0,.5)',
        }}
      >
        <PaperTexture />

        {/* Corners — scaled up */}
        <img src={asset('corner.png')} alt=""
          style={{ position: 'absolute', top: 0, left: 0, width: 680 * S, pointerEvents: 'none', transform: 'scaleX(-1)', zIndex: 1 }} />
        <img src={asset('corner.png')} alt=""
          style={{ position: 'absolute', top: 0, right: 0, width: 680 * S, pointerEvents: 'none', zIndex: 1 }} />
        <img src={asset('bottom-corner.png')} alt=""
          style={{ position: 'absolute', bottom: 0, left: 0, width: 440 * S, pointerEvents: 'none', transform: 'scaleX(-1)', mixBlendMode: 'multiply', zIndex: 3 }} />
        <img src={asset('bottom-corner.png')} alt=""
          style={{ position: 'absolute', bottom: 0, right: 0, width: 440 * S, pointerEvents: 'none', mixBlendMode: 'multiply', zIndex: 3 }} />

        {/* Main content */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: `${30 * S}px ${100 * S}px ${80 * S}px`,
          textAlign: 'center',
          zIndex: 2,
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100 * S, marginBottom: 6 * S }}>
            <img
              src={asset('logo.png')}
              alt="RoboTrick"
              style={{ height: 160 * S, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 1px 2px rgba(0,51,0,.15))' }}
            />
          </div>

          <div style={{ marginTop: 50 * S, width: 880 * S }}>
            {/* Title block */}
            <div style={{ marginTop: 4 }}>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: 72 * S,
                letterSpacing: '0.16em',
                color: C.green,
                lineHeight: 1,
                textAlign: 'center',
              }}>
                CERTIFICATE
              </div>
              <div style={{
                fontFamily: "'Fira Sans', sans-serif",
                fontWeight: 500,
                letterSpacing: '0.44em',
                fontSize: 15 * S,
                color: C.gold,
                textAlign: 'center',
                marginTop: 20 * S,
              }}>
                OF COMPLETION
              </div>
            </div>

            {/* Eyebrow */}
            <div style={{
              marginTop: 10 * S,
              fontSize: 17 * S,
              color: C.ink,
              letterSpacing: '0.03em',
              fontFamily: "'Fira Sans', sans-serif",
            }}>
              This is to certify that:
            </div>

            {/* Student name */}
            <div style={{
              marginTop: 10 * S,
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 700,
              fontSize: 50 * S,
              letterSpacing: '0.03em',
              color: C.green,
              textTransform: 'uppercase',
              lineHeight: 1,
              WebkitTextStroke: `0.5px ${C.green}`,
            }}>
              {cert.studentName}
            </div>

            {/* Body */}
            <div style={{
              margin: `${14 * S}px auto 0`,
              maxWidth: 820,
              fontSize: 15.5 * S,
              lineHeight: 1.7,
              color: '#2d3a2d',
              fontFamily: "'Fira Sans', sans-serif",
            }}>
              has successfully completed the{' '}
              <span style={{ color: C.green, fontWeight: 600 }}>
                {cert.courseName}{cert.courseLevel ? ` — ${cert.courseLevel}` : ''}
              </span>
              {' '}course, totaling{' '}
              <span style={{ color: C.green, fontWeight: 600 }}>
                {cert.trainingHours ?? 0} training hours
              </span>
              {' '}at RoboTrick. During this program, {pronoun} demonstrated outstanding technical
              proficiency and completed all assigned projects with exceptional creativity. We are
              proud of {possessive} commitment and wish {pronoun} a distinguished and innovative
              technical future.
            </div>

            {/* Footer */}
            <div style={{ marginTop: 18 * S, width: '100%' }}>
              <GoldDivider width="60%" />

              <div style={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'end',
                gap: 20 * S,
                paddingBottom: 8 * S,
              }}>
                <Sig
                  sigSrc={asset('sig1-nour.png')}
                  name="ENG. NOUR ALDIEN ALHOOT"
                  role="Chief Executive Officer"
                  scale={S}
                />

                <div style={{ width: 120 * S, height: 120 * S, display: 'grid', placeItems: 'center' }}>
                  <img
                    src={asset('stamp-new.png')}
                    alt="Seal"
                    style={{ width: 120 * S, height: 120 * S, objectFit: 'contain' }}
                  />
                </div>

                <Sig
                  sigSrc={asset('sig2.png')}
                  name="ENG. FEDAA AFDAL"
                  role="Head of Training"
                  scale={S}
                />
              </div>
            </div>
          </div>

          {/* Meta */}
          <div style={{
            position: 'absolute',
            bottom: 28,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 20,
            fontSize: 9 * S,
            letterSpacing: '0.1em',
            color: C.green,
            opacity: 0.75,
            fontWeight: 600,
            textTransform: 'uppercase',
            zIndex: 5,
            fontFamily: "'Fira Sans', sans-serif",
          }}>
            <span>ID · {cert.certificateNumber}</span>
            <span>ISSUED · {formatDate(cert.issuedAt)}</span>
          </div>
        </div>
      </div>
    );
  }
);
CertificateSquare.displayName = 'CertificateSquare';
