import { defineConfig } from 'vitest/config';
import path from 'node:path';
import react from '@vitejs/plugin-react-swc';
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: { environment: 'node', include: ['src/pages/__tests__/EstoqueGeladeira.test.tsx', 'src/lib/__tests__/historicoEstoqueData.test.ts', 'src/pages/__tests__/Geladeira.test.tsx', 'supabase/tests/geladeira.test.ts', 'src/lib/__tests__/geladeiraData.test.ts', 'src/lib/__tests__/receitasData.test.ts'], testTimeout: 15000, hookTimeout: 30000 },
});
