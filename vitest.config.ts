import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    env: { DATABASE_URL: 'file:/tmp/skillsetu-vitest.db' },
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
