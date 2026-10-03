import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-only-secret-0123456789-0123456789-abcdef',
      CLIENT_ORIGIN: 'http://localhost:5173',
    },
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
