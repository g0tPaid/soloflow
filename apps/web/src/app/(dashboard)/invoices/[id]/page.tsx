import { Suspense } from 'react';
import { InvoiceDetailPageContent } from './invoice-detail-content';

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl h-64 animate-pulse rounded-lg bg-muted" />}>
      <InvoiceDetailPageContent params={params} />
    </Suspense>
  );
}
