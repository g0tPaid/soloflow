'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DownloadQuotePdfButton({
  quoteId,
  organizationId,
  filename = 'quote.pdf',
  size = 'default',
}: {
  quoteId: string;
  organizationId?: string;
  filename?: string;
  size?: 'default' | 'lg';
}) {
  const printUrl = organizationId
    ? `/print/quotes/${quoteId}?org=${encodeURIComponent(organizationId)}`
    : `/print/quotes/${quoteId}`;

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
        Download PDF
      </Button>
      <p className="text-right text-[11px] text-muted-foreground">
        Opens quote — tap <strong>Download PDF</strong> to save {filename}
      </p>
    </div>
  );
}
