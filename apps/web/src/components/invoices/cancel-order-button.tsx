'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ban, RotateCcw } from 'lucide-react';
import { api, type Invoice } from '@/lib/api';
import { patchOrderActionCaches, restoreOrderActionCaches } from '@/lib/invoice-status-cache';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { Button } from '@/components/ui/button';

const OFFLINE_HINT = 'Needs a connection';

type Props = {
  invoice: Pick<Invoice, 'id' | 'status'>;
  organizationId: string;
  /** Tests pass this. The page uses the browser connection. */
  online?: boolean;
};

export function CancelOrderButton({ invoice, organizationId, online: onlineProp }: Props) {
  const browserOnline = useOnlineStatus();
  const online = onlineProp ?? browserOnline;
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const cancelled = invoice.status === 'CANCELLED';

  const mutation = useMutation({
    mutationFn: () => {
      const token = session?.accessToken;
      if (!token) throw new Error('Please sign in again.');
      return cancelled
        ? api.invoices.reopenOrder(token, organizationId, invoice.id)
        : api.invoices.cancelOrder(token, organizationId, invoice.id);
    },
    onMutate: async () => {
      setError('');
      const action = cancelled ? 'reopen' : 'cancel';
      await queryClient.cancelQueries({ queryKey: ['invoice', invoice.id, organizationId] });
      await queryClient.cancelQueries({ queryKey: ['invoices', organizationId] });
      return patchOrderActionCaches(queryClient, organizationId, invoice.id, action);
    },
    onError: (err, _variables, context) => {
      if (context) restoreOrderActionCaches(queryClient, context);
      setError(err instanceof Error ? err.message : 'Could not update this order');
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['invoice', invoice.id, organizationId] }),
        queryClient.invalidateQueries({ queryKey: ['invoices', organizationId] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', organizationId] }),
        queryClient.invalidateQueries({ queryKey: ['receipts', organizationId] }),
        queryClient.invalidateQueries({ queryKey: ['reports-vat', organizationId] }),
      ]);
    },
  });

  if (invoice.status === 'VOID') return null;

  function onClick() {
    if (!online || mutation.isPending) return;
    const ok = window.confirm(
      cancelled
        ? 'Reopen this order? It will count toward outstanding totals again if a balance is still due.'
        : 'Mark this order as cancelled? It will no longer count toward outstanding totals.',
    );
    if (!ok) return;
    mutation.mutate();
  }

  const label = mutation.isPending
    ? cancelled
      ? 'Reopening…'
      : 'Cancelling…'
    : cancelled
      ? 'Reopen order'
      : 'Order cancelled';

  return (
    <div className="flex w-full flex-col gap-1">
      <span title={online ? undefined : OFFLINE_HINT} className="inline-flex w-full">
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="w-full gap-2 border-rose-300 text-rose-800 hover:bg-rose-50 hover:text-rose-900"
          disabled={!online || mutation.isPending}
          onClick={onClick}
        >
          {cancelled ? <RotateCcw className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
          {label}
        </Button>
      </span>
      {error ? <p className="text-sm text-destructive sm:text-right">{error}</p> : null}
    </div>
  );
}
