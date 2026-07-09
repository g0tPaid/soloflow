'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AdminShell } from '@/components/admin/admin-shell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=/admin');
      return;
    }
    if (!session?.user?.isSuperAdmin) {
      router.replace('/dashboard');
    }
  }, [status, session, router]);

  if (status === 'loading' || !session?.user?.isSuperAdmin) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading admin…
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
