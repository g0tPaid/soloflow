'use client';

import Link from 'next/link';
import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useOrganizationId } from '@/hooks/use-organization';
import { InvoiceForm } from '@/components/invoices/invoice-form';
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge';
import { DownloadInvoicePdfButton } from '@/components/invoices/download-invoice-pdf-button';
import { ShareInvoiceWhatsAppButton } from '@/components/invoices/share-invoice-whatsapp-button';
import { Card, CardContent } from '@/components/ui/card';
import type { UpdateInvoiceInput } from '@flowbooks/shared';

export function InvoiceDetailPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const isNew = searchParams.get('new') === '1';
  const { data: session } = useSession();
  const { organizationId, businessCurrency, isReady } = useOrganizationId();
  const queryClient = useQueryClient();

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['invoice', id, organizationId],
    queryFn: () => api.invoices.get(session!.accessToken!, organizationId!, id),
    enabled: !!session?.accessToken && !!organizationId,
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers', organizationId],
    queryFn: () => api.customers.list(session!.accessToken!, organizationId!, { limit: 100 }),
    enabled: !!session?.accessToken && !!organizationId,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products', organizationId],
    queryFn: () => api.products.list(session!.accessToken!, organizationId!, { limit: 100 }),
    enabled: !!session?.accessToken && !!organizationId,
  });

  async function handleUpdate(data: UpdateInvoiceInput) {
    await api.invoices.update(session!.accessToken!, organizationId!, id, data);
    await queryClient.invalidateQueries({ queryKey: ['invoice', id, organizationId] });
    await queryClient.invalidateQueries({ queryKey: ['invoices', organizationId] });
    await queryClient.invalidateQueries({ queryKey: ['receipts', organizationId] });
  }

  function openPrintUrl(url: string) {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.location.href = url;
    }
  }

  function openReceipt() {
    if (!organizationId) return;
    openPrintUrl(`/print/receipts/${id}?org=${encodeURIComponent(organizationId)}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {isNew && invoice && organizationId && (
        <Card className="border-[#E40046]/30 bg-[#E40046]/5">
          <CardContent className="flex flex-col gap-4 py-4">
            <div>
              <p className="font-medium">Invoice created successfully</p>
              <p className="text-sm text-muted-foreground">
                Download the PDF, then share it with your customer on WhatsApp.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-end">
              <DownloadInvoicePdfButton
                invoiceId={id}
                organizationId={organizationId}
                filename={`${invoice.number.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`}
                size="lg"
              />
              <ShareInvoiceWhatsAppButton
                invoice={invoice}
                invoiceId={id}
                organizationId={organizationId}
                size="lg"
                fullWidth
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {invoice ? `Invoice ${invoice.number}` : 'Invoice'}
          </h1>
          {invoice && (
            <div className="mt-1 flex items-center gap-2">
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          )}
        </div>
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
          {invoice && organizationId && !isNew && (
            <>
              <DownloadInvoicePdfButton
                invoiceId={id}
                organizationId={organizationId}
                filename={`${invoice.number.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`}
              />
              <ShareInvoiceWhatsAppButton
                invoice={invoice}
                invoiceId={id}
                organizationId={organizationId}
                fullWidth
              />
            </>
          )}
          {invoice?.status === 'PAID' && organizationId && (
            <button
              type="button"
              onClick={openReceipt}
              className="inline-flex h-9 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Download receipt
            </button>
          )}
          <Link href="/invoices" className="text-sm text-primary hover:underline sm:text-right">
            ← Back to invoices
          </Link>
        </div>
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
            {error instanceof Error ? error.message : 'Failed to load invoice'}
          </CardContent>
        </Card>
      )}

      {isLoading && organizationId && (
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      )}

      {invoice && organizationId && (
        <InvoiceForm
          mode="edit"
          invoice={invoice}
          customers={customersData?.data ?? []}
          products={productsData?.data ?? []}
          defaultCurrency={businessCurrency}
          onSubmit={handleUpdate}
        />
      )}
    </div>
  );
}
