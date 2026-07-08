import { Suspense } from 'react';
import { ReceiptPrintPageContent } from './print-content';

export default function ReceiptPrintPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-gray-500">Preparing receipt…</p>}>
      <ReceiptPrintPageContent params={params} />
    </Suspense>
  );
}
