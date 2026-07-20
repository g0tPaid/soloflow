'use client';

import Image from 'next/image';
import Link from 'next/link';
import { X, Minus, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from '@/lib/store';
import { products } from '@/lib/catalog';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function CartDrawer() {
  const { items, isOpen, close, setQuantity, removeItem, subtotal } = useCart();
  const recommended = products
    .filter((p) => !items.some((i) => i.productId === p.id))
    .slice(0, 2);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close cart"
            className="fixed inset-0 z-[70] bg-foreground/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.aside
            role="dialog"
            aria-modal
            aria-label="Shopping cart"
            className="fixed inset-y-0 right-0 z-[80] flex w-full max-w-md flex-col bg-background shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <h2 className="font-serif text-2xl">Cart</h2>
              <button type="button" onClick={close} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {items.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="font-serif text-3xl">Your cart is empty</p>
                  <p className="mt-3 text-sm text-muted">Start with something built to last.</p>
                  <Link href="/shop" onClick={close} className="mt-8 inline-block">
                    <Button>Shop collection</Button>
                  </Link>
                </div>
              ) : (
                <ul className="space-y-6">
                  {items.map((item) => (
                    <li key={`${item.productId}-${item.variantId}`} className="flex gap-4">
                      <div className="relative h-24 w-20 shrink-0 overflow-hidden bg-border/40">
                        <Image src={item.image} alt={item.title} fill className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Link
                              href={`/products/${item.slug}`}
                              onClick={close}
                              className="font-serif text-xl leading-tight hover:text-accent"
                            >
                              {item.title}
                            </Link>
                            <p className="mt-1 text-xs text-muted">{item.variantTitle}</p>
                          </div>
                          <p className="text-sm tabular-nums">{formatPrice(item.price)}</p>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center border border-border">
                            <button
                              type="button"
                              className="px-3 py-2"
                              aria-label="Decrease"
                              onClick={() =>
                                setQuantity(item.productId, item.variantId, item.quantity - 1)
                              }
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="min-w-8 text-center text-sm tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              className="px-3 py-2"
                              aria-label="Increase"
                              onClick={() =>
                                setQuantity(item.productId, item.variantId, item.quantity + 1)
                              }
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <button
                            type="button"
                            className="text-xs uppercase tracking-[0.14em] text-muted hover:text-error"
                            onClick={() => removeItem(item.productId, item.variantId)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {items.length > 0 && recommended.length > 0 && (
                <div className="mt-12 border-t border-border pt-8">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
                    Recommended
                  </p>
                  <ul className="mt-4 space-y-4">
                    {recommended.map((p) => (
                      <li key={p.id} className="flex items-center gap-3">
                        <div className="relative h-14 w-12 overflow-hidden bg-border/40">
                          <Image src={p.images[0]} alt={p.title} fill className="object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/products/${p.slug}`}
                            onClick={close}
                            className="truncate text-sm hover:text-accent"
                          >
                            {p.title}
                          </Link>
                          <p className="text-xs text-muted">{formatPrice(p.price)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-border px-6 py-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Subtotal</span>
                  <span className="tabular-nums">{formatPrice(subtotal())}</span>
                </div>
                <p className="mt-2 text-xs text-muted">
                  Shipping estimated at checkout. Coupons supported.
                </p>
                <Link href="/checkout" onClick={close} className="mt-5 block">
                  <Button className="w-full" size="lg">
                    Checkout
                  </Button>
                </Link>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
