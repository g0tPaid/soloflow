'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText } from 'lucide-react';
import { api, type InvoiceStatus } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import { useOrganizationId } from '@/hooks/use-organization';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge';

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

export default function InvoicesPage() {
  const { data: session } = useSession();
  const { organizationId, isReady } = useOrganizationId();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['invoices', organizationId],
    queryFn: () => api.invoices.list(session!.accessToken!, organizationId!, { limit: 50 }),
    enabled: !!session?.accessToken && !!organizationId,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      api.invoices.update(session!.accessToken!, organizationId!, id, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['invoices', organizationId] });
      await queryClient.invalidateQueries({ queryKey: ['receipts', organizationId] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', organizationId] });
    },
  });

  const invoices = data?.data ?? [];

  function markStatus(id: string, status: InvoiceStatus, event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (statusMutation.isPending) return;
    statusMutation.mutate({ id, status });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">Create and manage invoices</p>
        </div>
        {organizationId && (
          <Button asChild>
            <Link href="/invoices/new">
              <Plus className="h-4 w-4" />
              New invoice
            </Link>
          </Button>
        )}
      </div>

      {isReady && !organizationId && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No organization selected</p>
            <Link href="/onboarding" className="text-primary hover:underline text-sm">
              Create your organization →
            </Link>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="py-6 text-sm text-destructive">
            {error instanceof Error ? error.message : 'Failed to load invoices'}
          </CardContent>
        </Card>
      )}

      {isLoading && organizationId && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && organizationId && invoices.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No invoices yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Create your first invoice to start billing customers
            </p>
            <Button asChild>
              <Link href="/invoices/new">Create invoice</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {invoices.length > 0 && (
        <div className="space-y-3">
          {invoices.map((invoice) => {
            const isPaid = invoice.status === 'PAID';
            return (
              <div
                key={invoice.id}
                className={cn(
                  'rounded-xl border bg-card transition-colors',
                  isPaid
                    ? 'border-emerald-400 bg-emerald-50/70 dark:border-emerald-700 dark:bg-emerald-950/40'
                    : 'border-border hover:bg-accent/20',
                )}
              >
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/invoices/${invoice.id}`} className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{invoice.number}</span>
                      <InvoiceStatusBadge status={invoice.status} />
                      {isPaid ? (
                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          Paid
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                          Unpaid
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {invoice.customer?.name ?? 'Unknown customer'}
                    </p>
                    <p className="text-xs text-muted-foreground sm:hidden">
                      Due {formatDate(invoice.dueDate)}
                    </p>
                  </Link>

                  <div className="flex flex-col gap-3 sm:items-end">
                    <p className="text-lg font-semibold">
                      {formatCurrency(Number(invoice.total), invoice.currency)}
                    </p>
                    <p className="hidden text-xs text-muted-foreground sm:block">
                      Due {formatDate(invoice.dueDate)}
                    </p>
                    <div className="flex w-full items-center gap-2 sm:w-auto">
                      {!isPaid ? (
                        <button
                          type="button"
                          onClick={(e) => markStatus(invoice.id, 'PAID', e)}
                          disabled={statusMutation.isPending}
                          className="w-full rounded-full border border-emerald-500 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-600 hover:text-white sm:w-auto sm:py-1"
                        >
                          Mark as paid
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => markStatus(invoice.id, 'SENT', e)}
                          disabled={statusMutation.isPending}
                          className="w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 sm:w-auto sm:py-1"
                        >
                          Mark as unpaid
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
