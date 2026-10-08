'use client';

import type { SyncState } from '@/lib/offline/types';

export function PendingSyncBadge({
  state,
  error,
  onRetry,
  retrying,
}: {
  state?: SyncState | null;
  error?: string | null;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  if (state !== 'pending' && state !== 'error') return null;

  if (state === 'pending') {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
        Pending sync
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span
        className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive"
        title={error ?? undefined}
      >
        Sync failed
      </span>
      {onRetry ? (
        <button
          type="button"
          className="text-[11px] font-medium text-primary underline"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRetry();
          }}
          disabled={retrying}
        >
          {retrying ? 'Retrying…' : 'Retry'}
        </button>
      ) : null}
    </span>
  );
}
