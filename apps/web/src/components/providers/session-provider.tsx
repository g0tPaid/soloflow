'use client';

import { SessionProvider } from 'next-auth/react';
import { AutoLocalSignIn } from '@/components/auth/auto-local-sign-in';
import { LOCAL_MODE } from '@/lib/local-mode';

export function AppSessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {LOCAL_MODE ? <AutoLocalSignIn /> : null}
      {children}
    </SessionProvider>
  );
}
