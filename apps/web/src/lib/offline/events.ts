type SyncHandler = () => void;

let syncHandler: SyncHandler | null = null;
const listeners = new Set<() => void>();

export function setSyncHandler(handler: SyncHandler): () => void {
  syncHandler = handler;
  return () => {
    if (syncHandler === handler) {
      syncHandler = null;
    }
  };
}

export function requestSync() {
  syncHandler?.();
}

export function subscribeOfflineChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitOfflineChange() {
  for (const listener of listeners) listener();
}
