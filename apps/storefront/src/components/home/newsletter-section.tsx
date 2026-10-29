import { NewsletterForm } from '@/components/forms/newsletter-form';
import { SITE } from '@/lib/site';

export function NewsletterSection() {
  return (
    <section className="border-t border-border bg-card">
      <div className="container-pt grid gap-10 py-24 md:grid-cols-[1.2fr_1fr] md:items-end md:py-32">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">
            {SITE.newsletter.eyebrow}
          </p>
          <h2 className="mt-3 font-serif text-4xl md:text-6xl">
            {SITE.newsletter.title.split(' ').slice(0, 2).join(' ')}
            <br />
            {SITE.newsletter.title.split(' ').slice(2).join(' ')}
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-muted">
            {SITE.newsletter.description}
          </p>
        </div>
        <NewsletterForm />
      </div>
    </section>
  );
}
