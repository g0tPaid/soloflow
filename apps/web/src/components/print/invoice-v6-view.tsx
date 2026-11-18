'use client';

import { useEffect, useState } from 'react';
import {
  CalendarDays, Download, FileText, Globe2, Link2,
  Mail, MapPin, Phone, UserRound,
} from 'lucide-react';
import type { Invoice, Organization } from '@/lib/api';
import { parseBranding, resolveImageSrc } from '@/lib/organization-branding';
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
  const branding = parseBranding(organization?.settings?.branding);
  const barcode = buildInvoiceBarcode(invoice.number, invoice.id);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState(false);

  useEffect(() => {
    if (!organization?.id) return;
    let active = true;
    const controller = new AbortController();
    void (async () => {
      try {
        setDownloadError(false);
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
      className="invoice-print mx-auto w-full max-w-[410px] overflow-hidden rounded-[27px] border border-[#e1e7ed] bg-[radial-gradient(ellipse_at_5%_90%,#e4f8e9_0%,transparent_35%),radial-gradient(ellipse_at_100%_0%,#e5f9e9_0%,transparent_33%),linear-gradient(145deg,#f4f7ff,#fcfdff_70%,#f3faf8)] p-2.5 text-[#141c28] shadow-[0_12px_35px_rgba(28,42,59,0.11)] print:w-[80mm] print:max-w-[80mm] print:rounded-none print:border-0 print:p-0 print:shadow-none"
      aria-label="Invoice Version 6 — modern 80 mm receipt"
    >
      <div className="rounded-[23px] border border-white bg-white/85 px-3.5 pb-4 pt-4 shadow-[0_5px_15px_rgba(49,73,94,0.055)] print:rounded-none print:px-2 print:shadow-none">

        <header className="text-center">
          <div className="flex items-center justify-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sevenColorMark} alt="" className="h-9 w-9 shrink-0 object-contain" />
            <div className="whitespace-nowrap text-[clamp(1.58rem,7.5vw,1.9rem)] font-black leading-none tracking-[-0.065em] text-[#10151e]">
              sourcing<span className="text-[#eb0035]">.center</span>
            </div>
          </div>
          <p className="mt-1.5 text-[11px] font-medium leading-snug text-slate-700">{data.organizationName}</p>
          {data.address ? (
            <div className="mt-3 flex items-start justify-center gap-1.5 text-[10.5px] leading-snug text-[#364358]">
              <MapPin className="mt-[1px] h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
              <span>{data.address}</span>
            </div>
          ) : null}
          {(branding.phone || branding.email) ? (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10.5px] text-[#364358]">
              {branding.phone ? <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{branding.phone}</span> : null}
              {branding.phone && branding.email ? <span className="h-4 w-px bg-slate-300" /> : null}
              {branding.email ? <span className="inline-flex min-w-0 items-center gap-1 break-all"><Mail className="h-3.5 w-3.5 shrink-0" />{branding.email}</span> : null}
            </div>
          ) : null}
          {data.taxId ? <p className="mt-1 text-[10px] text-slate-600">TRN {data.taxId}</p> : null}
        </header>

        <div className="my-4 h-px bg-[#d9e1e8]" />

        <div className="flex min-h-[46px] items-center gap-2 rounded-[15px] bg-[linear-gradient(100deg,#e9f6ed_0%,#f7f9fe_50%,#edf5f9_100%)] px-2 py-1.5 shadow-[0_2px_5px_rgba(36,53,75,0.055)]">
          <div className="flex shrink-0 items-center gap-1 rounded-xl bg-gradient-to-r from-[#dff3e5] to-[#f3f8fa] px-1.5 py-1.5">
            <FileText className="h-5 w-5 text-[#076343]" strokeWidth={2} />
            <span className="text-[13px] font-extrabold text-[#064c36]">INVOICE</span>
          </div>
          <span className="h-5 w-px shrink-0 bg-[#9caab9]" />
          <span className="min-w-0 flex-1 break-all text-[11px] font-semibold leading-tight text-slate-950">{invoice.number}</span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[#dbe3ec] bg-white/70 px-1.5 py-2 text-[10px] text-slate-800 shadow-sm">
            <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.8} />
            {data.date}
          </span>
        </div>

        <section className="mt-3 grid min-h-[94px] grid-cols-[43%_57%] items-start rounded-[20px] border border-white bg-[linear-gradient(120deg,#f5f8fd_0%,#f6fafc_42%,#e8f8f0_100%)] px-3 py-3 shadow-[0_3px_9px_rgba(49,73,94,0.04)]">
          <div className="min-w-0 border-r border-[#bcc9d2] pr-3">
            <UserRound className="h-5 w-5 text-[#526176]" strokeWidth={1.8} />
            <p className="mt-1 text-[11px] text-[#566274]">Bill to</p>
            <p className="mt-1 break-words text-[13px] font-bold leading-snug text-slate-950">{invoice.customer?.name || 'Customer'}</p>
          </div>
          <div className="min-w-0 pl-3">
            <MapPin className="h-5 w-5 text-[#526176]" strokeWidth={1.8} />
            <p className="mt-1 whitespace-pre-line break-words text-[11px] leading-[1.27] text-slate-800">
              {data.customerAddress.length ? data.customerAddress.join('\n') : 'Address not provided'}
            </p>
          </div>
        </section>
        {data.status ? <p className="mt-2 text-center text-xs font-bold text-rose-700">{data.status}</p> : null}
        {data.shipTo ? (
          <section className="mt-2 rounded-xl bg-slate-100 px-3 py-2 text-xs">
            <strong>Ship to: {data.shipTo.name}</strong>
            <p className="whitespace-pre-line">{data.shipTo.address.join('\n')}</p>
          </section>
        ) : null}

        <div className="mx-auto mt-4 w-[72%] text-center">
          <svg
            width="100%" height={32} viewBox={barcode.viewBox}
            preserveAspectRatio="none" role="img" aria-label={'Invoice barcode for ' + barcode.value}
          >
            {barcode.bands.map(({ fill, path }) => <path key={fill} fill={fill} d={path} />)}
          </svg>
          <p className="mt-0.5 break-all font-mono text-[10px] tracking-wide text-slate-700">{barcode.value}</p>
        </div>

        <div className="mt-3 border-t border-dashed border-slate-400/70">
          {data.items.map((item) => {
            const image = resolveImageSrc(item.image);
            return (
              <div key={item.id} className="my-2 flex items-center gap-2.5 rounded-[16px] border border-white bg-[linear-gradient(110deg,#ffffff_0%,#f6f8fd_60%,#fafdff_100%)] px-2 py-2 shadow-[0_3px_10px_rgba(15,23,42,0.07)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {image ? <img src={image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" /> : null}
                <div className="min-w-0 flex-1">
                  <p className="break-words text-[16px] font-extrabold leading-none text-slate-950">{item.title}</p>
                  {item.description ? <p className="mt-1 break-words text-[10px] leading-tight text-slate-500">{item.description}</p> : null}
                  <p className="mt-1.5 text-[11px] font-semibold text-slate-700">{item.quantity}</p>
                </div>
                <span className="shrink-0 rounded-[15px] bg-[#e4f5e9] px-2.5 py-2.5 text-[12px] font-bold text-[#064b37] shadow-[0_3px_8px_rgba(17,88,57,0.09)]">{item.amount}</span>
              </div>
            );
          })}
        </div>
        <div className="border-t border-dashed border-slate-400/70" />

        <dl className="mt-3 space-y-2 text-[13.5px] tabular-nums text-[#151923]">
          {data.totals.map(({ label, amount }) => (
            <div key={label} className="flex justify-between gap-2">
              <dt>{label}</dt><dd>{amount}</dd>
            </div>
          ))}
          <div className="mt-3 flex justify-between gap-2 border-y-[2px] border-[#07533c] py-2.5 text-[clamp(1rem,5.3vw,1.2rem)] font-extrabold text-[#07533c]">
            <dt>TOTAL DUE</dt><dd>{data.balance}</dd>
          </div>
        </dl>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <a
            href="https://wise.com/pay/me/ajmala214" target="_blank" rel="noopener noreferrer"
            className="flex min-h-[54px] items-center justify-center gap-1 rounded-[16px] border border-[#c6f3ba] bg-[linear-gradient(140deg,#16ed12_0%,#0aaa11_38%,#006c14_100%)] px-1.5 text-white shadow-[0_5px_9px_rgba(0,107,37,0.19)]"
          >
            <span className="text-[clamp(16px,5vw,20px)] font-black italic tracking-[-0.09em]">WISE</span>
            <span className="mx-0.5 h-5 w-px bg-white/75" />
            <span className="text-[10px] font-bold leading-tight">Pay with Wise</span>
          </a>
          <a
            href={downloadUrl ?? '#'} target="_blank" rel="noopener noreferrer"
            aria-disabled={!downloadUrl}
            onClick={(event) => { if (!downloadUrl) event.preventDefault(); }}
            className={'flex min-h-[54px] items-center justify-center gap-1 rounded-[16px] border border-[#ffc1ca] bg-[linear-gradient(145deg,#ff183b_0%,#e10022_55%,#b5000e_100%)] px-1 text-white shadow-[0_5px_9px_rgba(180,0,22,0.17)] ' + (!downloadUrl ? 'opacity-70' : '')}
          >
            <span className="min-w-0 text-center text-[clamp(9px,2.6vw,11px)] font-black leading-none tracking-tight">sourcing.center</span>
            <span className="mx-0.5 h-5 w-px shrink-0 bg-white/75" />
            <Download className="h-[19px] w-[19px] shrink-0" strokeWidth={2.7} />
            <span className="text-[10px] font-bold leading-tight">Download Invoice</span>
          </a>
        </div>
        <p className="ml-auto mt-2 w-fit max-w-[54%] rounded-2xl bg-[#ffebf1] px-2 py-1.5 text-center text-[10px] font-medium leading-tight text-[#a31143]">
          {downloadError ? 'Unable to create download link' : downloadUrl ? 'Opens in a browser — no login required' : 'Preparing secure download…'}
        </p>
        {invoice.notes ? <p className="mt-3 whitespace-pre-line text-[11px] text-slate-600">{invoice.notes}</p> : null}

        <footer className="mt-4 flex items-center gap-3 rounded-[21px] border border-white bg-gradient-to-r from-[#ffffff] to-[#f8fafd] p-3 shadow-[0_4px_15px_rgba(29,42,66,0.08)]">
          <a href={trackingUrl} target="_blank" rel="noopener noreferrer" aria-label="Track your parcel" className="shrink-0">
            <svg width={75} height={75} viewBox="0 0 37 37">
              <path fill="#000" d={trackingQrPath} />
            </svg>
          </a>
          <span className="h-[70px] w-px shrink-0 bg-[#cbd5df]" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-extrabold leading-tight text-slate-950">Track your parcel</p>
            <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1 break-all text-[11px] font-semibold leading-tight text-[#00703e] underline">
              <Link2 className="h-3.5 w-3.5 shrink-0" />www.sourcing.center/track
            </a>
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-600"><Globe2 className="h-3.5 w-3.5 shrink-0" />www.sourcing.center</p>
          </div>
        </footer>
        <div className="mt-5 flex items-center justify-center gap-3">
          <span className="h-px w-20 bg-slate-300" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sevenColorMark} alt="Seven Color" className="h-8 w-8 object-contain" />
          <span className="h-px w-20 bg-slate-300" />
        </div>
      </div>
    </article>
  );
}
