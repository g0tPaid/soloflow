import type { NextConfig } from 'next';

const apiOrigin = process.env.API_URL?.replace(/\/$/, '');

const nextConfig: NextConfig = {
  transpilePackages: ['@flowbooks/shared'],
  // Must stay external. Bundling this package into the Next server uses the
  // react-server build, whose internals the PDF reconciler cannot read, and
  // every invoice PDF then 500s. The browser still bundles it for offline PDFs.
  serverExternalPackages: ['@react-pdf/renderer'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        canvas: false,
        encoding: false,
      };
    }
    return config;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async rewrites() {
    if (!apiOrigin) return [];
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiOrigin}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [{ key: 'Content-Type', value: 'application/manifest+json' }],
      },
    ];
  },
};

export default nextConfig;