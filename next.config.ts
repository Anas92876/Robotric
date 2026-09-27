import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Next 16 requires an explicit quality allowlist
    qualities: [70, 80],
    // Job photos are uploaded through the dashboard to Cloudinary
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/dsvawmwpf/**' }],
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
