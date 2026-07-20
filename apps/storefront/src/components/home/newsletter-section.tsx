import { NewsletterForm } from '@/components/forms/newsletter-form';

export function NewsletterSection() {
  return (
    <section className="border-t border-border bg-card">
      <div className="container-pt grid gap-10 py-24 md:grid-cols-[1.2fr_1fr] md:items-end md:py-32">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Newsletter</p>
          <h2 className="mt-3 font-serif text-4xl md:text-6xl">
            Own less.
            <br />
            Own better.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-muted">
            Occasional notes on materials, repair, and products worth buying once. No spam. No
            noise.
          </p>
        </div>
        <NewsletterForm />
      </div>
    </section>
  );
}
