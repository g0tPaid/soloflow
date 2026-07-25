'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Product } from '@/lib/types';
import { formatPrice, cn } from '@/lib/utils';
import { useWishlist } from '@/lib/store';
import { ProductBadges } from '@/components/ui/badge';

export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const { toggle, has } = useWishlist();
  const wished = has(product.id);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="group flex h-full flex-col"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-border/30">
        <Link href={`/products/${product.slug}`} className="absolute inset-0">
          <Image
            src={product.images[0]}
            alt={product.title}
            fill
            priority={priority}
            sizes="(max-width:768px) 100vw, 33vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        </Link>
        <div className="absolute left-3 top-3 z-10">
          <ProductBadges badges={product.badges.slice(0, 2)} />
        </div>
        <button
          type="button"
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          onClick={() => toggle(product.id)}
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-card/95 text-foreground transition hover:text-accent"
        >
          <Heart className={cn('h-4 w-4', wished && 'fill-accent text-accent')} />
        </button>
      </div>

      <div className="mt-5 flex flex-1 flex-col gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{product.brand}</p>
          <Link href={`/products/${product.slug}`}>
            <h3 className="mt-1 font-serif text-2xl leading-tight text-foreground transition hover:text-accent">
              {product.title}
            </h3>
          </Link>
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-muted">
          <div>
            <dt className="uppercase tracking-[0.14em]">Lifespan</dt>
            <dd className="mt-1 text-sm text-foreground">{product.expectedLifespan}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-[0.14em]">Repairability</dt>
            <dd className="mt-1 text-sm text-foreground">{product.repairabilityScore}/100</dd>
          </div>
          <div>
            <dt className="uppercase tracking-[0.14em]">Warranty</dt>
            <dd className="mt-1 text-sm text-foreground">{product.warranty}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-[0.14em]">Origin</dt>
            <dd className="mt-1 text-sm text-foreground">{product.countryOfOrigin}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-[0.14em]">Editor</dt>
            <dd className="mt-1 text-sm text-foreground">{product.overallRating.toFixed(1)} / 5</dd>
          </div>
          <div>
            <dt className="uppercase tracking-[0.14em]">Materials</dt>
            <dd className="mt-1 text-sm text-foreground">{product.material}</dd>
          </div>
        </dl>

        <p className="mt-auto pt-2 font-medium text-foreground">{formatPrice(product.price)}</p>
      </div>
    </motion.article>
  );
}
