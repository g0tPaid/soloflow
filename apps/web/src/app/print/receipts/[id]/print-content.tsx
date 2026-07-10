'use client';

import Link from 'next/link';
import { use, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ORG_STORAGE_KEY, useOrganizationId } from '@/hooks/use-organization';
import { formatCurrency } from '@/lib/utils';
import { PrintPageToolbar } from '@/components/print/print-page-toolbar';
import { ReceiptPrintView } from '@/components/print/receipt-print-view';

export function ReceiptPrintPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const orgFromUrl = searchParams.get('org');
  const embed = searchParams.get('embed') === '1';
  const { data: session, status: sessionStatus } = useSession();
  const { organizationId: orgFromHook, organization, isReady } = useOrganizationId();
  const organizationId = orgFromHook ?? orgFromUrl;

  useEffect(() => {
    if (!orgFromUrl || orgFromHook) return;
    localStorage.setItem(ORG_STORAGE_KEY, orgFromUrl);
  }, [orgFromUrl, orgFromHook]);

  const callbackUrl = useMemo(() => {
    const query = orgFromUrl ? `?org=${encodeURIComponent(orgFromUrl)}` : '';
    return `/print/receipts/${id}${query}`;
  }, [id, orgFromUrl]);

  const canFetch =
    sessionStatus === 'authenticated' && !!session?.accessToken && !!organizationId;

  const { data: orgDetail } = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: () => api.organizations.get(session!.accessToken!, organizationId!),
    enabled: canFetch,
  });

  const {
    data: invoice,
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ['receipt-print', id, organizationId],
    queryFn: () => api.invoices.get(session!.accessToken!, organizationId!, id),
    enabled: canFetch,
    retry: 1,
  });

  if (sessionStatus === 'loading' || (!isReady && !orgFromUrl)) {
    return <p className="p-8 text-center text-sm text-gray-500">Preparing receipt…</p>;
  }

  if (sessionStatus === 'unauthenticated') {
    return (
      <div className="p-8 text-center text-sm text-gray-600">
        <p className="font-medium text-gray-900">Sign in to download this receipt</p>
        <p className="mt-2">
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="text-emerald-700 underline"
          >
            Go to login
          </Link>
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center text-sm text-red-600">
        <p className="font-medium">Could not load receipt</p>
        <p className="mt-2">{error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }

  if (!canFetch || isLoading || isFetching || !invoice) {
    return <p className="p-8 text-center text-sm text-gray-500">Preparing receipt…</p>;
  }

  if (invoice.status !== 'PAID') {
    return (
      <div className="p-8 text-center text-sm text-amber-700">
        <p className="font-medium">This invoice is not marked as paid yet</p>
        <p className="mt-2">
          Go to{' '}
          <Link href="/invoices" className="underline">
            Invoices
          </Link>{' '}
          and click <strong>Paid</strong> first.
        </p>
      </div>
    );
  }

  const org = orgDetail ?? organization;
  const receiptFilename = `receipt-${invoice.number.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
  const whatsappMessage = `Payment receipt for invoice ${invoice.number} — ${formatCurrency(Number(invoice.total), invoice.currency)}. Thank you!`;

  return (
    <>
      {!embed && (
        <PrintPageToolbar
          backHref="/receipts"
          backLabel="Back to receipts"
          captureElementId="receipt-capture-root"
          filename={receiptFilename}
          accentClassName="bg-emerald-600 hover:bg-emerald-700"
          whatsappMessage={whatsappMessage}
          whatsappPhone={invoice.customer?.phone ?? undefined}
          emailSubject={`Receipt for ${invoice.number}`}
          emailBody={whatsappMessage}
        />
      )}

      <ReceiptPrintView invoice={invoice} org={org} />

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .receipt-print {
            max-width: 100% !important;
          }
        }
      `}</style>
    </>
  );
}
