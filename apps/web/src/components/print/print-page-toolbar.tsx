'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { downloadElementAsPdf } from '@/lib/capture-element-image';
import { cn } from '@/lib/utils';

type Props = {
  backHref: string;
  backLabel?: string;
  captureElementId: string;
  filename: string;
  downloadLabel?: string;
  accentClassName?: string;
  children?: ReactNode;
};

export function PrintPageToolbar({
  backHref,
  backLabel = 'Back',
  captureElementId,
  filename,
  downloadLabel = 'Download PDF',
  accentClassName = 'bg-red-600 hover:bg-red-700',
  children,
}: Props) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    setError('');

    try {
      const element = document.getElementById(captureElementId);
      if (!element) throw new Error('Document not ready yet');
      await downloadElementAsPdf(element, filename);
    } catch {
      setError('Could not create PDF. Wait a moment and try again.');
    } finally {
      setDownloading(false);
    }
  }

  const topBar = (
    <div className="flex flex-wrap items-center gap-2">
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
        Home
      </Link>
      <button
        type="button"
        disabled={downloading}
        onClick={() => void handleDownload()}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-70',
          accentClassName,
        )}
      >
        {downloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {downloading ? 'Creating PDF…' : downloadLabel}
      </button>
    </div>
  );

  return (
    <>
      <div className="no-print fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto max-w-[900px] space-y-2">
          {topBar}
          {children}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </div>

      <div className="no-print fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-[900px] gap-2">
          <Link
            href={backHref}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
          <button
            type="button"
            disabled={downloading}
            onClick={() => void handleDownload()}
            className={cn(
              'inline-flex flex-[2] items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold text-white disabled:opacity-70',
              accentClassName,
            )}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {downloading ? 'Creating…' : 'Download PDF'}
          </button>
        </div>
      </div>

      <div
        className="no-print"
        style={{
          height: 'calc(4.5rem + env(safe-area-inset-top))',
        }}
      />
      <div
        className="no-print lg:hidden"
        style={{
          height: 'calc(4.5rem + env(safe-area-inset-bottom))',
        }}
      />
    </>
  );
}
