'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, CheckCircle2, Download } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useOrganizationId } from '@/hooks/use-organization';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge';

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

export default function ReceiptsPage() {
  const { data: session } = useSession();
  const { organizationId, isReady } = useOrganizationId();

  const { data, isLoading, error } = useQuery({
    queryKey: ['receipts', organizationId],
    queryFn: () => api.invoices.list(session!.accessToken!, organizationId!, { limit: 100 }),
    enabled: !!session?.accessToken && !!organizationId,
  });

  const paidInvoices = (data?.data ?? []).filter((invoice) => invoice.status === 'PAID');

  function openReceipt(invoiceId: string, event?: React.MouseEvent) {
    event?.preventDefault();
    event?.stopPropagation();
    if (!organizationId) return;
    const url = `/print/receipts/${invoiceId}?org=${encodeURIComponent(organizationId)}`;
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    // Phone browsers / Capacitor often block popups — fall back to same-tab navigation
    if (!opened) {
      window.location.href = url;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Receipts</h1>
        <p className="text-muted-foreground">
          Download payment receipts for invoices marked as paid
        </p>
      </div>

      <Card className="border-emerald-200 bg-emerald-50/50 lg:hidden">
        <CardContent className="flex items-start gap-3 py-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="text-sm">
            <p className="font-medium text-emerald-900">How to send a receipt</p>
            <p className="mt-1 text-emerald-800/80">
              1) Open Invoices → <strong>Mark as paid</strong>
              <br />
              2) Tap <strong>+ Receipts</strong> below → Download
              <br />
              3) Share or save the PDF to send to your customer
            </p>
          </div>
        </CardContent>
      </Card>

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
            {error instanceof Error ? error.message : 'Failed to load receipts'}
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

      {!isLoading && organizationId && paidInvoices.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BadgeCheck className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No paid invoices yet</p>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">
              Mark an invoice as <strong>Paid</strong> on the Invoices page, then come back here
            </p>
            <Button asChild>
              <Link href="/invoices">Go to invoices</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {paidInvoices.length > 0 && (
        <div className="space-y-3">
          {paidInvoices.map((invoice) => (
            <Card key={invoice.id} className="border-emerald-200 bg-emerald-50/40">
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{invoice.number}</span>
                    <InvoiceStatusBadge status={invoice.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {invoice.customer?.name ?? 'Unknown customer'} · {formatDate(invoice.issueDate)}
                  </p>
                  <p className="text-lg font-semibold text-emerald-800">
                    {formatCurrency(Number(invoice.total), invoice.currency)}
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    onClick={(e) => openReceipt(invoice.id, e)}
                  >
                    <Download className="h-4 w-4" />
                    Download receipt
                  </Button>
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="text-center text-xs text-muted-foreground hover:underline sm:text-right"
                  >
                    View invoice
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
