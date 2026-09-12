import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { guides } from '@/lib/guides';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Buying Guides',
  description:
    'Practical buying guides for choosing durable, repairable products that are built for long-term ownership.',
  alternates: { canonical: `${SITE.url}/guides` },
  openGraph: {
    title: `Buying Guides · ${SITE.name}`,
    description:
      'Durability, repairability, materials, maintenance, and warranty guidance for buying better things.',
    url: `${SITE.url}/guides`,
  },
};

export default function GuidesPage() {
  const featured = guides[0];
  const remaining = guides.slice(1);

  return (
    <div className="container-pt py-14 md:py-20">
      <section className="grid gap-10 border-b border-border pb-14 md:grid-cols-[0.9fr_1.1fr] md:pb-20">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Buying guides</p>
          <h1 className="mt-3 font-serif text-5xl md:text-7xl">Choose with patience.</h1>
        </div>
        <p className="max-w-xl self-end text-base leading-7 text-muted">
          Practical field notes for judging lifespan, repairability, parts support, materials, and
          ownership cost before you buy.
        </p>
      </section>

      <section className="mt-14 md:mt-20">
        <Link
          href={`/guides/${featured.slug}`}
          className="group grid gap-8 bg-card p-6 transition hover:bg-border/25 md:grid-cols-[0.75fr_1.25fr] md:p-10"
        >
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-accent">Featured guide</p>
            <p className="mt-4 text-sm text-muted">
              {new Date(featured.publishedAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}{' '}
              / {featured.readingMinutes} min read
            </p>
          </div>
          <div>
            <h2 className="font-serif text-4xl transition group-hover:text-accent md:text-5xl">
              {featured.title}
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-muted">{featured.excerpt}</p>
            <span className="mt-8 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em]">
              Read guide <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </Link>
      </section>

      <section className="mt-16 grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
        {remaining.map((guide) => (
          <Link
            key={guide.slug}
            href={`/guides/${guide.slug}`}
            className="group flex min-h-[260px] flex-col border-t border-border pt-6"
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
              {guide.readingMinutes} min read
            </p>
            <h2 className="mt-4 font-serif text-3xl leading-tight transition group-hover:text-accent">
              {guide.title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">{guide.excerpt}</p>
            <span className="mt-auto pt-8 text-xs font-medium uppercase tracking-[0.18em] text-foreground">
              Read the checklist
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
