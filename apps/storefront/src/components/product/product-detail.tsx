'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import type { Product } from '@/lib/types';
import { formatPrice, cn } from '@/lib/utils';
import { useCart, useRecentlyViewed, useWishlist } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ProductBadges } from '@/components/ui/badge';
import { BiflScorePanel } from '@/components/ui/score-bar';
import { ProductCard } from '@/components/product/product-card';

export function ProductDetail({
  product,
  related,
}: {
  product: Product;
  related: Product[];
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
            className="relative aspect-[4/5] cursor-zoom-in overflow-hidden bg-border/40"
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
                  'relative aspect-square overflow-hidden border',
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
          <p className="mt-5 text-[11px] uppercase tracking-[0.18em] text-muted">
            {product.brand}
          </p>
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
                      'border px-4 py-2 text-sm transition',
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

          <div className="mt-8 grid gap-3 text-sm text-muted">
            <p>
              <span className="text-foreground">Stock:</span>{' '}
              {product.inStock ? 'In stock' : 'Sold out'}
            </p>
            <p>
              <span className="text-foreground">Shipping:</span>{' '}
              {product.shippingNote || 'Calculated at checkout'}
            </p>
            <p>
              <span className="text-foreground">Material:</span> {product.material}
            </p>
            <p>
              <span className="text-foreground">Origin:</span> {product.countryOfOrigin}
            </p>
            <p>
              <span className="text-foreground">Manufacturer:</span> {product.manufacturer}
            </p>
            <p>
              <span className="text-foreground">Warranty:</span> {product.warranty}
            </p>
          </div>

          <div className="mt-8 flex gap-3">
            <Button
              size="lg"
              className="flex-1"
              disabled={!product.inStock}
              onClick={() => addItem(product, variantId)}
            >
              Add to cart
            </Button>
            <Button
              size="lg"
              variant="secondary"
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
          <h2 className="font-serif text-3xl">Why we chose this</h2>
          <p className="prose-pt mt-5">{product.whyWeChose}</p>
          <p className="prose-pt mt-4">{product.description}</p>
        </div>
        <div>
          <h2 className="font-serif text-3xl">Maintenance</h2>
          <ul className="mt-5 space-y-3 text-sm leading-relaxed text-muted">
            {product.maintenance.map((item) => (
              <li key={item} className="border-l-2 border-accent pl-4">
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-10 aspect-video border border-border bg-border/30">
            <div className="flex h-full items-center justify-center text-sm text-muted">
              Product film coming soon
            </div>
          </div>
        </div>
      </section>

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
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
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
                  className="border border-border px-4 py-2 text-sm hover:border-foreground"
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
