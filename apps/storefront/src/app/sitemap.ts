import type { MetadataRoute } from 'next';
import { articles, products } from '@/lib/catalog';
import { guides } from '@/lib/guides';
import { getAuthors } from '@/lib/authors';
import { SITE } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    '',
    '/shop',
    '/journal',
    '/guides',
    '/philosophy',
    '/community',
    '/about',
    '/contact',
    '/account',
  ].map((path) => ({
    url: `${SITE.url}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.8,
  }));

  const productRoutes = products.map((p) => ({
    url: `${SITE.url}/products/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const articleRoutes = articles.map((a) => ({
    url: `${SITE.url}/journal/${a.slug}`,
    lastModified: new Date(a.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const authorRoutes = getAuthors().map((a) => ({
    url: `${SITE.url}/journal/author/${a.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  const guideRoutes = guides.map((guide) => ({
    url: `${SITE.url}/guides/${guide.slug}`,
    lastModified: new Date(guide.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes, ...articleRoutes, ...authorRoutes, ...guideRoutes];
}
