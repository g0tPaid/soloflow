'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Download, Globe2, Link2, MapPin, Phone, UserRound } from 'lucide-react';
import type { Invoice, Organization } from '@/lib/api';
import { resolveImageSrc } from '@/lib/organization-branding';
import { buildInvoiceBarcode } from '@/lib/print-pdf/invoice-barcode-data';
import { getMobileInvoiceData } from '@/lib/print-pdf/mobile-invoice-data';
import { trackingQrPath, trackingUrl } from '@/lib/print-pdf/invoice-tracking-qr-data';
import { sevenColorMark } from '@/lib/print-pdf/sourcing-brand-mark';
import { isPublicInvoiceDownloadUrl } from '@/lib/public-invoice-download-url';

export function InvoiceV6View({
  invoice, organization,
}: {
  invoice: Invoice;
  organization?: Organization | null;
}) {
  const data = getMobileInvoiceData(invoice, organization);
  const barcode = buildInvoiceBarcode(invoice.number, invoice.id);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState(false);

  useEffect(() => {
    if (!organization?.id) return;
    let active = true;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(
          '/api/pdf/public-invoice-token/' + encodeURIComponent(invoice.id) +
            '?org=' + encodeURIComponent(organization.id),
          { credentials: 'include', cache: 'no-store', signal: controller.signal },
        );
        if (!response.ok) throw new Error('Unable to prepare download');
        const result = await response.json() as { url?: string };
        if (!result.url || !isPublicInvoiceDownloadUrl(result.url)) throw new Error('Invalid invoice download URL');
        if (active) setDownloadUrl(result.url);
      } catch {
        if (active) setDownloadError(true);
      }
    })();
    return () => { active = false; controller.abort(); };
  }, [invoice.id, organization?.id]);

  return (
    <article
      className="invoice-print invoice-v6 mx-auto w-full max-w-[370px] overflow-hidden rounded-[26px] border border-[#e0e8ee] bg-gradient-to-br from-[#fbfcff] via-white to-[#f2faf6] px-3 py-4 font-sans text-[#111827] shadow-[0_14px_45px_rgba(15,23,42,0.11)] print:w-[80mm] print:max-w-[80mm] print:rounded-none print:border-0 print:shadow-none"
      aria-label="Invoice Version 6 — compact receipt"
    >
      <div className="rounded-[20px] border border-white/90 bg-white/80 px-2.5 py-4 shadow-sm">
        <header className="text-center">
          <div className="flex items-center justify-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sevenColorMark} alt="" className="h-7 w-7 object-contain" />
            <p className="text-[clamp(1.35rem,6.8vw,1.65rem)] font-black tracking-tight text-slate-950">
              sourcing<span className="text-[#e40036]">.center</span>
            </p>
          </div>
          <p className="mt-1 text-[11px] font-medium text-slate-700">{data.organizationName}</p>
          {data.address ? (
            <p className="mt-2 flex items-start justify-center gap-1 text-[10px] leading-snug text-slate-600">
              <MapPin size={12} className="mt-0.5 shrink-0" />{data.address}
            </p>
          ) : null}
          {data.contact ? (
            <p className="mt-1 flex items-start justify-center gap-1 break-all text-[10px] text-slate-600">
              <Phone size={11} className="mt-0.5 shrink-0" />{data.contact}
            </p>
          ) : null}
          {data.taxId ? <p className="mt-1 text-[10px] text-slate-600">TRN {data.taxId}</p> : null}
        </header>

        <div className="my-3 h-px bg-slate-200" />

        <div className="rounded-[15px] bg-gradient-to-r from-[#e8f8ef] via-[#f5faf8] to-[#e6f6ed] px-3 py-2 text-center text-[18px] font-extrabold tracking-wide text-[#064d3c]">
          INVOICE
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/80 px-2.5 py-2 text-[11px] shadow-sm">
          <strong className="min-w-0 break-all">{invoice.number}</strong>
          <span className="flex shrink-0 items-center gap-1 text-[10px] text-slate-600">
            <CalendarDays size={13} />{data.date}
          </span>
        </div>

        <section className="mt-2 grid grid-cols-[44%_1fr] gap-2 rounded-2xl border border-[#e4f3eb] bg-gradient-to-br from-[#f4f8fb] to-[#eaf8f0] px-3 py-3 text-[11px]">
          <div className="min-w-0 border-r border-slate-300 pr-2">
            <UserRound size={16} className="text-slate-600" />
            <p className="mt-1 text-slate-500">Bill to</p>
            <p className="mt-0.5 break-words font-bold text-slate-900">{invoice.customer?.name || 'Customer'}</p>
          </div>
          <div className="min-w-0 break-words whitespace-pre-line leading-snug text-slate-800">
            <MapPin size={16} className="mb-1 text-slate-600" />
            {data.customerAddress.length ? data.customerAddress.join('\n') : 'Address not provided'}
          </div>
        </section>

        {data.status ? <p className="mt-2 text-center text-xs font-bold text-rose-600">{data.status}</p> : null}
        {data.shipTo ? (
          <section className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-xs">
            <strong>Ship to: {data.shipTo.name}</strong>
            <p className="whitespace-pre-line">{data.shipTo.address.join('\n')}</p>
          </section>
        ) : null}

        <div className="mt-3 text-center">
          <svg
            width="100%" height={33} viewBox={barcode.viewBox}
            preserveAspectRatio="none" role="img" aria-label={'Invoice barcode for ' + barcode.value}
          >
            {barcode.bands.map(({ fill, path }) => <path key={fill} d={path} fill={fill} />)}
          </svg>
          <p className="mt-0.5 break-all font-mono text-[10px] text-slate-700">{barcode.value}</p>
        </div>

        <div className="mt-3 space-y-2 border-y border-dashed border-slate-300 py-2.5">
          {data.items.map((item) => {
            const image = resolveImageSrc(item.image);
            return (
              <div key={item.id} className="flex items-center gap-2 rounded-xl bg-white/90 p-1.5 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {image ? <img src={image} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" /> : null}
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-extrabold text-slate-950">{item.title}</p>
                  {item.description ? <p className="break-words text-[10px] text-slate-600">{item.description}</p> : null}
                  <p className="mt-0.5 text-[10px] font-semibold text-slate-700">{item.quantity}</p>
                </div>
                <span className="shrink-0 rounded-xl bg-emerald-50 px-2 py-2 text-[11px] font-bold text-[#064d3c]">{item.amount}</span>
              </div>
            );
          })}
        </div>

        <dl className="mt-2 space-y-1.5 text-[13px] tabular-nums">
          {data.totals.map(({ label, amount }) => (
            <div key={label} className="flex justify-between gap-2">
              <dt>{label}</dt><dd>{amount}</dd>
            </div>
          ))}
          <div className="mt-3 flex justify-between gap-2 border-y-2 border-[#07523e] py-2 text-[clamp(1rem,4.8vw,1.2rem)] font-extrabold text-[#07523e]">
            <dt>TOTAL DUE</dt><dd>{data.balance}</dd>
          </div>
        </dl>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <a
            href="https://wise.com/pay/me/ajmala214"
            target="_blank" rel="noopener noreferrer"
            className="flex min-h-12 items-center justify-center gap-1 rounded-[15px] bg-gradient-to-br from-[#16d713] to-[#005b0c] px-1 text-center text-white shadow-md"
          >
            <span className="text-lg font-black italic">WISE</span>
            <span className="text-[10px] font-semibold leading-tight">Pay with Wise</span>
          </a>
          <a
            href={downloadUrl ?? '#'}
            target="_blank" rel="noopener noreferrer"
            aria-disabled={!downloadUrl}
            onClick={(event) => { if (!downloadUrl) event.preventDefault(); }}
            className={'flex min-h-12 items-center justify-center gap-1 rounded-[15px] bg-gradient-to-br from-[#ff203b] to-[#bf0010] px-1 text-center text-white shadow-md ' + (!downloadUrl ? 'opacity-70' : '')}
          >
            <span className="text-[10px] font-black leading-tight">sourcing.center</span>
            <Download size={17} className="shrink-0" />
            <span className="text-[10px] font-bold leading-tight">Download Invoice</span>
          </a>
        </div>
        <div className="mt-1.5 flex justify-end">
          <p className="rounded-full bg-[#ffebf2] px-2 py-1 text-right text-[10px] font-medium text-[#a1124a]">
            {downloadError ? 'Could not prepare download link' : downloadUrl ? 'Opens in a browser — no login required' : 'Preparing secure download…'}
          </p>
        </div>

        {invoice.notes ? <p className="mt-3 whitespace-pre-line text-[11px] text-slate-600">{invoice.notes}</p> : null}

        <footer className="mt-4 flex items-center gap-3 rounded-[18px] border border-slate-100 bg-white/85 p-3 shadow-sm">
          <a href={trackingUrl} target="_blank" rel="noopener noreferrer" aria-label="Track your parcel">
            <svg width={75} height={75} viewBox="0 0 37 37" className="shrink-0">
              <path fill="#000" d={trackingQrPath} />
            </svg>
          </a>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-extrabold">Track your parcel</p>
            <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 break-all text-[10px] font-semibold text-[#076a3e] underline">
              <Link2 size={12} className="shrink-0" />www.sourcing.center/track
            </a>
            <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500"><Globe2 size={12} />www.sourcing.center</p>
          </div>
        </footer>
        <div className="mt-4 flex items-center justify-center gap-3">
          <span className="h-px w-20 bg-slate-300" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sevenColorMark} alt="Seven Color" className="h-7 w-7 object-contain" />
          <span className="h-px w-20 bg-slate-300" />
        </div>
      </div>
    </article>
  );
}
