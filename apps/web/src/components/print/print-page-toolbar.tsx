'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Download, Loader2, MessageCircle } from 'lucide-react';
import {
  preparePdfFromElement,
  revokePreparedPdf,
  savePdfToDevice,
  type PreparedPdf,
} from '@/lib/capture-element-image';
import { shareInvoiceFile } from '@/lib/share-invoice-file';
import { PdfViewerSheet } from '@/components/print/pdf-viewer-sheet';
import { cn } from '@/lib/utils';

type Props = {
  backHref: string;
  backLabel?: string;
  captureElementId: string;
  filename: string;
  accentClassName?: string;
  whatsappMessage?: string;
  whatsappPhone?: string;
};

export function PrintPageToolbar({
  backHref,
  backLabel = 'Back',
  captureElementId,
  filename,
  accentClassName = 'bg-red-600 hover:bg-red-700',
  whatsappMessage = 'Please find the document attached.',
  whatsappPhone,
}: Props) {
  const [busy, setBusy] = useState<'download' | 'whatsapp' | null>(null);
  const [error, setError] = useState('');
  const [viewer, setViewer] = useState<PreparedPdf | null>(null);
  const viewerRef = useRef<PreparedPdf | null>(null);

  useEffect(() => {
    return () => {
      if (viewerRef.current) revokePreparedPdf(viewerRef.current);
    };
  }, []);

  function showViewer(prepared: PreparedPdf) {
    if (viewerRef.current) revokePreparedPdf(viewerRef.current);
    viewerRef.current = prepared;
    setViewer(prepared);
  }

  function closeViewer() {
    if (viewerRef.current) {
      revokePreparedPdf(viewerRef.current);
      viewerRef.current = null;
    }
    setViewer(null);
  }

  async function buildPdf(): Promise<PreparedPdf> {
    const element = document.getElementById(captureElementId);
    if (!element) throw new Error('Document not ready yet');
    return preparePdfFromElement(element, filename);
  }

  async function handleDownload() {
    if (busy) return;
    setBusy('download');
    setError('');

    try {
      const prepared = await buildPdf();
      showViewer(prepared);
      await savePdfToDevice(prepared.file);
    } catch {
      setError('Could not create PDF. Wait for the page to finish loading, then try again.');
    } finally {
      setBusy(null);
    }
  }

  async function handleWhatsApp() {
    if (busy) return;
    setBusy('whatsapp');
    setError('');

    try {
      const prepared = viewerRef.current ?? (await buildPdf());
      if (!viewerRef.current) showViewer(prepared);
      await shareInvoiceFile(prepared.file, whatsappMessage, whatsappPhone);
    } catch {
      setError('Could not share on WhatsApp. Try Download PDF first.');
    } finally {
      setBusy(null);
    }
  }

  function closeViewerOnly() {
    closeViewer();
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
          <Link
            href="/dashboard"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Dashboard
          </Link>
        </div>
        {error ? <p className="mx-auto mt-2 max-w-[900px] text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="no-print fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-3 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-[900px] gap-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void handleWhatsApp()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 py-3 text-sm font-semibold text-white disabled:opacity-70"
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
              'inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold text-white disabled:opacity-70',
              accentClassName,
            )}
          >
            {busy === 'download' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {busy === 'download' ? 'Creating…' : 'Download PDF'}
          </button>
        </div>
      </div>

      <div className="no-print" style={{ height: 'calc(3.5rem + env(safe-area-inset-top))' }} />
      <div className="no-print" style={{ height: 'calc(4.5rem + env(safe-area-inset-bottom))' }} />

      {viewer ? (
        <PdfViewerSheet
          prepared={viewer}
          onClose={closeViewerOnly}
          onWhatsApp={() => void handleWhatsApp()}
        />
      ) : null}
    </>
  );
}
