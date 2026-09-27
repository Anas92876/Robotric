import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 3000, // Changed from 5173 to avoid permission issue
    proxy: {
      "/api": {
        target: "http://localhost:4889",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:4889",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime', '@tanstack/react-query', 'framer-motion'],
    exclude: ['@react-three/drei', '@react-three/fiber', 'three', 'jspdf', 'html2canvas'],
  },
  resolve: {
    // Ensure single React instance - critical fix for Spline forwardRef error
    dedupe: ['react', 'react-dom', 'framer-motion'],
  },
  build: {
    // Exclude heavy lazy chunks from <link rel="modulepreload"> injection.
    // Without this, Vite injects modulepreload for ALL chunks including
    // chunk-spline (1.39 MB), chunk-socket, chunk-pdf on every page load.
    modulePreload: {
      polyfill: true,
      resolveDependencies: (_filename, deps) => {
        return deps.filter(
          (dep) =>
            !dep.includes('spline') &&
            !dep.includes('three') &&
            !dep.includes('socket') &&
            !dep.includes('pdf') &&
            !dep.includes('cert') &&
            !dep.includes('html2canvas') &&
            !dep.includes('moment') &&
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

          // Heavy dashboard-only libs — isolated so public pages never load them
          if (id.includes('pdfjs-dist') || id.includes('react-pdf')) return 'chunk-pdf';
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'chunk-cert';
          if (id.includes('react-big-calendar')) return 'chunk-calendar';
          if (id.includes('moment')) return 'chunk-moment';
          if (id.includes('socket.io-client') || id.includes('engine.io-client')) return 'chunk-socket';

          // 3D / Spline — desktop hero only, lazy loaded
          if (id.includes('@splinetool')) return 'chunk-spline';
          if (id.includes('three') || id.includes('@react-three')) return 'chunk-three';

          // Animation — keep framer-motion in vendor to avoid cross-chunk exports race
          // if (id.includes('framer-motion')) return 'chunk-framer';

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
    esbuildOptions: {
      drop: ['console', 'debugger'],
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    // Alternative: Use terser with React-safe settings
    // minify: 'terser',
    // terserOptions: {
    //   compress: {
    //     drop_console: true,
    //     drop_debugger: true,
    //     pure_funcs: ['console.log', 'console.info', 'console.debug'],
    //     passes: 1, // Reduce passes to avoid React 19 issues
    //   },
    //   mangle: {
    //     safari10: true,
    //     reserved: ['Activity', 'React', 'ReactDOM'],
    //   },
    // },
    // Enable source maps only for debugging
    sourcemap: false,
    // Target modern browsers for smaller bundles
    target: 'esnext',
  },
});
