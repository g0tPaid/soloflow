'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, Search, ShoppingBag, Heart, X } from 'lucide-react';
import { SITE } from '@/lib/site';
import { useCart, useWishlist } from '@/lib/store';
import { cn } from '@/lib/utils';
import { SearchDialog } from '@/components/search/search-dialog';

const nav = [
  { href: '/shop', label: 'Shop' },
  { href: '/journal', label: 'Journal' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const openCart = useCart((s) => s.open);
  const cartCount = useCart((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const wishCount = useWishlist((s) => s.ids.length);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 border-b transition-colors duration-300',
          scrolled
            ? 'border-border bg-background/95 backdrop-blur-sm'
            : 'border-transparent bg-background',
        )}
      >
        <div className="container-pt flex h-16 items-center justify-between md:h-20">
          <button
            type="button"
            className="md:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <nav className="hidden items-center gap-8 md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[12px] font-medium uppercase tracking-[0.18em] text-muted transition hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link href="/" className="absolute left-1/2 -translate-x-1/2 text-center">
            <span className="font-serif text-2xl tracking-tight md:text-[1.75rem]">
              {SITE.name}
            </span>
          </Link>

          <div className="flex items-center gap-1 md:gap-2">
            <button
              type="button"
              aria-label="Search"
              className="flex h-10 w-10 items-center justify-center hover:text-accent"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
            </button>
            <Link
              href="/account/wishlist"
              aria-label="Wishlist"
              className="relative flex h-10 w-10 items-center justify-center hover:text-accent"
            >
              <Heart className="h-4 w-4" />
              {wishCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center bg-foreground px-1 text-[10px] text-background">
                  {wishCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              aria-label="Cart"
              className="relative flex h-10 w-10 items-center justify-center hover:text-accent"
              onClick={openCart}
            >
              <ShoppingBag className="h-4 w-4" />
              {cartCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center bg-foreground px-1 text-[10px] text-background">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] bg-background md:hidden">
          <div className="container-pt flex h-16 items-center justify-between">
            <span className="font-serif text-2xl">{SITE.name}</span>
            <button type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="container-pt mt-10 flex flex-col gap-6">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="font-serif text-4xl"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/account"
              onClick={() => setMobileOpen(false)}
              className="pt-6 text-sm uppercase tracking-[0.18em] text-muted"
            >
              Account
            </Link>
          </nav>
        </div>
      )}

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
