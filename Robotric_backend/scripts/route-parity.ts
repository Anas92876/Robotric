/**
 * Route parity report.
 *
 * The web and Expo clients depend on the exact API surface of the old
 * backend (recorded in scripts/legacy-routes.json, 501 routes). This lists
 * every "METHOD /path" the new app serves and compares:
 *
 *   - MISSING: old routes not ported yet (expected during the rewrite)
 *   - EXTRA:   new routes the old API never had (always a failure)
 *
 *   npm run routes:check            # progress report; fails only on EXTRA
 *   npm run routes:check -- --strict # also fails on MISSING (for the final phase)
 */
import fs from 'node:fs';
import path from 'node:path';
import type * as TestApp from '../tests/helpers/test-app.js';

process.env.NODE_ENV ??= 'test';
process.env.JWT_SECRET ??= 'route-parity-only-secret-0123456789-abcdef';

// Express 5's router does not remember the path a sub-router was mounted at,
// so record it on each layer as it is created.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RouterCtor = require('router') as { prototype: { use: (...args: unknown[]) => unknown; stack: Layer[] } };
const originalUse = RouterCtor.prototype.use;
RouterCtor.prototype.use = function patchedUse(this: { stack: Layer[] }, ...args: unknown[]) {
  const before = this.stack.length;
  const result = originalUse.apply(this, args);
  const mountPath = typeof args[0] === 'string' ? args[0] : '/';
  for (const layer of this.stack.slice(before)) layer.mountPath = mountPath;
  return result;
};

interface Layer {
  mountPath?: string;
  route?: { path: string | string[]; methods: Record<string, boolean> };
  handle?: { stack?: Layer[] };
}

function collect(stack: Layer[], prefix: string, out: Set<string>): void {
  for (const layer of stack) {
    if (layer.route) {
      const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
      for (const p of paths) {
        for (const [method, on] of Object.entries(layer.route.methods)) {
          if (!on || method === '_all') continue;
          out.add(`${method.toUpperCase()} ${(prefix + p).replace(/\/{2,}/g, '/')}`);
        }
      }
    } else if (layer.handle?.stack) {
      const mount = layer.mountPath && layer.mountPath !== '/' ? layer.mountPath : '';
      collect(layer.handle.stack, prefix + mount, out);
    }
  }
}

async function main(): Promise<void> {
  // Loaded after the patch above, so the app's routers are created with it.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createTestApp } = require('../tests/helpers/test-app') as typeof TestApp;
  const t = await createTestApp();
  const stack = (t.app as unknown as { router: { stack: Layer[] } }).router.stack;
  const actual = new Set<string>();
  collect(stack, '', actual);
  await t.close();

  const legacy: string[] = JSON.parse(fs.readFileSync(path.join(__dirname, 'legacy-routes.json'), 'utf8'));
  const legacySet = new Set(legacy);
  // Infrastructure routes that exist outside the legacy snapshot.
  const allowedExtra = new Set(['GET /', 'GET /api/health']);

  const missing = legacy.filter((r) => !actual.has(r));
  const extra = [...actual].filter((r) => !legacySet.has(r) && !allowedExtra.has(r)).sort();
  const ported = legacy.length - missing.length;

  console.log(`Ported ${ported}/${legacy.length} legacy routes (${((ported / legacy.length) * 100).toFixed(1)}%)`);

  if (process.argv.includes('--list-missing')) for (const r of missing) console.log(`  MISSING  ${r}`);

  if (extra.length) {
    console.error('\n✗ Routes the old API never had (clients will not call these; check for typos):');
    for (const r of extra) console.error(`  EXTRA    ${r}`);
  }
  const strictFail = process.argv.includes('--strict') && missing.length > 0;
  if (extra.length || strictFail) process.exit(1);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
