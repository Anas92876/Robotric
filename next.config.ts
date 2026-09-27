import type { NextConfig } from 'next';
import { SITE } from './lib/config';
import { dashboardRewrites } from './lib/dashboard';

const nextConfig: NextConfig = {
  images: {
    // Next 16 requires an explicit quality allowlist
    qualities: [70, 80],
    // Job photos are uploaded through the dashboard to Cloudinary
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/dsvawmwpf/**' }],
  },

  // This site is the front door for the whole domain:
  //  - /api/* goes to the backend, so the browser never calls another domain (see SITE.browserApiBase)
  //  - the private dashboard's paths go to the dashboard app (lib/dashboard.ts)
  async rewrites() {
    return {
      beforeFiles: [{ source: '/api/:path*', destination: `${SITE.apiBase}/:path*` }, ...dashboardRewrites()],
      afterFiles: [],
      fallback: [],
    };
  },

  // Keep links to the old robotrick.net URLs working (they had no language prefix)
  async redirects() {
    return [
      { source: '/services/training/:path*', destination: '/en/training', permanent: true },
      { source: '/services/:slug(technical-projects|technical-consultation|curriculum-design|3d-printing|stem-lab-setup)', destination: '/en/:slug', permanent: true },
      { source: '/services', destination: '/en#services', permanent: true },
      { source: '/blog/:slug', destination: '/en/blog', permanent: true },
      { source: '/download-app', destination: '/en', permanent: false },
      // Accounts are created at the academy; there is no public sign-up
      { source: '/:lang(en|ar)/signup', destination: '/:lang/login', permanent: false },
    ];
  },
};

export default nextConfig;
