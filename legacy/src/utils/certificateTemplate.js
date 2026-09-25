const fs   = require('fs');
const path = require('path');

const CERT_ASSETS = path.join(__dirname, '../../../Robotrick-Frontend/Certificate/assets');

const escapeHtml = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const imageToBase64 = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) return '';
    const buf  = fs.readFileSync(filePath);
    const ext  = path.extname(filePath).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch { return ''; }
};

const formatDate = (iso) =>
  new Date(iso)
    .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    .toUpperCase();

const generateCertificateHTML = (data) => {
  const {
    certificateNumber, studentName, courseName, courseLevel,
    trainingHours, issuedAt, gender,
  } = data;

  const pronoun   = gender === 'female' ? 'she' : 'he';
  const possessive = gender === 'female' ? 'her' : 'his';

  const logoSrc         = imageToBase64(path.join(CERT_ASSETS, 'logo.png'));
  const cornerSrc       = imageToBase64(path.join(CERT_ASSETS, 'corner.png'));
  const bottomCornerSrc = imageToBase64(path.join(CERT_ASSETS, 'bottom-corner.png'));
  const sig1Src         = imageToBase64(path.join(CERT_ASSETS, 'sig1-nour.png'));
  const sig2Src         = imageToBase64(path.join(CERT_ASSETS, 'sig2.png'));
  const stampSrc        = imageToBase64(path.join(CERT_ASSETS, 'stamp-new.png'));

  const hours    = trainingHours || 0;
  const certName = `${escapeHtml(courseName)}${courseLevel ? ` — ${escapeHtml(courseLevel)}` : ''}`;

  // Noise SVG for paper texture (same as reference HTML)
  const noiseSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='0.12'/%3E%3C/svg%3E")`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>RoboTrick · Certificate</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Fira+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet"/>
<style>
  :root {
    --green:  #003300;
    --green-2:#0a4a1f;
    --beige:  #cccc99;
    --beige-2:#e8e6cf;
    --paper:  #eeecdf;
    --gold:   #b8962e;
    --ink:    #1d2a1d;
  }
  *{ box-sizing:border-box; margin:0; padding:0; }
  html,body{ height:100%; }
  body{
    font-family:'Fira Sans',sans-serif;
    background:#2a2a26;
    display:flex; justify-content:center; align-items:center;
    padding:0;
    -webkit-print-color-adjust:exact;
    print-color-adjust:exact;
  }

  /* ── Certificate wrap ── */
  .cert-wrap{
    width:1123px; height:794px;
    background:var(--paper);
    position:relative; overflow:hidden;
  }

  /* paper texture — exact match to reference */
  .cert-wrap::before{
    content:"";
    position:absolute; inset:0;
    pointer-events:none; z-index:0;
    background-image:
      ${noiseSvg},
      repeating-linear-gradient(90deg, rgba(0,51,0,0.012) 0 1px, transparent 1px 60px),
      repeating-linear-gradient(0deg,  rgba(0,51,0,0.012) 0 1px, transparent 1px 60px);
    background-size: 400px 400px, 60px 60px, 60px 60px;
    mix-blend-mode:multiply;
  }

  /* ── Corners ── */
  .corner{
    position:absolute; pointer-events:none;
    width:680px; height:auto;
  }
  .corner.tl{ top:0; left:0;  transform:scaleX(-1); }
  .corner.tr{ top:0; right:0; }

  .bottom-corner{
    position:absolute; bottom:0; pointer-events:none;
    width:440px; height:auto;
    mix-blend-mode:multiply; z-index:3;
  }
  .bottom-corner.left{  left:0;  transform:scaleX(-1); }
  .bottom-corner.right{ right:0; }

  /* ── Main content ── */
  .cert{
    position:absolute; inset:0;
    display:flex; flex-direction:column; align-items:center;
    padding:30px 100px 55px;
    text-align:center; z-index:2;
  }

  /* ── Logo ── */
  .brand{
    display:flex; align-items:center; justify-content:center;
    height:100px; margin-bottom:6px;
  }
  .brand-logo{
    height:160px; width:auto; object-fit:contain;
    filter:drop-shadow(0 1px 2px rgba(0,51,0,0.15));
  }

  /* ── Title ── */
  .conta{ margin-top:50px; }
  .title-block{
    width:100%;
    display:block;
    text-align:center;
    margin-top:4px;
  }
  .title{
    font-family:'Cormorant Garamond',serif;
    font-weight:600; font-size:72px; letter-spacing:0.16em;
    color:var(--green); line-height:1;
    display:block; width:100%; text-align:center;
  }
  .subtitle{
    font-family:'Fira Sans',sans-serif;
    font-weight:500; font-size:15px;
    color:var(--gold);
    letter-spacing:0.44em;
    display:block; width:100%; text-align:center;
    margin-top:3px;
  }

  /* ── Eyebrow / name / body ── */
  .eyebrow{ margin-top:10px; font-size:17px; color:var(--ink); letter-spacing:0.03em; }
  .name{
    margin-top:10px;
    font-family:'Cormorant Garamond',serif;
    font-weight:700; font-size:50px; letter-spacing:0.03em;
    color:#003300; text-transform:uppercase; line-height:1;
    -webkit-text-stroke:0.5px #003300;
  }
  .body{
    margin:14px auto 0; max-width:820px;
    font-size:15.5px; line-height:1.7;
    color:#2d3a2d; font-family:'Fira Sans',sans-serif;
  }
  .body .hl{ color:var(--green); font-weight:600; }

  /* ── Footer ── */
  .bottom-section{ margin-top:18px; width:100%; }
  .divider{
    width:60%; max-width:500px; height:1px;
    margin:16px auto 14px;
    background:linear-gradient(to right, transparent, var(--gold) 20%, var(--gold) 80%, transparent);
    opacity:0.7;
  }
  .footer{
    width:100%;
    display:grid; grid-template-columns:1fr auto 1fr;
    align-items:end; gap:20px; padding-bottom:8px;
  }

  /* ── Signatures ── */
  .sig{ display:flex; flex-direction:column; align-items:center; gap:8px; }
  .sig-img{ height:90px; width:260px; object-fit:contain; object-position:center bottom; }
  .line{ width:260px; height:2px; background:var(--gold); }
  .sig-name{
    font-family:'Fira Sans',sans-serif;
    font-weight:700; font-size:13px; letter-spacing:0.12em;
    color:var(--green); text-transform:uppercase;
  }
  .sig-role{ font-size:13px; color:#5a6450; letter-spacing:0.05em; }

  /* ── Seal ── */
  .seal{ width:120px; height:120px; display:grid; place-items:center; }
  .stamp-img{ width:120px; height:120px; object-fit:contain; }

  /* ── Meta ── */
  .meta{
    position:absolute; left:440px; right:440px; bottom:20px;
    display:flex; justify-content:center; gap:20px;
    font-size:9px; letter-spacing:0.1em;
    color:var(--green); opacity:0.75;
    font-weight:600; text-transform:uppercase; z-index:5;
  }

  @page{ size:A4 landscape; margin:0; }
  @media print{
    body{ background:#fff; padding:0; }
    .cert-wrap{ box-shadow:none; }
  }
</style>
</head>
<body>
<div class="cert-wrap">
  ${cornerSrc ? `<img class="corner tl" src="${cornerSrc}" alt=""/>` : ''}
  ${cornerSrc ? `<img class="corner tr" src="${cornerSrc}" alt=""/>` : ''}
  ${bottomCornerSrc ? `<img class="bottom-corner left"  src="${bottomCornerSrc}" alt=""/>` : ''}
  ${bottomCornerSrc ? `<img class="bottom-corner right" src="${bottomCornerSrc}" alt=""/>` : ''}

  <div class="cert">
    <div class="brand">
      ${logoSrc ? `<img class="brand-logo" src="${logoSrc}" alt="RoboTrick"/>` : ''}
    </div>

    <div class="conta">
      <div class="title-block">
        <div class="title">CERTIFICATE</div>
        <div class="subtitle">OF COMPLETION</div>
      </div>

      <div class="eyebrow">This is to certify that:</div>

      <div class="name">${escapeHtml(studentName)}</div>

      <div class="body">
        has successfully completed the
        <span class="hl">${certName}</span>
        course, totaling
        <span class="hl">${hours} training hours</span>
        at RoboTrick. During this program, ${pronoun} demonstrated outstanding technical
        proficiency and completed all assigned projects with exceptional creativity.
        We are proud of ${possessive} commitment and wish ${pronoun} a distinguished
        and innovative technical future.
      </div>

      <div class="bottom-section">
        <div class="divider"></div>
        <div class="footer">
          <div class="sig">
            ${sig1Src ? `<img class="sig-img" src="${sig1Src}" alt=""/>` : '<div style="height:90px"></div>'}
            <div class="line"></div>
            <div class="sig-name">ENG. NOUR ALDIEN ALHOOT</div>
            <div class="sig-role">Chief Executive Officer</div>
          </div>
          <div class="seal">
            ${stampSrc ? `<img class="stamp-img" src="${stampSrc}" alt=""/>` : ''}
          </div>
          <div class="sig">
            ${sig2Src ? `<img class="sig-img" src="${sig2Src}" alt=""/>` : '<div style="height:90px"></div>'}
            <div class="line"></div>
            <div class="sig-name">ENG. FEDAA AFDAL</div>
            <div class="sig-role">Head of Training</div>
          </div>
        </div>
      </div>
    </div>

    <div class="meta">
      <span>ID · ${escapeHtml(certificateNumber)}</span>
      <span>ISSUED · ${formatDate(issuedAt)}</span>
    </div>
  </div>
</div>
</body>
</html>`;
};

module.exports = { generateCertificateHTML };
