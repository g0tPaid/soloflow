'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Article } from '@/lib/types';
import { readingTime, cn } from '@/lib/utils';
import { authorSlug } from '@/lib/authors';

export function JournalIndex({ articles }: { articles: Article[] }) {
  const params = useSearchParams();
  const initialTag = params.get('tag') || 'all';
  const [tag, setTag] = useState(initialTag);
  const [query, setQuery] = useState('');

  const tags = useMemo(
    () => Array.from(new Set(articles.flatMap((a) => a.tags))).sort(),
    [articles],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((a) => {
      if (tag !== 'all' && !a.tags.includes(tag)) return false;
      if (!q) return true;
      return [a.title, a.excerpt, a.author.name, ...a.tags].join(' ').toLowerCase().includes(q);
    });
  }, [articles, tag, query]);

  return (
    <div className="container-pt py-14 md:py-20">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Journal</p>
        <h1 className="mt-3 font-serif text-5xl md:text-6xl">Read slowly</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Buying guides, maintenance notes, and essays on permanence.
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-6 border-b border-border pb-8 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-wrap gap-2">
          <TagChip active={tag === 'all'} onClick={() => setTag('all')}>
            All
          </TagChip>
          {tags.map((t) => (
            <TagChip key={t} active={tag === t} onClick={() => setTag(t)}>
              {t}
            </TagChip>
          ))}
        </div>
        <label className="block w-full max-w-sm">
          <span className="sr-only">Search journal</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles…"
            className="h-11 w-full border border-border bg-background px-4 text-sm outline-none focus:border-foreground"
          />
        </label>
      </div>

      <div className="mt-12 grid gap-12 md:grid-cols-2">
        {filtered.map((article) => (
          <article key={article.slug} className="group">
            <Link href={`/journal/${article.slug}`} className="block">
              <div className="relative aspect-[16/10] overflow-hidden bg-border/40">
                <Image
                  src={article.cover}
                  alt=""
                  fill
                  className="object-cover transition duration-700 group-hover:scale-[1.02]"
                  sizes="(max-width:768px) 100vw, 50vw"
                />
              </div>
              <p className="mt-5 text-[11px] uppercase tracking-[0.16em] text-muted">
                {article.tags[0]} · {readingTime(article.body.join(' '))} min
              </p>
              <h2 className="mt-2 font-serif text-3xl group-hover:text-accent">{article.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{article.excerpt}</p>
            </Link>
            <p className="mt-4 text-sm text-muted">
              By{' '}
              <Link
                href={`/journal/author/${authorSlug(article.author.name)}`}
                className="text-foreground underline-offset-4 hover:underline"
              >
                {article.author.name}
              </Link>
            </p>
          </article>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="py-20 text-center text-muted">No articles match this search.</p>
      )}
    </div>
  );
}

function TagChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-4 py-2 text-xs uppercase tracking-[0.14em] transition',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-border text-muted hover:border-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
