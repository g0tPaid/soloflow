'use client';

import { invoiceVersionForPath, type InvoicePdfVersion } from '@/lib/invoice-version';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
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
  const preferredVersion = invoiceVersionForPath(usePathname()) ?? 1;
  const versions: (1 | InvoicePdfVersion)[] = [preferredVersion, ...([1, 2, 3] as const).filter((version) => version !== preferredVersion)];
  const { organization } = useOrganizationId();
  const [busy, setBusy] = useState<1 | InvoicePdfVersion | null>(null);
  const [error, setError] = useState('');
  const printUrl = organizationId
    ? `/print/invoices/${invoiceId}?org=${encodeURIComponent(organizationId)}`
    : `/print/invoices/${invoiceId}`;

  async function handleDownload(version: 1 | InvoicePdfVersion) {
    if (!organizationId || busy) {
      if (!organizationId && version === 1) window.location.href = printUrl;
      if (!organizationId && version !== 1) setError('Select an organization to download this invoice.');
      return;
    }
    setBusy(version);
    setError('');
    try {
      const file = await resolveInvoicePdfFile({
        documentId: invoiceId,
        organizationId,
        organization,
        filename: version === 1 ? filename : filename.replace(/(?:\.pdf)?$/i, `-v${version}.pdf`),
        version: version === 1 ? undefined : version,
      });
      const saved = await downloadPdfToDevice(file);
      if (saved === 'cancelled') setError('');
    } catch (err) {
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      if (!offline && version === 1) {
        window.location.href = printUrl;
        return;
      }
      setError(err instanceof Error ? err.message : 'Could not create the PDF on this device.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      {versions.map((version, index) => (
        <Button
          key={version}
          type="button"
          variant={index === 0 ? 'default' : 'outline'}
          size={size}
          className="gap-2"
          disabled={busy !== null}
          onClick={() => void handleDownload(version)}
        >
          {busy === version ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {busy === version ? 'Preparing PDF…' : version === 1 ? 'Download PDF (Version 1)' : `Invoice Version ${version}`}
        </Button>
      ))}
      {error ? <p className="text-right text-[11px] text-red-600">{error}</p> : null}
      <p className="text-right text-[11px] text-muted-foreground">
        Offline uses the copy stored on this device.
      </p>
    </div>
  );
}
