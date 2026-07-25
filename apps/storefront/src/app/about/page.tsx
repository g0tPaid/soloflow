import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About',
  description:
    'About Practical Things: an editorial storefront for durable, repairable products and long-term ownership.',
  alternates: { canonical: `${SITE.url}/about` },
};

export default function AboutPage() {
  const proofPoints = [
    'We calculate value across years owned, not only checkout price.',
    'We look for repair paths before we celebrate materials.',
    'We treat warranties, spare parts, and maintenance as part of the product.',
  ];

  return (
    <div>
      <section className="relative min-h-[70vh] overflow-hidden bg-foreground">
        <Image
          src="https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=2400&q=80"
          alt=""
          fill
          priority
          className="object-cover opacity-75"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-foreground/35" />
        <div className="relative z-10 flex min-h-[70vh] items-end px-6 pb-16 md:px-12">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/75">
              {SITE.name}
            </p>
            <h1 className="mt-4 font-serif text-5xl text-white md:text-7xl">
              Buy better.
              <br />
              Own longer.
            </h1>
          </div>
        </div>
      </section>

      <section className="container-pt grid gap-12 py-20 md:grid-cols-[0.85fr_1.15fr] md:py-28">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">What we are building</p>
          <h2 className="mt-4 font-serif text-4xl md:text-5xl">
            A storefront for people tired of replacing things.
          </h2>
        </div>
        <div className="prose-pt space-y-5 text-base text-foreground/85">
          <p>
            Cheap products cost more over time. They break, disappoint, and fill landfills. We curate
            objects that earn their keep for decades - tools, bags, cookware, and home goods that
            improve with age.
          </p>
          <p>{SITE.philosophy}</p>
          <p>
            Practical Things is both shop and publication: a place to compare products, read care
            notes, understand ownership cost, and choose fewer things with more confidence.
          </p>
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="container-pt grid gap-12 py-20 md:grid-cols-3 md:py-28">
          {SITE.principles.map((item) => (
            <div key={item.title}>
              <h3 className="font-serif text-2xl">{item.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-pt grid gap-12 py-20 md:grid-cols-2 md:py-28">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">How we earn trust</p>
          <h2 className="mt-4 font-serif text-4xl md:text-5xl">Evidence before enthusiasm.</h2>
        </div>
        <div className="space-y-4">
          {proofPoints.map((point) => (
            <div key={point} className="border border-border bg-card p-5">
              <p className="text-sm leading-7 text-foreground/85">{point}</p>
            </div>
          ))}
          <p className="pt-4 text-sm leading-7 text-muted">
            V1 is intentionally practical: a deep catalog, buying guides, philosophy, and community
            workflows that make long-term ownership easier to evaluate.
          </p>
        </div>
      </section>

      <section className="container-pt py-20 text-center md:py-28">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Begin</p>
        <h2 className="mt-4 font-serif text-4xl md:text-5xl">Start with something lasting</h2>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/shop">
            <Button size="lg">Shop the collection</Button>
          </Link>
          <Link href="/philosophy">
            <Button variant="secondary" size="lg">
              Read the philosophy
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
