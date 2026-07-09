'use client';

import Link from 'next/link';
import { use, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { Globe, Mail, Phone, Plane, Ship, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { ORG_STORAGE_KEY, useOrganizationId } from '@/hooks/use-organization';
import { formatCurrency } from '@/lib/utils';
import { parseStoredLineItem } from '@/lib/line-items';
import {
  formatAddressLines,
  parseBranding,
  resolveImageSrc,
} from '@/lib/organization-branding';
import { InstagramQrBadge } from '@/components/shared/instagram-qr-badge';
import { PrintPageToolbar } from '@/components/print/print-page-toolbar';
import { buildWhatsAppMessage } from '@/components/invoices/share-invoice-whatsapp-button';

const RED = '#DC2626';
const RED_LIGHT = '#FEE2E2';
const RED_DARK = '#991B1B';
const DEFAULT_INSTAGRAM = 'https://www.instagram.com/sevencolortrading/';

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function TopWave() {
  return (
    <svg
      className="block w-full"
      viewBox="0 0 1440 80"
      preserveAspectRatio="none"
      aria-hidden
      style={{ height: 36 }}
    >
      <path
        fill={RED}
        d="M0,48 C240,80 480,16 720,40 C960,64 1200,24 1440,48 L1440,0 L0,0 Z"
      />
      <path
        fill={RED_LIGHT}
        fillOpacity={0.6}
        d="M0,56 C360,32 720,72 1080,44 C1260,32 1380,56 1440,56 L1440,0 L0,0 Z"
      />
    </svg>
  );
}

function SectionWave() {
  return (
    <svg
      className="my-3 block w-full"
      viewBox="0 0 1440 24"
      preserveAspectRatio="none"
      aria-hidden
      style={{ height: 14 }}
    >
      <path
        fill={RED_LIGHT}
        d="M0,12 C180,24 360,0 540,12 C720,24 900,0 1080,12 C1260,24 1380,6 1440,12 L1440,24 L0,24 Z"
      />
    </svg>
  );
}

function BottomWave() {
  return (
    <svg
      className="block w-full"
      viewBox="0 0 1440 100"
      preserveAspectRatio="none"
      aria-hidden
      style={{ height: 64 }}
    >
      <path
        fill={RED_DARK}
        d="M0,36 C240,0 480,72 720,36 C960,0 1200,72 1440,36 L1440,100 L0,100 Z"
      />
      <path
        fill={RED}
        fillOpacity={0.85}
        d="M0,52 C360,88 720,16 1080,52 C1260,68 1380,40 1440,52 L1440,100 L0,100 Z"
      />
    </svg>
  );
}

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
    const ig = brandingPreload.instagramUrl?.trim() || DEFAULT_INSTAGRAM;
    const urls = [
      orgDetail?.logo,
      brandingPreload.invoiceBanner,
      `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&ecc=M&data=${encodeURIComponent(ig)}`,
      ...(invoice.items ?? []).flatMap((item) => [
        item.imageUrl,
        item.product?.imageUrl,
      ]),
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
  const branding = parseBranding(org?.settings?.branding);
  const companyAddress = formatAddressLines(branding.address);
  const customerAddress = formatAddressLines(invoice.customer?.address ?? undefined);
  const logoSrc = resolveImageSrc(org?.logo);
  const bannerSrc = resolveImageSrc(branding.invoiceBanner);
  const instagramUrl = branding.instagramUrl?.trim() || DEFAULT_INSTAGRAM;
  const currency = invoice.currency;
  const customer = invoice.customer;
  const taxAmount = Number(invoice.taxAmount ?? 0);
  const discountAmount = Number(invoice.discount ?? 0);
  const shippingAmount = Number(invoice.shipping ?? 0);
  const hasShippingInfo =
    invoice.shippingMethod ||
    invoice.shippingTerms ||
    invoice.shippingFromCountry ||
    invoice.shippingToCountry;

  const footerContacts = [
    branding.website && { icon: Globe, text: branding.website },
    branding.phone && { icon: Phone, text: branding.phone },
    branding.email && { icon: Mail, text: branding.email },
  ].filter(Boolean) as { icon: typeof Globe; text: string }[];

  const safeFilename = `${invoice.number.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
  const whatsappMessage = buildWhatsAppMessage(invoice);

  return (
    <div className="invoice-print mx-auto min-h-screen w-full max-w-[820px] overflow-x-hidden bg-white text-slate-800">
      {!embed && (
        <PrintPageToolbar
          backHref={`/invoices/${id}`}
          backLabel="Back to invoice"
          captureElementId="invoice-capture-root"
          filename={safeFilename}
          whatsappMessage={whatsappMessage}
          whatsappPhone={sharePhone ?? invoice.customer?.phone ?? undefined}
        />
      )}

      <div id="invoice-capture-root" className="bg-white">
      <TopWave />

      <div className="relative px-4 pb-2 pt-2 sm:px-10">
        {/* Instagram QR — top right */}
        <div className="absolute right-6 top-1 z-10 print:right-4 print:top-0">
          <InstagramQrBadge url={instagramUrl} />
        </div>

        {/* Compact centered company header (~30% of page) */}
        <header className="invoice-header mx-auto mb-1 flex max-h-[30vh] max-w-xl flex-col items-center justify-center overflow-hidden text-center">
          <div className="mb-1.5 flex justify-center">
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt=""
                className="h-28 w-28 rounded-xl object-contain shadow-sm ring-1 ring-red-100"
              />
            ) : (
              <div
                className="flex h-28 w-28 items-center justify-center rounded-xl text-3xl font-bold text-white shadow-md"
                style={{ backgroundColor: RED }}
              >
                {(org?.name ?? 'C').charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <h1 className="text-lg font-bold leading-tight tracking-tight text-slate-900">
            {org?.name ?? 'Your Company'}
          </h1>

          {branding.tagline && (
            <p className="mt-0.5 text-xs font-medium text-red-600">{branding.tagline}</p>
          )}

          {companyAddress.length > 0 && (
            <p className="mt-1 text-[11px] leading-snug text-slate-500">
              {companyAddress.join(' · ')}
            </p>
          )}

          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[11px] text-slate-600">
            {branding.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3 text-red-500" />
                {branding.phone}
              </span>
            )}
            {branding.email && (
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3 text-red-500" />
                {branding.email}
              </span>
            )}
            {branding.website && (
              <span className="inline-flex items-center gap-1">
                <Globe className="h-3 w-3 text-red-500" />
                {branding.website}
              </span>
            )}
          </div>
        </header>

        <SectionWave />

        {/* Invoice title + meta — 50/50 Bill To and invoice details */}
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:items-start">
          <div className="min-w-0">
            <div
              className="bill-to-celebrate relative overflow-hidden border px-4 py-3 text-center shadow-sm"
              style={{
                borderColor: '#fecaca',
                background: '#FFFFFF',
                borderRadius: 28,
              }}
            >
              <div
                className="mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ring-2 ring-red-50"
                style={{ backgroundColor: RED }}
              >
                {(customer?.name ?? 'C').charAt(0).toUpperCase()}
              </div>

              <p className="text-base font-extrabold leading-tight tracking-tight text-slate-900">
                {customer?.name}
              </p>

              <p className="mt-0.5 text-[10px] font-medium italic text-slate-500">
                Thank you for being a valued partner
              </p>

              {(customerAddress.length > 0 || customer?.email || customer?.phone) && (
                <div className="mt-2 space-y-px border-t border-slate-100 pt-2">
                  {customerAddress.length > 0 && (
                    <p className="text-[11px] leading-snug text-slate-600">
                      {customerAddress.join(' · ')}
                    </p>
                  )}
                  {(customer?.email || customer?.phone) && (
                    <p className="text-[11px] leading-snug text-slate-500">
                      {[customer?.phone, customer?.email].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 sm:text-right">
            <p
              className="text-3xl font-extrabold tracking-tight sm:text-4xl"
              style={{ color: RED }}
            >
              INVOICE
            </p>
            <div className="mt-4 w-full rounded-xl border border-red-100 bg-red-50/50 px-5 py-4 text-left sm:text-right">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4 sm:flex-col sm:gap-1">
                  <dt className="font-medium text-slate-500">Invoice #</dt>
                  <dd className="font-semibold text-slate-900">{invoice.number}</dd>
                </div>
                <div className="flex justify-between gap-4 sm:flex-col sm:gap-1">
                  <dt className="font-medium text-slate-500">Issue Date</dt>
                  <dd className="font-semibold text-slate-900">{formatDate(invoice.issueDate)}</dd>
                </div>
                {invoice.dueDate && (
                  <div className="flex justify-between gap-4 sm:flex-col sm:gap-1">
                    <dt className="font-medium text-slate-500">Due Date</dt>
                    <dd className="font-semibold text-slate-900">{formatDate(invoice.dueDate)}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>

        {hasShippingInfo && (
          <section className="mb-6">
            <p
              className="mb-3 text-xs font-bold uppercase tracking-[0.15em]"
              style={{ color: RED }}
            >
              Shipping details
            </p>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-xl border border-red-100 bg-red-50/40 px-4 py-3 text-center">
                <p className="text-xs font-medium text-slate-500">Method</p>
                <p className="mt-1.5 inline-flex items-center justify-center gap-1.5 font-semibold text-slate-900">
                  {invoice.shippingMethod === 'AIR' && (
                    <>
                      <Plane className="h-4 w-4 text-red-600" />
                      Air freight
                    </>
                  )}
                  {invoice.shippingMethod === 'SEA' && (
                    <>
                      <Ship className="h-4 w-4 text-red-600" />
                      Sea freight
                    </>
                  )}
                  {!invoice.shippingMethod && <span>—</span>}
                </p>
              </div>
              <div className="rounded-xl border border-red-100 bg-red-50/40 px-4 py-3 text-center">
                <p className="text-xs font-medium text-slate-500">Terms</p>
                <p className="mt-1.5 font-semibold text-slate-900">
                  {invoice.shippingTerms ?? '—'}
                </p>
              </div>
              <div className="rounded-xl border border-red-100 bg-red-50/40 px-4 py-3 text-center">
                <p className="text-xs font-medium text-slate-500">Country route</p>
                <p className="mt-1.5 inline-flex items-center justify-center gap-1.5 font-semibold text-slate-900">
                  {invoice.shippingFromCountry || invoice.shippingToCountry ? (
                    <>
                      <span>{invoice.shippingFromCountry || '—'}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-red-500" />
                      <span>{invoice.shippingToCountry || '—'}</span>
                    </>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Line items */}
        <table className="mb-8 w-full table-fixed border-collapse overflow-hidden rounded-xl text-sm shadow-sm ring-1 ring-slate-100">
          <thead>
            <tr style={{ backgroundColor: RED }} className="text-left text-white">
              <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider w-16">
                Image
              </th>
              <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider">
                Qty
              </th>
              <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider">
                Unit Price
              </th>
              <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items ?? []).map((item, index) => {
              const { name, description } = parseStoredLineItem(item);
              const imageSrc = resolveImageSrc(item.imageUrl ?? item.product?.imageUrl);
              const isEven = index % 2 === 0;
              return (
                <tr
                  key={item.id}
                  className={isEven ? 'bg-white' : 'bg-slate-50/60'}
                  style={{ borderBottom: '1px solid #f1f5f9' }}
                >
                  <td className="px-4 py-4 align-top">
                    {imageSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageSrc}
                        alt=""
                        className="invoice-product-image h-14 w-14 rounded-lg border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-[10px] text-slate-400">
                        No img
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {name || description || 'Item'}
                      </p>
                      {description && name && (
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                          {description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right align-top tabular-nums text-slate-700">
                    {Number(item.quantity)}
                  </td>
                  <td className="px-4 py-4 text-right align-top tabular-nums text-slate-700">
                    {formatCurrency(Number(item.unitPrice), currency)}
                  </td>
                  <td className="px-5 py-4 text-right align-top font-semibold tabular-nums text-slate-900">
                    {formatCurrency(Number(item.amount), currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Notes + Totals */}
        <section className="mb-10 grid gap-8 sm:grid-cols-2">
          <div>
            {invoice.notes && (
              <>
                <p
                  className="mb-2 text-xs font-bold uppercase tracking-[0.15em]"
                  style={{ color: RED }}
                >
                  Notes
                </p>
                <p className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm leading-relaxed text-slate-600">
                  {invoice.notes}
                </p>
              </>
            )}
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium tabular-nums text-slate-900">
                  {formatCurrency(Number(invoice.subtotal), currency)}
                </span>
              </div>
              {shippingAmount > 0 && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Shipping</span>
                  <span className="font-medium tabular-nums text-slate-900">
                    {formatCurrency(shippingAmount, currency)}
                  </span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Discount</span>
                  <span className="font-medium tabular-nums text-red-600">
                    −{formatCurrency(discountAmount, currency)}
                  </span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Tax</span>
                  <span className="font-medium tabular-nums text-slate-900">
                    {formatCurrency(taxAmount, currency)}
                  </span>
                </div>
              )}
              <div
                className="mt-2 flex justify-between border-t-2 pt-3 text-base font-bold"
                style={{ borderColor: RED }}
              >
                <span className="uppercase tracking-wide text-slate-900">Total Due</span>
                <span className="tabular-nums" style={{ color: RED }}>
                  {formatCurrency(Number(invoice.total), currency)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Promotional banner */}
        {bannerSrc && (
          <section className="invoice-banner mb-6">
            <p
              className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.2em]"
              style={{ color: RED }}
            >
              New Offers
            </p>
            <div className="overflow-hidden rounded-xl shadow-md ring-1 ring-red-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bannerSrc}
                alt="Promotional offers"
                className="block w-full object-cover"
                style={{ maxHeight: 140 }}
              />
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      {footerContacts.length > 0 && (
        <footer className="mt-auto">
          <BottomWave />
          <div className="px-6 py-5 text-white" style={{ backgroundColor: RED_DARK }}>
            <div className="mx-auto flex max-w-[820px] flex-wrap items-center justify-center gap-6 text-xs">
              {footerContacts.map(({ icon: Icon, text }) => (
                <span key={text} className="flex items-center gap-2 opacity-95">
                  <Icon className="h-3.5 w-3.5 text-red-200" />
                  {text}
                </span>
              ))}
            </div>
          </div>
        </footer>
      )}

      {!footerContacts.length && <div className="pb-6" />}
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
          .invoice-print {
            max-width: 100% !important;
            padding: 0 !important;
          }
          .invoice-header {
            max-height: 30vh !important;
          }
          .invoice-banner img {
            max-height: 140px !important;
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
          .instagram-qr {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
