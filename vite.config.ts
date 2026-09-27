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
    // No manual chunks: every page is lazy-loaded, and Vite's own splitting gives each
    // page just the libraries it uses. (Hand-made chunks — one big "vendor" file plus
    // named ones — tied them together, so the first page downloaded the certificate
    // PDF tools and every other page's libraries.)
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
