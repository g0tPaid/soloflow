'use client';

import Link from 'next/link';
import { PendingSyncBadge } from '@/components/invoices/pending-sync-badge';
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge';
import { useSyncStatus } from '@/components/offline/sync-provider';
import { Card, CardContent } from '@/components/ui/card';
import type { Invoice } from '@/lib/api';
import type { SyncState } from '@/lib/offline/types';
import { formatCurrency } from '@/lib/utils';

export function PendingInvoiceDetail({
  invoice,
  syncState,
  syncError,
}: {
  invoice: Invoice;
  syncState: SyncState;
  syncError?: string | null;
}) {
  const { requestSync, syncing } = useSyncStatus();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoice {invoice.number}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <InvoiceStatusBadge status={invoice.status} />
            <PendingSyncBadge
              state={syncState}
              error={syncError}
              onRetry={() => void requestSync()}
              retrying={syncing}
            />
          </div>
        </div>
        <Link href="/invoices" className="text-sm text-primary hover:underline">
          ← Back to invoices
        </Link>
      </div>

      <Card className="border-amber-300 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/30">
        <CardContent className="space-y-2 py-4 text-sm">
          <p className="font-medium">Saved on this device</p>
          <p className="text-muted-foreground">
            {syncState === 'error'
              ? syncError || 'Sync failed. You can retry now.'
              : 'This invoice will sync automatically when you are back online. SoloFlow assigns the real invoice number then, so it will not clash with invoices created on another device.'}
          </p>
          <p className="text-muted-foreground">Editing, payments, and fulfillment are available after it syncs.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 py-5 text-sm">
          <p>
            <span className="text-muted-foreground">Customer · </span>
            {invoice.customer?.name ?? 'Customer'}
          </p>
          <ul className="divide-y rounded-lg border">
            {(invoice.items ?? []).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span>{item.name || item.description}</span>
                <span className="tabular-nums">
                  {formatCurrency(Number(item.amount), invoice.currency)}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-right text-lg font-medium tabular-nums">
            {formatCurrency(Number(invoice.total), invoice.currency)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
