'use client';

import { SessionProvider } from 'next-auth/react';

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-white">{children}</div>
    </SessionProvider>
  );
}
