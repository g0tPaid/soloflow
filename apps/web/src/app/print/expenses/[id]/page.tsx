import { Suspense } from 'react';
import { ExpensePrintPageContent } from './print-content';

export default function ExpensePrintPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-gray-500">Preparing expenses…</p>}>
      <ExpensePrintPageContent params={params} />
    </Suspense>
  );
}
