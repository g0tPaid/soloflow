/**
 * Sanity CMS client stub.
 * Set NEXT_PUBLIC_SANITY_PROJECT_ID + NEXT_PUBLIC_SANITY_DATASET + SANITY_API_TOKEN.
 */

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01';
const token = process.env.SANITY_API_TOKEN;

export function isSanityConfigured() {
  return Boolean(projectId);
}

export async function sanityFetch<T>(query: string, params: Record<string, unknown> = {}) {
  if (!isSanityConfigured()) return null as T | null;

  const search = new URLSearchParams({
    query,
    ...(Object.keys(params).length ? { $params: JSON.stringify(params) } : {}),
  });

  const res = await fetch(
    `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?${search}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      next: { revalidate: 60 },
    },
  );

  if (!res.ok) throw new Error(`Sanity error ${res.status}`);
  const json = await res.json();
  return json.result as T;
}

export const homepageQuery = `*[_type == "homepage"][0]{
  heroHeadline, heroSubhead, heroImage, featuredCategoryIds
}`;

export const articlesQuery = `*[_type == "article"]|order(publishedAt desc){
  title, "slug": slug.current, excerpt, cover, publishedAt, author->{name, role}
}`;
