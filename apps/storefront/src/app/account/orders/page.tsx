import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Orders' };

export default function OrdersPage() {
  return (
    <AccountStub
      title="Orders"
      body="Connect Shopify Admin / Customer Account API to list live orders here."
    />
  );
}

function AccountStub({ title, body }: { title: string; body: string }) {
  return (
    <div className="container-pt py-14 md:py-20">
      <Link href="/account" className="text-xs uppercase tracking-[0.16em] text-muted hover:text-foreground">
        ← Account
      </Link>
      <h1 className="mt-4 font-serif text-5xl">{title}</h1>
      <p className="mt-4 max-w-xl text-sm text-muted">{body}</p>
    </div>
  );
}
