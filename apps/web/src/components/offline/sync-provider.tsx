'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useOrganizationId } from '@/hooks/use-organization';
import { loadCustomers, loadProducts } from '@/lib/offline/catalog';
import { offlineQueryOptions } from '@/lib/offline/network';
import { setSyncHandler, subscribeOfflineChanges } from '@/lib/offline/events';
import { loadInvoiceList } from '@/lib/offline/invoice-list';
import { getOfflineStore } from '@/lib/offline/store';
import { flushOutbox } from '@/lib/offline/sync';

type SyncContextValue = {
  online: boolean;
  pendingCount: number;
  errorCount: number;
  syncing: boolean;
  requestSync: () => Promise<void>;
};

const SyncContext = createContext<SyncContextValue | null>(null);

const idleSync: SyncContextValue = {
  online: true,
  pendingCount: 0,
  errorCount: 0,
  syncing: false,
  requestSync: async () => undefined,
};

export function useSyncStatus() {
  return useContext(SyncContext) ?? idleSync;
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const { organizationId } = useOrganizationId();
  const online = useOnlineStatus();
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const token = session?.accessToken;

  const refreshCounts = useCallback(async () => {
    if (!organizationId) {
      setPendingCount(0);
      setErrorCount(0);
      return;
    }
    const jobs = await getOfflineStore().listOutbox(organizationId).catch(() => []);
    setPendingCount(jobs.filter((job) => job.status === 'pending').length);
    setErrorCount(jobs.filter((job) => job.status === 'error').length);
  }, [organizationId]);

  const requestSync = useCallback(async () => {
    if (!token || !organizationId) return;
    setSyncing(true);
    try {
      const result = await flushOutbox(
        getOfflineStore(),
        organizationId,
        { createInvoice: (data) => api.invoices.create(token, organizationId, data) },
        { isOnline: () => (typeof navigator === 'undefined' ? true : navigator.onLine) },
      );
      if (result.synced > 0 || result.failed > 0) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['invoices', organizationId] }),
          queryClient.invalidateQueries({ queryKey: ['invoice'] }),
        ]);
      }
    } finally {
      setSyncing(false);
      await refreshCounts();
    }
  }, [token, organizationId, queryClient, refreshCounts]);

  useEffect(() => {
    return setSyncHandler(() => {
      void requestSync();
    });
  }, [requestSync]);

  useEffect(() => {
    void refreshCounts();
    return subscribeOfflineChanges(() => {
      void refreshCounts();
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
    });
  }, [refreshCounts, queryClient]);

  useEffect(() => {
    if (!token || !organizationId || !online) return;
    void requestSync();
    void queryClient.prefetchQuery({
      queryKey: ['customers', organizationId],
      queryFn: () => loadCustomers({ token, organizationId }),
    });
    void queryClient.prefetchQuery({
      queryKey: ['products', organizationId],
      queryFn: () => loadProducts({ token, organizationId }),
    });
    void queryClient.prefetchQuery({
      queryKey: ['invoices', organizationId, null],
      queryFn: () => loadInvoiceList({ token, organizationId, params: { limit: 50 } }),
      staleTime: 0,
      ...offlineQueryOptions,
    });
  }, [token, organizationId, online, requestSync, queryClient]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') void requestSync();
    }
    window.addEventListener('online', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [requestSync]);

  return (
    <SyncContext.Provider value={{ online, pendingCount, errorCount, syncing, requestSync }}>
      {children}
    </SyncContext.Provider>
  );
}
