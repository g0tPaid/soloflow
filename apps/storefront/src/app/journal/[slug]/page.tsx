import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { articles, getArticle } from '@/lib/catalog';
import { readingTime } from '@/lib/utils';
import { SITE } from '@/lib/site';
import { authorSlug } from '@/lib/authors';
import { ReadingProgress } from '@/components/journal/reading-progress';
import { JsonLd } from '@/components/seo/json-ld';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: 'Article' };
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.excerpt,
      images: [{ url: article.cover }],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt,
      images: [article.cover],
    },
    alternates: { canonical: `${SITE.url}/journal/${article.slug}` },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();
  const related = articles
    .filter((a) => a.slug !== article.slug && a.tags.some((t) => article.tags.includes(t)))
    .concat(articles.filter((a) => a.slug !== article.slug))
    .filter((a, i, arr) => arr.findIndex((x) => x.slug === a.slug) === i)
    .slice(0, 3);
  const mins = readingTime(article.body.join(' '));

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    image: [article.cover],
    datePublished: article.publishedAt,
    author: {
      '@type': 'Person',
      name: article.author.name,
      url: `${SITE.url}/journal/author/${authorSlug(article.author.name)}`,
    },
    description: article.excerpt,
    publisher: {
      '@type': 'Organization',
      name: SITE.name,
      url: SITE.url,
    },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
      { '@type': 'ListItem', position: 2, name: 'Journal', item: `${SITE.url}/journal` },
      {
        '@type': 'ListItem',
        position: 3,
        name: article.title,
        item: `${SITE.url}/journal/${article.slug}`,
      },
    ],
  };

  return (
    <article className="pb-24">
      <ReadingProgress />
      <JsonLd data={[articleLd, breadcrumbLd]} />
      <div className="relative h-[50vh] min-h-[360px] w-full overflow-hidden bg-foreground">
        <Image
          src={article.cover}
          alt=""
          fill
          priority
          className="object-cover opacity-80"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-foreground/30" />
        <div className="absolute inset-x-0 bottom-0 container-pt pb-12">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/75">
            {article.tags.join(' · ')} · {mins} min read
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl text-white md:text-6xl">
            {article.title}
          </h1>
        </div>
      </div>

      <div className="container-pt mt-12 grid gap-12 lg:grid-cols-[1fr_220px]">
        <div id="article-body">
          <p className="max-w-2xl text-lg leading-relaxed text-muted">{article.excerpt}</p>
          <div className="prose-pt mt-10 space-y-6 text-base text-foreground/90">
            {article.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </div>
        <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          <Link
            href={`/journal/author/${authorSlug(article.author.name)}`}
            className="flex items-center gap-3"
          >
            <div className="relative h-12 w-12 overflow-hidden rounded-full bg-border">
              <Image src={article.author.avatar} alt="" fill className="object-cover" />
            </div>
            <div>
              <p className="text-sm font-medium">{article.author.name}</p>
              <p className="text-xs text-muted">{article.author.role}</p>
            </div>
          </Link>
          <p className="text-xs text-muted">
            Published{' '}
            {new Date(article.publishedAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <Link
                key={tag}
                href={`/journal?tag=${encodeURIComponent(tag)}`}
                className="rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-muted hover:border-foreground hover:text-foreground"
              >
                {tag}
              </Link>
            ))}
          </div>
        </aside>
      </div>

      <div className="container-pt mt-20 border-t border-border pt-12">
        <h2 className="font-serif text-3xl">Related articles</h2>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {related.map((a) => (
            <Link key={a.slug} href={`/journal/${a.slug}`} className="group block">
              <div className="relative aspect-[16/10] overflow-hidden bg-border/40">
                <Image src={a.cover} alt="" fill className="object-cover" sizes="33vw" />
              </div>
              <h3 className="mt-4 font-serif text-2xl group-hover:text-accent">{a.title}</h3>
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}
