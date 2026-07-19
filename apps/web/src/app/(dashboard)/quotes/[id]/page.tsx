import { Suspense } from 'react';
import { QuoteDetailPageContent } from './quote-detail-content';

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl h-64 animate-pulse rounded-lg bg-muted" />}>
      <QuoteDetailPageContent params={params} />
    </Suspense>
  );
}
