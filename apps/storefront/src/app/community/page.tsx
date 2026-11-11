import type { Metadata } from 'next';
import Link from 'next/link';
import { CommunityForms } from '@/components/forms/community-forms';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Community',
  description:
    'Submit durable products, repair stories, ownership photos, and testing suggestions to the Practical Things community.',
  alternates: { canonical: `${SITE.url}/community` },
  openGraph: {
    title: `Community · ${SITE.name}`,
    description:
      'Community evidence for long-term ownership: repair stories, product nominations, patina photos, and guide suggestions.',
    url: `${SITE.url}/community`,
  },
};

const trustNotes = [
  'We separate reader submissions from editorial recommendations.',
  'No product is listed because a brand asks nicely.',
  'Repair evidence and long-term ownership notes carry more weight than launch claims.',
  'We update guides when the community proves a product has changed.',
];

export default function CommunityPage() {
  return (
    <div>
      <section className="container-pt grid gap-12 py-14 md:grid-cols-[1fr_0.75fr] md:py-20">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Community</p>
          <h1 className="mt-4 max-w-4xl font-serif text-5xl leading-none md:text-7xl">
            Real ownership is better than marketing.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-muted">
            Practical Things gets stronger when owners share what happened after checkout: what
            broke, what repaired cleanly, what aged beautifully, and what should never have been
            recommended.
          </p>
        </div>
        <aside className="self-end border-l border-border pl-6">
          <p className="font-serif text-3xl">Trust is built in public.</p>
          <p className="mt-4 text-sm leading-7 text-muted">
            Your submissions help us verify lifespan, parts availability, warranty behavior, and
            real-world durability before we ask anyone else to buy.
          </p>
        </aside>
      </section>

      <section className="border-y border-border bg-card">
        <div className="container-pt grid gap-6 py-10 md:grid-cols-4">
          {trustNotes.map((note) => (
            <p key={note} className="text-sm leading-7 text-foreground/80">
              {note}
            </p>
          ))}
        </div>
      </section>

      <section className="container-pt py-16 md:py-24">
        <div className="mb-10 max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Contribute</p>
          <h2 className="mt-3 font-serif text-4xl md:text-5xl">Send evidence, not hype.</h2>
          <p className="mt-4 text-sm leading-7 text-muted">
            These forms do not submit to a backend yet. They model the community workflows for V1 and
            confirm the information we will collect when submissions go live.
          </p>
        </div>
        <CommunityForms />
      </section>

      <section className="container-pt border-t border-border py-16 text-center">
        <p className="mx-auto max-w-2xl font-serif text-4xl">
          Want to understand how we judge products before submitting one?
        </p>
        <Link
          href="/philosophy"
          className="mt-6 inline-flex text-xs font-medium uppercase tracking-[0.18em] text-accent"
        >
          Read the Practical Things philosophy
        </Link>
      </section>
    </div>
  );
}
