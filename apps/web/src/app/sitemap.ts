import type { MetadataRoute } from 'next';
import { publicSiteUrl } from '@/lib/site-url';

const publicPaths = ['/login', '/register', '/privacy', '/forgot-password'];

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = publicSiteUrl();
  return publicPaths.map((path) => ({
    url: `${origin}${path}`,
    changeFrequency: 'monthly',
    priority: path === '/login' ? 1 : 0.5,
  }));
}
