import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * This app is the private dashboard. The public site (home, services, /en/login…)
 * is a separate Next.js app served on the same domain. Only these paths belong
 * to the dashboard; the production rewrites must list the same ones.
 */
const DASHBOARD_PATHS = [
  "dashboard", "student", "trainer", "reception", "clo", "cto-internal", "engineer", "client", "admin",
  "orders", "projects", "competitions", "teams", "posts", "inventory", "my-tasks", "my-hours",
  "settings", "profile", "notifications",
  "dash-assets", // this app's built files and images
  "odom-map", // the standalone field map tool
];

// Vite's own dev-server paths — never forwarded
const VITE_DEV_PATHS = ["src", "node_modules", "@vite", "@id", "@fs", "@react-refresh", "__vite_ping"];

const PUBLIC_SITE_DEV_URL = process.env.PUBLIC_SITE_DEV_URL || "http://localhost:3100";
const API_DEV_URL = "http://localhost:4889";
const escape = (p: string) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ownPaths = [...DASHBOARD_PATHS, ...VITE_DEV_PATHS, "api"].map(escape).join("|");

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 3000, // Changed from 5173 to avoid permission issue
    proxy: {
      "/api": {
        target: API_DEV_URL,
        changeOrigin: true,
      },
      // Next.js live reload for the public site
      "/_next/webpack-hmr": {
        target: PUBLIC_SITE_DEV_URL,
        ws: true,
        // A reset on the socket to Next.js (e.g. a tab closed mid-reload) has no
        // error handler by default and crashes the whole dev server.
        configure: (proxy) => {
          proxy.on("open", (proxySocket) => {
            proxySocket.on("error", (err) => console.warn(`[next-hmr proxy] ${err.message}`));
          });
        },
      },
      // Everything that isn't a dashboard path is the public Next.js site, so in
      // development both apps share one origin (and one login), like production.
      [`^/(?!(?:${ownPaths})(?:[/?#]|$))`]: {
        target: PUBLIC_SITE_DEV_URL,
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
