'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const printUrl = organizationId
    ? `/print/invoices/${invoiceId}?org=${encodeURIComponent(organizationId)}`
    : `/print/invoices/${invoiceId}`;

  function handleDownload() {
    window.location.href = printUrl;
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <Button
        type="button"
        variant="default"
        size={size}
        className="gap-2"
        onClick={handleDownload}
      >
        <Download className="h-4 w-4" />
        Save PDF
      </Button>
      <p className="text-right text-[11px] text-muted-foreground">
        Opens invoice — tap <strong>Save PDF</strong>, then choose Save as PDF in the print menu
      </p>
    </div>
  );
}
