// Checks every API call in the dashboard against the backend's routes.
//   node scripts/check-api-links.cjs            (backend expected at ../Robotrick-Backend-main)
//   BACKEND_DIR=path node scripts/check-api-links.cjs
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const FE = path.join(__dirname, '..', 'src');
const BE = process.env.BACKEND_DIR || path.join(__dirname, '..', '..', 'Robotrick-Backend-main');

// ---- backend: legacy routes minus the ones not ported ----
const legacy = JSON.parse(fs.readFileSync(BE + '/scripts/legacy-routes.json', 'utf8'));
const missingOut = execSync('npx tsx scripts/route-parity.ts --list-missing', { cwd: BE, encoding: 'utf8' });
const missing = new Set([...missingOut.matchAll(/MISSING\s+(\S+ \S+)/g)].map((m) => m[1]));
const served = legacy.filter((r) => !missing.has(r));
const toRe = (p) => new RegExp('^' + p.split('/').map((s) => (s.startsWith(':') ? '[^/]+' : s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('/') + '$');
// Root routes are recorded with a trailing slash ("/api/parts/"); compare without it.
const strip = (p) => (p.length > 1 ? p.replace(/\/+$/, '') : p);
const backend = served.map((r) => { const [m, p] = r.split(' '); return { m, p: strip(p), route: r }; });
const postponed = [...missing].map((r) => { const [m, p] = r.split(' '); return { m, p: strip(p), route: r }; });

// ---- frontend: find calls ----
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(p) && files.push(p); } })(FE);

const calls = [];
const unresolved = [];
const callRe = /\b(api|apiClient|axios|axiosInstance|http|client|instance)\s*\.\s*(get|post|put|patch|delete)\s*(?:<[^>(]*>)?\s*\(\s*([`'"])((?:\\.|(?!\3)[^\\])*)\3/g;
const helperRe = /\b(apiGet|apiPost|apiPut|apiPatch|apiDelete)\s*(?:<[^>(]*>)?\s*\(\s*([`'"])((?:\\.|(?!\2)[^\\])*)\2/g;
const fetchRe = /\bfetch\s*\(\s*([`'"])((?:\\.|(?!\1)[^\\])*)\1\s*(,\s*\{[^}]*?method\s*:\s*['"](\w+)['"])?/g;
const anyCallRe = /\b(api|axios)\s*\.\s*(get|post|put|patch|delete)\s*(?:<[^>(]*>)?\s*\(\s*([A-Za-z_$][\w$.]*)/g;

const norm = (raw) => {
  let p = raw.replace(/\$\{[^}]*\}/g, (m) => (/API_BASE|API_URL|BASE_URL|apiUrl|getApiUrl|baseUrl|API\b/i.test(m) ? '' : ':p'));
  p = p.split('?')[0].replace(/\/+$/, '');
  if (/^https?:/.test(p)) p = p.replace(/^https?:\/\/[^/]+/, '');
  if (!p.startsWith('/api')) p = '/api' + (p.startsWith('/') ? '' : '/') + p;
  return p.replace(/\/{2,}/g, '/');
};

for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const rel = path.relative(FE, f).replace(/\\/g, '/');
  const line = (i) => text.slice(0, i).split('\n').length;
  for (const m of text.matchAll(callRe)) calls.push({ m: m[2].toUpperCase(), raw: m[4], p: norm(m[4]), at: `${rel}:${line(m.index)}` });
  for (const m of text.matchAll(helperRe)) calls.push({ m: m[1].slice(3).toUpperCase(), raw: m[3], p: norm(m[3]), at: `${rel}:${line(m.index)}` });
  for (const m of text.matchAll(fetchRe)) if (/api|\/|\$\{/.test(m[2]) && !/^(blob:|data:)/.test(m[2])) calls.push({ m: (m[4] || 'GET').toUpperCase(), raw: m[2], p: norm(m[2]), at: `${rel}:${line(m.index)}`, fetch: true });
  for (const m of text.matchAll(anyCallRe)) unresolved.push(`${m[2].toUpperCase()} <${m[3]}> ${rel}:${line(m.index)}`);
}

// ---- match ----
const segMatch = (fp, be) => {
  const a = fp.split('/'), b = be.p.split('/');
  if (a.length !== b.length) return false;
  return a.every((s, i) => s === ':p' || b[i].startsWith(':') || s === b[i]);
};
const result = { ok: [], postponed: [], wrongMethod: [], missing: [] };
for (const c of calls) {
  const hit = backend.find((b) => b.m === c.m && segMatch(c.p, b));
  if (hit) { result.ok.push({ ...c, be: hit.route }); continue; }
  if (postponed.find((b) => b.m === c.m && segMatch(c.p, b))) { result.postponed.push(c); continue; }
  const other = backend.filter((b) => segMatch(c.p, b));
  if (other.length) { result.wrongMethod.push({ ...c, be: other.map((b) => b.m).join('/') }); continue; }
  result.missing.push(c);
}

// Backend routes never called by the dashboard
const used = new Set(result.ok.map((c) => c.be));
const unusedBackend = served.filter((r) => !used.has(r));

const out = [];
out.push(`calls found: ${calls.length} (unique paths ${new Set(calls.map((c) => c.m + ' ' + c.p)).size})`);
out.push(`matched: ${result.ok.length} | postponed (chat/notifications): ${result.postponed.length} | wrong method: ${result.wrongMethod.length} | no backend route: ${result.missing.length}`);
out.push(`backend routes never called by the dashboard: ${unusedBackend.length} of ${served.length}`);
out.push('\n== WRONG METHOD');
for (const c of result.wrongMethod) out.push(`  ${c.m} ${c.p}  (backend has ${c.be})  ${c.at}`);
out.push('\n== NO BACKEND ROUTE');
for (const c of result.missing.sort((a, b) => a.p.localeCompare(b.p))) out.push(`  ${c.m} ${c.p}   <- ${c.raw}   ${c.at}`);
out.push('\n== POSTPONED (chat / notifications)');
for (const c of result.postponed) out.push(`  ${c.m} ${c.p}  ${c.at}`);
out.push('\n== CALLS WITH A VARIABLE URL (check by hand)');
for (const u of unresolved) out.push('  ' + u);
out.push('\n== BACKEND ROUTES NEVER CALLED');
for (const r of unusedBackend) out.push('  ' + r);
console.log(out.join('\n'));
