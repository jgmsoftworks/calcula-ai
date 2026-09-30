import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  test: { environment: 'node', include: ['supabase/functions/_shared/billing.test.ts'] },
  resolve: { alias: {
    'npm:stripe@22.6.0': path.resolve('tests/billing-runtime-stub.ts'),
    'https://esm.sh/@supabase/supabase-js@2.57.2': path.resolve('tests/billing-runtime-stub.ts'),
  } },
});
