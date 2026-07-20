'use client';

import Link from 'next/link';
import { products } from '@/lib/catalog';
import { useWishlist } from '@/lib/store';
import { ProductCard } from '@/components/product/product-card';
import { Button } from '@/components/ui/button';

export default function WishlistPage() {
  const ids = useWishlist((s) => s.ids);
  const saved = products.filter((p) => ids.includes(p.id));

  return (
    <div className="container-pt py-14 md:py-20">
      <h1 className="font-serif text-5xl">Wishlist</h1>
      {saved.length === 0 ? (
        <div className="mt-12">
          <p className="text-sm text-muted">No saved products yet.</p>
          <Link href="/shop" className="mt-6 inline-block">
            <Button>Browse collection</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
