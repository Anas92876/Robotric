// Robotrick public site — static builder.
// Renders every page template in src/pages/*.mjs in English and Arabic from the content in content/<lang>/*.json,
// wraps it in the shared layout, and writes plain HTML to dist/ (English at the root, Arabic under dist/ar/).
// Run: node build.mjs
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, existsSync, cpSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { makeCtx } from './src/lib.mjs';
import { layout } from './src/layout.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, 'src');
const CONTENT = join(ROOT, 'content');
const OUT = join(ROOT, 'dist');

// ---------------------------------------------------------------------------
// Site config — edit these, then rebuild.
// ---------------------------------------------------------------------------
const CONFIG = {
  siteUrl: 'https://www.robotrick.net',
  apiBase: 'https://robotrick-backend-production.up.railway.app/api', // the backend robotrick.net uses today
  loginUrl: '/login',          // link to the existing internal dashboard login
  gaId: '',                    // GA4 — current property is G-JZZ5RPMDBG; set it here once the owner confirms reuse
  phoneDisplay: '+963 942 060 440',
  phoneTel: '+963942060440',
  whatsapp: '963942060440',
  email: 'robotrick.co@gmail.com',
  maps: 'https://maps.app.goo.gl/hiXH455azQDmafsp8',
  facebook: 'https://www.facebook.com/profile.php?id=61561504957102',
  instagram: 'https://www.instagram.com/robo_trick01/',
  linkedin: 'https://www.linkedin.com/company/robotrick-co/',
};

const LANGS = ['en', 'ar'];

const loadContent = (lang) => Object.fromEntries(
  readdirSync(join(CONTENT, lang)).filter((f) => f.endsWith('.json'))
    .map((f) => [f.replace('.json', ''), JSON.parse(readFileSync(join(CONTENT, lang, f), 'utf8'))]),
);

const pageFiles = readdirSync(join(SRC, 'pages')).filter((f) => f.endsWith('.mjs'));
const pages = await Promise.all(pageFiles.map((f) => import(pathToFileURL(join(SRC, 'pages', f)).href)));

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'ar'), { recursive: true });

let count = 0;
for (const lang of LANGS) {
  const content = loadContent(lang);
  const { site, ...pageContent } = content;
  for (const page of pages) {
    const ctx = makeCtx({ lang, file: page.file, content: pageContent, site, cfg: CONFIG });
    const { title, description, body, noindex } = page.render(ctx);
    const html = layout(ctx, { title, description, body, noindex });
    writeFileSync(join(OUT, lang === 'ar' ? 'ar' : '', page.file), html);
    count++;
  }
}

copyFileSync(join(SRC, 'styles.css'), join(OUT, 'styles.css'));
copyFileSync(join(SRC, 'script.js'), join(OUT, 'script.js'));
if (existsSync(join(SRC, 'public'))) cpSync(join(SRC, 'public'), OUT, { recursive: true });

console.log(`Built ${count} pages (${pages.length} × ${LANGS.length} languages) → dist/`);
