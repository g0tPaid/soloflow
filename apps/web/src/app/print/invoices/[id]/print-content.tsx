'use client';

import Link from 'next/link';
import { use, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ORG_STORAGE_KEY, useOrganizationId } from '@/hooks/use-organization';
import { resolveImageSrc, parseBranding } from '@/lib/organization-branding';
import { PrintPageToolbar } from '@/components/print/print-page-toolbar';
import { InvoicePrintView } from '@/components/print/invoice-print-view';
import { buildWhatsAppMessage } from '@/components/invoices/share-invoice-whatsapp-button';

export function InvoicePrintPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const orgFromUrl = searchParams.get('org');
  const sharePhone = searchParams.get('phone');
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
    return `/print/invoices/${id}${query}`;
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
    queryKey: ['invoice-print', id, organizationId],
    queryFn: () => api.invoices.get(session!.accessToken!, organizationId!, id),
    enabled: canFetch,
    retry: 1,
  });

  useEffect(() => {
    if (!invoice) return;
    const brandingPreload = parseBranding(orgDetail?.settings?.branding);
    const urls = [
      orgDetail?.logo,
      brandingPreload.invoiceBanner,
      ...(invoice.items ?? []).flatMap((item) => [item.imageUrl, item.product?.imageUrl]),
    ]
      .map((url) => (url?.startsWith('http') ? url : resolveImageSrc(url)))
      .filter(Boolean) as string[];
    for (const src of urls) {
      const img = new window.Image();
      img.src = src;
    }
  }, [invoice, orgDetail]);

  if (sessionStatus === 'loading' || (!isReady && !orgFromUrl)) {
    return <p className="p-8 text-center text-sm text-gray-500">Preparing invoice…</p>;
  }

  if (sessionStatus === 'unauthenticated') {
    return (
      <div className="p-8 text-center text-sm text-gray-600">
        <p className="font-medium text-gray-900">Sign in to download this invoice</p>
        <p className="mt-2">
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="text-red-600 underline hover:text-red-700"
          >
            Go to login
          </Link>
        </p>
      </div>
    );
  }

  if (isReady && !organizationId) {
    return (
      <div className="p-8 text-center text-sm text-gray-600">
        <p className="font-medium text-gray-900">No organization selected</p>
        <p className="mt-2">
          <Link href="/onboarding" className="text-red-600 underline hover:text-red-700">
            Set up your organization
          </Link>
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center text-sm text-red-600">
        <p className="font-medium">Could not load invoice</p>
        <p className="mt-2">{error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }

  if (!canFetch || isLoading || isFetching || !invoice) {
    return <p className="p-8 text-center text-sm text-gray-500">Preparing invoice…</p>;
  }

  const org = orgDetail ?? organization;
  const safeFilename = `${invoice.number.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
  const whatsappMessage = buildWhatsAppMessage(invoice);

  return (
    <>
      {!embed && (
        <PrintPageToolbar
          backHref={`/invoices/${id}`}
          backLabel="Back to invoice"
          documentType="invoices"
          documentId={id}
          organizationId={organizationId}
          filename={safeFilename}
          whatsappMessage={whatsappMessage}
          whatsappPhone={sharePhone ?? invoice.customer?.phone ?? undefined}
          emailSubject={`Invoice ${invoice.number}`}
          emailBody={whatsappMessage}
        />
      )}

      <InvoicePrintView invoice={invoice} org={org} />

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
          .invoice-print {
            max-width: 100% !important;
            padding: 0 !important;
          }
          .invoice-header {
            max-height: 30vh !important;
          }
          .invoice-banner img {
            max-height: none !important;
            height: auto !important;
            width: 100% !important;
            object-fit: contain !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .invoice-product-image {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .bill-to-celebrate {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </>
  );
}
