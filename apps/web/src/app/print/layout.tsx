'use client';

import { SessionProvider } from 'next-auth/react';

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="min-h-screen overflow-x-hidden bg-white">{children}</div>
    </SessionProvider>
  );
}
