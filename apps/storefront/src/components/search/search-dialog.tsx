'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { searchCatalog } from '@/lib/catalog';
import { formatPrice } from '@/lib/utils';

export function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchCatalog(query), [query]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-start justify-center bg-foreground/25 px-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            role="dialog"
            aria-modal
            aria-label="Search"
            className="w-full max-w-xl overflow-hidden border border-border bg-background shadow-2xl"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="h-4 w-4 text-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search brand, material, category…"
                className="h-14 w-full bg-transparent text-sm outline-none placeholder:text-muted"
              />
              <button type="button" aria-label="Close search" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {!query.trim() && (
                <p className="px-3 py-8 text-center text-sm text-muted">
                  Search by brand, material, category, product, or country.
                </p>
              )}
              {query.trim() && results.products.length === 0 && results.articles.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-muted">No results.</p>
              )}
              {results.products.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between gap-4 px-3 py-3 text-sm hover:bg-border/40"
                >
                  <span>
                    <span className="block">{p.title}</span>
                    <span className="text-xs text-muted">
                      {p.brand} · {p.material}
                    </span>
                  </span>
                  <span className="tabular-nums text-muted">{formatPrice(p.price)}</span>
                </Link>
              ))}
              {results.articles.map((a) => (
                <Link
                  key={a.slug}
                  href={`/journal/${a.slug}`}
                  onClick={() => onOpenChange(false)}
                  className="block px-3 py-3 text-sm hover:bg-border/40"
                >
                  <span className="block">{a.title}</span>
                  <span className="text-xs text-muted">Journal</span>
                </Link>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
