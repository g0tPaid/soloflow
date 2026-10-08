import { IndexedDbOfflineStorage } from '@/lib/offline/indexed-db-store';
import { MemoryOfflineStorage } from '@/lib/offline/memory-store';
import type { OfflineStorage } from '@/lib/offline/types';

let browserStore: OfflineStorage | null = null;
let fallbackStore: OfflineStorage | null = null;

/** Browser IndexedDB, or a memory store when IndexedDB is unavailable (tests, SSR). */
export function getOfflineStore(): OfflineStorage {
  if (typeof indexedDB === 'undefined') {
    fallbackStore ??= new MemoryOfflineStorage();
    return fallbackStore;
  }
  browserStore ??= new IndexedDbOfflineStorage();
  return browserStore;
}
