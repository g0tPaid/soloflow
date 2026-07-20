import Link from 'next/link';
import type { Product } from '@/lib/types';
import { ProductCard } from '@/components/product/product-card';

export function FeaturedProducts({ products }: { products: Product[] }) {
  return (
    <section className="container-pt py-24 md:py-32">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Curated</p>
          <h2 className="mt-3 font-serif text-4xl md:text-5xl">Featured products</h2>
        </div>
        <Link
          href="/shop"
          className="text-[11px] uppercase tracking-[0.18em] text-muted hover:text-foreground"
        >
          Shop all
        </Link>
      </div>
      <div className="mt-12 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} priority={i < 2} />
        ))}
      </div>
    </section>
  );
}
