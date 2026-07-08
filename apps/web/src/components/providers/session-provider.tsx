'use client';

import { SessionProvider } from 'next-auth/react';
import { AutoLocalSignIn } from '@/components/auth/auto-local-sign-in';

export function AppSessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AutoLocalSignIn />
      {children}
    </SessionProvider>
  );
}
