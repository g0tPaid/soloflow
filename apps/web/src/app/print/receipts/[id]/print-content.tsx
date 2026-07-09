'use client';

import Link from 'next/link';
import { use, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Globe, Mail, Phone } from 'lucide-react';
import { api } from '@/lib/api';
import { ORG_STORAGE_KEY, useOrganizationId } from '@/hooks/use-organization';
import { formatCurrency } from '@/lib/utils';
import { parseStoredLineItem } from '@/lib/line-items';
import {
  formatAddressLines,
  parseBranding,
  resolveImageSrc,
} from '@/lib/organization-branding';
import { PrintPageToolbar } from '@/components/print/print-page-toolbar';

const GREEN = '#059669';
const GREEN_LIGHT = '#D1FAE5';
const GREEN_DARK = '#065F46';

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function ReceiptPrintPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const orgFromUrl = searchParams.get('org');
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
  const branding = parseBranding(org?.settings?.branding);
  const companyAddress = formatAddressLines(branding.address);
  const customerAddress = formatAddressLines(invoice.customer?.address ?? undefined);
  const logoSrc = resolveImageSrc(org?.logo);
  const currency = invoice.currency;
  const paidDate = formatDate(invoice.updatedAt || invoice.issueDate);

  const receiptFilename = `receipt-${invoice.number.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
  const whatsappMessage = `Payment receipt for invoice ${invoice.number} — ${formatCurrency(Number(invoice.total), currency)}. Thank you!`;

  return (
    <div className="receipt-print mx-auto min-h-screen w-full max-w-[760px] overflow-x-hidden bg-white text-slate-800">
      <PrintPageToolbar
        backHref="/receipts"
        backLabel="Back to receipts"
        captureElementId="receipt-capture-root"
        filename={receiptFilename}
        accentClassName="bg-emerald-600 hover:bg-emerald-700"
        whatsappMessage={whatsappMessage}
        whatsappPhone={invoice.customer?.phone ?? undefined}
      />

      <div id="receipt-capture-root" className="bg-white">
      <div
        className="px-8 py-3 text-center text-white"
        style={{ background: `linear-gradient(90deg, ${GREEN_DARK}, ${GREEN})` }}
      >
        <p className="text-xs font-bold uppercase tracking-[0.25em]">Payment received</p>
      </div>

      <div className="px-8 py-8">
        <div className="mb-6 flex flex-col items-center text-center">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt="" className="mb-3 h-16 w-16 rounded-xl object-contain" />
          ) : (
            <div
              className="mb-3 flex h-16 w-16 items-center justify-center rounded-xl text-2xl font-bold text-white"
              style={{ backgroundColor: GREEN }}
            >
              {(org?.name ?? 'C').charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-xl font-bold text-slate-900">{org?.name ?? 'Your Company'}</h1>
          {companyAddress.length > 0 && (
            <p className="mt-1 text-xs text-slate-500">{companyAddress.join(' · ')}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-600">
            {branding.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3 text-emerald-600" />
                {branding.phone}
              </span>
            )}
            {branding.email && (
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3 text-emerald-600" />
                {branding.email}
              </span>
            )}
            {branding.website && (
              <span className="inline-flex items-center gap-1">
                <Globe className="h-3 w-3 text-emerald-600" />
                {branding.website}
              </span>
            )}
          </div>
        </div>

        <div
          className="mb-6 flex flex-col items-center rounded-2xl border-2 px-6 py-5 text-center"
          style={{ borderColor: GREEN, backgroundColor: GREEN_LIGHT }}
        >
          <CheckCircle2 className="mb-2 h-10 w-10" style={{ color: GREEN }} />
          <p className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: GREEN_DARK }}>
            Official receipt
          </p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">
            {formatCurrency(Number(invoice.total), currency)}
          </p>
          <p className="mt-1 text-sm text-emerald-800">Payment received with thanks</p>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Received from</p>
            <p className="mt-2 font-semibold text-slate-900">{invoice.customer?.name}</p>
            {customerAddress.map((line) => (
              <p key={line} className="text-slate-600">
                {line}
              </p>
            ))}
            {invoice.customer?.email && (
              <p className="text-slate-600">{invoice.customer.email}</p>
            )}
            {invoice.customer?.phone && (
              <p className="text-slate-600">{invoice.customer.phone}</p>
            )}
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-sm">
            <dl className="space-y-2">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Receipt for invoice</dt>
                <dd className="font-semibold">{invoice.number}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Invoice date</dt>
                <dd className="font-semibold">{formatDate(invoice.issueDate)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Payment date</dt>
                <dd className="font-semibold">{paidDate}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Status</dt>
                <dd className="font-semibold text-emerald-700">PAID</dd>
              </div>
            </dl>
          </div>
        </div>

        <table className="mb-6 w-full border-collapse overflow-hidden rounded-xl text-sm shadow-sm ring-1 ring-slate-100">
          <thead>
            <tr style={{ backgroundColor: GREEN }} className="text-left text-white">
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Description</th>
              <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider">Qty</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items ?? []).map((item, index) => {
              const { name, description } = parseStoredLineItem(item);
              return (
                <tr
                  key={item.id}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                  style={{ borderBottom: '1px solid #f1f5f9' }}
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold">{name || description || 'Item'}</p>
                    {description && name && (
                      <p className="text-xs text-slate-500">{description}</p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{Number(item.quantity)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {formatCurrency(Number(item.amount), currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="ml-auto w-full max-w-xs rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-slate-600">Subtotal</span>
            <span className="font-medium">{formatCurrency(Number(invoice.subtotal), currency)}</span>
          </div>
          {Number(invoice.shipping ?? 0) > 0 && (
            <div className="flex justify-between py-1">
              <span className="text-slate-600">Shipping</span>
              <span className="font-medium">
                {formatCurrency(Number(invoice.shipping), currency)}
              </span>
            </div>
          )}
          {Number(invoice.discount ?? 0) > 0 && (
            <div className="flex justify-between py-1">
              <span className="text-slate-600">Discount</span>
              <span className="font-medium text-emerald-700">
                −{formatCurrency(Number(invoice.discount), currency)}
              </span>
            </div>
          )}
          <div
            className="mt-2 flex justify-between border-t-2 pt-3 text-base font-bold"
            style={{ borderColor: GREEN }}
          >
            <span>Amount paid</span>
            <span style={{ color: GREEN }}>{formatCurrency(Number(invoice.total), currency)}</span>
          </div>
        </div>

        <p className="mt-8 text-center text-sm italic text-slate-500">
          Thank you for your payment. This receipt confirms that invoice {invoice.number} has been
          paid in full.
        </p>
      </div>
      </div>

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
    </div>
  );
}
