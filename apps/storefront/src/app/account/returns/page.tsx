import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Returns' };

export default function ReturnsPage() {
  return (
    <div className="container-pt py-14 md:py-20">
      <Link href="/account" className="text-xs uppercase tracking-[0.16em] text-muted hover:text-foreground">
        ← Account
      </Link>
      <h1 className="mt-4 font-serif text-5xl">Returns</h1>
      <p className="mt-4 max-w-xl text-sm text-muted">
        Start a return or repair request. See Contact → Returns for policy details.
      </p>
    </div>
  );
}
