'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, FileSpreadsheet, Pencil, Download, Loader2 } from 'lucide-react';
import { api, type QuoteStatus } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import { useOrganizationId } from '@/hooks/use-organization';
import { fetchServerPdfFile } from '@/lib/fetch-server-pdf';
import { downloadPdfToDevice } from '@/lib/save-pdf-to-device';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { QuoteStatusBadge } from '@/components/quotes/quote-status-badge';

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function QuoteListDownloadButton({
  quoteId,
  organizationId,
  number,
}: {
  quoteId: string;
  organizationId: string;
  number: string;
}) {
  const [busy, setBusy] = useState(false);

  async function handleDownload(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const filename = `${number.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
      const file = await fetchServerPdfFile('quotes', quoteId, {
        organizationId,
        filename,
      });
      await downloadPdfToDevice(file);
    } catch {
      window.open(
        `/print/quotes/${quoteId}?org=${encodeURIComponent(organizationId)}`,
        '_blank',
        'noopener,noreferrer',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="flex-1 gap-1.5 sm:flex-none"
      onClick={handleDownload}
      disabled={busy}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      {busy ? 'PDF…' : 'Download'}
    </Button>
  );
}

export default function QuotesPage() {
  const { data: session } = useSession();
  const { organizationId, isReady } = useOrganizationId();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['quotes', organizationId],
    queryFn: () => api.quotes.list(session!.accessToken!, organizationId!, { limit: 50 }),
    enabled: !!session?.accessToken && !!organizationId,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: QuoteStatus }) =>
      api.quotes.update(session!.accessToken!, organizationId!, id, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['quotes', organizationId] });
    },
  });

  const quotes = data?.data ?? [];

  function markStatus(id: string, status: QuoteStatus, event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (statusMutation.isPending) return;
    statusMutation.mutate({ id, status });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Quotes</h1>
          <p className="text-sm text-muted-foreground">Create and manage quotes</p>
        </div>
        {organizationId && (
          <Button asChild>
            <Link href="/quotes/new">
              <Plus className="h-4 w-4" />
              New quote
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
            {error instanceof Error ? error.message : 'Failed to load quotes'}
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

      {!isLoading && organizationId && quotes.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileSpreadsheet className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No quotes yet</p>
            <p className="mb-4 mt-1 text-sm text-muted-foreground">
              Create your first quote to send proposals to customers
            </p>
            <Button asChild>
              <Link href="/quotes/new">Create quote</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {quotes.length > 0 && (
        <div className="space-y-3">
          {quotes.map((quote) => {
            const isAccepted = quote.status === 'ACCEPTED';
            const isConverted = quote.status === 'CONVERTED';
            return (
              <div
                key={quote.id}
                className={cn(
                  'rounded-xl border bg-card transition-colors',
                  isAccepted || isConverted
                    ? 'border-emerald-400 bg-emerald-50/70 dark:border-emerald-700 dark:bg-emerald-950/40'
                    : 'border-border hover:bg-accent/20',
                )}
              >
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/quotes/${quote.id}`} className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{quote.number}</span>
                      <QuoteStatusBadge status={quote.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {quote.customer?.name ?? 'Unknown customer'}
                    </p>
                    <p className="text-xs text-muted-foreground sm:hidden">
                      Valid until {formatDate(quote.validUntil)}
                    </p>
                  </Link>

                  <div className="flex flex-col gap-3 sm:items-end">
                    <p className="text-lg font-medium tabular-nums">
                      {formatCurrency(Number(quote.total), quote.currency)}
                    </p>
                    <p className="hidden text-xs text-muted-foreground sm:block">
                      Valid until {formatDate(quote.validUntil)}
                    </p>
                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                      <Button
                        asChild
                        size="sm"
                        className="flex-1 gap-1.5 bg-[#E40046] text-white hover:bg-[#c4003c] sm:flex-none"
                      >
                        <Link href={`/quotes/${quote.id}#edit-line-items`}>
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Link>
                      </Button>
                      {organizationId && (
                        <QuoteListDownloadButton
                          quoteId={quote.id}
                          organizationId={organizationId}
                          number={quote.number}
                        />
                      )}
                      {quote.status === 'DRAFT' && (
                        <button
                          type="button"
                          onClick={(e) => markStatus(quote.id, 'SENT', e)}
                          disabled={statusMutation.isPending}
                          className="flex-1 rounded-full border border-primary bg-white px-3 py-2 text-xs font-medium text-primary transition hover:bg-primary hover:text-primary-foreground sm:flex-none sm:py-1"
                        >
                          Mark Sent
                        </button>
                      )}
                      {(quote.status === 'DRAFT' || quote.status === 'SENT') && (
                        <button
                          type="button"
                          onClick={(e) => markStatus(quote.id, 'ACCEPTED', e)}
                          disabled={statusMutation.isPending}
                          className="flex-1 rounded-full border border-emerald-500 bg-white px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-600 hover:text-white sm:flex-none sm:py-1"
                        >
                          Mark Accepted
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
