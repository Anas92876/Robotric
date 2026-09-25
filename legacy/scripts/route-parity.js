#!/usr/bin/env node
/**
 * Route parity check.
 *
 * The web frontend (Vercel) and the Expo mobile app are fixed: they cannot be
 * changed alongside the backend. So the one thing the refactor must never do is
 * alter the API surface — and "never" is not something to verify by hand across
 * 391 handlers.
 *
 * This walks the Express router tree of the real app, produces a sorted list of
 * every "METHOD /path" it serves, and diffs it against a committed snapshot.
 * Any route added, removed, or renamed fails the check.
 *
 *   npm run routes:snapshot   # record the current surface (do this once, on
 *                             # known-good code, and commit the result)
 *   npm run routes:check      # fail if the surface moved (CI)
 *
 * Adding an endpoint is a deliberate act: re-run routes:snapshot and commit the
 * diff, so the change is visible in review instead of slipping through.
 */

const fs = require('fs');
const path = require('path');

const SNAPSHOT_PATH = path.join(__dirname, '..', 'src', 'tests', '__snapshots__', 'routes.json');

/**
 * Express keeps mounted routers in a layer stack. Each layer is either a route
 * (has .route with .methods) or a sub-router (has .handle.stack), and a mounted
 * router carries its prefix only as the regexp it was mounted with — hence the
 * unpicking below.
 */
function prefixFromLayer(layer) {
  // Express 5 exposes the mount path directly on some layers.
  if (typeof layer.path === 'string') return layer.path;

  const src = layer.regexp && layer.regexp.source;
  if (!src) return '';

  // Root-mounted router: matches everything, contributes no prefix.
  if (src === '^\\/?(?=\\/|$)' || src === '^\\/?$') return '';

  const literal = src
    .replace(/^\^/, '')
    .replace(/\\\/\?\(\?=\\\/\|\$\)$/, '')
    .replace(/\(\?=\\\/\|\$\)$/, '')
    .replace(/\$$/, '')
    .replace(/\\\//g, '/')
    .replace(/\\\./g, '.');

  // Anything still containing regex metacharacters is a parameterised mount;
  // fall back to the layer's own keys so the path stays readable.
  if (/[\\^$*+?()[\]{}|]/.test(literal)) {
    if (Array.isArray(layer.keys) && layer.keys.length) {
      return '/' + layer.keys.map((k) => ':' + k.name).join('/');
    }
    return '';
  }

  return literal;
}

function collectRoutes(stack, prefix, out) {
  for (const layer of stack || []) {
    if (layer.route) {
      const routePath = layer.route.path;
      const paths = Array.isArray(routePath) ? routePath : [routePath];
      const methods = Object.keys(layer.route.methods || {})
        .filter((m) => layer.route.methods[m])
        .map((m) => m.toUpperCase());

      for (const p of paths) {
        for (const method of methods) {
          if (method === '_ALL') continue;
          const full = (prefix + p).replace(/\/{2,}/g, '/') || '/';
          out.add(`${method} ${full}`);
        }
      }
      continue;
    }

    const subStack = layer.handle && layer.handle.stack;
    if (subStack) {
      collectRoutes(subStack, prefix + prefixFromLayer(layer), out);
    }
  }
}

function loadApp() {
  // VERCEL=1 stops index.js from binding a port or opening a DB connection.
  process.env.VERCEL = '1';
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';

  const app = require(path.join(__dirname, '..', 'index.js'));
  if (!app || typeof app.use !== 'function') {
    throw new Error('index.js did not export an Express app');
  }
  return app;
}

function routerStackOf(app) {
  // Express 4 exposes the stack as app._router and *throws* on app.router
  // ("'app.router' is deprecated!"), so _router must be tried first and the
  // Express 5 path guarded.
  if (app._router && app._router.stack) return app._router.stack;
  try {
    if (app.router && app.router.stack) return app.router.stack;
  } catch {
    /* Express 4 getter throws; already handled above */
  }
  return null;
}

function currentRoutes() {
  const app = loadApp();
  const stack = routerStackOf(app);
  if (!stack) throw new Error('Could not read the Express router stack');

  const out = new Set();
  collectRoutes(stack, '', out);
  return [...out].sort();
}

function main() {
  const write = process.argv.includes('--write');
  const routes = currentRoutes();

  if (!routes.length) {
    console.error('✗ No routes found — the harness is broken, not the app.');
    process.exit(1);
  }

  if (write) {
    fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
    fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(routes, null, 2) + '\n');
    console.log(`✓ Recorded ${routes.length} routes to ${path.relative(process.cwd(), SNAPSHOT_PATH)}`);
    process.exit(0);
  }

  if (!fs.existsSync(SNAPSHOT_PATH)) {
    console.error('✗ No snapshot found. Run `npm run routes:snapshot` first.');
    process.exit(1);
  }

  const expected = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
  const expectedSet = new Set(expected);
  const actualSet = new Set(routes);

  const added = routes.filter((r) => !expectedSet.has(r));
  const removed = expected.filter((r) => !actualSet.has(r));

  if (!added.length && !removed.length) {
    console.log(`✓ Route surface unchanged (${routes.length} routes)`);
    process.exit(0);
  }

  console.error('✗ The API surface changed. The web and mobile clients depend on it.\n');
  for (const r of removed) console.error(`  REMOVED  ${r}`);
  for (const r of added) console.error(`  ADDED    ${r}`);
  console.error('\nIf this is intentional, run `npm run routes:snapshot` and commit the diff.');
  process.exit(1);
}

main();
