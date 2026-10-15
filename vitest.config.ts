import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    environment: 'node',
    globalSetup: ['tests/integration/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    env: { DATABASE_URL: 'file:./test.db', AUTH_SECRET: 'test-secret-test-secret-test-secret-123', AI_PROVIDER: 'local', STORAGE_DIR: './storage-test' },
  },
});
