import type { Invoice, Organization } from '@/lib/api';
import { resolveImageSrc } from '@/lib/organization-branding';
import { buildInvoiceBarcode } from '@/lib/print-pdf/invoice-barcode-data';
import { trackingQrPath, trackingUrl } from '@/lib/print-pdf/invoice-tracking-qr-data';
import { getMobileInvoiceData } from '@/lib/print-pdf/mobile-invoice-data';

export function MobileInvoiceView({ invoice, organization }: { invoice: Invoice; organization?: Organization | null }) {
  const data = getMobileInvoiceData(invoice, organization);
  const barcode = buildInvoiceBarcode(invoice.number, invoice.id);
  const logo = resolveImageSrc(data.logo);

  return (
    <article className="invoice-print mx-auto w-full max-w-sm bg-white px-5 py-6 text-sm text-zinc-900 print:max-w-none" aria-label="Mobile invoice">
      <header className="space-y-1 text-center">
        {/* Images may be stored on the organization server or on this device. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logo ? <img src={logo} alt="" className="mx-auto mb-2 h-12 max-w-full object-contain" /> : null}
        <p className="text-lg font-bold">{data.organizationName}</p>
        {data.address ? <p className="text-xs">{data.address}</p> : null}
        {data.contact ? <p className="break-words text-xs">{data.contact}</p> : null}
        {data.taxId ? <p className="text-xs">TRN {data.taxId}</p> : null}
        <h1 className="pt-2 text-2xl font-extrabold">INVOICE</h1>
        <p className="break-words font-mono font-semibold">{invoice.number}</p>
        <p>{data.date}</p>
        {invoice.customer?.name ? <p>Bill to: {invoice.customer.name}</p> : null}
        {data.status ? <p className="font-semibold">{data.status}</p> : null}
      </header>
      <ul className="my-4 space-y-3 border-y border-dashed border-zinc-400 py-4">
        {data.items.map((item) => {
          const image = resolveImageSrc(item.image);
          return (
            <li key={item.id} className="flex items-start gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {image ? <img src={image} alt="" className="h-10 w-10 shrink-0 rounded object-cover" /> : null}
              <div className="min-w-0 flex-1 break-words">
                <p className="font-bold">{item.title}</p>
                {item.description ? <p className="text-xs text-zinc-600">{item.description}</p> : null}
                <p className="text-xs tabular-nums text-zinc-700">{item.quantity}</p>
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
          <dt>TOTAL DUE</dt><dd>{data.balance}</dd>
        </div>
      </dl>
      {invoice.notes ? <p className="mt-3 whitespace-pre-wrap break-words text-xs">{invoice.notes}</p> : null}
      <footer className="mt-5 grid justify-items-center gap-3 text-center">
        <div>
          <svg width={barcode.width} height={27} viewBox={barcode.viewBox} preserveAspectRatio="none" className="mx-auto max-w-full" role="img" aria-label={`Invoice barcode for ${barcode.value}`}>
            {barcode.bands.map(({ fill, path }) => <path key={fill} fill={fill} d={path} />)}
          </svg>
          <p className="max-w-full break-all font-mono text-xs">{barcode.value}</p>
        </div>
        <a href={trackingUrl} className="flex items-center gap-2 rounded-lg border border-zinc-300 px-2 py-1.5 text-left">
          <svg width={47} height={47} viewBox="0 0 37 37" aria-hidden="true">
            <path fill="#000" d={trackingQrPath} />
          </svg>
          <span><span className="block font-bold">Track shipment</span><span className="block text-xs">sourcing.center/track</span></span>
        </a>
        {data.website ? <p className="break-words text-xs">{data.website}</p> : null}
      </footer>
    </article>
  );
}
