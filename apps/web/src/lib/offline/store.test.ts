import { afterEach, describe, expect, it } from 'vitest';
import { IndexedDbOfflineStorage } from '@/lib/offline/indexed-db-store';
import { MemoryOfflineStorage } from '@/lib/offline/memory-store';
import { getOfflineStore, resetOfflineStoreForTests } from '@/lib/offline/store';
import { SqliteOfflineStorage } from '@/lib/offline/sqlite-store';

describe('getOfflineStore', () => {
  afterEach(() => {
    delete (window as Window & { Capacitor?: unknown }).Capacitor;
    resetOfflineStoreForTests();
  });

  it('uses SQLite when the Capacitor app is native', () => {
    (window as Window & { Capacitor?: { isNativePlatform: () => boolean } }).Capacitor = {
      isNativePlatform: () => true,
    };
    expect(getOfflineStore()).toBeInstanceOf(SqliteOfflineStorage);
  });

  it('keeps IndexedDB for the browser and memory when IndexedDB is missing', () => {
    const store = getOfflineStore();
    if (typeof indexedDB === 'undefined') {
      expect(store).toBeInstanceOf(MemoryOfflineStorage);
      return;
    }
    expect(store).toBeInstanceOf(IndexedDbOfflineStorage);
  });
});
