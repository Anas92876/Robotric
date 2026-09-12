/**
 * ESLint flat config.
 *
 * The rules below are not style preferences — each one corresponds to a class
 * of bug this codebase has actually produced:
 *
 *   no-undef      a scripted edit introduced `safeLimit` in a handler that
 *                 never declared it. `node --check` passed; the endpoint would
 *                 have thrown at runtime. This is also the single rule that
 *                 catches the most AI-written mistakes.
 *   no-redeclare  the same edit declared `safePage` twice in one function.
 *   no-unused-vars  leftovers from half-finished refactors, of which there are
 *                 many.
 *   no-shadow     `profile`, `user` and `limit` are shadowed repeatedly across
 *                 the controllers, which is how the OTP blob confusion started.
 *
 * Stylistic rules are deliberately absent: Prettier owns formatting, and a
 * 52k-line codebase does not need a formatting argument mid-refactor.
 */

const nodeGlobals = {
  require: 'readonly',
  module: 'writable',
  exports: 'writable',
  process: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  Buffer: 'readonly',
  console: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  setImmediate: 'readonly',
  queueMicrotask: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  TextEncoder: 'readonly',
  TextDecoder: 'readonly',
  AbortController: 'readonly',
  fetch: 'readonly',
  structuredClone: 'readonly',
  globalThis: 'readonly',
};

const jestGlobals = {
  describe: 'readonly',
  test: 'readonly',
  it: 'readonly',
  expect: 'readonly',
  beforeAll: 'readonly',
  afterAll: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  jest: 'readonly',
};

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'logs/**',
      'uploads/**',
      'dist/**',
      'public/**',
    ],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: nodeGlobals,
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    rules: {
      // Correctness — these are the ones that matter.
      'no-undef': 'error',
      'no-redeclare': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-dupe-else-if': 'error',
      'no-duplicate-case': 'error',
      'no-unreachable': 'error',
      'no-fallthrough': 'error',
      'no-self-assign': 'error',
      'no-self-compare': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      'require-atomic-updates': 'error',
      'no-async-promise-executor': 'error',
      'no-promise-executor-return': 'error',
      'no-return-await': 'error',

      // Hygiene — warnings, so they surface without blocking the refactor.
      'no-unused-vars': [
        'warn',
        { args: 'none', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      'no-shadow': 'warn',
      'no-var': 'warn',
      'prefer-const': 'warn',
      eqeqeq: ['warn', 'smart'],
    },
  },
  {
    files: ['**/*.test.js', 'src/tests/**/*.js'],
    languageOptions: {
      globals: { ...nodeGlobals, ...jestGlobals },
    },
  },
];
