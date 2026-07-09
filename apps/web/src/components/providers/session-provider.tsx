'use client';

import { SessionProvider } from 'next-auth/react';
import { AutoLocalSignIn } from '@/components/auth/auto-local-sign-in';

const LOCAL_MODE = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';

export function AppSessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {LOCAL_MODE ? <AutoLocalSignIn /> : null}
      {children}
    </SessionProvider>
  );
}
