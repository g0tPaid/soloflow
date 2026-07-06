import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@flowbooks/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
