import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { getProduct } from '@/lib/catalog';
import { getGuide, guides } from '@/lib/guides';
import { SITE } from '@/lib/site';
import { formatPrice } from '@/lib/utils';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: 'Guide' };

  return {
    title: guide.seoTitle,
    description: guide.seoDescription,
    alternates: { canonical: `${SITE.url}/guides/${guide.slug}` },
    openGraph: {
      type: 'article',
      title: guide.seoTitle,
      description: guide.seoDescription,
      url: `${SITE.url}/guides/${guide.slug}`,
    },
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const relatedProducts = guide.relatedProductSlugs
    .map((productSlug) => getProduct(productSlug))
    .filter((product): product is NonNullable<typeof product> => Boolean(product));

  const relatedGuides = guides.filter((item) => item.slug !== guide.slug).slice(0, 3);

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: guide.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.seoDescription,
    datePublished: guide.publishedAt,
    author: { '@type': 'Organization', name: SITE.name },
    publisher: { '@type': 'Organization', name: SITE.name },
    mainEntityOfPage: `${SITE.url}/guides/${guide.slug}`,
  };

  return (
    <article className="pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([articleJsonLd, faqJsonLd]) }}
      />

      <header className="container-pt py-14 md:py-20">
        <Link
          href="/guides"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Guides
        </Link>
        <div className="mt-10 grid gap-10 md:grid-cols-[1fr_240px]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-accent">
              Buying guide / {guide.readingMinutes} min read
            </p>
            <h1 className="mt-4 max-w-4xl font-serif text-5xl leading-none md:text-7xl">
              {guide.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">{guide.intro}</p>
          </div>
          <aside className="border-t border-border pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Published</p>
            <p className="mt-2 text-sm text-foreground">
              {new Date(guide.publishedAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-muted">
              Practical standard
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground/80">
              Durability, repairability, materials, warranty, and long-term cost.
            </p>
          </aside>
        </div>
      </header>

      <div className="border-y border-border bg-card">
        <div className="container-pt py-10">
          <p className="max-w-3xl font-serif text-3xl leading-snug md:text-4xl">{guide.excerpt}</p>
        </div>
      </div>

      <div className="container-pt mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-14">
          {guide.sections.map((section) => (
            <section key={section.h2} className="border-t border-border pt-8">
              <h2 className="font-serif text-4xl">{section.h2}</h2>
              <div className="prose-pt mt-6 text-base text-foreground/85">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}

          <section className="border-t border-border pt-8">
            <h2 className="font-serif text-4xl">Common questions</h2>
            <div className="mt-6 divide-y divide-border">
              {guide.faqs.map((faq) => (
                <div key={faq.q} className="py-6">
                  <h3 className="font-serif text-2xl">{faq.q}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted">{faq.a}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-10 lg:sticky lg:top-28 lg:self-start">
          {relatedProducts.length > 0 && (
            <section>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
                Related products
              </p>
              <div className="mt-4 space-y-4">
                {relatedProducts.map((product) => (
                  <Link
                    key={product.slug}
                    href={`/products/${product.slug}`}
                    className="group block border border-border bg-card p-5 transition hover:border-accent"
                  >
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
                      {product.brand}
                    </p>
                    <h3 className="mt-2 font-serif text-2xl group-hover:text-accent">
                      {product.title}
                    </h3>
                    <p className="mt-3 text-sm text-muted">
                      {product.expectedLifespan} / {product.repairabilityScore}/100 repairability
                    </p>
                    <p className="mt-4 text-sm font-medium">{formatPrice(product.price)}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted">More guides</p>
            <div className="mt-4 space-y-4">
              {relatedGuides.map((item) => (
                <Link
                  key={item.slug}
                  href={`/guides/${item.slug}`}
                  className="group flex items-start justify-between gap-4 border-t border-border pt-4"
                >
                  <span className="font-serif text-xl leading-tight group-hover:text-accent">
                    {item.title}
                  </span>
                  <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted" />
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </article>
  );
}
