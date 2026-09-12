import { articles } from '@/lib/catalog';
import type { Article } from '@/lib/types';

export function authorSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function getAuthors() {
  const map = new Map<string, Article['author'] & { slug: string; articles: Article[] }>();
  for (const article of articles) {
    const slug = authorSlug(article.author.name);
    const existing = map.get(slug);
    if (existing) {
      existing.articles.push(article);
    } else {
      map.set(slug, { ...article.author, slug, articles: [article] });
    }
  }
  return Array.from(map.values());
}

export function getAuthor(slug: string) {
  return getAuthors().find((a) => a.slug === slug);
}
