import { Suspense } from 'react';
import { InvoicePrintPageContent } from './print-content';

export default function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-gray-500">Preparing invoice…</p>}>
      <InvoicePrintPageContent params={params} />
    </Suspense>
  );
}
