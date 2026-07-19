import { Suspense } from 'react';
import { QuotePrintPageContent } from './print-content';

export default function QuotePrintPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-gray-500">Preparing quote…</p>}>
      <QuotePrintPageContent params={params} />
    </Suspense>
  );
}
