'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { products as allProducts, categories } from '@/lib/catalog';
import type { Product } from '@/lib/types';
import { ProductCard } from '@/components/product/product-card';
import { cn } from '@/lib/utils';

type SortKey = 'newest' | 'rating' | 'warranty' | 'editors';

function warrantyRank(warranty: string) {
  const w = warranty.toLowerCase();
  if (w.includes('lifetime')) return 100;
  const years = parseInt(w, 10);
  return Number.isFinite(years) ? years : 0;
}

export function ShopCatalog() {
  const params = useSearchParams();
  const initialCategory = params.get('category') || 'all';

  const [category, setCategory] = useState(initialCategory);
  const [material, setMaterial] = useState('all');
  const [country, setCountry] = useState('all');
  const [brand, setBrand] = useState('all');
  const [minScore, setMinScore] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('editors');

  const materials = useMemo(
    () => Array.from(new Set(allProducts.map((p) => p.material))).sort(),
    [],
  );
  const countries = useMemo(
    () => Array.from(new Set(allProducts.map((p) => p.countryOfOrigin))).sort(),
    [],
  );
  const brands = useMemo(
    () => Array.from(new Set(allProducts.map((p) => p.brand))).sort(),
    [],
  );

  const filtered = useMemo(() => {
    let list: Product[] = [...allProducts];
    if (category !== 'all') list = list.filter((p) => p.category === category);
    if (material !== 'all') list = list.filter((p) => p.material === material);
    if (country !== 'all') list = list.filter((p) => p.countryOfOrigin === country);
    if (brand !== 'all') list = list.filter((p) => p.brand === brand);
    if (minScore > 0) list = list.filter((p) => p.lifetimeScore >= minScore);
    list = list.filter((p) => p.price <= maxPrice);
    if (inStockOnly) list = list.filter((p) => p.inStock);

    list.sort((a, b) => {
      if (sort === 'rating') return b.overallRating - a.overallRating;
      if (sort === 'warranty') return warrantyRank(b.warranty) - warrantyRank(a.warranty);
      if (sort === 'editors') return Number(b.editorPick) - Number(a.editorPick) || b.lifetimeScore - a.lifetimeScore;
      return b.id.localeCompare(a.id);
    });
    return list;
  }, [category, material, country, brand, minScore, maxPrice, inStockOnly, sort]);

  return (
    <div className="container-pt py-14 md:py-20">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Shop</p>
        <h1 className="mt-3 font-serif text-5xl md:text-6xl">The collection</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Every product is scored for lifetime durability, repairability, and craft. No gimmicks.
        </p>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-8 lg:sticky lg:top-28 lg:self-start">
          <FilterGroup label="Category">
            <Select
              value={category}
              onChange={setCategory}
              options={[
                { value: 'all', label: 'All' },
                ...categories.map((c) => ({ value: c.slug, label: c.title })),
              ]}
            />
          </FilterGroup>
          <FilterGroup label="Material">
            <Select
              value={material}
              onChange={setMaterial}
              options={[
                { value: 'all', label: 'All' },
                ...materials.map((m) => ({ value: m, label: m })),
              ]}
            />
          </FilterGroup>
          <FilterGroup label="Country">
            <Select
              value={country}
              onChange={setCountry}
              options={[
                { value: 'all', label: 'All' },
                ...countries.map((c) => ({ value: c, label: c })),
              ]}
            />
          </FilterGroup>
          <FilterGroup label="Brand">
            <Select
              value={brand}
              onChange={setBrand}
              options={[
                { value: 'all', label: 'All' },
                ...brands.map((b) => ({ value: b, label: b })),
              ]}
            />
          </FilterGroup>
          <FilterGroup label={`Lifetime score · ${minScore}+`}>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </FilterGroup>
          <FilterGroup label={`Price up to $${maxPrice}`}>
            <input
              type="range"
              min={40}
              max={500}
              step={10}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </FilterGroup>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="accent-accent"
            />
            In stock only
          </label>
        </aside>

        <div>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
            <p className="text-sm text-muted">{filtered.length} products</p>
            <label className="flex items-center gap-3 text-sm">
              <span className="text-muted">Sort</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="h-10 border border-border bg-background px-3 text-sm outline-none"
              >
                <option value="editors">Editor&apos;s picks</option>
                <option value="newest">Newest</option>
                <option value="rating">Best rated</option>
                <option value="warranty">Longest warranty</option>
              </select>
            </label>
          </div>
          <div className="grid gap-x-6 gap-y-14 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="py-20 text-center text-muted">No products match these filters.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted">{label}</p>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn('h-11 w-full border border-border bg-background px-3 text-sm outline-none')}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
