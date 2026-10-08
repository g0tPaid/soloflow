'use client';

import { AppShell } from '@/components/layout/sidebar';
import { SyncProvider } from '@/components/offline/sync-provider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SyncProvider>
      <AppShell>{children}</AppShell>
    </SyncProvider>
  );
}
