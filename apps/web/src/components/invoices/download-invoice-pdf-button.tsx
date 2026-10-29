'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOrganizationId } from '@/hooks/use-organization';
import { resolveInvoicePdfFile } from '@/lib/offline/resolve-invoice-pdf';
import { downloadPdfToDevice } from '@/lib/save-pdf-to-device';

export function DownloadInvoicePdfButton({
  invoiceId,
  organizationId,
  filename = 'invoice.pdf',
  size = 'default',
}: {
  invoiceId: string;
  organizationId?: string;
  filename?: string;
  size?: 'default' | 'lg';
}) {
  const { organization } = useOrganizationId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const printUrl = organizationId
    ? `/print/invoices/${invoiceId}?org=${encodeURIComponent(organizationId)}`
    : `/print/invoices/${invoiceId}`;

  async function handleDownload() {
    if (!organizationId || busy) {
      if (!organizationId) window.location.href = printUrl;
      return;
    }
    setBusy(true);
    setError('');
    try {
      const file = await resolveInvoicePdfFile({
        documentId: invoiceId,
        organizationId,
        organization,
        filename,
      });
      const saved = await downloadPdfToDevice(file);
      if (saved === 'cancelled') setError('');
    } catch (err) {
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      if (!offline) {
        window.location.href = printUrl;
        return;
      }
      setError(err instanceof Error ? err.message : 'Could not create the PDF on this device.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <Button
        type="button"
        variant="default"
        size={size}
        className="gap-2"
        disabled={busy}
        onClick={() => void handleDownload()}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {busy ? 'Preparing PDF…' : 'Download PDF'}
      </Button>
      {error ? <p className="text-right text-[11px] text-red-600">{error}</p> : null}
      <p className="text-right text-[11px] text-muted-foreground">
        Saves <strong>{filename}</strong>. Offline uses the copy stored on this device.
      </p>
    </div>
  );
}
