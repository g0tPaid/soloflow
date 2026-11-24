import type { Invoice, Organization } from '@/lib/api';
import { resolveImageSrc } from '@/lib/organization-branding';
import { buildInvoiceBarcode } from '@/lib/print-pdf/invoice-barcode-data';
import { sevenColorMark } from '@/lib/print-pdf/sourcing-brand-mark';
import { trackingQrPath, trackingUrl } from '@/lib/print-pdf/invoice-tracking-qr-data';
import { getMobileInvoiceData } from '@/lib/print-pdf/mobile-invoice-data';

export function MobileInvoiceView({ invoice, organization, documentType = 'invoice', repMarkets = false }: { invoice: Invoice; organization?: Organization | null; documentType?: 'invoice' | 'quote'; repMarkets?: boolean }) {
  const isQuote = documentType === 'quote';
  const data = getMobileInvoiceData(invoice, organization, repMarkets);
  const barcode = buildInvoiceBarcode(invoice.number, invoice.id);

  return (
    <article className="invoice-print mx-auto w-full max-w-sm bg-white px-5 py-6 text-sm text-zinc-900 print:max-w-none" aria-label={isQuote ? "Mobile quote" : "Mobile invoice"}>
      <header className="space-y-1 text-center">
        {repMarkets ? <p className="mb-2 font-serif text-[24px] font-bold leading-none tracking-[-0.03em] text-[#DC2626]">www.rep.markets</p> : <p className="mb-2 text-[clamp(1.65rem,8vw,2.25rem)] font-extrabold tracking-tight">
          sourcing<span className="text-[#e4001b]">.center</span>
        </p>}
        {data.organizationName ? <p className="text-xs text-zinc-500">{data.organizationName}</p> : null}
        {data.address ? <p className="text-xs">{data.address}</p> : null}
        {data.contact ? <p className="break-words text-xs">{data.contact}</p> : null}
        {data.taxId ? <p className="text-xs">TRN {data.taxId}</p> : null}
        <h1 className="break-words pt-2 text-sm font-bold">
          {isQuote ? 'QUOTE' : 'INVOICE'} <span className="font-mono text-xs font-normal"> · {invoice.number}</span>
        </h1>
        <p>{data.date}</p>
        {isQuote && invoice.dueDate ? <p className="text-xs font-semibold">Valid until: {new Date(invoice.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</p> : null}
        {invoice.customer?.name ? <p>{isQuote ? 'Prepared for:' : 'Bill to:'} <strong>{invoice.customer.name}</strong></p> : null}
        {data.customerAddress.length ? (
          <p className="whitespace-pre-line break-words text-xs text-zinc-700">{data.customerAddress.join('\n')}</p>
        ) : null}
        {!isQuote && data.status ? <p className="font-semibold">{data.status}</p> : null}
        <div className="pt-2">
          <svg width={Math.min(barcode.width * 1.12, 166)} height={22} viewBox={barcode.viewBox} preserveAspectRatio="none" className="mx-auto max-w-full" role="img" aria-label={`${isQuote ? 'Quote' : 'Invoice'} barcode for ${barcode.value}`}>
            {barcode.bands.map(({ fill, path }) => <path key={fill} fill={fill} d={path} />)}
          </svg>
          <p className="max-w-full break-all font-mono text-xs">{barcode.value}</p>
        </div>
      </header>
      {data.shipTo ? (
        <section aria-label="Ship to" className="mt-3 rounded-lg bg-zinc-100 px-3 py-2 text-xs">
          <p className="font-semibold">Ship to</p>
          {data.shipTo.name ? <p className="mt-1 break-words font-bold">{data.shipTo.name}</p> : null}
          {data.shipTo.address.length ? <p className="whitespace-pre-line break-words">{data.shipTo.address.join('\n')}</p> : null}
        </section>
      ) : null}
      <div className="mt-3 text-center text-xs"><a href={`/api/pdf/print/${isQuote ? 'quotes' : 'invoices'}/${encodeURIComponent(invoice.id)}?org=${encodeURIComponent(organization?.id ?? '')}&version=${isQuote ? '5' : '1'}`} className="inline-flex rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 font-bold text-blue-800 shadow-sm transition hover:bg-blue-100">Download Official {isQuote ? 'Quote' : 'Invoice'}</a></div>
      <ul className="my-4 space-y-3 border-t border-dashed border-zinc-400 pt-4">
        {data.items.map((item) => {
          const image = resolveImageSrc(item.image);
          return (
            <li key={item.id} className="flex items-start gap-2.5 border-b border-dotted border-zinc-400 pb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {image ? <img src={image} alt="" className="h-10 w-10 shrink-0 rounded object-cover" /> : null}
              <div className="min-w-0 flex-1 break-words">
                <p className="font-bold">{item.title}</p>
                {item.description ? <p className="text-xs text-zinc-600">{item.description}</p> : null}
                <p className="text-xs font-bold tabular-nums text-zinc-800">{item.quantity}</p>
              </div>
              <p className="shrink-0 text-right text-sm font-semibold tabular-nums">{item.amount}</p>
            </li>
          );
        })}
      </ul>
      <dl className="space-y-2 tabular-nums">
        {data.totals.map(({ label, amount }) => (
          <div key={label} className="flex justify-between gap-2"><dt>{label}</dt><dd>{amount}</dd></div>
        ))}
        <div className="flex flex-wrap justify-between gap-x-2 border-y-2 border-zinc-900 py-2 text-lg font-extrabold">
          <dt>{isQuote ? 'QUOTED TOTAL' : 'TOTAL DUE'}</dt><dd>{data.balance}</dd>
        </div>
      </dl>
      {invoice.notes ? <p className="mt-3 whitespace-pre-wrap break-words text-xs">{invoice.notes}</p> : null}
      <footer className="mt-5 grid justify-items-center gap-3 text-center">
        {!isQuote ? <a href={trackingUrl} className="flex items-center gap-2 rounded-lg border border-zinc-300 px-2 py-1.5 text-left">
          <svg width={47} height={47} viewBox="0 0 37 37" aria-hidden="true">
            <path fill="#000" d={trackingQrPath} />
          </svg>
          <span><span className="block font-bold">Track shipment</span><span className="block text-xs">sourcing.center/track</span></span>
        </a> : null}
        {data.website ? <p className="break-words text-xs">{data.website}</p> : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {!repMarkets ? <img src={sevenColorMark} alt="Seven Color" className="h-8 w-8 object-contain" /> : null}
      </footer>
    </article>
  );
}
