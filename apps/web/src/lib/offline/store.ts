import { openCapacitorDocumentDb } from '@/lib/offline/capacitor-sqlite';
import { IndexedDbOfflineStorage } from '@/lib/offline/indexed-db-store';
import { MemoryOfflineStorage } from '@/lib/offline/memory-store';
import { SqliteOfflineStorage } from '@/lib/offline/sqlite-store';
import type { OfflineStorage } from '@/lib/offline/types';

let nativeStore: OfflineStorage | null = null;
let browserStore: OfflineStorage | null = null;
let fallbackStore: OfflineStorage | null = null;

type CapacitorGlobal = { isNativePlatform?: () => boolean };

/**
 * True inside the Capacitor WebView. The native bridge sets window.Capacitor
 * before page scripts run, so the PWA bundle does not import Capacitor core.
 */
export function isNativeOfflinePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as Window & { Capacitor?: CapacitorGlobal }).Capacitor;
  return cap?.isNativePlatform?.() === true;
}

/**
 * SQLite inside the Android app. IndexedDB in the PWA.
 * Memory only when neither is available (tests, SSR).
 */
export function getOfflineStore(): OfflineStorage {
  if (isNativeOfflinePlatform()) {
    nativeStore ??= new SqliteOfflineStorage(openCapacitorDocumentDb);
    return nativeStore;
  }
  if (typeof indexedDB === 'undefined') {
    fallbackStore ??= new MemoryOfflineStorage();
    return fallbackStore;
  }
  browserStore ??= new IndexedDbOfflineStorage();
  return browserStore;
}

export function resetOfflineStoreForTests() {
  nativeStore = null;
  browserStore = null;
  fallbackStore = null;
}
