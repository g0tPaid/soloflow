import type { MetadataRoute } from 'next';
import { publicSiteUrl } from '@/lib/site-url';

const privatePrefixes = [
  '/dashboard',
  '/invoices',
  '/quotes',
  '/customers',
  '/expenses',
  '/products',
  '/vendors',
  '/inventory',
  '/receipts',
  '/reports',
  '/settings',
  '/admin',
  '/print',
  '/onboarding',
  '/invite',
  '/reset-password',
  '/api/',
  '/uploads/',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: privatePrefixes,
    },
    sitemap: `${publicSiteUrl()}/sitemap.xml`,
  };
}
