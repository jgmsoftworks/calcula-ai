import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Share these stable dependencies without requesting dozens of tiny
          // icon modules on the first visit to a screen.
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react-vendor';
          if (id.includes('/node_modules/lucide-react/')) return 'icons';
        },
      },
    },
  },
}));
