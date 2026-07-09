'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Download, LayoutDashboard, Loader2, MessageCircle, Share2 } from 'lucide-react';
import { shareDocumentByEmail } from '@/lib/share-document-file';
import { shareInvoiceFile } from '@/lib/share-invoice-file';
import { cn } from '@/lib/utils';

type Props = {
  backHref: string;
  backLabel?: string;
  serverPdfUrl: string;
  filename: string;
  accentClassName?: string;
  whatsappMessage?: string;
  whatsappPhone?: string;
  emailSubject?: string;
  emailBody?: string;
};

function prefersBrowserPrint() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

async function fetchServerPdf(serverPdfUrl: string, filename: string): Promise<File> {
  const response = await fetch(serverPdfUrl, { credentials: 'include' });
  if (!response.ok) {
    throw new Error('PDF generation failed');
  }
  const blob = await response.blob();
  return new File([blob], filename, { type: 'application/pdf' });
}

export function PrintPageToolbar({
  backHref,
  backLabel = 'Back',
  serverPdfUrl,
  filename,
  accentClassName = 'bg-red-600 hover:bg-red-700',
  whatsappMessage = 'Please find the document attached.',
  whatsappPhone,
  emailSubject,
  emailBody,
}: Props) {
  const [busy, setBusy] = useState<'download' | 'whatsapp' | 'share' | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const shareSubject = emailSubject ?? filename;
  const shareBody = emailBody ?? whatsappMessage;

  async function handleDownload() {
    if (busy) return;
    setBusy('download');
    setError('');
    setStatus('');

    try {
      if (prefersBrowserPrint()) {
        window.print();
        return;
      }

      setStatus('Generating PDF…');
      window.location.assign(serverPdfUrl);
    } catch {
      setError('Could not download PDF. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function handleWhatsApp() {
    if (busy) return;
    setBusy('whatsapp');
    setError('');
    setStatus('Generating PDF…');

    try {
      const file = await fetchServerPdf(serverPdfUrl, filename);
      await shareInvoiceFile(file, whatsappMessage, whatsappPhone);
      setStatus('PDF ready — pick WhatsApp in the share menu.');
    } catch {
      setError('Could not share on WhatsApp. Try the PDF button first.');
    } finally {
      setBusy(null);
    }
  }

  async function handleShareEmail() {
    if (busy) return;
    setBusy('share');
    setError('');
    setStatus('Generating PDF…');

    try {
      const file = await fetchServerPdf(serverPdfUrl, filename);
      await shareDocumentByEmail(file, shareSubject, shareBody);
      setStatus('PDF ready — pick your email app in the share menu.');
    } catch {
      setError('Could not share by email. Try the PDF button first.');
    } finally {
      setBusy(null);
    }
  }

  const isBusy = busy !== null;

  return (
    <>
      <div className="no-print fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-[900px] items-center gap-2">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </div>
        {error ? <p className="mx-auto mt-2 max-w-[900px] text-sm text-red-600">{error}</p> : null}
        {status && !error ? (
          <p className="mx-auto mt-2 max-w-[900px] text-sm text-slate-600">{status}</p>
        ) : null}
      </div>

      <div className="no-print fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-[900px] gap-1.5">
          <Link
            href="/dashboard"
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-3 text-xs font-semibold text-slate-800 sm:text-sm"
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span className="truncate">Dashboard</span>
          </Link>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void handleShareEmail()}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-3 text-xs font-semibold text-slate-800 disabled:opacity-70 sm:text-sm"
          >
            {busy === 'share' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
            Share
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void handleWhatsApp()}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#25D366] px-2 py-3 text-xs font-semibold text-white disabled:opacity-70 sm:text-sm"
          >
            {busy === 'whatsapp' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4" />
            )}
            WhatsApp
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void handleDownload()}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-3 text-xs font-semibold text-white disabled:opacity-70 sm:text-sm',
              accentClassName,
            )}
          >
            {busy === 'download' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {busy === 'download' ? 'Creating…' : 'PDF'}
          </button>
        </div>
      </div>

      <div className="no-print" style={{ height: 'calc(3.5rem + env(safe-area-inset-top))' }} />
      <div className="no-print" style={{ height: 'calc(5rem + env(safe-area-inset-bottom))' }} />
    </>
  );
}
