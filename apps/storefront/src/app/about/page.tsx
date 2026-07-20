import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Why Practical Things exists — quality, longevity, repairability, and buying less.',
};

export default function AboutPage() {
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
              Practical Things
            </p>
            <h1 className="mt-4 font-serif text-5xl text-white md:text-7xl">
              Buy once.
              <br />
              Buy better.
            </h1>
          </div>
        </div>
      </section>

      <section className="container-pt grid gap-12 py-20 md:grid-cols-2 md:py-28">
        <h2 className="font-serif text-4xl md:text-5xl">Why quality matters</h2>
        <div className="prose-pt space-y-5 text-base text-foreground/85">
          <p>
            Cheap products cost more over time. They break, disappoint, and fill landfills. We
            curate objects that earn their keep for decades — tools, bags, cookware, and home goods
            that improve with age.
          </p>
          <p>
            Every product must answer one question: will this still be useful in 20 years? If the
            answer is no, it does not belong here.
          </p>
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="container-pt grid gap-12 py-20 md:grid-cols-3 md:py-28">
          {[
            {
              title: 'Buying less saves money',
              body: 'A $400 bag that lasts twenty years costs less than five $80 bags that fail.',
            },
            {
              title: 'Sustainability is longevity',
              body: 'The greenest product is the one you do not replace. Repairability is non-negotiable.',
            },
            {
              title: 'Craft over trend',
              body: 'Timeless design ages into character. Trends age into regret.',
            },
          ].map((item) => (
            <div key={item.title}>
              <h3 className="font-serif text-2xl">{item.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-pt py-20 text-center md:py-28">
        <h2 className="font-serif text-4xl md:text-5xl">Start with something lasting</h2>
        <Link href="/shop" className="mt-8 inline-block">
          <Button size="lg">Shop the collection</Button>
        </Link>
      </section>
    </div>
  );
}
