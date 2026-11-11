import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: ['supabase/tests/production-yield.test.ts','supabase/tests/kanban-integrity.test.ts'], testTimeout: 15000, hookTimeout: 30000 } });
