'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileInput, Pencil, Banknote } from 'lucide-react';
import { api } from '@/lib/api';
import { useOrganizationId } from '@/hooks/use-organization';
import { InvoiceForm } from '@/components/invoices/invoice-form';
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge';
import {
  FulfillmentControls,
  FulfillmentStatusBadge,
} from '@/components/invoices/fulfillment-controls';
import { DownloadInvoicePdfButton } from '@/components/invoices/download-invoice-pdf-button';
import { ShareInvoiceWhatsAppButton } from '@/components/invoices/share-invoice-whatsapp-button';
import { RecordPaymentDialog } from '@/components/invoices/record-payment-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  invoiceAmountPaid,
  invoiceBalanceDue,
  isReceiptEligible,
  paymentMethodLabel,
  type UpdateInvoiceInput,
} from '@flowbooks/shared';
import { formatCurrency } from '@/lib/utils';

export function InvoiceDetailPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = searchParams.get('new') === '1';
  const { data: session } = useSession();
  const { organizationId, organization, businessCurrency, isReady } = useOrganizationId();
  const timeZone = organization?.settings?.timezone;
  const queryClient = useQueryClient();
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState('');
  const [showPayment, setShowPayment] = useState(false);

  const fulfillmentMutation = useMutation({
    mutationFn: (data: UpdateInvoiceInput) =>
      api.invoices.update(session!.accessToken!, organizationId!, id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['invoice', id, organizationId] });
      await queryClient.invalidateQueries({ queryKey: ['invoices', organizationId] });
    },
  });

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#edit-line-items' && window.location.hash !== '#edit-invoice') {
      return;
    }
    const el =
      document.getElementById('edit-line-items') ?? document.getElementById('edit-invoice');
    if (el) {
      window.setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [invoice]);

  async function handleUpdate(data: UpdateInvoiceInput) {
    await api.invoices.update(session!.accessToken!, organizationId!, id, data);
    await queryClient.invalidateQueries({ queryKey: ['invoice', id, organizationId] });
    await queryClient.invalidateQueries({ queryKey: ['invoices', organizationId] });
    await queryClient.invalidateQueries({ queryKey: ['receipts', organizationId] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', organizationId] });
  }

  async function handleConvert() {
    if (!session?.accessToken || !organizationId || converting) return;
    const ok = window.confirm(
      'Convert this invoice to a quote? It will be removed from Invoices and no longer count in reports or totals.',
    );
    if (!ok) return;
    setConverting(true);
    setConvertError('');
    try {
      const { quote } = await api.invoices.convert(session.accessToken, organizationId, id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['quotes', organizationId] }),
        queryClient.invalidateQueries({ queryKey: ['invoices', organizationId] }),
        queryClient.invalidateQueries({ queryKey: ['receipts', organizationId] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', organizationId] }),
        queryClient.invalidateQueries({ queryKey: ['reports-vat', organizationId] }),
        queryClient.invalidateQueries({ queryKey: ['inventory', organizationId] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-summary', organizationId] }),
      ]);
      router.push(`/quotes/${quote.id}`);
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : 'Failed to convert invoice');
      setConverting(false);
    }
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

  function scrollToEdit() {
    const el =
      document.getElementById('edit-line-items') ?? document.getElementById('edit-invoice');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <InvoiceStatusBadge status={invoice.status} />
              <FulfillmentStatusBadge status={invoice.fulfillmentStatus} />
            </div>
          )}
        </div>
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
          {invoice && organizationId && (
            <>
              <div className="flex w-full flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  size="lg"
                  onClick={scrollToEdit}
                  className="flex-1 gap-2 bg-[#E40046] text-white hover:bg-[#c4003c]"
                >
                  <Pencil className="h-4 w-4" />
                  Edit invoice
                </Button>
                {invoice.status !== 'VOID' &&
                  invoice.status !== 'CANCELLED' &&
                  invoiceBalanceDue(invoice) > 0.005 && (
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      className="flex-1 gap-2 border-amber-500 text-amber-800 hover:bg-amber-600 hover:text-white"
                      onClick={() => setShowPayment(true)}
                    >
                      <Banknote className="h-4 w-4" />
                      Record payment
                    </Button>
                  )}
              </div>
              {!isNew && (
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
              {invoice.customerId && (
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={() => void handleConvert()}
                  disabled={converting}
                  className="gap-2"
                >
                  <FileInput className="h-4 w-4" />
                  {converting ? 'Converting…' : 'Convert to quote'}
                </Button>
              )}
              {convertError && (
                <p className="text-sm text-destructive sm:text-right">{convertError}</p>
              )}
            </>
          )}
              {invoice && isReceiptEligible(invoice) && organizationId && (
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
        <>
          <Card>
            <CardContent className="py-5">
              <FulfillmentControls
                idPrefix={invoice.id}
                status={invoice.fulfillmentStatus}
                localTrackingNumber={invoice.localTrackingNumber}
                internationalTrackingNumber={invoice.internationalTrackingNumber}
                saving={fulfillmentMutation.isPending}
                error={
                  fulfillmentMutation.isError
                    ? fulfillmentMutation.error instanceof Error
                      ? fulfillmentMutation.error.message
                      : 'Could not update fulfillment'
                    : undefined
                }
                history={invoice.fulfillmentEvents}
                timeZone={timeZone}
                onStatusChange={(fulfillmentStatus) =>
                  fulfillmentMutation.mutate({ fulfillmentStatus })
                }
                onTrackingSave={(tracking) => fulfillmentMutation.mutate(tracking)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-4 py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Payments</p>
                  <p className="text-sm text-muted-foreground">
                    Record a partial payment when a customer pays some of the invoice, not all of it.
                  </p>
                </div>
                <div className="text-sm sm:text-right">
                  <p>
                    Paid{' '}
                    <span className="font-medium tabular-nums">
                      {formatCurrency(invoiceAmountPaid(invoice), invoice.currency)}
                    </span>
                  </p>
                  <p>
                    Balance due{' '}
                    <span className="font-medium tabular-nums">
                      {formatCurrency(invoiceBalanceDue(invoice), invoice.currency)}
                    </span>
                  </p>
                </div>
              </div>
              {(invoice.payments ?? []).length > 0 && (
                <ul className="divide-y rounded-lg border">
                  {(invoice.payments ?? []).map((payment) => (
                    <li
                      key={payment.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {formatCurrency(Number(payment.amount), invoice.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.paidAt).toLocaleDateString()} ·{' '}
                          {paymentMethodLabel(payment.method)}
                          {payment.note ? ` · ${payment.note}` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {invoice.status !== 'VOID' &&
                invoice.status !== 'CANCELLED' &&
                invoiceBalanceDue(invoice) > 0.005 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => setShowPayment(true)}
                  >
                    <Banknote className="h-4 w-4" />
                    Record payment
                  </Button>
                )}
            </CardContent>
          </Card>
          <div id="edit-invoice" className="scroll-mt-20">
            <InvoiceForm
              key={`${invoice.id}-${invoice.status}-${invoice.amountPaid ?? 0}`}
              mode="edit"
              invoice={invoice}
              customers={customersData?.data ?? []}
              products={productsData?.data ?? []}
              defaultCurrency={businessCurrency}
              onSubmit={handleUpdate}
            />
          </div>
          {showPayment && (
            <RecordPaymentDialog
              invoice={invoice}
              organizationId={organizationId}
              onClose={() => setShowPayment(false)}
              onRecorded={async () => {
                setShowPayment(false);
                await queryClient.invalidateQueries({ queryKey: ['invoice', id, organizationId] });
                await queryClient.invalidateQueries({ queryKey: ['invoices', organizationId] });
                await queryClient.invalidateQueries({ queryKey: ['receipts', organizationId] });
                await queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', organizationId] });
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
