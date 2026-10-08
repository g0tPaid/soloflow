'use client';

import { useSyncStatus } from '@/components/offline/sync-provider';
import { cn } from '@/lib/utils';

export function ConnectivityIndicator() {
  const { online, pendingCount, errorCount, syncing } = useSyncStatus();
  const queued = pendingCount + errorCount;
  let label = online ? 'Online' : 'Offline';
  if (online && syncing && queued > 0) label = 'Syncing';
  else if (online && errorCount > 0) label = 'Sync failed';

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground"
      data-testid="connectivity-indicator"
      data-online={online ? 'true' : 'false'}
      title={queued > 0 ? `${queued} invoice${queued === 1 ? '' : 's'} waiting to sync` : undefined}
    >
      <span className={cn('h-2 w-2 rounded-full', online ? 'bg-emerald-500' : 'bg-amber-500')} aria-hidden />
      {label}
    </span>
  );
}
