import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Philosophy',
  description:
    'The Practical Things philosophy: buy less, avoid planned obsolescence, repair what matters, and choose timeless products built with craft.',
  alternates: { canonical: `${SITE.url}/philosophy` },
  openGraph: {
    title: `Philosophy · ${SITE.name}`,
    description:
      'A practical argument for durable design, repairability, craftsmanship, and buying fewer better things.',
    url: `${SITE.url}/philosophy`,
  },
};

const chapters = [
  {
    eyebrow: '01',
    title: 'Against planned obsolescence',
    body: 'Most things do not fail all at once. They are designed around weak hinges, sealed batteries, unsupported parts, thin finishes, and trend cycles that make replacement feel normal. We start by asking what will wear first - and whether the maker expects you to repair it.',
  },
  {
    eyebrow: '02',
    title: 'Repairability is respect',
    body: 'A product that can be opened, cleaned, resoled, reseasoned, rewired, or serviced treats ownership as a relationship. Screws, gaskets, standard parts, and published care paths are not small details. They are how useful objects stay useful.',
  },
  {
    eyebrow: '03',
    title: 'Buying less is the luxury',
    body: 'The goal is not a house full of premium goods. It is fewer purchases, made with more care. A lasting object should remove friction from daily life, not become another thing to manage, upgrade, or explain.',
  },
  {
    eyebrow: '04',
    title: 'Environment follows lifespan',
    body: 'The greenest product is rarely the one with the loudest label. Materials, shipping, packaging, repair, and end-of-life all matter, but lifespan changes the math. When something works for decades, the cost to the planet is spread across years of service.',
  },
  {
    eyebrow: '05',
    title: 'Craftsmanship over novelty',
    body: 'Craft is visible in the joinery, the stitching, the balance, the tolerance, the finish, and the way a product ages. We prefer quiet excellence: forms that do their job well and invite maintenance instead of replacement.',
  },
  {
    eyebrow: '06',
    title: 'Timeless design earns patience',
    body: 'Timeless does not mean plain. It means proportion, materials, and utility that still make sense after the campaign ends. We look for products that feel better with patina, not worse when the next season arrives.',
  },
];

const standards = [
  'Serviceable wear parts',
  'Materials with honest aging',
  'Warranty terms that can actually be used',
  'Manufacturers with long-term parts support',
  'Designs that avoid trend dependence',
  'Clear maintenance instructions',
];

export default function PhilosophyPage() {
  return (
    <div className="bg-background">
      <section className="container-pt grid min-h-[78vh] items-end gap-12 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted">Our philosophy</p>
          <h1 className="mt-5 max-w-4xl font-serif text-6xl leading-[0.92] md:text-8xl">
            Buy less. Repair more. Keep what works.
          </h1>
        </div>
        <div className="border-l border-border pl-6 md:mb-4">
          <p className="max-w-md text-lg leading-relaxed text-foreground/80">{SITE.philosophy}</p>
          <p className="mt-6 text-sm leading-relaxed text-muted">
            Practical Things exists for people who want the calm of owning fewer objects - each one
            useful, repairable, beautiful, and worthy of long service.
          </p>
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="container-pt grid gap-10 py-16 md:grid-cols-[0.85fr_1.15fr] md:py-24">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted">The problem</p>
            <h2 className="mt-4 font-serif text-4xl md:text-5xl">Replacement has been made easy.</h2>
          </div>
          <div className="prose-pt text-base text-foreground/85">
            <p>
              Modern shopping rewards speed: fast launches, fast checkout, fast disappointment. A
              cracked part, a dead battery, a missing seal, or a discontinued component can turn a
              useful object into waste.
            </p>
            <p>
              Our work is slower. We study how products fail, what can be maintained, whether parts
              exist, and whether the design will still feel resolved years from now.
            </p>
          </div>
        </div>
      </section>

      <section className="container-pt py-20 md:py-28">
        <div className="grid gap-x-12 gap-y-16 md:grid-cols-2">
          {chapters.map((chapter) => (
            <article key={chapter.title} className="border-t border-border pt-6">
              <p className="text-[11px] uppercase tracking-[0.22em] text-accent">{chapter.eyebrow}</p>
              <h2 className="mt-4 font-serif text-4xl">{chapter.title}</h2>
              <p className="mt-5 text-sm leading-7 text-muted">{chapter.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-foreground text-background">
        <div className="container-pt grid gap-12 py-20 md:grid-cols-[1fr_1.2fr] md:py-28">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-background/60">
              Our buying standard
            </p>
            <h2 className="mt-4 font-serif text-5xl">A thing must earn its place.</h2>
            <p className="mt-6 max-w-md text-sm leading-7 text-background/70">
              We do not confuse expensive with enduring. Every recommendation has to make a practical
              case for long-term ownership.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {standards.map((standard) => (
              <div key={standard} className="border border-background/15 bg-background/5 p-5">
                <p className="text-sm text-background/90">{standard}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-pt py-20 text-center md:py-28">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted">{SITE.name}</p>
        <h2 className="mx-auto mt-4 max-w-3xl font-serif text-5xl md:text-6xl">
          Start with the objects you use every day.
        </h2>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/shop">
            <Button size="lg">Shop lasting things</Button>
          </Link>
          <Link href="/guides">
            <Button variant="secondary" size="lg">
              Read the guides
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
