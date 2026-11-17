'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Pencil, FileInput } from 'lucide-react';
import { api } from '@/lib/api';
import { buildServerPdfUrl } from '@/lib/build-server-pdf-url';
import { useOrganizationId } from '@/hooks/use-organization';
import { QuoteForm } from '@/components/quotes/quote-form';
import { QuoteStatusBadge } from '@/components/quotes/quote-status-badge';
import { DownloadQuotePdfButton } from '@/components/quotes/download-quote-pdf-button';
import { ShareQuoteWhatsAppButton } from '@/components/quotes/share-quote-whatsapp-button';
import { loadCustomers, loadProducts } from '@/lib/offline/catalog';
import { offlineQueryOptions } from '@/lib/offline/network';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { UpdateQuoteInput } from '@flowbooks/shared';

export function QuoteDetailPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = searchParams.get('new') === '1';
  const { data: session } = useSession();
  const { organizationId, businessCurrency, isReady } = useOrganizationId();
  const queryClient = useQueryClient();
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState('');

  const { data: quote, isLoading, error } = useQuery({
    queryKey: ['quote', id, organizationId],
    queryFn: () => api.quotes.get(session!.accessToken!, organizationId!, id),
    enabled: !!session?.accessToken && !!organizationId,
  });

  const pdfHistory = useQuery({
    queryKey: ['quote-pdf-versions', id, organizationId],
    queryFn: () => api.quotes.listPdfVersions(session!.accessToken!, organizationId!, id),
    enabled: !!session?.accessToken && !!organizationId && !!quote,
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers', organizationId],
    queryFn: () => loadCustomers({ token: session!.accessToken!, organizationId: organizationId! }),
    enabled: !!session?.accessToken && !!organizationId,
    ...offlineQueryOptions,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products', organizationId],
    queryFn: () => loadProducts({ token: session!.accessToken!, organizationId: organizationId! }),
    enabled: !!session?.accessToken && !!organizationId,
    ...offlineQueryOptions,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#edit-line-items' && window.location.hash !== '#edit-quote') {
      return;
    }
    const el =
      document.getElementById('edit-line-items') ?? document.getElementById('edit-quote');
    if (el) {
      window.setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [quote]);

  async function handleUpdate(data: UpdateQuoteInput) {
    await api.quotes.update(session!.accessToken!, organizationId!, id, data);
  }

  async function refreshQuote() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['quote', id, organizationId] }),
      queryClient.invalidateQueries({ queryKey: ['quotes', organizationId] }),
      queryClient.invalidateQueries({ queryKey: ['quote-pdf-versions', id, organizationId] }),
    ]);
  }

  async function handleConvert() {
    if (!session?.accessToken || !organizationId || converting) return;
    setConverting(true);
    setConvertError('');
    try {
      const { invoice } = await api.quotes.convert(session.accessToken, organizationId, id);
      await queryClient.invalidateQueries({ queryKey: ['quotes', organizationId] });
      await queryClient.invalidateQueries({ queryKey: ['invoices', organizationId] });
      router.push(`/invoices/${invoice.id}`);
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : 'Failed to convert quote');
      setConverting(false);
    }
  }

  function scrollToEdit() {
    const el =
      document.getElementById('edit-line-items') ?? document.getElementById('edit-quote');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {isNew && quote && organizationId && (
        <Card className="border-[#E40046]/30 bg-[#E40046]/5">
          <CardContent className="flex flex-col gap-4 py-4">
            <div>
              <p className="font-medium">Quote created successfully</p>
              <p className="text-sm text-muted-foreground">
                Download the PDF, then share it with your customer.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-end">
              <DownloadQuotePdfButton
                quoteId={id}
                organizationId={organizationId}
                filename={`${quote.number.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`}
                size="lg"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {quote ? `Quote ${quote.number}` : 'Quote'}
          </h1>
          {quote && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <QuoteStatusBadge status={quote.status} />
              {quote.convertedInvoiceId && (
                <Link
                  href={`/invoices/${quote.convertedInvoiceId}`}
                  className="text-sm text-primary hover:underline"
                >
                  View latest invoice →
                </Link>
              )}
            </div>
          )}
        </div>
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
          {quote && organizationId && (
            <>
              <Button
                type="button"
                size="lg"
                onClick={scrollToEdit}
                className="gap-2 bg-[#E40046] text-white hover:bg-[#c4003c]"
              >
                <Pencil className="h-4 w-4" />
                Edit quote — change prices &amp; items
              </Button>
              {!isNew && (
                <DownloadQuotePdfButton
                  quoteId={id}
                  organizationId={organizationId}
                  filename={`${quote.number.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`}
                />
              )}
              <ShareQuoteWhatsAppButton
                quote={quote}
                quoteId={id}
                organizationId={organizationId}
                fullWidth
              />
              {quote.status !== 'CONVERTED' && (
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={() => void handleConvert()}
                  disabled={converting}
                  className="gap-2"
                >
                  <FileInput className="h-4 w-4" />
                  {converting ? 'Converting…' : quote.convertedInvoiceId ? 'Create new invoice' : 'Convert to invoice'}
                </Button>
              )}
              {convertError && (
                <p role="alert" className="text-sm text-destructive sm:text-right">{convertError}</p>
              )}
            </>
          )}
          <Link href="/quotes" className="text-sm text-primary hover:underline sm:text-right">
            ← Back to quotes
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
            {error instanceof Error ? error.message : 'Failed to load quote'}
          </CardContent>
        </Card>
      )}

      {isLoading && organizationId && (
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      )}

      {quote && organizationId && (
        <Card>
          <CardContent className="space-y-3 py-5">
            <h2 className="font-semibold">PDF version history</h2>
            {pdfHistory.isLoading ? <p className="text-sm text-muted-foreground">Loading PDF history…</p> : null}
            {pdfHistory.isError ? (
              <div className="flex items-center justify-between gap-3 text-sm">
                <p role="alert" className="text-destructive">Could not load PDF history.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void pdfHistory.refetch()}>Retry</Button>
              </div>
            ) : null}
            {pdfHistory.data?.length ? (
              <ul className="divide-y">
                {pdfHistory.data.map(({ version, savedAt }, index) => (
                  <li key={version} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div>
                      <p className="text-sm font-medium">PDF {version}{index === 0 ? ' · Latest' : ''}</p>
                      <time dateTime={savedAt} className="text-xs text-muted-foreground">{new Date(savedAt).toLocaleString()}</time>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <a href={buildServerPdfUrl('quotes', id, { organizationId, quoteVersion: version, filename: `quote-${id}-pdf-${version}.pdf` })}>
                        <Download className="h-4 w-4" aria-hidden="true" />
                        Download PDF {version}
                      </a>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      )}

      {quote && organizationId && (
        <div id="edit-quote" className="scroll-mt-20 space-y-3">
          {quote.status === 'CONVERTED' ? (
            <p className="text-sm text-muted-foreground">Save your changes to create a new draft invoice from this quote.</p>
          ) : null}
          <QuoteForm
            mode="edit"
            quote={quote}
            customers={customersData?.data ?? []}
            products={productsData?.data ?? []}
            defaultCurrency={businessCurrency}
            draftIdentity={
              session?.user?.id && organizationId
                ? { userId: session.user.id, organizationId }
                : null
            }
            onSubmit={handleUpdate}
            onSaved={refreshQuote}
          />
        </div>
      )}
    </div>
  );
}
