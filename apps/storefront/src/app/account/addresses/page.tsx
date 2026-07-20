import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Addresses' };

export default function AddressesPage() {
  return (
    <div className="container-pt py-14 md:py-20">
      <Link href="/account" className="text-xs uppercase tracking-[0.16em] text-muted hover:text-foreground">
        ← Account
      </Link>
      <h1 className="mt-4 font-serif text-5xl">Addresses</h1>
      <p className="mt-4 max-w-xl text-sm text-muted">
        Shipping and billing address book — wire to customer account profiles.
      </p>
    </div>
  );
}
