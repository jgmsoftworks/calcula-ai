import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['supabase/tests/recipe-save.test.ts', 'supabase/tests/recipe-delete.test.ts'],
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});
