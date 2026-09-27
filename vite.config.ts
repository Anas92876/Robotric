import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * This app is the private dashboard. The public Next.js site is the front door for
 * the whole domain (http://localhost:3000 in development): it serves the public
 * pages and forwards the dashboard's paths here. The list of dashboard paths lives
 * in the public site's lib/dashboard.ts.
 *
 * Always open http://localhost:3000, not this server's port — the login is shared
 * only on the same address.
 */
const DEV_PORT = 5173;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: DEV_PORT,
    strictPort: true,
    // Pages are served through the front door on :3000, but live reload connects here directly
    hmr: { clientPort: DEV_PORT },
    proxy: {
      // Only used when this server is opened directly; through :3000 the front door forwards /api
      "/api": {
        target: "http://localhost:4889",
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime', '@tanstack/react-query', 'framer-motion'],
    exclude: ['jspdf', 'html2canvas'],
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'framer-motion'],
  },
  build: {
    // Built files live under /dash-assets/ so they never clash with the public site's files
    assetsDir: 'dash-assets',
    // Exclude heavy lazy chunks from <link rel="modulepreload"> injection,
    // so they only load on the pages that need them.
    modulePreload: {
      polyfill: true,
      resolveDependencies: (_filename, deps) => {
        return deps.filter(
          (dep) =>
            !dep.includes('pdf') &&
            !dep.includes('cert') &&
            !dep.includes('html2canvas') &&
            !dep.includes('calendar')
        );
      },
    },
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined;

          // React core — keep in main bundle
          if (
            id.includes('react/') || id.includes('react\\') ||
            id.includes('react-dom/') || id.includes('react-dom\\') ||
            id.includes('react-router')
          ) return undefined;

          // Heavy page-specific libs — isolated so other pages never load them
          if (id.includes('pdfjs-dist') || id.includes('react-pdf')) return 'chunk-pdf';
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'chunk-cert';
          if (id.includes('react-big-calendar')) return 'chunk-calendar';

          // Small UI utils
          if (id.includes('lucide-react') || id.includes('clsx') || id.includes('tailwind-merge')) return 'chunk-ui';

          // i18n
          if (id.includes('i18next') || id.includes('react-i18next')) return 'chunk-i18n';

          // Everything else
          return 'chunk-vendor';
        },
      },
    },
    // Reduce chunk size warnings
    chunkSizeWarningLimit: 1000,
    minify: 'esbuild',
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    // Enable source maps only for debugging
    sourcemap: false,
    // Target modern browsers for smaller bundles
    target: 'esnext',
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
});
