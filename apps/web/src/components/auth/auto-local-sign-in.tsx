'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { api } from '@/lib/api';

const LOCAL_MODE = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';

export function AutoLocalSignIn() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const bootstrapping = useRef(false);

  useEffect(() => {
    if (!LOCAL_MODE) return;
    if (status === 'loading') return;

    async function ensureSignedIn() {
      if (bootstrapping.current) return;
      bootstrapping.current = true;

      try {
        if (status === 'unauthenticated') {
          await signIn('local', { redirect: false });
          return;
        }

        if (!session?.accessToken) return;

        if (pathname === '/onboarding') {
          const orgs = await api.organizations.list(session.accessToken);
          if (orgs.length > 0) {
            router.replace('/dashboard');
          }
          return;
        }

        if (pathname === '/login' || pathname === '/register') {
          const orgs = await api.organizations.list(session.accessToken);
          router.replace(orgs.length === 0 ? '/onboarding' : '/dashboard');
          return;
        }

        if (pathname === '/' || pathname === '/dashboard') {
          const orgs = await api.organizations.list(session.accessToken);
          if (orgs.length === 0) {
            router.replace('/onboarding');
          }
        }
      } finally {
        bootstrapping.current = false;
      }
    }

    void ensureSignedIn();
  }, [status, session?.accessToken, pathname, router]);

  return null;
}
