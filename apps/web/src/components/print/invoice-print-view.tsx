import { Globe, Mail, Phone, Plane, Ship, ArrowRight } from 'lucide-react';
import type { Invoice, Organization } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { parseStoredLineItem } from '@/lib/line-items';
import {
  formatAddressLines,
  parseBranding,
  resolveImageSrc,
  resolveImageSrcForPrint,
} from '@/lib/organization-branding';

const RED = '#DC2626';
const RED_LIGHT = '#FEE2E2';
const RED_DARK = '#991B1B';

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
      className="block max-w-full w-full"
      viewBox="0 0 1440 80"
      preserveAspectRatio="none"
      aria-hidden
      style={{ height: 36, width: '100%' }}
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
      className="my-3 block max-w-full w-full"
      viewBox="0 0 1440 24"
      preserveAspectRatio="none"
      aria-hidden
      style={{ height: 14, width: '100%' }}
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
      className="block max-w-full w-full"
      viewBox="0 0 1440 100"
      preserveAspectRatio="none"
      aria-hidden
      style={{ height: 64, width: '100%' }}
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

type InvoicePrintViewProps = {
  invoice: Invoice;
  org: Organization | null | undefined;
  baseUrl?: string;
};

export function InvoicePrintView({ invoice, org, baseUrl }: InvoicePrintViewProps) {
  const resolveImage = (url?: string | null) =>
    baseUrl ? resolveImageSrcForPrint(url, baseUrl) : resolveImageSrc(url);

  const branding = parseBranding(org?.settings?.branding);
  const companyAddress = formatAddressLines(branding.address);
  const customerAddress = formatAddressLines(invoice.customer?.address ?? undefined);
  const logoSrc = resolveImage(org?.logo);
  const bannerSrc = resolveImage(branding.invoiceBanner);
  const signatureSrc = resolveImage(branding.invoiceSignature);
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

  return (
    <div className="invoice-print mx-auto min-h-screen w-full max-w-[820px] overflow-x-hidden bg-white text-slate-800">
      <div id="invoice-capture-root" className="max-w-full overflow-x-hidden bg-white">
        <TopWave />

        <div className="relative max-w-full px-4 pb-2 pt-2 sm:px-10">
          <header className="invoice-header mx-auto mb-1 flex max-h-[30vh] max-w-xl flex-col items-center justify-center overflow-hidden text-center">
            <div className="mb-1.5 flex justify-center">
              {logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoSrc}
                  alt=""
                  className="h-28 w-28 rounded-xl bg-transparent object-contain"
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

          <div className="mb-8 max-w-full overflow-x-hidden rounded-xl shadow-sm ring-1 ring-slate-100">
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[8%]" />
                <col className="w-[18%]" />
                <col className="w-[30%]" />
                <col className="w-[12%]" />
                <col className="w-[16%]" />
                <col className="w-[16%]" />
              </colgroup>
              <thead>
                <tr style={{ backgroundColor: RED }} className="text-left text-white">
                  <th className="px-1 py-3 text-center text-xs font-bold uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-1 py-3 text-center text-xs font-bold uppercase tracking-wider">
                    Image
                  </th>
                  <th className="px-2 py-3 text-xs font-bold uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-1 py-3 text-center text-xs font-bold uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-1 py-3 text-right text-xs font-bold uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-2 py-3 text-right text-xs font-bold uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items ?? []).map((item, index) => {
                  const { name, description } = parseStoredLineItem(item);
                  const imageSrc = resolveImage(item.imageUrl ?? item.product?.imageUrl);
                  const isEven = index % 2 === 0;
                  return (
                    <tr
                      key={item.id}
                      className={isEven ? 'bg-white' : 'bg-slate-50/60'}
                      style={{ borderBottom: '1px solid #f1f5f9', breakInside: 'avoid' }}
                    >
                      <td className="px-1 py-3 text-center align-middle tabular-nums text-slate-600">
                        {index + 1}
                      </td>
                      <td className="px-1 py-3 align-middle">
                        <div className="flex justify-center">
                          {imageSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imageSrc}
                              alt=""
                              className="invoice-product-image h-11 w-11 rounded-lg border border-slate-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-[10px] text-slate-400">
                              —
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="min-w-0 px-2 py-3 align-middle">
                        <div className="min-w-0 break-words">
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
                      <td className="px-1 py-3 text-center align-middle tabular-nums text-slate-700">
                        {Number(item.quantity)}
                      </td>
                      <td className="px-1 py-3 text-right align-middle text-[11px] tabular-nums text-slate-700 sm:text-sm">
                        {formatCurrency(Number(item.unitPrice), currency)}
                      </td>
                      <td className="px-2 py-3 text-right align-middle text-[11px] font-semibold tabular-nums text-slate-900 sm:text-sm">
                        {formatCurrency(Number(item.amount), currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <section className="mb-10 grid gap-8 sm:grid-cols-2 sm:items-end">
            <div className="space-y-5">
              {invoice.notes && (
                <div>
                  <p
                    className="mb-2 text-xs font-bold uppercase tracking-[0.15em]"
                    style={{ color: RED }}
                  >
                    Notes
                  </p>
                  <p className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm leading-relaxed text-slate-600">
                    {invoice.notes}
                  </p>
                </div>
              )}

              {signatureSrc ? (
                <div className="invoice-signature">
                  <p
                    className="mb-2 text-xs font-bold uppercase tracking-[0.15em]"
                    style={{ color: RED }}
                  >
                    Authorized signature
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={signatureSrc}
                    alt="Authorized signature"
                    className="max-h-40 w-auto max-w-full object-contain object-left"
                  />
                </div>
              ) : null}
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
                  className="block h-auto w-full object-contain"
                />
              </div>
            </section>
          )}
        </div>

        {footerContacts.length > 0 && (
          <footer className="mt-auto max-w-full overflow-hidden">
            <BottomWave />
            <div className="max-w-full px-4 py-5 text-white sm:px-6" style={{ backgroundColor: RED_DARK }}>
              <div className="mx-auto flex max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
                {footerContacts.map(({ icon: Icon, text }) => (
                  <span
                    key={text}
                    className="inline-flex max-w-full items-center gap-2 opacity-95"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-red-200" />
                    <span className="min-w-0 break-all">{text}</span>
                  </span>
                ))}
              </div>
            </div>
          </footer>
        )}

        {!footerContacts.length && <div className="pb-6" />}
      </div>
    </div>
  );
}
