import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    env: {
      DATABASE_URL: 'file:/tmp/skillsetu-vitest.db',
      TURSO_DATABASE_URL: '',
      TURSO_AUTH_TOKEN: '',
      DATABASE_AUTH_TOKEN: '',
    },
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
