import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Account',
  description: 'Orders, wishlist, addresses, and account settings.',
};

const links = [
  { href: '/account/orders', label: 'Orders', desc: 'Track and review past purchases' },
  { href: '/account/wishlist', label: 'Wishlist', desc: 'Saved products across devices' },
  { href: '/account/addresses', label: 'Addresses', desc: 'Shipping and billing profiles' },
  { href: '/account/downloads', label: 'Downloads', desc: 'Care guides and manuals' },
  { href: '/account/returns', label: 'Returns', desc: 'Start a return or repair request' },
  { href: '/account/settings', label: 'Settings', desc: 'Email, password, preferences' },
];

export default function AccountPage() {
  return (
    <div className="container-pt py-14 md:py-20">
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Account</p>
      <h1 className="mt-3 font-serif text-5xl">Your space</h1>
      <p className="mt-4 max-w-xl text-sm text-muted">
        Demo account area. Connect Shopify Customer Accounts or NextAuth for production auth.
      </p>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="border border-border bg-card p-6 transition hover:border-foreground"
          >
            <h2 className="font-serif text-2xl">{link.label}</h2>
            <p className="mt-2 text-sm text-muted">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
