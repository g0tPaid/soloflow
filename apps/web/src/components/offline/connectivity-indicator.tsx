'use client';

import { useSyncStatus } from '@/components/offline/sync-provider';
import { cn } from '@/lib/utils';

export function describeSyncStatus(input: {
  online: boolean;
  pendingCount: number;
  errorCount: number;
  syncing: boolean;
  lastError?: string | null;
}) {
  const queued = input.pendingCount + input.errorCount;
  let label = input.online ? 'Online' : 'Offline';
  if (input.online && input.syncing && queued > 0) label = 'Syncing';
  else if (input.online && input.errorCount > 0) label = 'Sync failed';
  return {
    label,
    queued,
    detail: input.errorCount > 0 ? input.lastError ?? 'Could not sync' : null,
  };
}

export function ConnectivityIndicator() {
  const status = useSyncStatus();
  const { label, queued, detail } = describeSyncStatus(status);

  return (
    <button
      type="button"
      className="inline-flex max-w-[11rem] shrink-0 flex-col items-start rounded-full border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground"
      data-testid="connectivity-indicator"
      data-online={status.online ? 'true' : 'false'}
      data-queued={queued}
      onClick={() => void status.requestSync()}
      disabled={status.syncing}
    >
      <span className="inline-flex items-center gap-1.5">
        <span className={cn('h-2 w-2 rounded-full', status.online ? 'bg-emerald-500' : 'bg-amber-500')} aria-hidden />
        <span>
          {label}
          {queued > 0 ? ` ${queued}` : ''}
        </span>
      </span>
      {detail ? <span className="max-w-full truncate text-left text-[10px] text-destructive">{detail}</span> : null}
    </button>
  );
}
