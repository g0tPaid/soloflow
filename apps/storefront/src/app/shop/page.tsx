import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ShopCatalog } from '@/components/shop/shop-catalog';

export const metadata: Metadata = {
  title: 'Shop',
  description:
    'Browse Buy It For Life products across kitchen, tools, travel, office, outdoors, home, and more.',
};

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="container-pt py-20 text-muted">Loading collection…</div>}>
      <ShopCatalog />
    </Suspense>
  );
}
