import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { articles } from '@/lib/catalog';
import { readingTime } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Journal',
  description: 'Essays on materials, repair, and things worth buying once.',
};

export default function JournalPage() {
  return (
    <div className="container-pt py-14 md:py-20">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Journal</p>
        <h1 className="mt-3 font-serif text-5xl md:text-6xl">Read slowly</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          A magazine for people who prefer permanence over novelty.
        </p>
      </div>
      <div className="mt-14 grid gap-12 md:grid-cols-2">
        {articles.map((article) => (
          <Link key={article.slug} href={`/journal/${article.slug}`} className="group block">
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
        ))}
      </div>
    </div>
  );
}
