import { describe, expect, it } from 'vitest';
import { describeSyncStatus } from './connectivity-indicator';

describe('describeSyncStatus', () => {
  it('shows the waiting count and the sync error where a phone can read them', () => {
    expect(
      describeSyncStatus({ online: false, pendingCount: 2, errorCount: 0, syncing: false }),
    ).toMatchObject({ label: 'Offline', queued: 2, detail: null });

    expect(
      describeSyncStatus({
        online: true,
        pendingCount: 0,
        errorCount: 1,
        syncing: false,
        lastError: 'Customer is required',
      }),
    ).toEqual({ label: 'Sync failed', queued: 1, detail: 'Customer is required' });
  });
});
