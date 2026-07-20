'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Product } from '@/lib/types';
import { formatPrice, cn } from '@/lib/utils';
import { useCart, useWishlist } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ProductBadges } from '@/components/ui/badge';

export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const addItem = useCart((s) => s.addItem);
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
      <div className="relative aspect-[4/5] overflow-hidden bg-border/40">
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
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center bg-background/90 text-foreground transition hover:text-accent"
        >
          <Heart className={cn('h-4 w-4', wished && 'fill-accent text-accent')} />
        </button>
        <div className="absolute inset-x-3 bottom-3 z-10 flex translate-y-2 gap-2 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 max-md:translate-y-0 max-md:opacity-100">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => addItem(product, product.variants[0]?.id || 'default')}
          >
            Add to cart
          </Button>
          <Link
            href={`/products/${product.slug}`}
            className="flex h-10 w-10 items-center justify-center border border-border bg-background"
            aria-label="Quick view"
          >
            <Eye className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="mt-5 flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
              {product.brand}
            </p>
            <Link href={`/products/${product.slug}`}>
              <h3 className="mt-1 font-serif text-2xl leading-tight text-foreground transition hover:text-accent">
                {product.title}
              </h3>
            </Link>
          </div>
          <p className="pt-1 text-sm tabular-nums">{formatPrice(product.price)}</p>
        </div>
        <p className="text-sm text-muted">{product.material}</p>
        <div className="mt-auto flex items-center gap-4 pt-2 text-[11px] uppercase tracking-[0.14em] text-muted">
          <span>Lifetime {product.lifetimeScore}</span>
          <span>Warranty {product.warranty}</span>
        </div>
      </div>
    </motion.article>
  );
}
