'use client';

import { useEffect, useState } from 'react';
import {
  CalendarDays, ChevronRight, Download, ExternalLink,
  Mail, MapPin, Phone,
} from 'lucide-react';
import type { Invoice, Organization } from '@/lib/api';
import { parseBranding, resolveImageSrc } from '@/lib/organization-branding';
import { getMobileInvoiceData } from '@/lib/print-pdf/mobile-invoice-data';
import { buildInvoiceBarcode } from '@/lib/print-pdf/invoice-barcode-data';
import { trackingQrPath, trackingUrl } from '@/lib/print-pdf/invoice-tracking-qr-data';
import { sevenColorMark } from '@/lib/print-pdf/sourcing-brand-mark';
import { isPublicInvoiceDownloadUrl } from '@/lib/public-invoice-download-url';

type Props = {
  invoice: Invoice;
  organization?: Organization | null;
};

/**
 * Invoice 7 — browser design preview.
 * The approved red reference is the layout authority. This is deliberately
 * separate from the PDF and all previous invoice versions.
 */
export function InvoiceV7View({ invoice, organization }: Props) {
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
        if (!response.ok) throw new Error('Invoice link unavailable');
        const result = await response.json() as { url?: string };
        if (!result.url || !isPublicInvoiceDownloadUrl(result.url)) {
          throw new Error('Invalid invoice link');
        }
        if (active) setDownloadUrl(result.url);
      } catch {
        if (active && !controller.signal.aborted) setDownloadError(true);
      }
    })();

    return () => { active = false; controller.abort(); };
  }, [invoice.id, organization?.id]);

  const contactPhone = branding.phone;
  const contactEmail = branding.email;

  return (
    <article
      className="invoice-print relative mx-auto w-full max-w-[430px] overflow-hidden bg-[#f8f8f9] pb-0 font-sans text-[#101014] shadow-[0_12px_36px_rgba(60,20,35,0.14)] print:w-[80mm] print:max-w-[80mm] print:shadow-none"
      aria-label="Invoice Version 7 — red premium receipt design preview"
    >
      {/* Red angular banner from the approved design. */}
      <header className="relative h-[142px] overflow-hidden bg-[linear-gradient(124deg,#f4051e_0%,#d0001d_42%,#77000d_100%)] text-white">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div
            className="absolute -left-[14%] -top-[46px] h-[150px] w-[92%] bg-[linear-gradient(135deg,rgba(255,74,78,.7),rgba(244,2,29,.1))]"
            style={{ clipPath: 'polygon(0 0,100% 0,0 100%)' }}
          />
          <div
            className="absolute -right-[28%] -bottom-[75px] h-[180px] w-[94%] bg-[linear-gradient(100deg,rgba(130,0,15,.06),rgba(44,0,8,.83))]"
            style={{ transform: 'rotate(-17deg)' }}
          />
          <div
            className="absolute right-[-10%] top-[28px] h-[120px] w-[68%] bg-red-950/20"
            style={{ clipPath: 'polygon(100% 0,100% 100%,0 100%)' }}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center px-4 pt-[13px] text-center">
          <div className="whitespace-nowrap text-[clamp(27px,8.2vw,35px)] font-black leading-[1.08] tracking-[-0.068em] drop-shadow-sm">
            sourcing<span className="text-white">.center</span>
          </div>
          <p className="mt-[7px] max-w-full text-[clamp(10px,3vw,12.5px)] leading-snug text-white/95">
            {data.organizationName}
          </p>
          {data.address ? (
            <div className="mt-[9px] flex max-w-full items-start justify-center gap-1.5 text-[clamp(9px,2.65vw,11.5px)] leading-snug text-white/95">
              <MapPin size={15} className="mt-[1px] shrink-0 fill-white/10" strokeWidth={2.8} />
              <span className="min-w-0">{data.address}</span>
            </div>
          ) : null}
          {(contactPhone || contactEmail) ? (
            <div className="mt-[7px] flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[clamp(9px,2.6vw,11.5px)] font-medium text-white/95">
              {contactPhone ? <span className="inline-flex items-center gap-1.5"><Phone size={13} strokeWidth={2.4} />{contactPhone}</span> : null}
              {contactPhone && contactEmail ? <span className="h-[15px] w-px bg-white/65" /> : null}
              {contactEmail ? <span className="inline-flex min-w-0 items-center gap-1.5 break-all"><Mail size={14} strokeWidth={2.2} />{contactEmail}</span> : null}
            </div>
          ) : null}
        </div>
      </header>

      <div className="relative z-10 -mt-[12px] rounded-t-[30px] bg-[#f9f9fa] px-[9px] pb-[11px] pt-[12px]">
        {/* Main curved white receipt card */}
        <section className="rounded-[27px] border-[5px] border-[#f2f2f4] bg-white px-[11px] pb-[12px] pt-[11px] shadow-[0_6px_17px_rgba(0,0,0,0.095)]">
          <div className="flex min-h-[44px] w-full items-stretch overflow-hidden rounded-full border border-[#dedee0] bg-[linear-gradient(100deg,#f1f1f1,#e9e9ea)]">
            <span className="flex w-[41%] shrink-0 items-center justify-center rounded-[12px] bg-[linear-gradient(120deg,#ff1923,#ce000e)] px-2 text-[clamp(16px,5vw,23px)] font-black text-white">
              INVOICE
            </span>
            <span className="flex min-w-0 flex-1 items-center justify-center break-all px-[7px] text-center text-[clamp(10.5px,3.1vw,13.5px)] font-medium tracking-tight text-[#121216]">
              {invoice.number}
            </span>
          </div>

          <div className="mt-[12px] flex items-center justify-center gap-2 text-[13px] font-medium">
            <CalendarDays size={17} strokeWidth={2.6} />
            <span>{data.date}</span>
          </div>
          <div className="mt-[8px] text-center text-[14px] leading-tight">
            Bill to: <strong className="font-extrabold">{invoice.customer?.name || 'Customer'}</strong>
          </div>
          <div className="mt-[6px] flex items-start justify-center gap-3">
            <MapPin className="mt-[2px] shrink-0" size={19} fill="#111827" stroke="white" strokeWidth={1.6} />
            <p className="max-w-[78%] whitespace-pre-line text-center text-[13px] leading-[1.25]">
              {data.customerAddress.length ? data.customerAddress.join('\n') : 'Address not provided'}
            </p>
          </div>
          {data.status ? <p className="mt-2 text-center text-xs font-extrabold text-red-700">{data.status}</p> : null}
          {data.shipTo ? (
            <div className="mt-2 rounded-lg bg-zinc-100 px-2 py-2 text-center text-xs">
              <strong>Ship to: {data.shipTo.name || ''}</strong>
              <p className="whitespace-pre-line">{data.shipTo.address.join('\n')}</p>
            </div>
          ) : null}

          <div className="mx-auto mt-[13px] w-[86%] text-center">
            <svg
              role="img"
              aria-label={'Multicolor invoice barcode for ' + barcode.value}
              className="block h-[37px] w-full"
              viewBox={barcode.viewBox}
              preserveAspectRatio="none"
            >
              {barcode.bands.map((band) => <path key={band.fill} d={band.path} fill={band.fill} />)}
            </svg>
            <p className="mt-[2px] break-all text-[10.5px] font-medium text-zinc-800">{barcode.value}</p>
          </div>

          <div className="mt-[12px] border-t border-dashed border-[#999]">
            {data.items.map((item) => {
              const image = resolveImageSrc(item.image);
              return (
                <div key={item.id} className="flex min-h-[68px] items-center gap-[12px] py-[11px]">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="" className="h-[54px] w-[54px] shrink-0 rounded-[7px] object-cover" />
                  ) : <div className="h-[54px] w-[54px] shrink-0 rounded-[7px] bg-gray-100" />}
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-[16px] font-extrabold leading-tight">{item.title}</p>
                    {item.description ? <p className="mt-[2px] break-words text-[11px] text-zinc-600">{item.description}</p> : null}
                    <p className="mt-[3px] text-[11px] font-semibold">{item.quantity}</p>
                  </div>
                  <span className="max-w-[43%] shrink-0 self-start pt-1 text-right text-[13px] font-extrabold tabular-nums">{item.amount}</span>
                </div>
              );
            })}
          </div>
          <dl className="border-t border-dashed border-[#999] pt-[10px] text-[13.5px] font-semibold tabular-nums">
            {data.totals.map(({ label, amount }) => (
              <div key={label} className="mb-[6px] flex justify-between gap-2">
                <dt>{label}</dt><dd>{amount}</dd>
              </div>
            ))}
          </dl>

          <div className="relative mt-[11px] flex min-h-[52px] items-center justify-between gap-2 overflow-hidden rounded-[12px] bg-[linear-gradient(165deg,#333335,#141415_75%)] px-[14px] text-white shadow-inner">
            <div className="pointer-events-none absolute bottom-0 left-0 h-[24px] w-[42px] bg-[#ed0032]" style={{ clipPath: 'polygon(0 0,100% 100%,0 100%)' }} />
            <strong className="relative z-10 text-[clamp(16px,5.3vw,23px)] font-extrabold tracking-tight">TOTAL DUE</strong>
            <span className="h-[30px] w-px shrink-0 bg-white/70" />
            <strong className="relative z-10 whitespace-nowrap text-right text-[clamp(16px,5.3vw,23px)] font-extrabold tabular-nums">{data.balance}</strong>
          </div>
        </section>

        {/* The approved design stacks two full-width glossy CTA pills. */}
        <section className="mt-[13px] rounded-[25px] border border-[#f3a9b1] bg-white px-[14px] py-[12px] shadow-[0_5px_13px_rgba(130,0,19,.08)]">
          <a
            href="https://wise.com/pay/me/ajmala214" target="_blank" rel="noopener noreferrer"
            aria-label="Pay this invoice through Wise"
            className="group relative flex h-[58px] items-center overflow-hidden rounded-[19px] border border-[#15bd38] bg-[linear-gradient(170deg,#04db20_0%,#008e0e_38%,#01421d_100%)] px-[13px] text-white shadow-[0_5px_10px_rgba(0,112,25,.28)]"
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-[38%] rounded-t-[19px] bg-gradient-to-b from-white/15 to-transparent" />
            <span className="relative z-10 flex shrink-0 items-center whitespace-nowrap text-[clamp(17px,5.6vw,24px)] font-black italic tracking-[-0.07em]">
              <span className="mr-0.5 text-[20px]">↗</span>WISE
            </span>
            <span className="relative z-10 mx-[12px] h-[30px] w-px shrink-0 bg-white/85" />
            <span className="relative z-10 min-w-0 flex-1 whitespace-nowrap text-[clamp(12px,3.8vw,17px)] font-extrabold tracking-tight">Pay with Wise</span>
            <span className="absolute bottom-[-15px] right-[20px] select-none text-[93px] font-black italic leading-none text-[#0bfa27]/35" aria-hidden="true">7</span>
            <ChevronRight size={26} strokeWidth={3.1} className="relative z-10 shrink-0" />
          </a>

          <a
            href={downloadUrl ?? '#'} target="_blank" rel="noopener noreferrer"
            aria-label="Download Invoice Version 1 PDF"
            aria-disabled={!downloadUrl}
            onClick={(event) => { if (!downloadUrl) event.preventDefault(); }}
            className={'relative mt-[10px] flex h-[58px] items-center overflow-hidden rounded-[19px] border border-[#e50022] bg-[linear-gradient(166deg,#fb1827_0%,#ed0019_42%,#970003_100%)] px-[13px] text-white shadow-[0_5px_10px_rgba(168,0,24,.27)] ' + (!downloadUrl ? 'opacity-75' : '')}
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-[40%] rounded-t-[19px] bg-gradient-to-b from-white/15 to-transparent" />
            <span className="relative z-10 flex min-w-0 flex-[1.2] flex-col justify-center">
              <span className="whitespace-nowrap text-[clamp(11px,3.6vw,15px)] font-black tracking-[-.05em]">sourcing.center</span>
              <span className="mt-1 flex items-center gap-1 text-[8px] leading-none text-white/85">
                by
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sevenColorMark} alt="" className="h-[12px] w-[12px] object-contain brightness-0 invert" />
                Seven Color Trading Co Ltd
              </span>
            </span>
            <span className="relative z-10 mx-[9px] h-[30px] w-px shrink-0 bg-white/80" />
            <Download size={24} strokeWidth={2.8} className="relative z-10 mr-[9px] shrink-0" />
            <span className="relative z-10 min-w-0 flex-1 text-[clamp(12px,3.5vw,16px)] font-extrabold leading-[1.05]">Download<br/>Invoice</span>
            <ChevronRight size={26} strokeWidth={3.1} className="relative z-10 shrink-0" />
          </a>
          {downloadError ? <p className="mt-2 text-center text-xs text-red-700">Could not prepare Invoice 1 download link.</p> : null}
        </section>

        <section className="relative mt-[11px] overflow-hidden rounded-[27px] bg-white px-4 pb-[79px] pt-[15px] text-center shadow-[0_4px_15px_rgba(0,0,0,.055)]">
          <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-block" aria-label="Track your parcel">
            <svg width={102} height={102} viewBox="0 0 37 37" role="img" aria-label="Parcel tracking QR code">
              <path d={trackingQrPath} fill="#000" />
            </svg>
          </a>
          <p className="mt-[5px] text-[17px] font-extrabold leading-none">Track your parcel</p>
          <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-[8px] inline-flex items-center text-[13px] text-[#1c1c1c] underline">
            www.sourcing.center/track <ExternalLink size={0} className="sr-only" />
          </a>
          <p className="mt-[5px] text-[12px] text-zinc-700">www.sourcing.center</p>

          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[76px]" aria-hidden="true">
            <svg className="h-full w-full" viewBox="0 0 430 76" preserveAspectRatio="none">
              <path d="M0 24 Q160 74 340 52 Q390 40 430 7 L430 76 L0 76 Z" fill="#f0002d" />
              <path d="M0 50 Q210 100 430 17 L430 76 L0 76 Z" fill="#b40022" opacity=".95" />
              <path d="M0 34 Q235 78 430 10" fill="none" stroke="white" strokeWidth="9" opacity=".95" />
            </svg>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sevenColorMark} alt="Seven Color" className="pointer-events-none absolute bottom-[22px] left-1/2 z-10 h-[37px] w-[37px] -translate-x-1/2 object-contain" />
        </section>
      </div>
    </article>
  );
}
