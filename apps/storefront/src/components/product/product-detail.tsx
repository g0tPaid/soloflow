'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import type { Product, Review } from '@/lib/types';
import { formatPrice, cn } from '@/lib/utils';
import { useCart, useRecentlyViewed, useWishlist } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ProductBadges } from '@/components/ui/badge';
import { BiflScorePanel } from '@/components/ui/score-bar';
import { ProductCard } from '@/components/product/product-card';

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3 className="font-serif text-2xl">{title}</h3>
      <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
        {items.map((item) => (
          <li key={item} className="border-l-2 border-accent/40 pl-4">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProductDetail({
  product,
  related,
  reviews = [],
}: {
  product: Product;
  related: Product[];
  reviews?: Review[];
}) {
  const [activeImage, setActiveImage] = useState(0);
  const [variantId, setVariantId] = useState(product.variants[0]?.id || 'default');
  const [zoomed, setZoomed] = useState(false);
  const addItem = useCart((s) => s.addItem);
  const { toggle, has } = useWishlist();
  const addRecent = useRecentlyViewed((s) => s.add);
  const recentSlugs = useRecentlyViewed((s) => s.slugs);
  const wished = has(product.id);
  const variant = product.variants.find((v) => v.id === variantId);
  const price = variant?.price ?? product.price;
  const years = product.premiumYears || 20;
  const savings = Math.max(0, product.longTermCostCheap - product.longTermCostPremium);

  useEffect(() => {
    addRecent(product.slug);
  }, [product.slug, addRecent]);

  return (
    <div className="container-pt py-10 md:py-16">
      <nav className="mb-8 text-xs text-muted" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href="/shop" className="hover:text-foreground">
              Shop
            </Link>
          </li>
          <li>/</li>
          <li className="text-foreground">{product.title}</li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
        <div>
          <div
            className="relative aspect-[4/5] cursor-zoom-in overflow-hidden rounded-2xl bg-border/40"
            onClick={() => setZoomed((z) => !z)}
          >
            <Image
              src={product.images[activeImage]}
              alt={product.title}
              fill
              priority
              sizes="(max-width:1024px) 100vw, 55vw"
              className={cn(
                'object-cover transition duration-500',
                zoomed && 'scale-150 cursor-zoom-out',
              )}
            />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {product.images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setActiveImage(i)}
                className={cn(
                  'relative aspect-square overflow-hidden rounded-xl border',
                  activeImage === i ? 'border-foreground' : 'border-transparent',
                )}
              >
                <Image src={src} alt="" fill className="object-cover" sizes="120px" />
              </button>
            ))}
          </div>
        </div>

        <div className="lg:sticky lg:top-28 lg:self-start">
          <ProductBadges badges={product.badges} />
          <p className="mt-5 text-[11px] uppercase tracking-[0.18em] text-muted">{product.brand}</p>
          <h1 className="mt-2 font-serif text-4xl md:text-5xl">{product.title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">{product.subtitle}</p>
          <p className="mt-6 text-xl tabular-nums">{formatPrice(price)}</p>

          {product.variants.length > 1 && (
            <div className="mt-8">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Options</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    disabled={!v.available}
                    onClick={() => setVariantId(v.id)}
                    className={cn(
                      'rounded-full border px-4 py-2 text-sm transition',
                      variantId === v.id
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border hover:border-foreground',
                      !v.available && 'opacity-40',
                    )}
                  >
                    {v.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <dl className="mt-8 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted">Expected lifespan</dt>
              <dd className="mt-1 font-medium">{product.expectedLifespan}</dd>
            </div>
            <div>
              <dt className="text-muted">Repairability</dt>
              <dd className="mt-1 font-medium">{product.repairabilityScore}/100</dd>
            </div>
            <div>
              <dt className="text-muted">Warranty</dt>
              <dd className="mt-1 font-medium">{product.warranty}</dd>
            </div>
            <div>
              <dt className="text-muted">Origin</dt>
              <dd className="mt-1 font-medium">{product.countryOfOrigin}</dd>
            </div>
            <div>
              <dt className="text-muted">Materials</dt>
              <dd className="mt-1 font-medium">{product.material}</dd>
            </div>
            <div>
              <dt className="text-muted">Weight</dt>
              <dd className="mt-1 font-medium">
                {product.weightGrams >= 1000
                  ? `${(product.weightGrams / 1000).toFixed(1)} kg`
                  : `${product.weightGrams} g`}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Spare parts</dt>
              <dd className="mt-1 font-medium">
                {product.sparePartsAvailable ? 'Available' : 'Limited'}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Editor&apos;s rating</dt>
              <dd className="mt-1 font-medium">{product.overallRating.toFixed(1)} / 5</dd>
            </div>
          </dl>

          <div className="mt-8 flex gap-3">
            <Button
              size="lg"
              className="flex-1 rounded-full"
              disabled={!product.inStock}
              onClick={() => addItem(product, variantId)}
            >
              Add to cart
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="rounded-full"
              aria-label="Wishlist"
              onClick={() => toggle(product.id)}
            >
              <Heart className={cn('h-4 w-4', wished && 'fill-accent text-accent')} />
            </Button>
          </div>

          <div className="mt-10">
            <BiflScorePanel
              scores={product.scores}
              overall={Math.round(
                (product.scores.lifetime +
                  product.scores.repairability +
                  product.scores.materialQuality +
                  product.scores.manufacturerReputation +
                  product.scores.warranty) /
                  5,
              )}
            />
          </div>
        </div>
      </div>

      <section className="mt-24 grid gap-12 border-t border-border pt-16 md:grid-cols-2">
        <div>
          <h2 className="font-serif text-3xl">The story</h2>
          <p className="prose-pt mt-5">{product.description}</p>
        </div>
        <div>
          <h2 className="font-serif text-3xl">Why we recommend it</h2>
          <p className="prose-pt mt-5">{product.whyWeChose}</p>
        </div>
      </section>

      <section className="mt-20 border-t border-border pt-16">
        <h2 className="font-serif text-3xl">Long-term ownership cost</h2>
        <p className="mt-3 text-sm text-muted">Over {years} years of ownership</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:max-w-3xl">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
              {product.cheapAlternativeName || 'Cheap alternative'}
            </p>
            <p className="mt-3 text-sm text-muted">Replace repeatedly</p>
            <p className="mt-4 font-serif text-3xl">{formatPrice(product.longTermCostCheap)}</p>
          </div>
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-accent">This product</p>
            <p className="mt-3 text-sm text-muted">One lasting purchase</p>
            <p className="mt-4 font-serif text-3xl">{formatPrice(product.longTermCostPremium)}</p>
          </div>
        </div>
        {savings > 0 ? (
          <p className="mt-4 text-sm text-accent">
            Estimated savings over {years} years: {formatPrice(savings)}
          </p>
        ) : null}
      </section>

      <section className="mt-20 grid gap-10 border-t border-border pt-16 md:grid-cols-2">
        <ListBlock title="Pros" items={product.pros} />
        <ListBlock title="Cons" items={product.cons} />
        <ListBlock title="Who should buy" items={product.whoShouldBuy} />
        <ListBlock title="Who shouldn’t buy" items={product.whoShouldNotBuy} />
      </section>

      <section className="mt-20 grid gap-12 border-t border-border pt-16 md:grid-cols-2">
        <div>
          <h2 className="font-serif text-3xl">Maintenance</h2>
          <ul className="mt-5 space-y-3 text-sm leading-relaxed text-muted">
            {product.maintenance.map((item) => (
              <li key={item} className="border-l-2 border-accent pl-4">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-serif text-3xl">Manufacturing & materials</h2>
          <p className="mt-5 text-sm leading-relaxed text-muted">
            Made by {product.manufacturer} in {product.countryOfOrigin}. Primary materials:{' '}
            {(product.materials || [product.material]).join(', ')}.
          </p>
          <p className="mt-4 text-sm text-muted">
            Replacement parts: {product.sparePartsAvailable ? 'supported' : 'limited availability'}.
            Repairable: {product.repairable ? 'yes' : 'limited'}.
          </p>
        </div>
      </section>

      {reviews.length > 0 && (
        <section className="mt-20 border-t border-border pt-16">
          <h2 className="font-serif text-3xl">Community reviews</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <figure key={review.id} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-1 text-accent" aria-label={`${review.rating} stars`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={i < review.rating ? 'opacity-100' : 'opacity-25'}>
                      ★
                    </span>
                  ))}
                </div>
                <blockquote className="mt-4 font-serif text-xl leading-snug">
                  “{review.quote}”
                </blockquote>
                <figcaption className="mt-5 text-sm text-muted">
                  <span className="text-foreground">{review.name}</span>
                  <span className="mx-2">·</span>
                  {review.location}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {product.faq.length > 0 && (
        <section className="mt-20 border-t border-border pt-16">
          <h2 className="font-serif text-3xl">FAQ</h2>
          <dl className="mt-8 divide-y divide-border">
            {product.faq.map((item) => (
              <div key={item.q} className="py-6">
                <dt className="font-medium">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="mt-24">
        <h2 className="font-serif text-3xl">Related products</h2>
        <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {recentSlugs.filter((s) => s !== product.slug).length > 0 && (
        <section className="mt-20">
          <h2 className="font-serif text-3xl">Recently viewed</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {recentSlugs
              .filter((s) => s !== product.slug)
              .slice(0, 6)
              .map((slug) => (
                <Link
                  key={slug}
                  href={`/products/${slug}`}
                  className="rounded-full border border-border px-4 py-2 text-sm hover:border-foreground"
                >
                  {slug.replace(/-/g, ' ')}
                </Link>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
