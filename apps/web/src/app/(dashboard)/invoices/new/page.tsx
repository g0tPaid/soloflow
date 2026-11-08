import { Suspense } from 'react';
import { NewInvoicePageContent } from './new-invoice-content';

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl h-64 animate-pulse rounded-lg bg-muted" />}>
      <NewInvoicePageContent />
    </Suspense>
  );
}
