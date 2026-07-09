import type { NextConfig } from 'next';

const apiOrigin = process.env.API_URL?.replace(/\/$/, '');

const nextConfig: NextConfig = {
  transpilePackages: ['@flowbooks/shared'],
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
};

export default nextConfig;