/** IndexedDB-backed reads must still run when the browser reports offline. */
export const offlineQueryOptions = {
  networkMode: 'always' as const,
};

/** Thrown when a sync attempt cannot reach the API. The outbox job stays pending. */
export class SyncOfflineError extends Error {
  constructor(message = 'Offline') {
    super(message);
    this.name = 'SyncOfflineError';
  }
}

export function isLikelyOfflineError(error: unknown): boolean {
  if (error instanceof SyncOfflineError) return true;
  if (!(error instanceof Error)) return false;
  return /cannot reach soloflow|cannot connect to soloflow|failed to fetch|networkerror|network request failed|load failed/i.test(
    error.message,
  );
}
