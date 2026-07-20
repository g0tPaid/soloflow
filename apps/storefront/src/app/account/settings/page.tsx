import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <div className="container-pt py-14 md:py-20">
      <Link href="/account" className="text-xs uppercase tracking-[0.16em] text-muted hover:text-foreground">
        ← Account
      </Link>
      <h1 className="mt-4 font-serif text-5xl">Settings</h1>
      <p className="mt-4 max-w-xl text-sm text-muted">
        Email preferences, password, and notification controls — connect to your auth provider.
      </p>
    </div>
  );
}
