import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'legacy', 'drizzle', 'node_modules', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      // Layering: features never import each other's tables or reach into Express from services.
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ group: ['mongoose', 'mongodb'], message: 'This project uses PostgreSQL via Drizzle.' }],
        },
      ],
    },
  },
);
