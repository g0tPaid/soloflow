'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from './types';

export type CartItem = {
  productId: string;
  slug: string;
  title: string;
  price: number;
  image: string;
  variantId: string;
  variantTitle: string;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  addItem: (product: Product, variantId: string, quantity?: number) => void;
  removeItem: (productId: string, variantId: string) => void;
  setQuantity: (productId: string, variantId: string, quantity: number) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
      addItem: (product, variantId, quantity = 1) => {
        const variant =
          product.variants.find((v) => v.id === variantId) || product.variants[0];
        const price = variant?.price ?? product.price;
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === product.id && i.variantId === variantId,
          );
          if (existing) {
            return {
              isOpen: true,
              items: state.items.map((i) =>
                i.productId === product.id && i.variantId === variantId
                  ? { ...i, quantity: i.quantity + quantity }
                  : i,
              ),
            };
          }
          return {
            isOpen: true,
            items: [
              ...state.items,
              {
                productId: product.id,
                slug: product.slug,
                title: product.title,
                price,
                image: product.images[0],
                variantId,
                variantTitle: variant?.title || 'Default',
                quantity,
              },
            ],
          };
        });
      },
      removeItem: (productId, variantId) =>
        set((s) => ({
          items: s.items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId),
          ),
        })),
      setQuantity: (productId, variantId, quantity) =>
        set((s) => ({
          items:
            quantity <= 0
              ? s.items.filter(
                  (i) => !(i.productId === productId && i.variantId === variantId),
                )
              : s.items.map((i) =>
                  i.productId === productId && i.variantId === variantId
                    ? { ...i, quantity }
                    : i,
                ),
        })),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((n, i) => n + i.quantity, 0),
      subtotal: () => get().items.reduce((n, i) => n + i.price * i.quantity, 0),
    }),
    { name: 'pt-cart' },
  ),
);

type WishlistState = {
  ids: string[];
  toggle: (productId: string) => void;
  has: (productId: string) => boolean;
};

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (productId) =>
        set((s) => ({
          ids: s.ids.includes(productId)
            ? s.ids.filter((id) => id !== productId)
            : [...s.ids, productId],
        })),
      has: (productId) => get().ids.includes(productId),
    }),
    { name: 'pt-wishlist' },
  ),
);

type RecentState = {
  slugs: string[];
  add: (slug: string) => void;
};

export const useRecentlyViewed = create<RecentState>()(
  persist(
    (set, get) => ({
      slugs: [],
      add: (slug) => {
        const next = [slug, ...get().slugs.filter((s) => s !== slug)].slice(0, 8);
        set({ slugs: next });
      },
    }),
    { name: 'pt-recent' },
  ),
);
