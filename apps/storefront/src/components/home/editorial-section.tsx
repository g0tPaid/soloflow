import Image from 'next/image';
import Link from 'next/link';
import type { Article } from '@/lib/types';
import { readingTime } from '@/lib/utils';

export function EditorialSection({ articles }: { articles: Article[] }) {
  const [lead, ...rest] = articles;
  return (
    <section className="border-y border-border bg-card">
      <div className="container-pt py-24 md:py-32">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Journal</p>
            <h2 className="mt-3 font-serif text-4xl md:text-5xl">Editorial</h2>
          </div>
          <Link
            href="/journal"
            className="text-[11px] uppercase tracking-[0.18em] text-muted hover:text-foreground"
          >
            Read more
          </Link>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          {lead && (
            <Link href={`/journal/${lead.slug}`} className="group block">
              <div className="relative aspect-[16/10] overflow-hidden bg-border/40">
                <Image
                  src={lead.cover}
                  alt={lead.title}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-[1.02]"
                  sizes="(max-width:1024px) 100vw, 60vw"
                />
              </div>
              <p className="mt-5 text-[11px] uppercase tracking-[0.18em] text-muted">
                {lead.tags[0]} · {readingTime(lead.body.join(' '))} min read
              </p>
              <h3 className="mt-3 font-serif text-3xl md:text-4xl group-hover:text-accent">
                {lead.title}
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{lead.excerpt}</p>
            </Link>
          )}
          <div className="flex flex-col justify-between gap-8 border-t border-border pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            {rest.slice(0, 4).map((article) => (
              <Link key={article.slug} href={`/journal/${article.slug}`} className="group block">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
                  {article.tags[0]}
                </p>
                <h3 className="mt-2 font-serif text-2xl leading-snug group-hover:text-accent">
                  {article.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm text-muted">{article.excerpt}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
