import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ShopCatalog } from '@/components/shop/shop-catalog';

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Browse Buy It For Life products — kitchen, tools, travel, office, home, and outdoor.',
};

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="container-pt py-20 text-muted">Loading collection…</div>}>
      <ShopCatalog />
    </Suspense>
  );
}
